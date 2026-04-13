/**
 * Polynomial Analyzer - 다항식 분석
 *
 * 다항식의 차수, 주 변수 등을 분석
 */

import type { RootNode, MathNode, PowerNode, VariableNode } from '../types';
import type { PolynomialInfo, ASTCollectionResult } from './types';
import { findNodes } from './ast-walker';

/** 디버그 로깅 플래그 (window 전역 의존 없이 모듈 레벨로 관리) */
let debugEnabled = false;

/** 다항식 분석 디버그 로깅 활성화/비활성화 */
export function setDebugAnalyzer(enabled: boolean): void {
  debugEnabled = enabled;
}

/**
 * 다항식 정보 분석
 *
 * @param ast - 분석할 AST
 * @param collected - AST 수집 결과
 * @returns 다항식 정보 (다항식이 아니면 undefined)
 */
export function analyzePolynomial(
  ast: RootNode,
  collected: ASTCollectionResult
): PolynomialInfo | undefined {
  const variables = Array.from(collected.variables);

  // 변수가 없으면 다항식이 아님 (상수)
  if (variables.length === 0) {
    return undefined;
  }

  // 각 변수별 최고차수 계산
  const degrees = new Map<string, number>();
  for (const variable of variables) {
    degrees.set(variable, findMaxDegree(ast, variable));
  }

  // 전체 최고차수와 주 변수 결정
  let maxDegree = 0;
  let mainVariable = variables[0];

  for (const [variable, degree] of degrees) {
    if (degree > maxDegree) {
      maxDegree = degree;
      mainVariable = variable;
    }
  }

  // 차수가 0이면 상수
  if (maxDegree === 0) {
    return undefined;
  }

  return {
    degree: maxDegree,
    mainVariable,
    variables,
    leadingCoefficients: Object.fromEntries(degrees),
  };
}

/**
 * 특정 변수의 최고차수 찾기
 */
function findMaxDegree(ast: RootNode, targetVariable: string): number {
  let maxDegree = 0;

  // 모든 power 노드 검사
  const powerNodes = findNodes<PowerNode>(ast, 'power');

  // DEBUG: 발견된 PowerNode 수 로깅
  if (debugEnabled) {
    console.log(`[Analyzer] Finding degree for '${targetVariable}', found ${powerNodes.length} power nodes`);
  }

  for (const power of powerNodes) {
    // base에 해당 변수가 있는지 확인
    const hasVar = containsVariable(power.base, targetVariable);

    // DEBUG: 각 PowerNode 검사 로깅
    if (debugEnabled) {
      console.log(`[Analyzer] PowerNode base:`, power.base, `contains '${targetVariable}':`, hasVar);
      console.log(`[Analyzer] PowerNode exponent:`, power.exponent);
    }

    if (hasVar) {
      const degree = extractDegree(power.exponent);

      // DEBUG: 추출된 차수 로깅
      if (debugEnabled) {
        console.log(`[Analyzer] Extracted degree: ${degree}`);
      }

      maxDegree = Math.max(maxDegree, degree);
    }
  }

  // power 노드 없이 변수만 있는 경우 (1차)
  const variableNodes = findNodes<VariableNode>(ast, 'variable');
  for (const varNode of variableNodes) {
    if (varNode.name === targetVariable) {
      // power의 base에 있지 않은 단독 변수는 1차
      if (!isInsidePowerBase(ast, varNode)) {
        maxDegree = Math.max(maxDegree, 1);
      }
    }
  }

  // DEBUG: 최종 차수 로깅
  if (debugEnabled) {
    console.log(`[Analyzer] Final degree for '${targetVariable}': ${maxDegree}`);
  }

  return maxDegree;
}

/**
 * 노드 배열에 특정 변수가 포함되어 있는지 확인
 */
