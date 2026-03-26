/**
 * Variable Classifier - 변수 분류기
 *
 * 수식에서 변수(x, y)와 계수/파라미터(a, b, c)를 구분
 * 복합 휴리스틱 기반 점수 계산
 */

import type { RootNode, MathNode, PowerNode, SubscriptNode } from '../types';
import type { VariableClassification, VariableScore } from './types';
import { findNodes } from './ast-walker';

/**
 * 일반적인 주 변수 이름 (높은 점수)
 * x, y, z는 전통적으로 미지수/변수로 사용
 */
const MAIN_VARIABLE_NAMES = new Set(['x', 'y', 'z', 't', 'u', 'v', 'w']);

/**
 * 일반적인 계수/파라미터 이름 (낮은 점수)
 * a, b, c, d는 전통적으로 계수/상수로 사용
 */
const COEFFICIENT_NAMES = new Set([
  'a',
  'b',
  'c',
  'd',
  'k',
  'm',
  'n',
  'p',
  'q',
  'r',
  's',
]);

/**
 * 그리스 문자 (보통 상수/파라미터)
 */
const GREEK_LETTERS = new Set([
  'alpha',
  'β',
  'beta',
  'γ',
  'gamma',
  'δ',
  'delta',
  'ε',
  'epsilon',
  'θ',
  'theta',
  'λ',
  'lambda',
  'μ',
  'mu',
  'σ',
  'sigma',
  'ω',
  'omega',
]);

/**
 * 변수 분류 수행
 *
 * @param ast - AST 루트 노드
 * @param variables - 수집된 변수 목록
 * @returns 변수 분류 결과
 */
export function classifyVariables(
  ast: RootNode,
  variables: string[]
): VariableClassification {
  // 변수가 없으면 빈 결과
  if (variables.length === 0) {
    return {
      mainVariables: [],
      coefficients: [],
      confidence: 1.0,
    };
  }

  // 변수가 하나뿐이면 주 변수로 간주
  if (variables.length === 1) {
    return {
      mainVariables: variables,
      coefficients: [],
      confidence: 1.0,
    };
  }

  // 각 변수에 대해 점수 계산
  const scores: VariableScore[] = variables.map((name) =>
    calculateVariableScore(ast, name, variables)
  );

  // 점수순 정렬 (높은 점수 = 주 변수)
  scores.sort((a, b) => b.score - a.score);

  // 점수 기반 분류
  const { mainVariables, coefficients, confidence } =
    separateByScore(scores);

  return {
    mainVariables,
    coefficients,
    confidence,
  };
}

/**
 * 변수 점수 계산 (복합 휴리스틱)
 */
function calculateVariableScore(
  ast: RootNode,
  variable: string,
  allVariables: string[]
): VariableScore {
  let score = 0;
  const reasons: string[] = [];

  // 1. 이름 기반 점수 (±30점)
  const nameScore = getNameBasedScore(variable);
  score += nameScore.score;
  if (nameScore.reason) {
    reasons.push(nameScore.reason);
  }

  // 2. 거듭제곱 base 출현 여부 (+40점)
  const powerScore = getPowerBaseScore(ast, variable);
  score += powerScore.score;
  if (powerScore.reason) {
    reasons.push(powerScore.reason);
  }

  // 3. 아래첨자 여부 (-30점)
  const subscriptScore = getSubscriptScore(ast, variable);
  score += subscriptScore.score;
  if (subscriptScore.reason) {
    reasons.push(subscriptScore.reason);
  }

  // 4. 출현 빈도 (0~20점)
  const frequencyScore = getFrequencyScore(ast, variable, allVariables);
  score += frequencyScore.score;
  if (frequencyScore.reason) {
    reasons.push(frequencyScore.reason);
  }

  // 5. 위치 기반 점수 (함수 인자 내부 등)
  const positionScore = getPositionScore(ast, variable);
  score += positionScore.score;
  if (positionScore.reason) {
    reasons.push(positionScore.reason);
  }

  return {
    name: variable,
    score,
    reasons,
  };
}

/**
 * 이름 기반 점수
 */
function getNameBasedScore(variable: string): {
  score: number;
  reason?: string;
} {
  // 단일 문자 확인
  if (variable.length === 1) {
    if (MAIN_VARIABLE_NAMES.has(variable)) {
      return { score: 30, reason: `'${variable}'는 일반적인 변수명` };
    }
    if (COEFFICIENT_NAMES.has(variable)) {
      return { score: -30, reason: `'${variable}'는 일반적인 계수명` };
    }
  }

  // 그리스 문자
  if (GREEK_LETTERS.has(variable.toLowerCase())) {
    return { score: -20, reason: `'${variable}'는 그리스 문자 (보통 파라미터)` };
  }

  // 숫자가 포함된 경우 (x1, x2 등) - 주 변수일 가능성
  if (/^[xyz]\d+$/.test(variable)) {
    return { score: 20, reason: `'${variable}'는 인덱스가 붙은 변수` };
  }

  // 기본값
  return { score: 0 };
}

