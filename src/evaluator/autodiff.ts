/**
 * E10 자동미분 — forward-mode 듀얼넘버 (별도 표면)
 *
 * 메인 evaluator 의 number 계약은 변경 없이, 새 진입점이 AST 를 듀얼넘버
 * `{ v: value; d: derivative }` 로 평가한다. 미분 변수에 대해 `d=1` 로
 * 시드하면 식 전체의 partial 미분값을 자연스럽게 산출한다.
 *
 *   differentiateAt(ast, variable, bindings): number | undefined  (핫패스)
 *   differentiate    (ast, variable, bindings): DiffResult         (콜드패스)
 *
 * 도메인 정책 — 메인 evaluator 와 동일하지만 미분 가능성도 함께 검사한다:
 *   - 분모 0, ln(≤0), sqrt(<0), 음수^비정수 등 → domain
 *   - abs(0), sign/floor/ceil/round 등 미분 불가능 지점 → domain (미분 불가)
 *   - matrix/integral/sum/product/limit 등 비-기본 노드 → unsupported (표면 밖)
 *
 * 자체 시퀀스 평가자 (shunting-yard) 를 갖고 메인 registry 와 격리된다.
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
} from '../types.js';
import type { Bindings, EvalDetail, EvalStatus } from './types.js';
import { normalizeVarName } from './normalize.js';

export interface Dual {
  readonly v: number;
  readonly d: number;
}

export type DiffResult =
  | { ok: true; derivative: number }
  | { ok: false; status: EvalStatus; detail?: EvalDetail };

type DualOutcome =
  | { kind: 'value'; dual: Dual }
  | { kind: 'fail'; status: EvalStatus; detail?: EvalDetail };

function ok(v: number, d: number): DualOutcome {
  return { kind: 'value', dual: { v, d } };
}
function okDual(dual: Dual): DualOutcome {
  return { kind: 'value', dual };
}
function fail(status: EvalStatus, detail?: EvalDetail): DualOutcome {
  return { kind: 'fail', status, detail };
}
function isFiniteDual(d: Dual): boolean {
  return Number.isFinite(d.v) && Number.isFinite(d.d);
}

interface AutoCtx {
  readonly bindings: Bindings;
  /** 미분 변수의 정규형 이름 */
  readonly diffVar: string;
  /** 평가 중 임시 바인딩(예: 적분/합 인덱스) — 현재는 사용 안 함, 확장 여지로 보관 */
  readonly overrides: Readonly<Record<string, number>>;
}

function makeCtx(bindings: Bindings, diffVar: string): AutoCtx {
  return { bindings, diffVar, overrides: {} };
}

/* ─────────────────── 듀얼넘버 산술 ─────────────────── */

const add = (a: Dual, b: Dual): Dual => ({ v: a.v + b.v, d: a.d + b.d });
const sub = (a: Dual, b: Dual): Dual => ({ v: a.v - b.v, d: a.d - b.d });
const neg = (a: Dual): Dual => ({ v: -a.v, d: -a.d });
const mul = (a: Dual, b: Dual): Dual => ({ v: a.v * b.v, d: a.d * b.v + a.v * b.d });
const div = (a: Dual, b: Dual): Dual => ({
  v: a.v / b.v,
  d: (a.d * b.v - a.v * b.d) / (b.v * b.v),
});

/**
 * pow(u, v) 의 미분.
 *   - v 가 상수(v.d === 0): d/dx[u^c] = c · u^(c-1) · u'
 *     (u.v < 0 이고 c 가 비정수 → domain)
 *   - 일반: u^v = exp(v · ln u). u.v > 0 일 때만 정의.
 *     d/dx = u^v · (v' · ln u + v · u'/u)
 */
function powDual(u: Dual, e: Dual): DualOutcome {
  // 상수 지수 분기 — u<0 음수 밑 정수 지수도 처리 가능
  if (e.d === 0) {
    const c = e.v;
    if (u.v === 0) {
      if (c <= 0) return fail('domain', { nodeType: 'power', reason: 'zero-base-non-positive-exp' });
      if (c === 1) return okDual(u);
      // 0^c (c>0): v=0, d = c · 0^(c-1) · u'. c<1 이면 무한대 → divergent. c≥1 이면 0.
      if (c < 1) return fail('divergent', { nodeType: 'power', reason: 'pow-derivative-infinite-at-zero' });
      return ok(0, c === 1 ? u.d : 0);
    }
    if (u.v < 0 && !Number.isInteger(c)) {
      return fail('domain', { nodeType: 'power', reason: 'negative-base-fractional-exp' });
    }
    const vNew = Math.pow(u.v, c);
    const dNew = c * Math.pow(u.v, c - 1) * u.d;
    return ok(vNew, dNew);
  }
  // 일반 지수
  if (u.v <= 0) {
    return fail('domain', { nodeType: 'power', reason: 'non-positive-base-variable-exp' });
  }
  const vNew = Math.pow(u.v, e.v);
  const lnU = Math.log(u.v);
  const dNew = vNew * (e.d * lnU + (e.v * u.d) / u.v);
  return ok(vNew, dNew);
}

