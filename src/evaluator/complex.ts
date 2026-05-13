/**
 * E12 복소수 평가자 — 별도 표면
 *
 * 메인 evaluator 의 number 계약은 변경 없이, 새 진입점이 AST 를
 * 복소수 Complex = { re, im } 로 평가한다. `i` 는 imaginary unit 으로
 * 자동 인식되지만 bindings 에 명시되면 사용자 값이 우선한다.
 *
 *   evaluateComplexSync(ast, bindings): Complex | undefined  (핫패스)
 *   evaluateComplex    (ast, bindings): ComplexResult         (콜드패스)
 *
 * 산술: +, -, *, /, neg, integer power (반복 곱), 일반 power (exp(w·ln z))
 * 함수: exp/ln/sqrt/sin/cos/tan/sinh/cosh/tanh + abs(|z| 실수), arg(z)
 * 도메인: 1/0, ln(0), 0^Re(w)≤0 → domain
 *
 * 메인 registry 와 격리된 자체 shunting-yard 시퀀스 평가자를 갖는다.
 */
import type {
  MathNode,
  NumberNode,
  VariableNode,
  OperatorNode,
  FracNode,
  PowerNode,
  SqrtNode,
  ParenNode,
  AbsNode,
  FuncNode,
  RootNode,
  RowNode,
} from '../types';
import type { Bindings, EvalDetail, EvalStatus } from './types';
import { normalizeVarName } from './normalize';

export interface Complex {
  readonly re: number;
  readonly im: number;
}

export type ComplexResult =
  | { ok: true; value: Complex }
  | { ok: false; status: EvalStatus; detail?: EvalDetail };

type ComplexOutcome =
  | { kind: 'value'; value: Complex }
  | { kind: 'fail'; status: EvalStatus; detail?: EvalDetail };

function ok(re: number, im: number): ComplexOutcome {
  return { kind: 'value', value: { re, im } };
}
function okZ(z: Complex): ComplexOutcome {
  return { kind: 'value', value: z };
}
function fail(status: EvalStatus, detail?: EvalDetail): ComplexOutcome {
  return { kind: 'fail', status, detail };
}
function isFiniteComplex(z: Complex): boolean {
  return Number.isFinite(z.re) && Number.isFinite(z.im);
}

const ZERO: Complex = { re: 0, im: 0 };
const ONE: Complex = { re: 1, im: 0 };
const I: Complex = { re: 0, im: 1 };

/* ─────────────────── 산술 ─────────────────── */

const cAdd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
const cSub = (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im });
/** -0 을 +0 으로 정규화 — atan2(-0, x<0) = -π 가지 함정 회피. */
const negZero = (x: number): number => (x === 0 ? 0 : -x);
const cNeg = (a: Complex): Complex => ({ re: negZero(a.re), im: negZero(a.im) });
const cMul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
function cDiv(a: Complex, b: Complex): ComplexOutcome {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) return fail('domain', { nodeType: 'frac', reason: 'division-by-zero' });
  return ok(
    (a.re * b.re + a.im * b.im) / denom,
    (a.im * b.re - a.re * b.im) / denom,
  );
}

const cAbs = (a: Complex): number => Math.hypot(a.re, a.im);
const cArg = (a: Complex): number => Math.atan2(a.im === 0 ? 0 : a.im, a.re === 0 ? 0 : a.re);

function cExp(z: Complex): Complex {
  const er = Math.exp(z.re);
  return { re: er * Math.cos(z.im), im: er * Math.sin(z.im) };
}

function cLn(z: Complex): ComplexOutcome {
  const r = cAbs(z);
  if (r === 0) return fail('domain', { nodeType: 'func', reason: 'ln-zero' });
  return ok(Math.log(r), cArg(z));
}

function cSqrt(z: Complex): Complex {
  // principal branch
  if (z.re === 0 && z.im === 0) return ZERO;
  const r = Math.sqrt(cAbs(z));
  const theta = cArg(z) / 2;
  return { re: r * Math.cos(theta), im: r * Math.sin(theta) };
}

function cSin(z: Complex): Complex {
  return { re: Math.sin(z.re) * Math.cosh(z.im), im: Math.cos(z.re) * Math.sinh(z.im) };
}
function cCos(z: Complex): Complex {
  return { re: Math.cos(z.re) * Math.cosh(z.im), im: -Math.sin(z.re) * Math.sinh(z.im) };
}
function cTan(z: Complex): ComplexOutcome {
  const s = cSin(z);
  const c = cCos(z);
  return cDiv(s, c);
}
function cSinh(z: Complex): Complex {
  return { re: Math.sinh(z.re) * Math.cos(z.im), im: Math.cosh(z.re) * Math.sin(z.im) };
}
function cCosh(z: Complex): Complex {
  return { re: Math.cosh(z.re) * Math.cos(z.im), im: Math.sinh(z.re) * Math.sin(z.im) };
}
function cTanh(z: Complex): ComplexOutcome {
  const s = cSinh(z);
  const c = cCosh(z);
  return cDiv(s, c);
}

