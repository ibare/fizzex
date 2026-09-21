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

import type { MathNode, OperatorNode, FuncNode, MathOpNode, ScriptsNode } from '../types.js';

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

/**
 * 극값·한계 연산자와 그 피연산자를 묶은 토큰.
 *
 * `\max` 는 자식을 갖지 않고 피연산자가 형제로 온다 — `\max f(x)` 의 `f(x)` 는
 * AST 상 `\max` 의 아래가 아니라 옆이다. 그래서 결합은 이 단계에서만 가능하다.
 * 우선순위 계산에서는 하나의 피연산자처럼 다룬다.
 */
export interface MathOpToken {
  kind: 'mathop';
  name: string;
  lower?: MathNode[];
  upper?: MathNode[];
  operand: MathNode[];
}

export type SeqToken =
  | { kind: 'operand'; node: MathNode }
  | MathOpToken
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

/** mathop 과 그 limits 를 꺼낸다 — 맨 노드이거나 scripts 의 base 인 두 형태를 받는다 */
function readMathOp(
  node: MathNode
): { name: string; lower?: MathNode[]; upper?: MathNode[] } | null {
  if (node.type === 'mathop') {
    return { name: (node as MathOpNode).name };
  }
  if (node.type === 'scripts') {
    const n = node as ScriptsNode;
    // 좌첨자가 붙은 것은 limits 로 볼 수 없다 — 조판이 일반 첨자로 보내는 것과 같은 기준이다.
    if (n.leftSuperscript || n.leftSubscript) return null;
    if (n.base.length !== 1 || n.base[0].type !== 'mathop') return null;
    return {
      name: (n.base[0] as MathOpNode).name,
      ...(n.subscript ? { lower: n.subscript } : {}),
      ...(n.superscript ? { upper: n.superscript } : {}),
    };
  }
  return null;
}

/**
 * 피연산자를 어디까지 끌어올지 가르는 경계.
 *
 * 덧셈·뺄셈과 관계 연산자에서 끊고, 곱셈 계열은 안으로 넣는다 — `\sum` 을 읽는
 * 관례와 같다. `\max a + b` 는 `(\max a) + b` 지만 `\max a \cdot b` 는
 * `\max(a \cdot b)` 다.
 */
function isOperandBoundary(node: MathNode): boolean {
  if (node.type !== 'operator') return false;
  const op = (node as OperatorNode).operator;
  return op === '+' || op === '-' || REL_OP_SET.has(op);
}

export function tokenizeSequence(children: MathNode[]): SeqToken[] | TokenizeError {
  const tokens: SeqToken[] = [];
  let prevWasOperand = false;
  for (let i = 0; i < children.length; i++) {
    const c = children[i];

    // 극값·한계 연산자: 뒤따르는 피연산자를 다음 연산자 앞까지 모아 하나로 묶는다.
    const op = readMathOp(c);
    if (op) {
      const operand: MathNode[] = [];
      let j = i + 1;
      while (j < children.length && !isOperandBoundary(children[j])) {
        operand.push(children[j]);
        j++;
      }
      if (prevWasOperand) {
        tokens.push({ kind: 'binop', op: '×', prec: PREC['×'] });
      }
      tokens.push({ kind: 'mathop', name: op.name, ...(op.lower ? { lower: op.lower } : {}), ...(op.upper ? { upper: op.upper } : {}), operand });
      prevWasOperand = true;
      i = j - 1;
      continue;
    }

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
    if (t.kind === 'operand' || t.kind === 'mathop') {
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