/* ─────────────────── 함수 핸들러 ─────────────────── */

type UnaryDualFn = (a: Dual) => DualOutcome;

const fSin: UnaryDualFn = (a) => ok(Math.sin(a.v), Math.cos(a.v) * a.d);
const fCos: UnaryDualFn = (a) => ok(Math.cos(a.v), -Math.sin(a.v) * a.d);
const fTan: UnaryDualFn = (a) => {
  const c = Math.cos(a.v);
  if (c === 0) return fail('divergent', { nodeType: 'func', reason: 'tan-pole' });
  return ok(Math.tan(a.v), a.d / (c * c));
};
const fCot: UnaryDualFn = (a) => {
  const s = Math.sin(a.v);
  if (s === 0) return fail('divergent', { nodeType: 'func', reason: 'cot-pole' });
  return ok(1 / Math.tan(a.v), -a.d / (s * s));
};
const fSec: UnaryDualFn = (a) => {
  const c = Math.cos(a.v);
  if (c === 0) return fail('divergent', { nodeType: 'func', reason: 'sec-pole' });
  return ok(1 / c, (Math.sin(a.v) / (c * c)) * a.d);
};
const fCsc: UnaryDualFn = (a) => {
  const s = Math.sin(a.v);
  if (s === 0) return fail('divergent', { nodeType: 'func', reason: 'csc-pole' });
  return ok(1 / s, -(Math.cos(a.v) / (s * s)) * a.d);
};

const fAsin: UnaryDualFn = (a) => {
  if (a.v < -1 || a.v > 1) return fail('domain', { nodeType: 'func', reason: 'asin-out-of-range' });
  if (a.v === -1 || a.v === 1) return fail('divergent', { nodeType: 'func', reason: 'asin-boundary-derivative' });
  return ok(Math.asin(a.v), a.d / Math.sqrt(1 - a.v * a.v));
};
const fAcos: UnaryDualFn = (a) => {
  if (a.v < -1 || a.v > 1) return fail('domain', { nodeType: 'func', reason: 'acos-out-of-range' });
  if (a.v === -1 || a.v === 1) return fail('divergent', { nodeType: 'func', reason: 'acos-boundary-derivative' });
  return ok(Math.acos(a.v), -a.d / Math.sqrt(1 - a.v * a.v));
};
const fAtan: UnaryDualFn = (a) => ok(Math.atan(a.v), a.d / (1 + a.v * a.v));
const fAcot: UnaryDualFn = (a) => ok(Math.atan(1 / a.v), -a.d / (1 + a.v * a.v));

const fSinh: UnaryDualFn = (a) => ok(Math.sinh(a.v), Math.cosh(a.v) * a.d);
const fCosh: UnaryDualFn = (a) => ok(Math.cosh(a.v), Math.sinh(a.v) * a.d);
const fTanh: UnaryDualFn = (a) => {
  const c = Math.cosh(a.v);
  return ok(Math.tanh(a.v), a.d / (c * c));
};

const fAsinh: UnaryDualFn = (a) => ok(Math.asinh(a.v), a.d / Math.sqrt(a.v * a.v + 1));
const fAcosh: UnaryDualFn = (a) => {
  if (a.v < 1) return fail('domain', { nodeType: 'func', reason: 'acosh-below-1' });
  if (a.v === 1) return fail('divergent', { nodeType: 'func', reason: 'acosh-boundary-derivative' });
  return ok(Math.acosh(a.v), a.d / Math.sqrt(a.v * a.v - 1));
};
const fAtanh: UnaryDualFn = (a) => {
  if (a.v <= -1 || a.v >= 1) return fail('domain', { nodeType: 'func', reason: 'atanh-out-of-range' });
  return ok(Math.atanh(a.v), a.d / (1 - a.v * a.v));
};