function cPowInt(z: Complex, n: number): ComplexOutcome {
  // 반복 제곱
  if (n === 0) {
    if (z.re === 0 && z.im === 0) return fail('domain', { nodeType: 'power', reason: 'zero-pow-zero' });
    return okZ(ONE);
  }
  let base = z;
  let exp = Math.abs(n);
  let result: Complex = ONE;
  while (exp > 0) {
    if (exp & 1) result = cMul(result, base);
    base = cMul(base, base);
    exp >>>= 1;
  }
  if (n < 0) {
    if (result.re === 0 && result.im === 0) {
      return fail('domain', { nodeType: 'power', reason: 'zero-base-negative-exp' });
    }
    return cDiv(ONE, result);
  }
  return okZ(result);
}

function cPow(z: Complex, w: Complex): ComplexOutcome {
  // 0^w 처리
  if (z.re === 0 && z.im === 0) {
    if (w.re > 0 && w.im === 0) return okZ(ZERO);
    return fail('domain', { nodeType: 'power', reason: 'zero-base-non-positive-exp' });
  }
  // 정수 지수 우선
  if (w.im === 0 && Number.isInteger(w.re)) {
    return cPowInt(z, w.re);
  }
  // 일반: exp(w · ln z)
  const lnZ = cLn(z);
  if (lnZ.kind === 'fail') return lnZ;
  return okZ(cExp(cMul(w, lnZ.value)));
}

/* ─────────────────── 함수 핸들러 ─────────────────── */

type UnaryComplexFn = (z: Complex) => ComplexOutcome;

const pure = (fn: (z: Complex) => Complex): UnaryComplexFn => (z) => okZ(fn(z));

const FUNCTIONS: Readonly<Record<string, UnaryComplexFn>> = {
  exp: pure(cExp),
  ln: cLn,
  log: (z) => {
    // 자연로그가 아닌 10진 로그: ln(z)/ln(10)
    const l = cLn(z);
    if (l.kind === 'fail') return l;
    return okZ({ re: l.value.re / Math.LN10, im: l.value.im / Math.LN10 });
  },
  lg: (z) => {
    const l = cLn(z);
    if (l.kind === 'fail') return l;
    return okZ({ re: l.value.re / Math.LN10, im: l.value.im / Math.LN10 });
  },
  lb: (z) => {
    const l = cLn(z);
    if (l.kind === 'fail') return l;
    return okZ({ re: l.value.re / Math.LN2, im: l.value.im / Math.LN2 });
  },
  sqrt: pure(cSqrt),
  sin: pure(cSin),
  cos: pure(cCos),
  tan: cTan,
  sinh: pure(cSinh),
  cosh: pure(cCosh),
  tanh: cTanh,
  // 실수 결과 → im=0 으로 임베드
  abs: (z) => ok(cAbs(z), 0),
  arg: (z) => ok(cArg(z), 0),
  re: (z) => ok(z.re, 0),
  im: (z) => ok(z.im, 0),
  conj: (z) => ok(z.re, -z.im),
};

/* ─────────────────── dispatch ─────────────────── */

interface ComplexCtx {
  readonly bindings: Bindings;
}

function dispatch(node: MathNode, ctx: ComplexCtx): ComplexOutcome {
  const out = dispatchInner(node, ctx);
  if (out.kind === 'value' && !isFiniteComplex(out.value)) {
    return fail('divergent', { nodeType: node.type, reason: 'non-finite-result' });
  }
  return out;
}

