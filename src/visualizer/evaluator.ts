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
 * 방정식 AST를 평가하여 "좌변 변수의 값"을 반환한다.
 *
 * `=` 기준으로 LHS/RHS를 분할:
 *   - RHS 를 evaluateAst 로 평가
 *   - LHS 패턴을 분석해 RHS 값을 좌변 변수의 값으로 풀어낸다 (analyzeLhsInversion)
 *     - 단일 variable (`T = ...`)        → identity (RHS 그대로)
 *     - power(variable, n) (`T^n = ...`) → RHS^(1/n)
 *     - 그 외 패턴 (다항식 등)           → RHS 그대로 (풀이 불가)
 * 등호가 없으면 전체를 평가한다.
 *
 * 발견적 학습: 좌변 number 노드 변경(예: T² → T³)이 ctx.equationValue 에 반영되어
 * derivedValue.compute 가 자동으로 cbrt(rhs) 결과를 받게 된다.
 *
 * @returns rhsValue — **이름은 후방 호환을 위해 유지하나 의미는 "좌변 변수의 풀린 값".**
 *                     LHS 패턴이 풀이 불가일 때만 순수 RHS 값.
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

  if (eqIdx < 0) {
    // 등호 없음 — 전체 평가 (기존 동작 유지)
    const r = evaluateAst(children, params);
    return { rhsValue: r.result, nodeValues: r.nodeValues };
  }

  const lhsNodes = children.slice(0, eqIdx);
  const rhsNodes = children.slice(eqIdx + 1);

  const rhsResult = evaluateAst(rhsNodes, params);
  const invert = analyzeLhsInversion(lhsNodes, params);
  const equationValue = invert ? invert(rhsResult.result) : rhsResult.result;

  return { rhsValue: equationValue, nodeValues: rhsResult.nodeValues };
}

/**
 * LHS 노드 배열을 분석하여 RHS 값을 좌변 변수 값으로 풀어내는 함수를 반환.
 *
 * 발견적 학습: 좌변의 number 노드 변경(예: T²의 2 → 3)이 derived 결과에 반영되도록
 * 양변을 모두 고려해 평가한다.
 *
 * 지원 패턴:
 *   - 단일 `variable` 노드          → identity
 *   - `power` 노드 (단일 변수 base) → rhs^(1/exponent)
 *   - 그 외 (다항식, frac 등)       → null (호출자가 RHS 그대로 사용)
 */
function analyzeLhsInversion(
  lhsNodes: MathNode[],
  params: ParameterValues,
): ((rhsValue: number) => number) | null {
  // 공백/텍스트 노드 제거 — 실제 의미 있는 노드만 남긴다
  const meaningful = lhsNodes.filter((n) => n.type !== 'space' && n.type !== 'text');
  if (meaningful.length !== 1) return null;
  const node = meaningful[0];

  // case 1: 단일 변수 — invert 없음 (T = RHS)
  if (node.type === 'variable') {
    return (rhs) => rhs;
  }

  // case 2: 변수의 거듭제곱 — T^n = RHS → T = RHS^(1/n)
  if (node.type === 'power') {
    const base = node.base.filter((n) => n.type !== 'space' && n.type !== 'text');
    if (base.length !== 1 || base[0].type !== 'variable') return null;

    const exponent = evaluateAst(node.exponent, params).result;
    if (!Number.isFinite(exponent) || exponent === 0) return null;

    const inv = 1 / exponent;
    return (rhs) => Math.pow(rhs, inv);
  }

  return null;
}

function normalizeOp(op: string): string {
  switch (op) {
    case '\\cdot': case '\\times': case '×': return '*';
    case '\\div': case '÷': return '/';
    case '−': return '-';
    default: return op;
  }
}