const fExp: UnaryDualFn = (a) => {
  const ev = Math.exp(a.v);
  return ok(ev, ev * a.d);
};
const fLn: UnaryDualFn = (a) => {
  if (a.v <= 0) return fail('domain', { nodeType: 'func', reason: 'ln-non-positive' });
  return ok(Math.log(a.v), a.d / a.v);
};
const fLog10: UnaryDualFn = (a) => {
  if (a.v <= 0) return fail('domain', { nodeType: 'func', reason: 'log-non-positive' });
  return ok(Math.log10(a.v), a.d / (a.v * Math.LN10));
};
const fLog2: UnaryDualFn = (a) => {
  if (a.v <= 0) return fail('domain', { nodeType: 'func', reason: 'lb-non-positive' });
  return ok(Math.log2(a.v), a.d / (a.v * Math.LN2));
};

const fSqrt: UnaryDualFn = (a) => {
  if (a.v < 0) return fail('domain', { nodeType: 'func', reason: 'sqrt-negative' });
  if (a.v === 0) return fail('divergent', { nodeType: 'func', reason: 'sqrt-derivative-infinite-at-zero' });
  const s = Math.sqrt(a.v);
  return ok(s, a.d / (2 * s));
};
const fAbs: UnaryDualFn = (a) => {
  if (a.v === 0 && a.d !== 0) return fail('domain', { nodeType: 'func', reason: 'abs-non-differentiable-at-zero' });
  if (a.v === 0) return ok(0, 0);
  return ok(Math.abs(a.v), Math.sign(a.v) * a.d);
};

const FUNCTIONS: Readonly<Record<string, UnaryDualFn>> = {
  sin: fSin,
  cos: fCos,
  tan: fTan,
  cot: fCot,
  sec: fSec,
  csc: fCsc,
  asin: fAsin,
  arcsin: fAsin,
  acos: fAcos,
  arccos: fAcos,
  atan: fAtan,
  arctan: fAtan,
  acot: fAcot,
  arccot: fAcot,
  sinh: fSinh,
  cosh: fCosh,
  tanh: fTanh,
  asinh: fAsinh,
  arcsinh: fAsinh,
  acosh: fAcosh,
  arccosh: fAcosh,
  atanh: fAtanh,
  arctanh: fAtanh,
  exp: fExp,
  ln: fLn,
  log: fLog10,
  lg: fLog10,
  lb: fLog2,
  sqrt: fSqrt,
  abs: fAbs,
};

/* ─────────────────── dispatch ─────────────────── */

function dispatch(node: MathNode, ctx: AutoCtx): DualOutcome {
  const out = dispatchInner(node, ctx);
  if (out.kind === 'value' && !isFiniteDual(out.dual)) {
    return fail('divergent', { nodeType: node.type, reason: 'non-finite-result' });
  }
  return out;
}

function dispatchInner(node: MathNode, ctx: AutoCtx): DualOutcome {
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
      return evalSqrt(node as SqrtNode, ctx);
    case 'abs':
      return evalAbs(node as AbsNode, ctx);
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

function evalNumber(node: MathNode): DualOutcome {
  const raw = (node as NumberNode).value;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) {
    return fail('domain', { nodeType: 'number', reason: `cannot parse "${raw}"` });
  }
  return ok(n, 0);
}

function evalVariable(node: MathNode, ctx: AutoCtx): DualOutcome {
  const raw = (node as VariableNode).name;
  const canonical = normalizeVarName(raw);
  const override = ctx.overrides[canonical] ?? ctx.overrides[raw];
  if (typeof override === 'number') {
    return ok(override, canonical === ctx.diffVar ? 1 : 0);
  }
  const direct = ctx.bindings[canonical];
  const v = typeof direct === 'number' ? direct : ctx.bindings[raw];
  if (typeof v !== 'number') {
    return fail('unbound', { variable: canonical });
  }
  return ok(v, canonical === ctx.diffVar ? 1 : 0);
}

function evalFrac(n: FracNode, ctx: AutoCtx): DualOutcome {
  if (n.variant === 'binom') {
    return fail('unsupported', { nodeType: 'frac', reason: 'binom' });
  }
  const num = evalSequence(n.numerator, ctx);
  if (num.kind === 'fail') return num;
  const den = evalSequence(n.denominator, ctx);
  if (den.kind === 'fail') return den;
  if (den.dual.v === 0) return fail('domain', { nodeType: 'frac', reason: 'division-by-zero' });
  return okDual(div(num.dual, den.dual));
}

function evalPower(n: PowerNode, ctx: AutoCtx): DualOutcome {
  const base = evalSequence(n.base, ctx);
  if (base.kind === 'fail') return base;
  const exp = evalSequence(n.exponent, ctx);
  if (exp.kind === 'fail') return exp;
  return powDual(base.dual, exp.dual);
}