function dispatchInner(node: MathNode, ctx: ComplexCtx): ComplexOutcome {
  switch (node.type) {
    case 'number':
      return evalNumber(node);
    case 'variable':
      return evalVariable(node, ctx);
    case 'paren':
      return evalSequence((node as ParenNode).content, ctx);
    case 'root':
    case 'row':
      return evalSequence((node as RootNode | RowNode).children, ctx);
    case 'frac':
      return evalFrac(node as FracNode, ctx);
    case 'power':
      return evalPower(node as PowerNode, ctx);
    case 'sqrt':
      return evalSqrtNode(node as SqrtNode, ctx);
    case 'abs':
      return evalAbsNode(node as AbsNode, ctx);
    case 'func':
      return evalFunc(node as FuncNode, ctx);
    case 'operator':
      return fail('unsupported', {
        nodeType: 'operator',
        reason: `bare-operator:${(node as OperatorNode).operator}`,
      });
    case 'subscript':
    case 'overline':
    case 'accent':
    case 'matrix':
    case 'integral':
    case 'sum':
    case 'product':
    case 'limit':
    case 'text':
    case 'space':
    case 'align':
    case 'cases':
    case 'gather':
    case 'array':
    case 'overset':
    case 'cancel':
    case 'xarrow':
    case 'literal':
    case 'error':
    case 'opaque':
      return fail('unsupported', { nodeType: node.type });
  }
}

function evalNumber(node: MathNode): ComplexOutcome {
  const raw = (node as NumberNode).value;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) {
    return fail('domain', { nodeType: 'number', reason: `cannot parse "${raw}"` });
  }
  return ok(n, 0);
}

function evalVariable(node: MathNode, ctx: ComplexCtx): ComplexOutcome {
  const raw = (node as VariableNode).name;
  const canonical = normalizeVarName(raw);
  // bindings 우선
  const direct = ctx.bindings[canonical];
  if (typeof direct === 'number') return ok(direct, 0);
  const alias = ctx.bindings[raw];
  if (typeof alias === 'number') return ok(alias, 0);
  // imaginary unit 자동 인식
  if (canonical === 'i') return okZ(I);
  return fail('unbound', { variable: canonical });
}

function evalFrac(n: FracNode, ctx: ComplexCtx): ComplexOutcome {
  if (n.variant === 'binom') return fail('unsupported', { nodeType: 'frac', reason: 'binom' });
  const num = evalSequence(n.numerator, ctx);
  if (num.kind === 'fail') return num;
  const den = evalSequence(n.denominator, ctx);
  if (den.kind === 'fail') return den;
  return cDiv(num.value, den.value);
}

function evalPower(n: PowerNode, ctx: ComplexCtx): ComplexOutcome {
  const base = evalSequence(n.base, ctx);
  if (base.kind === 'fail') return base;
  const exp = evalSequence(n.exponent, ctx);
  if (exp.kind === 'fail') return exp;
  return cPow(base.value, exp.value);
}

function evalSqrtNode(n: SqrtNode, ctx: ComplexCtx): ComplexOutcome {
  const content = evalSequence(n.content, ctx);
  if (content.kind === 'fail') return content;
  if (!n.index || n.index.length === 0) {
    return okZ(cSqrt(content.value));
  }
  const idx = evalSequence(n.index, ctx);
  if (idx.kind === 'fail') return idx;
  if (idx.value.re === 0 && idx.value.im === 0) {
    return fail('domain', { nodeType: 'sqrt', reason: 'zero-degree-root' });
  }
  const inv = cDiv(ONE, idx.value);
  if (inv.kind === 'fail') return inv;
  return cPow(content.value, inv.value);
}

function evalAbsNode(n: AbsNode, ctx: ComplexCtx): ComplexOutcome {
  const inner = evalSequence(n.content, ctx);
  if (inner.kind === 'fail') return inner;
  return ok(cAbs(inner.value), 0);
}

function evalFunc(n: FuncNode, ctx: ComplexCtx): ComplexOutcome {
  const fn = FUNCTIONS[n.name];
  if (!fn) return fail('unsupported', { nodeType: 'func', reason: n.name });
  const arg = evalSequence(n.argument, ctx);
  if (arg.kind === 'fail') return arg;
  return fn(arg.value);
}

/* ─────────────────── 시퀀스 평가 (shunting-yard) ─────────────────── */

type BinaryOp = '+' | '-' | '×' | '÷' | '·';

type SeqToken =
  | { kind: 'operand'; node: MathNode }
  | { kind: 'binop'; op: BinaryOp; prec: number }
  | { kind: 'unaryMinus' };

const PREC: Record<BinaryOp, number> = {
  '+': 1,
  '-': 1,
  '×': 2,
  '·': 2,
  '÷': 2,
};
const UNARY_PREC = 3;