function containsVariable(nodes: MathNode[], targetVariable: string): boolean {
  for (const node of nodes) {
    if (node.type === 'variable' && node.name === targetVariable) {
      return true;
    }
    // 재귀적으로 자식 노드 검사
    if (hasChildren(node)) {
      const children = getChildren(node);
      if (containsVariable(children, targetVariable)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 지수에서 숫자 추출 (재귀적으로 탐색)
 */
function extractDegree(exponent: MathNode[]): number {
  // 빈 배열이면 1차로 간주
  if (exponent.length === 0) {
    return 1;
  }

  // 단순한 경우: 숫자 노드 하나만 있는 경우
  if (exponent.length === 1) {
    const node = exponent[0];

    if (node.type === 'number') {
      return parseFloat(node.value);
    }

    // RowNode로 감싸진 경우 재귀적으로 탐색
    if (node.type === 'row') {
      const rowNode = node as import('../types').RowNode;
      return extractDegree(rowNode.children);
    }

    // 변수인 경우 (예: x^n에서 n) - 알 수 없으므로 기본값
    if (node.type === 'variable') {
      return 1; // 변수 지수는 분석하기 어려움
    }
  }

  // 여러 노드가 있는 경우, 첫 번째 숫자 찾기
  for (const node of exponent) {
    if (node.type === 'number') {
      return parseFloat(node.value);
    }
    if (node.type === 'row') {
      const rowNode = node as import('../types').RowNode;
      const result = extractDegree(rowNode.children);
      if (result > 1) return result;
    }
  }

  // 복잡한 지수는 분석하기 어려우므로 기본값 반환
  return 1;
}

/**
 * 변수 노드가 power의 base 안에 있는지 확인
 */
function isInsidePowerBase(ast: RootNode, targetNode: VariableNode): boolean {
  const powerNodes = findNodes<PowerNode>(ast, 'power');

  for (const power of powerNodes) {
    if (containsNodeById(power.base, targetNode.id)) {
      return true;
    }
  }

  return false;
}

/**
 * 노드 배열에 특정 ID의 노드가 있는지 확인
 */
function containsNodeById(nodes: MathNode[], targetId: string): boolean {
  for (const node of nodes) {
    if (node.id === targetId) {
      return true;
    }
    if (hasChildren(node)) {
      const children = getChildren(node);
      if (containsNodeById(children, targetId)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 노드가 자식을 가지는지 확인
 */
function hasChildren(node: MathNode): boolean {
  return [
    'root',
    'row',
    'frac',
    'power',
    'subscript',
    'sqrt',
    'paren',
    'abs',
    'func',
    'integral',
    'sum',
    'limit',
    'product',
    'overline',
    'accent',
    'matrix',
    'align',
    'cases',
    'gather',
    'array',
    'overset',
    'cancel',
    'xarrow',
  ].includes(node.type);
}

/**
 * 노드의 모든 자식 노드 반환
 */
function getChildren(node: MathNode): MathNode[] {
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
    case 'accent':
      return (node as { content: MathNode[] }).content;
    case 'func':
      return (node as { argument: MathNode[] }).argument;
    case 'integral': {
      const integral = node as {
        lower?: MathNode[];
        upper?: MathNode[];
        integrand: MathNode[];
      };
      return [
        ...(integral.lower || []),
        ...(integral.upper || []),
        ...integral.integrand,
      ];
    }
    case 'sum':
    case 'product': {
      const sumProd = node as {
        lower: MathNode[];
        upper: MathNode[];
        body: MathNode[];
      };
      return [...sumProd.lower, ...sumProd.upper, ...sumProd.body];
    }
    case 'limit': {
      const limit = node as { approach: MathNode[]; body: MathNode[] };
      return [...limit.approach, ...limit.body];
    }
    case 'matrix':
    case 'align':
    case 'cases':
    case 'array': {
      const env = node as { rows: MathNode[][] };
      return env.rows.flat();
    }
    case 'gather':
      return (node as { rows: MathNode[] }).rows;
    case 'overset': {
      const overset = node as { base: MathNode[]; annotation: MathNode[] };
      return [...overset.base, ...overset.annotation];
    }
    case 'cancel':
      return (node as { content: MathNode[] }).content;
    case 'xarrow': {
      const xarrow = node as { above: MathNode[]; below?: MathNode[] };
      return [...xarrow.above, ...(xarrow.below || [])];
    }
    default:
      return [];
  }
}

/**
 * 차수에 따른 명칭 반환
 */
export function getDegreeLabel(degree: number): string {
  switch (degree) {
    case 0:
      return 'constant';
    case 1:
      return 'linear';
    case 2:
      return 'quadratic';
    case 3:
      return 'cubic';
    case 4:
      return 'quartic';
    case 5:
      return 'quintic';
    default:
      return `degree-${degree}`;
  }
}
