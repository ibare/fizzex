/**
 * 폴백 의미 해석 — JSON 데이터 기반
 *
 * 노드 타입별 기본 역할명과 설명을 JSON에서 가져온다.
 */

import type { MathNode, ScriptsNode } from '../../types.js';
import type { FallbackTexts } from './loader.js';
import { isInfinity, isEulerE } from './helpers.js';

/**
 * 첨자 노드가 어떤 종류인지 — 붙은 슬롯 조합으로 정한다.
 *
 * 노드 타입은 하나(scripts)뿐이라 거듭제곱과 아래첨자를 타입만으로 구분할 수 없다.
 * accent 가 accentType 으로 갈리는 것과 같은 방식이다.
 */
function scriptsTextKey(
  node: ScriptsNode,
): 'superscriptOnly' | 'subscriptOnly' | 'both' | 'withLeft' {
  if (node.leftSuperscript || node.leftSubscript) return 'withLeft';
  if (node.superscript && node.subscript) return 'both';
  if (node.superscript) return 'superscriptOnly';
  return 'subscriptOnly';
}

/**
 * JSON 기반 기본 역할명 조회
 */
export function getDefaultRoleFromTexts(node: MathNode, fallback: FallbackTexts): string {
  switch (node.type) {
    case 'func':
      // roles.func 는 `{name}` 을 함수 이름으로 바꾸는 형식이다 — 어순이 언어마다 다르다
      return fallback.roles['func']?.replace('{name}', node.name) ?? node.name;
    case 'accent': {
      const accentData = fallback.accents[node.accentType];
      return accentData?.role ?? fallback.defaultAccent.role;
    }
    case 'scripts':
      return fallback.scripts[scriptsTextKey(node)].role;
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
      return (fallback.descriptions['matrix'] ?? '')
        .replace('{rows}', String(node.rows.length))
        .replace('{cols}', String(node.rows[0]?.length ?? 0));
    case 'accent': {
      const accentData = fallback.accents[node.accentType];
      return accentData?.description ?? fallback.defaultAccent.description;
    }
    case 'scripts':
      return fallback.scripts[scriptsTextKey(node)].description;
    default:
      return fallback.descriptions[node.type] ?? '';
  }
}
