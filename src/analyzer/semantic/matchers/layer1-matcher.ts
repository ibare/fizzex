/**
 * Layer 1 매처 — 부모-자식 구조 매칭
 *
 * 규칙 로직 (조건 함수)과 텍스트 데이터 (JSON)를 매핑한다.
 * 조건 함수는 conditionId로 식별되며, JSON의 refinements 키와 대응한다.
 */

import type { MathNode } from '../../../types.js';
import type { AncestorEntry, SemanticResult } from '../types.js';
import type { Layer1TextEntry } from '../loader.js';
import { containsVariable, isConstantOnly, isInfinity, isEulerE, isNumberValue } from '../helpers.js';

// ─── 조건 함수 레지스트리 ───

/** conditionId → 조건 함수 매핑 */
const CONDITIONS: Record<string, (node: MathNode) => boolean> = {
  containsVariable: (node) => containsVariable(node),
  constantOnly: isConstantOnly,
  isEulerE: isEulerE,
  isVariable: (node) => node.type === 'variable',
  isTwo: (node) => isNumberValue(node, 2),
  isNegativeOne: (node) => isNumberValue(node, -1),
  isHalf: (node) => isNumberValue(node, 0.5) || isNumberValue(node, 1 / 2),
  isInfinity: isInfinity,
};

// ─── 규칙 정의 (로직만, 텍스트 없음) ───

interface Layer1RuleDef {
  /** "parentType.childPosition" 형태의 키 */
  key: string;
  parentType: string;
  childPosition: string;
  /** refinement 조건 ID 목록 (JSON의 refinements 키와 매핑) */
  refinementIds?: string[];
}

/**
 * 32개 Layer 1 규칙의 로직 정의.
 * 텍스트는 JSON에서, 조건 함수는 CONDITIONS 레지스트리에서 가져온다.
 */
const LAYER1_RULE_DEFS: Layer1RuleDef[] = [
  { key: 'frac.numerator', parentType: 'frac', childPosition: 'numerator', refinementIds: ['containsVariable', 'constantOnly'] },
  { key: 'frac.denominator', parentType: 'frac', childPosition: 'denominator', refinementIds: ['containsVariable', 'constantOnly'] },
  { key: 'power.base', parentType: 'power', childPosition: 'base', refinementIds: ['isEulerE', 'isVariable'] },
  { key: 'power.exponent', parentType: 'power', childPosition: 'exponent', refinementIds: ['isTwo', 'isNegativeOne', 'isHalf', 'containsVariable'] },
  { key: 'sqrt.content', parentType: 'sqrt', childPosition: 'content' },
  { key: 'sqrt.index', parentType: 'sqrt', childPosition: 'index' },
  { key: 'subscript.base', parentType: 'subscript', childPosition: 'base' },
  { key: 'subscript.subscript', parentType: 'subscript', childPosition: 'subscript' },
  { key: 'sum.lower', parentType: 'sum', childPosition: 'lower' },
  { key: 'sum.upper', parentType: 'sum', childPosition: 'upper', refinementIds: ['isInfinity'] },
  { key: 'sum.body', parentType: 'sum', childPosition: 'body' },
  { key: 'product.lower', parentType: 'product', childPosition: 'lower' },
  { key: 'product.upper', parentType: 'product', childPosition: 'upper' },
  { key: 'product.body', parentType: 'product', childPosition: 'body' },
  { key: 'integral.lower', parentType: 'integral', childPosition: 'lower' },
  { key: 'integral.upper', parentType: 'integral', childPosition: 'upper', refinementIds: ['isInfinity'] },
  { key: 'integral.integrand', parentType: 'integral', childPosition: 'integrand' },
  { key: 'limit.approach', parentType: 'limit', childPosition: 'approach' },
  { key: 'limit.body', parentType: 'limit', childPosition: 'body' },
  { key: 'paren.content', parentType: 'paren', childPosition: 'content' },
  { key: 'abs.content', parentType: 'abs', childPosition: 'content' },
  { key: 'func.argument', parentType: 'func', childPosition: 'argument' },
  { key: 'matrix.element', parentType: 'matrix', childPosition: 'element' },
  { key: 'cases.element', parentType: 'cases', childPosition: 'element' },
  { key: 'accent.content', parentType: 'accent', childPosition: 'content' },
  { key: 'overline.content', parentType: 'overline', childPosition: 'content' },
  { key: 'cancel.content', parentType: 'cancel', childPosition: 'content' },
  { key: 'overset.base', parentType: 'overset', childPosition: 'base' },
  { key: 'overset.annotation', parentType: 'overset', childPosition: 'annotation' },
  { key: 'xarrow.above', parentType: 'xarrow', childPosition: 'above' },
  { key: 'xarrow.below', parentType: 'xarrow', childPosition: 'below' },
];

// ─── 매칭 ───

export interface Layer1MatchResult {
  key: string;
  role: string;
  description: string;
}

/**
 * Layer 1 매칭 — 가장 가까운 의미 있는 부모에서 규칙 탐색.
 * @returns 매칭 결과 또는 null
 */
export function matchLayer1(
  node: MathNode,
  parent: AncestorEntry,
  texts: Record<string, Layer1TextEntry>,
): Layer1MatchResult | null {
  const ruleDef = LAYER1_RULE_DEFS.find(
    r => r.parentType === parent.node.type && r.childPosition === parent.childPosition,
  );
  if (!ruleDef) return null;

  const text = texts[ruleDef.key];
  if (!text) return null;

  let description = text.description;

  // refinement 적용
  if (ruleDef.refinementIds && text.refinements) {
    for (const condId of ruleDef.refinementIds) {
      const condFn = CONDITIONS[condId];
      if (condFn && condFn(node) && text.refinements[condId]) {
        description = text.refinements[condId];
        break;
      }
    }
  }

  return { key: ruleDef.key, role: text.role, description };
}

/**
 * Layer 1에서 role만 조회 (Layer 2 폴백용).
 */
export function getLayer1RoleFromTexts(
  parent: AncestorEntry,
  texts: Record<string, Layer1TextEntry>,
): string | null {
  const ruleDef = LAYER1_RULE_DEFS.find(
    r => r.parentType === parent.node.type && r.childPosition === parent.childPosition,
  );
  if (!ruleDef) return null;
  return texts[ruleDef.key]?.role ?? null;
}
