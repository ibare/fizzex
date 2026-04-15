/**
 * AST 수치 평가 엔진
 *
 * AST를 직접 순회하며 파라미터 값을 넣어 각 노드의 중간값을 계산한다.
 * Explorer의 값 흐름 표시와 파생값 계산에 사용된다.
 */

import type { MathNode, RootNode } from '../types';
import type { ParameterValues } from './types';

/** 수치 평가 결과 */
export interface EvaluationResult {
  /** 각 노드 ID → 계산된 값 */
  nodeValues: Map<string, number>;
  /** 최종 결과 (루트 노드의 값) */
  result: number;
}

/** 잘 알려진 수학 상수 */
const KNOWN_CONSTANTS: Record<string, number> = {
  'π': Math.PI,
  'pi': Math.PI,
  'e': Math.E,
  'i': NaN, // 허수 — 실수 평가 불가
};

/** 잘 알려진 함수 */
const KNOWN_FUNCTIONS: Record<string, (x: number) => number> = {
  'sin': Math.sin,
  'cos': Math.cos,
  'tan': Math.tan,
  'arcsin': Math.asin,
  'arccos': Math.acos,
  'arctan': Math.atan,
  'ln': Math.log,
  'log': Math.log10,
  'exp': Math.exp,
  'sqrt': Math.sqrt,
  'abs': Math.abs,
  'floor': Math.floor,
  'ceil': Math.ceil,
};

/**
 * AST의 각 노드에 대해 수치 평가를 수행한다.
 *
 * @param nodes - 루트 노드의 children (또는 임의 노드 배열)
 * @param params - 파라미터 값 (예: { x: 2, a: 3 })
 */
export function evaluateAst(nodes: MathNode[], params: ParameterValues): EvaluationResult {
  const nodeValues = new Map<string, number>();

  function evalNode(node: MathNode): number {
    let result: number;

    switch (node.type) {
      case 'number':
        result = parseFloat(node.value);
        break;

      case 'variable':
        if (node.name in params) {
          result = params[node.name];
        } else if (node.name in KNOWN_CONSTANTS) {
          result = KNOWN_CONSTANTS[node.name];
        } else {
          result = NaN;
        }
        break;

      case 'frac': {
        const num = evalNodes(node.numerator);
        const den = evalNodes(node.denominator);
        result = num / den;
        break;
      }

      case 'power': {
        const base = evalNodes(node.base);
        const exp = evalNodes(node.exponent);
        result = Math.pow(base, exp);
        break;
      }

      case 'sqrt': {
        const content = evalNodes(node.content);
        if (node.index && node.index.length > 0) {
          const idx = evalNodes(node.index);
          result = Math.pow(content, 1 / idx);
        } else {
          result = Math.sqrt(content);
        }
        break;
      }

      case 'func': {
        const fn = KNOWN_FUNCTIONS[node.name];
        const arg = evalNodes(node.argument);
        result = fn ? fn(arg) : NaN;
        break;
      }

      case 'paren':
        result = evalNodes(node.content);
        break;

      case 'abs':
        result = Math.abs(evalNodes(node.content));
        break;

      case 'operator':
        // 연산자 노드 자체는 값이 없음 — row에서 중위 처리
        result = NaN;
        break;

      case 'root':
        result = evalNodes(node.children);
        break;

      case 'row':
        result = evalRow(node.children);
        break;

      default:
        result = NaN;
    }

    nodeValues.set(node.id, result);
    return result;
  }

  /** 노드 배열을 row처럼 중위 평가 */
  function evalNodes(nodes: MathNode[]): number {
    if (nodes.length === 0) return 0;
    if (nodes.length === 1) return evalNode(nodes[0]);
    return evalRow(nodes);
  }

  /** 중위 연산자 기반 행 평가: 곱셈(juxtaposition) → 덧셈/뺄셈 */
  function evalRow(children: MathNode[]): number {
    // 1단계: 토큰화 — 값과 연산자 분리
    const tokens: Array<{ type: 'value'; val: number } | { type: 'op'; op: string }> = [];

    for (const child of children) {
      if (child.type === 'operator') {
        tokens.push({ type: 'op', op: normalizeOp(child.operator) });
      } else {
        tokens.push({ type: 'value', val: evalNode(child) });
      }
    }

    // 2단계: 인접한 value 사이에 암묵적 곱셈 삽입
    const expanded: typeof tokens = [];
    for (let i = 0; i < tokens.length; i++) {
      if (i > 0 && tokens[i].type === 'value' && tokens[i - 1].type === 'value') {
        expanded.push({ type: 'op', op: '*' });
      }
      expanded.push(tokens[i]);
    }

    // 3단계: 곱셈/나눗셈 먼저
    const addTerms: Array<{ type: 'value'; val: number } | { type: 'op'; op: string }> = [];
    let acc: number | null = null;

    for (const tok of expanded) {
      if (tok.type === 'value') {
        if (acc === null) {
          acc = tok.val;
        } else {
          // 이전 연산자가 없으면 곱셈
          acc *= tok.val;
        }
      } else if (tok.type === 'op') {
        if (tok.op === '*' || tok.op === '×') {
          // 다음 값과 곱
          continue; // acc에 다음 value가 곱해질 것
        } else if (tok.op === '/' || tok.op === '÷') {
          // 다음 값으로 나눔
          const nextIdx = expanded.indexOf(tok) + 1;
          if (nextIdx < expanded.length && expanded[nextIdx].type === 'value') {
            acc = (acc ?? 0) / (expanded[nextIdx] as { val: number }).val;
            (expanded[nextIdx] as { type: string }).type = 'consumed' as 'value';
          }
        } else {
          // +, - 연산자 → 이전 항 저장
          if (acc !== null) addTerms.push({ type: 'value', val: acc });
          addTerms.push(tok);
          acc = null;
        }
      }
    }
    if (acc !== null) addTerms.push({ type: 'value', val: acc });

    // 4단계: 덧셈/뺄셈
    let result = 0;
    let sign = 1;
    for (const tok of addTerms) {
      if (tok.type === 'value') {
        result += sign * tok.val;
        sign = 1;
      } else if (tok.type === 'op') {
        if (tok.op === '-' || tok.op === '−') sign = -1;
        else sign = 1;
      }
    }

    return result;
  }

  const finalResult = evalNodes(nodes);
  return { nodeValues, result: finalResult };
}

/**
 * 방정식 AST의 우변을 평가한다.
 *
 * `=` 연산자를 기준으로 LHS/RHS를 분할하고, RHS를 evaluateAst로 평가한다.
 * 등호가 없으면 전체를 평가한다.
 */
export function evaluateEquation(
  ast: RootNode,
  params: ParameterValues,
): { rhsValue: number; nodeValues: Map<string, number> } {
  const children = ast.children;

  // = 연산자 위치 탐색
  const eqIdx = children.findIndex(
    (c) => c.type === 'operator' && (c.operator === '=' || c.operator === '\\eq'),
  );

  const targetNodes = eqIdx >= 0 ? children.slice(eqIdx + 1) : children;
  const result = evaluateAst(targetNodes, params);

  return { rhsValue: result.result, nodeValues: result.nodeValues };
}

function normalizeOp(op: string): string {
  switch (op) {
    case '\\cdot': case '\\times': case '×': return '*';
    case '\\div': case '÷': return '/';
    case '−': return '-';
    default: return op;
  }
}