function evalSqrt(n: SqrtNode, ctx: AutoCtx): DualOutcome {
  const content = evalSequence(n.content, ctx);
  if (content.kind === 'fail') return content;
  let degree: Dual = { v: 2, d: 0 };
  if (n.index && n.index.length > 0) {
    const idx = evalSequence(n.index, ctx);
    if (idx.kind === 'fail') return idx;
    if (idx.dual.v === 0) return fail('domain', { nodeType: 'sqrt', reason: 'zero-degree-root' });
    degree = idx.dual;
  }
  // x^(1/n) — 일반 power 로 환원
  const inv: Dual = {
    v: 1 / degree.v,
    d: -degree.d / (degree.v * degree.v),
  };
  // 짝수근 음수 가드 (홀수근은 powDual 의 음수-정수지수 분기로는 처리 불가하므로 직접 처리)
  if (content.dual.v < 0) {
    if (!Number.isInteger(degree.v) || degree.v % 2 === 0 || degree.d !== 0) {
      return fail('domain', { nodeType: 'sqrt', reason: 'even-root-of-negative' });
    }
    // 홀수근: f(x) = -|x|^(1/n). u = -content > 0 로 환원.
    const u = neg(content.dual);
    const r = powDual(u, inv);
    if (r.kind === 'fail') return r;
    return okDual(neg(r.dual));
  }
  return powDual(content.dual, inv);
}

function evalAbs(n: AbsNode, ctx: AutoCtx): DualOutcome {
  const inner = evalSequence(n.content, ctx);
  if (inner.kind === 'fail') return inner;
  return fAbs(inner.dual);
}

function evalFunc(n: FuncNode, ctx: AutoCtx): DualOutcome {
  const fn = FUNCTIONS[n.name];
  if (!fn) return fail('unsupported', { nodeType: 'func', reason: n.name });
  const arg = evalSequence(n.argument, ctx);
  if (arg.kind === 'fail') return arg;
  return fn(arg.dual);
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
        if (!prevWasOperand) {
          return { error: 'malformed-sequence', operator: op };
        }
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

function evalRPN(rpn: SeqToken[], ctx: AutoCtx): DualOutcome {
  const stack: Dual[] = [];
  for (const t of rpn) {
    if (t.kind === 'operand') {
      const out = dispatch(t.node, ctx);
      if (out.kind === 'fail') return out;
      stack.push(out.dual);
      continue;
    }
    if (t.kind === 'unaryMinus') {
      const x = stack.pop();
      if (x === undefined) return fail('unsupported', { nodeType: 'row', reason: 'malformed-sequence' });
      stack.push(neg(x));
      continue;
    }
    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) {
      return fail('unsupported', { nodeType: 'row', reason: 'malformed-sequence' });
    }
    switch (t.op) {
      case '+':
        stack.push(add(a, b));
        break;
      case '-':
        stack.push(sub(a, b));
        break;
      case '×':
      case '·':
        stack.push(mul(a, b));
        break;
      case '÷':
        if (b.v === 0) return fail('domain', { nodeType: 'operator', reason: 'division-by-zero' });
        stack.push(div(a, b));
        break;
    }
  }
  if (stack.length !== 1) return fail('unsupported', { nodeType: 'row', reason: 'malformed-sequence' });
  return okDual(stack[0]);
}

function evalSequence(children: MathNode[], ctx: AutoCtx): DualOutcome {
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

export function differentiateAt(
  node: MathNode,
  variable: string,
  bindings: Bindings = EMPTY_BINDINGS,
): number | undefined {
  try {
    const out = dispatch(node, makeCtx(bindings, normalizeVarName(variable)));
    if (out.kind === 'value' && Number.isFinite(out.dual.d)) return out.dual.d;
    return undefined;
  } catch {
    return undefined;
  }
}

export function differentiate(
  node: MathNode,
  variable: string,
  bindings: Bindings = EMPTY_BINDINGS,
): DiffResult {
  try {
    const out = dispatch(node, makeCtx(bindings, normalizeVarName(variable)));
    if (out.kind === 'value') {
      if (!Number.isFinite(out.dual.d)) {
        return { ok: false, status: 'divergent', detail: { reason: 'non-finite-derivative' } };
      }
      return { ok: true, derivative: out.dual.d };
    }
    return { ok: false, status: out.status, detail: out.detail };
  } catch {
    return { ok: false, status: 'divergent', detail: { reason: 'internal-error' } };
  }
}
