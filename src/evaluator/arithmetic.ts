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
 *   - 토큰화·우선순위 파싱은 ./sequence.ts 가 담당 (analyzer 와 공유)
 *   - RPN 을 수치로 폴드
 *   - 관계 연산자 (=, <, > 등) 는 평가 이전에 unsupported 로 정직 신호
 */
import type {
  MathNode,
  OperatorNode,
  FracNode,
  PowerNode,
  SqrtNode,
  ParenNode,
  AbsNode,
} from '../types.js';
import { register } from './registry.js';
import {
  type SeqToken,
  tokenizeSequence,
  toRPN,
} from './sequence.js';
import { setSequenceEvaluator } from './core.js';
import { value, fail, type EvalContext, type EvalOutcome } from './types.js';

function evalRPN(rpn: SeqToken[], ctx: EvalContext): EvalOutcome {
  const stack: number[] = [];
  for (const t of rpn) {
    if (t.kind === 'rel') {
      return fail('unsupported', { nodeType: 'operator', reason: t.op });
    }
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
  const tokens = tokenizeSequence(children);
  if (!Array.isArray(tokens)) {
    if (tokens.error === 'unsupported-operator') {
      return fail('unsupported', { nodeType: 'operator', reason: tokens.operator });
    }
    return fail('unsupported', { nodeType: 'row', reason: tokens.error });
  }
  if (tokens.length === 0) {
    return fail('unsupported', { nodeType: 'row', reason: 'empty-sequence' });
  }
  // 관계 연산자는 산수 평가 대상이 아니다. 피연산자 평가보다 먼저 거부해야
  // detail.nodeType 이 'operator' 로 보존된다.
  const rel = tokens.find((t) => t.kind === 'rel');
  if (rel && rel.kind === 'rel') {
    return fail('unsupported', { nodeType: 'operator', reason: rel.op });
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