/**
 * 거듭제곱 base 점수
 * x^2, y^3 등에서 base에 단독으로 있는 변수는 주 변수일 가능성 높음
 *
 * 주의: ax^2에서 a는 x와 함께 base에 있을 수 있으므로,
 * 변수가 base의 "핵심"인 경우에만 점수 부여
 */
function getPowerBaseScore(
  ast: RootNode,
  variable: string
): { score: number; reason?: string } {
  const powerNodes = findNodes<PowerNode>(ast, 'power');

  for (const power of powerNodes) {
    // base가 해당 변수만으로 구성되어 있는지 확인
    if (isVariableSoleBaseContent(power.base, variable)) {
      // 지수가 숫자인 경우 더 높은 점수
      const exponentIsNumber = power.exponent.some((n) => n.type === 'number');
      if (exponentIsNumber) {
        return { score: 40, reason: `거듭제곱의 밑 (${variable}^n 형태)` };
      }
      return { score: 30, reason: '거듭제곱의 밑' };
    }
  }

  return { score: 0 };
}

/**
 * 변수가 power base의 유일한 핵심 내용인지 확인
 * - [variable(x)] → true
 * - [row([variable(x)])] → true
 * - [variable(a), variable(x)] → false (a도 x도 단독이 아님)
 * - [paren([variable(x)])] → true
 */
