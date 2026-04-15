/**
 * 의미 해석 헬퍼 함수
 *
 * AST 검사, 경로 매칭, 폴백 설명 생성 등 순수 유틸리티.
 */

import type { MathNode } from '../../types';
import type { AncestorEntry, SemanticResult } from './types';
import type { FallbackTexts } from './loader';

// ─── AST 검사 헬퍼 ───

/** 노드에 변수가 포함되어 있는지 */
export function containsVariable(node: MathNode): boolean {
  if (node.type === 'variable') return true;
  for (const child of getChildArrays(node)) {
    for (const c of child) {
      if (containsVariable(c)) return true;
    }
  }
  return false;
}

/** 노드가 순수 상수인지 (변수 없음) */
export function isConstantOnly(node: MathNode): boolean {
  return !containsVariable(node);
}

/** 노드가 무한대 기호인지 */
export function isInfinity(node: MathNode): boolean {
  return node.type === 'variable' && (node.name === '∞' || node.name === 'inf');
}

/** 노드가 음의 무한대인지 (row: [operator(-), variable(∞)]) */
export function isNegativeInfinity(nodes: MathNode[]): boolean {
  if (nodes.length === 2) {
    return nodes[0].type === 'operator' && nodes[0].operator === '-' && isInfinity(nodes[1]);
  }
  return false;
}

/** 노드가 자연상수 e인지 */
export function isEulerE(node: MathNode): boolean {
  return node.type === 'variable' && node.name === 'e';
}

/** 특정 숫자 값인지 */
export function isNumberValue(node: MathNode, value: number): boolean {
  return node.type === 'number' && parseFloat(node.value) === value;
}

/** 노드 배열이 음수 표현인지 */
export function isNegativeExpression(nodes: MathNode[]): boolean {
  return nodes.length >= 1 && nodes[0].type === 'operator' && nodes[0].operator === '-';
}

/** x² + c 형태로 항상 양수인지 (간단 패턴만) */
export function isAlwaysPositive(nodes: MathNode[]): boolean {
  // 단일 power 노드: base가 변수, exponent가 2 → x² (≥ 0)
  if (nodes.length === 1 && nodes[0].type === 'power') {
    const exp = nodes[0].exponent;
    if (exp.length === 1 && isNumberValue(exp[0], 2)) return true;
  }
  // x² + 상수 패턴
  if (nodes.length === 3) {
    const [a, op, b] = nodes;
    if (op.type === 'operator' && op.operator === '+') {
      if (a.type === 'power' && a.exponent.length === 1 && isNumberValue(a.exponent[0], 2)) {
        if (b.type === 'number' && parseFloat(b.value) > 0) return true;
      }
    }
  }
  return false;
}

/** MathNode의 모든 자식 배열을 반환 */
export function getChildArrays(node: MathNode): MathNode[][] {
  switch (node.type) {
    case 'root':
    case 'row':
      return [node.children];
    case 'frac':
      return [node.numerator, node.denominator];
    case 'power':
      return [node.base, node.exponent];
    case 'subscript':
      return [node.base, node.subscript];
    case 'sqrt':
      return node.index ? [node.content, node.index] : [node.content];
    case 'paren':
    case 'abs':
    case 'overline':
    case 'accent':
    case 'cancel':
      return [node.content];
    case 'func':
      return [node.argument];
    case 'integral': {
      const arrays: MathNode[][] = [node.integrand];
      if (node.lower) arrays.push(node.lower);
      if (node.upper) arrays.push(node.upper);
      return arrays;
    }
    case 'sum':
    case 'product':
      return [node.lower, node.upper, node.body];
    case 'limit':
      return [node.approach, node.body];
    case 'overset':
      return [node.base, node.annotation];
    case 'xarrow':
      return node.below ? [node.above, node.below] : [node.above];
    case 'matrix':
    case 'align':
    case 'cases':
    case 'array':
      return node.rows;
    case 'gather':
      return [node.rows];
    case 'opaque':
      return node.args;
    default:
      return [];
  }
}

// ─── 경로 패턴 매칭 ───

/**
 * 조상 경로의 끝이 패턴과 매칭하는지 확인한다 (접미사 매칭).
 */
export function matchesPathPattern(path: string[], pattern: string[]): boolean {
  if (pattern.length > path.length) return false;
  // 패턴은 경로 끝(현재 노드에 가까운 쪽)과 매칭
  const offset = path.length - pattern.length;
  for (let i = 0; i < pattern.length; i++) {
    if (path[offset + i] !== pattern[i]) return false;
  }
  return true;
}

// ─── accent 특수 처리 ───

/** accent 노드의 accentType별 의미 (JSON 기반) */
export function getSemanticForAccent(node: MathNode, parent: AncestorEntry, fallback: FallbackTexts): SemanticResult {
  const accentNode = parent.node;
  if (accentNode.type !== 'accent') {
    const def = fallback.defaultAccent;
    return { role: def.role, description: def.description, layer: 'layer1' };
  }

  const accentData = fallback.accents[accentNode.accentType];
  const role = accentData?.role ?? fallback.defaultAccent.role;
  const description = accentData?.description ?? fallback.defaultAccent.description;
  return { role, description, layer: 'layer1' };
}

// 하드코딩 폴백 함수는 fallback.ts (JSON 기반)로 대체됨
