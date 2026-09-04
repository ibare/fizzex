/**
 * 자식 시퀀스 토큰화 + 우선순위 파싱 (shunting-yard).
 *
 * `root`/`row` 의 children 은 평평한 배열이다 —
 * `a^2 + b^2 = c^2` 는 `[power, '+', power, '=', power]` 이고 중위 연산자에
 * 트리 구조가 없다. 여기서 암묵적 곱을 삽입하고 우선순위를 적용해 RPN 으로
 * 바꾼다.
 *
 * 이 모듈은 `../types.js` 만 import 하는 leaf 다. evaluator registry 나
 * 핸들러 설치 부수효과를 갖지 않으므로 analyzer 도 안전하게 쓸 수 있다
 * (파이프라인 단계 독립).
 */

import type { MathNode, OperatorNode, FuncNode } from '../types.js';

export type BinaryOp = '+' | '-' | '×' | '÷' | '·';

/**
 * 관계 연산자 — 시퀀스를 좌변/우변으로 가르는 최저 우선순위 토큰.
 *
 * `ast-walker` 의 `hasEquality`/`hasInequality` 어휘에 `⩽`/`⩾` 를 더한 집합이다.
 * `\leqslant`/`\geqslant` 는 `≤`/`≥` 가 아닌 별도 코드포인트로 산출되는데
 * (`latex/commands/operators.ts`), 의미상 같은 관계이므로 함께 받는다.
 */
export const REL_OPS = ['=', '<', '>', '≤', '≥', '≠', '⩽', '⩾'] as const;

export type RelOp = (typeof REL_OPS)[number];

const REL_OP_SET: ReadonlySet<string> = new Set(REL_OPS);

export type SeqToken =
  | { kind: 'operand'; node: MathNode }
  | { kind: 'binop'; op: BinaryOp; prec: number }
  | { kind: 'rel'; op: RelOp; prec: number }
  | { kind: 'unaryMinus' };

export interface TokenizeError {
  error: 'malformed-sequence' | 'unsupported-operator';
  operator?: string;
}

export const PREC: Record<BinaryOp, number> = {
  '+': 1,
  '-': 1,
  '×': 2,
  '·': 2,
  '÷': 2,
};

export const UNARY_PREC = 3;

/** 관계 연산자는 모든 산술 연산자보다 느슨하게 묶인다. */
export const REL_PREC = 0;

export function tokenizeSequence(children: MathNode[]): SeqToken[] | TokenizeError {
  const tokens: SeqToken[] = [];
  let prevWasOperand = false;
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    // `\operatorname{name}` 등은 parser 에서 FuncNode(argument=[]) 로 산출되고
    // 인자 paren 은 별개 자식으로 따라온다. 여기서 합성한다.
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
      if (REL_OP_SET.has(op)) {
        tokens.push({ kind: 'rel', op: op as RelOp, prec: REL_PREC });
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

export function toRPN(tokens: SeqToken[]): SeqToken[] {
  const output: SeqToken[] = [];
  const stack: SeqToken[] = [];
  const precOf = (t: SeqToken): number => {
    if (t.kind === 'unaryMinus') return UNARY_PREC;
    if (t.kind === 'binop' || t.kind === 'rel') return t.prec;
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
    // binop / rel: 좌결합
    while (stack.length > 0 && precOf(stack[stack.length - 1]) >= t.prec) {
      output.push(stack.pop()!);
    }
    stack.push(t);
  }
  while (stack.length > 0) output.push(stack.pop()!);
  return output;
}