function isVariableSoleBaseContent(base: MathNode[], variable: string): boolean {
  // base가 비어있으면 false
  if (base.length === 0) {
    return false;
  }

  // base에 요소가 하나만 있는 경우
  if (base.length === 1) {
    const node = base[0];

    // 직접 변수 노드인 경우
    if (node.type === 'variable' && node.name === variable) {
      return true;
    }

    // row나 paren으로 감싸진 경우 재귀 확인
    if (node.type === 'row') {
      return isVariableSoleBaseContent((node as { children: MathNode[] }).children, variable);
    }
    if (node.type === 'paren') {
      return isVariableSoleBaseContent((node as { content: MathNode[] }).content, variable);
    }
  }

  // base에 여러 요소가 있는 경우
  // 변수 노드들만 추출
  const variableNodes = base.filter((n) => n.type === 'variable');

  // 변수가 하나이고 그것이 target이면 true
  // (예: [variable(x), operator(*)] 같은 경우는 x가 유일한 변수)
  if (variableNodes.length === 1) {
    const varNode = variableNodes[0] as { name: string };
    if (varNode.name === variable) {
      // 단, 다른 의미있는 노드가 없어야 함 (숫자, 다른 구조 등)
      const hasOtherContent = base.some(
        (n) => n.type === 'number' ||
               n.type === 'frac' ||
               n.type === 'sqrt' ||
               n.type === 'func'
      );
      if (!hasOtherContent) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 아래첨자 점수
 * a_1, b_n 등 아래첨자가 있는 변수는 계수/파라미터일 가능성
 */
function getSubscriptScore(
  ast: RootNode,
  variable: string
): { score: number; reason?: string } {
  const subscriptNodes = findNodes<SubscriptNode>(ast, 'subscript');

  for (const sub of subscriptNodes) {
    // base에 해당 변수가 단독으로 있는지 확인
    if (
      sub.base.length === 1 &&
      sub.base[0].type === 'variable' &&
      sub.base[0].name === variable
    ) {
      return { score: -30, reason: '아래첨자가 있음 (계수/시퀀스)' };
    }
  }

  return { score: 0 };
}

/**
 * 출현 빈도 점수
 * 자주 등장하는 변수가 주 변수일 가능성 높음
 */
function getFrequencyScore(
  ast: RootNode,
  variable: string,
  allVariables: string[]
): { score: number; reason?: string } {
  const frequency = countVariableOccurrences(ast, variable);
  const maxFrequency = Math.max(
    ...allVariables.map((v) => countVariableOccurrences(ast, v))
  );

  if (maxFrequency === 0) {
    return { score: 0 };
  }

  // 최빈 변수에 가까울수록 높은 점수 (0~20)
  const ratio = frequency / maxFrequency;
  const score = Math.round(ratio * 20);

  if (ratio >= 0.8) {
    return { score, reason: `가장 자주 등장 (${frequency}회)` };
  }
  if (ratio >= 0.5) {
    return { score, reason: `자주 등장 (${frequency}회)` };
  }

  return { score };
}

/**
 * 위치 기반 점수
 * 함수 인자 내부의 변수는 주 변수일 가능성 높음
 * 단, 계수명(a, b, c, ...)은 함수 인자 안에 있어도 점수를 주지 않음
 */
function getPositionScore(
  ast: RootNode,
  variable: string
): { score: number; reason?: string } {
  // 계수명은 함수 인자 안에 있어도 점수를 주지 않음
  if (variable.length === 1 && COEFFICIENT_NAMES.has(variable)) {
    return { score: 0 };
  }

  // 함수 인자 내부 확인
  const funcNodes = findNodes(ast, 'func');

  for (const func of funcNodes) {
    const funcNode = func as { argument: MathNode[] };
    if (containsVariable(funcNode.argument, variable)) {
      return { score: 15, reason: '함수의 인자로 사용됨' };
    }
  }

  return { score: 0 };
}

/**
 * 변수 출현 횟수 계산
 */
function countVariableOccurrences(ast: RootNode, variable: string): number {
  let count = 0;

  function traverse(nodes: MathNode[]): void {
    for (const node of nodes) {
      if (node.type === 'variable' && node.name === variable) {
        count++;
      }
      // 자식 노드 순회
      const children = getNodeChildren(node);
      if (children.length > 0) {
        traverse(children);
      }
    }
  }

  traverse(ast.children);
  return count;
}

/**
 * 노드 배열에 특정 변수가 포함되어 있는지 확인
 */
function containsVariable(nodes: MathNode[], variable: string): boolean {
  for (const node of nodes) {
    if (node.type === 'variable' && node.name === variable) {
      return true;
    }
    const children = getNodeChildren(node);
    if (children.length > 0 && containsVariable(children, variable)) {
      return true;
    }
  }
  return false;
}

/**
 * 노드의 자식 노드 반환
 */
function getNodeChildren(node: MathNode): MathNode[] {
  switch (node.type) {
    case 'root':
    case 'row':
      return (node as { children: MathNode[] }).children;
    case 'frac':
      return [
        ...(node as { numerator: MathNode[] }).numerator,
        ...(node as { denominator: MathNode[] }).denominator,
      ];
    case 'power':
      return [
        ...(node as { base: MathNode[] }).base,
        ...(node as { exponent: MathNode[] }).exponent,
      ];
    case 'subscript':
      return [
        ...(node as { base: MathNode[] }).base,
        ...(node as { subscript: MathNode[] }).subscript,
      ];
    case 'sqrt': {
      const sqrt = node as { content: MathNode[]; index?: MathNode[] };
      return [...sqrt.content, ...(sqrt.index || [])];
    }
    case 'paren':
    case 'abs':
    case 'overline':
      return (node as { content: MathNode[] }).content;
    case 'func':
      return (node as { argument: MathNode[] }).argument;
    default:
      return [];
  }
}

/**
 * 점수 기반 변수 분류
 */
function separateByScore(scores: VariableScore[]): {
  mainVariables: string[];
  coefficients: string[];
  confidence: number;
} {
  // 점수 차이 기반 분류
  const mainVariables: string[] = [];
  const coefficients: string[] = [];

  // 임계값: 0 이상이면 주 변수, 0 미만이면 계수
  // 단, 최고 점수 변수는 항상 주 변수로 포함
  const topScore = scores[0]?.score ?? 0;

  for (const { name, score } of scores) {
    // 최고 점수 변수이거나 점수가 양수면 주 변수
    if (score === topScore || score > 0) {
      mainVariables.push(name);
    } else {
      coefficients.push(name);
    }
  }

  // 신뢰도 계산: 점수 분산이 클수록 높은 신뢰도
  const confidence = calculateConfidence(scores);

  return {
    mainVariables,
    coefficients,
    confidence,
  };
}

/**
 * 분류 신뢰도 계산
 */
function calculateConfidence(scores: VariableScore[]): number {
  if (scores.length <= 1) {
    return 1.0;
  }

  // 최고점과 최저점 차이 기반
  const maxScore = scores[0].score;
  const minScore = scores[scores.length - 1].score;
  const range = maxScore - minScore;

  // 범위가 50 이상이면 높은 신뢰도
  if (range >= 50) {
    return 0.95;
  }
  if (range >= 30) {
    return 0.8;
  }
  if (range >= 15) {
    return 0.6;
  }

  // 점수 차이가 작으면 낮은 신뢰도
  return 0.4;
}
