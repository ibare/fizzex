/**
 * 화학식 카탈로그 매칭 — 표기 정확 일치
 *
 * 반응식은 구조 패턴이 아니라 개별 항목이다. `2H2 + O2 -> 2H2O` 와
 * `2H2 + Cl2 -> 2HCl` 은 구조가 같지만 다른 반응이고, 이름도 따로다.
 * 그래서 시그니처 점수가 아니라 표기 동일성으로만 가린다.
 *
 * 비교하는 문자열은 직렬화기가 내는 정규형이다 — `\ce{H_2O}` 로 적어도
 * `H2O` 로 접히므로 사용자가 어떻게 쳤든 같은 항목에 닿는다.
 */

import type { MathNode } from '../../../types.js';
import { astToLatex } from '../../../latex/ast-to-latex.js';
import { chemNotation } from '../../../latex/chem/serializer.js';
import type { CatalogIndexEntry, CatalogMatchResult } from '../types.js';
import { asChem } from '../chem-semantics.js';

/**
 * 화학식을 카탈로그와 대조한다.
 *
 * @returns 표기가 정확히 같은 항목, 없으면 `null`
 */
export function matchChemCatalog(
  ast: MathNode,
  index: CatalogIndexEntry[],
): CatalogMatchResult | null {
  const chem = asChem(ast);
  if (!chem) return null;

  const notation = chemNotation(chem.content, astToLatex);

  for (const entry of index) {
    if (entry.patternType !== 'chem') continue;
    if (entry.chemFormula !== notation) continue;
    return {
      catalogId: entry.id,
      category: entry.category,
      // 표기가 정확히 같으므로 점수를 매길 것이 없다.
      tier: 'confirmed',
    };
  }

  return null;
}
