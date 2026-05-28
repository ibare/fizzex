/**
 * 폴백 의미 해석 — JSON 데이터 기반
 *
 * 노드 타입별 기본 역할명과 설명을 JSON에서 가져온다.
 */

import type { MathNode } from '../../types.js';
import type { FallbackTexts } from './loader.js';
import { isInfinity, isEulerE } from './helpers.js';

/**
 * JSON 기반 기본 역할명 조회
 */
export function getDefaultRoleFromTexts(node: MathNode, fallback: FallbackTexts): string {
  switch (node.type) {
    case 'func':
      return `${fallback.roles['func'] ?? '함수'} ${node.name}`;
    case 'accent': {
      const accentData = fallback.accents[node.accentType];
      return accentData?.role ?? fallback.defaultAccent.role;
    }
    default:
      return fallback.roles[node.type] ?? node.type;
  }
}

/**
 * JSON 기반 기본 설명 조회
 */
export function getDefaultDescriptionFromTexts(node: MathNode, fallback: FallbackTexts): string {
  switch (node.type) {
    case 'number':
      return (fallback.descriptions['number'] ?? '').replace('{value}', node.value);
    case 'variable': {
      if (isInfinity(node)) return fallback.specialVariables['infinity'] ?? '';
      if (isEulerE(node)) return fallback.specialVariables['eulerE'] ?? '';
      if (node.name === 'π' || node.name === 'pi') return fallback.specialVariables['pi'] ?? '';
      if (node.name === 'i') return fallback.specialVariables['imaginaryI'] ?? '';
      return (fallback.descriptions['variable'] ?? '').replace('{name}', node.name);
    }
    case 'operator':
      return fallback.operators[node.operator]
        ?? (fallback.defaultOperator ?? '').replace('{op}', node.operator);
    case 'func':
      return fallback.functions[node.name]
        ?? (fallback.defaultFunction ?? '').replace('{name}', node.name);
    case 'matrix':
      return `${node.rows.length}x${node.rows[0]?.length ?? 0} 행렬입니다.`;
    case 'accent': {
      const accentData = fallback.accents[node.accentType];
      return accentData?.description ?? fallback.defaultAccent.description;
    }
    default:
      return fallback.descriptions[node.type] ?? '';
  }
}