function tokenize(children: MathNode[]): SeqToken[] | { error: string; operator?: string } {
  const tokens: SeqToken[] = [];
  let prevWasOperand = false;
  for (const c of children) {
    if (c.type === 'operator') {
      const op = (c as OperatorNode).operator;
      if (op === '+') {
        if (!prevWasOperand) continue;
        tokens.push({ kind: 'binop', op: '+', prec: PREC['+'] });
        prevWasOperand = false;
        continue;
      }
      if (op === '-') {
        if (!prevWasOperand) {
          tokens.push({ kind: 'unaryMinus' });
        } else {
          tokens.push({ kind: 'binop', op: '-', prec: PREC['-'] });
          prevWasOperand = false;
        }
        continue;
      }
      if (op === '×' || op === '·' || op === '÷') {
        if (!prevWasOperand) return { error: 'malformed-sequence', operator: op };
        tokens.push({ kind: 'binop', op, prec: PREC[op] });
        prevWasOperand = false;
        continue;
      }
      return { error: 'unsupported-operator', operator: op };
    }
    if (prevWasOperand) {
      tokens.push({ kind: 'binop', op: '×', prec: PREC['×'] });
    }
    tokens.push({ kind: 'operand', node: c });
    prevWasOperand = true;
  }
  return tokens;
}

function toRPN(tokens: SeqToken[]): SeqToken[] {
  const output: SeqToken[] = [];
  const stack: SeqToken[] = [];
  const precOf = (t: SeqToken): number => {
    if (t.kind === 'unaryMinus') return UNARY_PREC;
    if (t.kind === 'binop') return t.prec;
    return 0;
  };
  for (const t of tokens) {
    if (t.kind === 'operand') {
      output.push(t);
      continue;
    }
    if (t.kind === 'unaryMinus') {
      stack.push(t);
      continue;
    }
    while (stack.length > 0 && precOf(stack[stack.length - 1]) >= t.prec) {
      output.push(stack.pop()!);
    }
    stack.push(t);
  }
  while (stack.length > 0) output.push(stack.pop()!);
  return output;
}

function evalRPN(rpn: SeqToken[], ctx: ComplexCtx): ComplexOutcome {
  const stack: Complex[] = [];
  for (const t of rpn) {
    if (t.kind === 'operand') {
      const out = dispatch(t.node, ctx);
      if (out.kind === 'fail') return out;
      stack.push(out.value);
      continue;
    }
    if (t.kind === 'unaryMinus') {
      const x = stack.pop();
      if (x === undefined) return fail('unsupported', { nodeType: 'row', reason: 'malformed-sequence' });
      stack.push(cNeg(x));
      continue;
    }
    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) {
      return fail('unsupported', { nodeType: 'row', reason: 'malformed-sequence' });
    }
    switch (t.op) {
      case '+':
        stack.push(cAdd(a, b));
        break;
      case '-':
        stack.push(cSub(a, b));
        break;
      case '×':
      case '·':
        stack.push(cMul(a, b));
        break;
      case '÷': {
        const d = cDiv(a, b);
        if (d.kind === 'fail') return d;
        stack.push(d.value);
        break;
      }
    }
  }
  if (stack.length !== 1) return fail('unsupported', { nodeType: 'row', reason: 'malformed-sequence' });
  return okZ(stack[0]);
}

function evalSequence(children: MathNode[], ctx: ComplexCtx): ComplexOutcome {
  if (children.length === 0) return fail('unsupported', { nodeType: 'row', reason: 'empty-sequence' });
  if (children.length === 1) return dispatch(children[0], ctx);
  const tokens = tokenize(children);
  if (!Array.isArray(tokens)) {
    if (tokens.error === 'unsupported-operator') {
      return fail('unsupported', { nodeType: 'operator', reason: tokens.operator });
    }
    return fail('unsupported', { nodeType: 'row', reason: tokens.error });
  }
  if (tokens.length === 0) return fail('unsupported', { nodeType: 'row', reason: 'empty-sequence' });
  return evalRPN(toRPN(tokens), ctx);
}

/* ─────────────────── 표면 ─────────────────── */

const EMPTY_BINDINGS: Bindings = Object.freeze({});

export function evaluateComplexSync(node: MathNode, bindings: Bindings = EMPTY_BINDINGS): Complex | undefined {
  try {
    const out = dispatch(node, { bindings });
    if (out.kind === 'value' && isFiniteComplex(out.value)) return out.value;
    return undefined;
  } catch {
    return undefined;
  }
}

export function evaluateComplex(node: MathNode, bindings: Bindings = EMPTY_BINDINGS): ComplexResult {
  try {
    const out = dispatch(node, { bindings });
    if (out.kind === 'value') {
      if (!isFiniteComplex(out.value)) {
        return { ok: false, status: 'divergent', detail: { reason: 'non-finite-complex' } };
      }
      return { ok: true, value: out.value };
    }
    return { ok: false, status: out.status, detail: out.detail };
  } catch {
    return { ok: false, status: 'divergent', detail: { reason: 'internal-error' } };
  }
}
