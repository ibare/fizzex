/**
 * E1 산수 평가자
 *
 * 다중 자식 row/root 시퀀스 (shunting-yard) + 단일 노드 핸들러:
 * frac, power, sqrt, paren, abs.
 *
 * 도메인 정책:
 *   0 나눔                            → domain
 *   음수 밑 + 비정수 지수               → domain
 *   0^(≤0)                           → domain
 *   짝수근의 음수                      → domain (홀수근은 정상 -∛|x|)
 *
 * 시퀀스 처리:
 *   - 토큰화: 피연산자 / 이항 연산자 / 단항 마이너스
 *   - 인접 피연산자 사이에 암묵적 곱(×) 삽입
 *   - shunting-yard 로 RPN 변환, 평가
 *   - 미지원 OperatorNode (=, <, > 등) 는 unsupported 로 정직 신호
 */
import type {
  MathNode,
  OperatorNode,
  FracNode,
  PowerNode,
  SqrtNode,
  ParenNode,
  AbsNode,
  FuncNode,
} from '../types.js';
import { register } from './registry.js';
import { setSequenceEvaluator } from './core.js';
import { value, fail, type EvalContext, type EvalOutcome } from './types.js';

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
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    // `\operatorname{name}` 등은 parser 에서 FuncNode(argument=[]) 로 산출되고
    // 인자 paren 은 별개 자식으로 따라온다. 평가 시점에 합성한다.
    if (c.type === 'func' && (c as FuncNode).argument.length === 0) {
      const next = children[i + 1];
      if (next && next.type === 'paren') {
        const synthesized: FuncNode = { ...(c as FuncNode), argument: [next] };
        if (prevWasOperand) {
          tokens.push({ kind: 'binop', op: '×', prec: PREC['×'] });
        }
        tokens.push({ kind: 'operand', node: synthesized });
        prevWasOperand = true;
        i += 1; // paren 자식 소비
        continue;
      }
    }
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
      // 우결합: 다른 unary 와 동등 prec 일 때 pop 하지 않고 그냥 push
      stack.push(t);
      continue;
    }
    // binop: 좌결합
    while (stack.length > 0 && precOf(stack[stack.length - 1]) >= t.prec) {
      output.push(stack.pop()!);
    }
    stack.push(t);
  }
  while (stack.length > 0) output.push(stack.pop()!);
  return output;
}

function evalRPN(rpn: SeqToken[], ctx: EvalContext): EvalOutcome {
  const stack: number[] = [];
  for (const t of rpn) {
    if (t.kind === 'operand') {
      const out = ctx.evaluate(t.node);
      if (out.kind === 'fail') return out;
      stack.push(out.value);
      continue;
    }
    if (t.kind === 'unaryMinus') {
      const x = stack.pop();
      if (x === undefined) return fail('unsupported', { nodeType: 'row', reason: 'malformed-sequence' });
      stack.push(-x);
      continue;
    }
    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) {
      return fail('unsupported', { nodeType: 'row', reason: 'malformed-sequence' });
    }
    switch (t.op) {
      case '+':
        stack.push(a + b);
        break;
      case '-':
        stack.push(a - b);
        break;
      case '×':
      case '·':
        stack.push(a * b);
        break;
      case '÷':
        if (b === 0) return fail('domain', { nodeType: 'operator', reason: 'division-by-zero' });
        stack.push(a / b);
        break;
    }
  }
  if (stack.length !== 1) return fail('unsupported', { nodeType: 'row', reason: 'malformed-sequence' });
  return value(stack[0]);
}

function evalSequence(children: MathNode[], ctx: EvalContext): EvalOutcome {
  const tokens = tokenize(children);
  if (!Array.isArray(tokens)) {
    if (tokens.error === 'unsupported-operator') {
      return fail('unsupported', { nodeType: 'operator', reason: tokens.operator });
    }
    return fail('unsupported', { nodeType: 'row', reason: tokens.error });
  }
  if (tokens.length === 0) {
    return fail('unsupported', { nodeType: 'row', reason: 'empty-sequence' });
  }
  return evalRPN(toRPN(tokens), ctx);
}

/** 자식 시퀀스 평가 — 단일 자식은 dispatch, 다중은 shunting-yard. */
export function evalChildSequence(children: MathNode[], ctx: EvalContext): EvalOutcome {
  if (children.length === 0) return fail('unsupported', { nodeType: 'row', reason: 'empty-sequence' });
  if (children.length === 1) return ctx.evaluate(children[0]);
  return evalSequence(children, ctx);
}

function evalFrac(node: MathNode, ctx: EvalContext): EvalOutcome {
  const n = node as FracNode;
  if (n.variant === 'binom') {
    return fail('unsupported', { nodeType: 'frac', reason: 'binom' });
  }
  const num = evalChildSequence(n.numerator, ctx);
  if (num.kind === 'fail') return num;
  const den = evalChildSequence(n.denominator, ctx);
  if (den.kind === 'fail') return den;
  if (den.value === 0) return fail('domain', { nodeType: 'frac', reason: 'division-by-zero' });
  return value(num.value / den.value);
}

function evalPower(node: MathNode, ctx: EvalContext): EvalOutcome {
  const n = node as PowerNode;
  const base = evalChildSequence(n.base, ctx);
  if (base.kind === 'fail') return base;
  const exp = evalChildSequence(n.exponent, ctx);
  if (exp.kind === 'fail') return exp;
  if (base.value === 0 && exp.value <= 0) {
    return fail('domain', { nodeType: 'power', reason: 'zero-base-non-positive-exp' });
  }
  if (base.value < 0 && !Number.isInteger(exp.value)) {
    return fail('domain', { nodeType: 'power', reason: 'negative-base-fractional-exp' });
  }
  return value(Math.pow(base.value, exp.value));
}

function evalSqrt(node: MathNode, ctx: EvalContext): EvalOutcome {
  const n = node as SqrtNode;
  const content = evalChildSequence(n.content, ctx);
  if (content.kind === 'fail') return content;
  let degree = 2;
  if (n.index && n.index.length > 0) {
    const idx = evalChildSequence(n.index, ctx);
    if (idx.kind === 'fail') return idx;
    if (idx.value === 0) return fail('domain', { nodeType: 'sqrt', reason: 'zero-degree-root' });
    degree = idx.value;
  }
  if (content.value < 0) {
    if (!Number.isInteger(degree) || degree % 2 === 0) {
      return fail('domain', { nodeType: 'sqrt', reason: 'even-root-of-negative' });
    }
    return value(-Math.pow(-content.value, 1 / degree));
  }
  return value(Math.pow(content.value, 1 / degree));
}

function evalParen(node: MathNode, ctx: EvalContext): EvalOutcome {
  return evalChildSequence((node as ParenNode).content, ctx);
}

function evalAbs(node: MathNode, ctx: EvalContext): EvalOutcome {
  const inner = evalChildSequence((node as AbsNode).content, ctx);
  if (inner.kind === 'fail') return inner;
  return value(Math.abs(inner.value));
}

function evalOperator(node: MathNode): EvalOutcome {
  return fail('unsupported', {
    nodeType: 'operator',
    reason: `bare-operator:${(node as OperatorNode).operator}`,
  });
}

let installed = false;

export function installArithmeticHandlers(): void {
  if (installed) return;
  installed = true;
  setSequenceEvaluator(evalSequence);
  register('frac', evalFrac);
  register('power', evalPower);
  register('sqrt', evalSqrt);
  register('paren', evalParen);
  register('abs', evalAbs);
  register('operator', evalOperator);
}
