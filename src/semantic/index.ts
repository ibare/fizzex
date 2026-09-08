/**
 * Fizzex 의미 표면 — `fizzex/semantic`
 *
 * 수식의 각 요소가 구조 안에서 갖는 의미를 해석한다.
 * 카탈로그 데이터(설명 텍스트 JSON)가 함께 실려 `fizzex/compute` 보다 무겁기 때문에,
 * 계산만 필요한 호스트가 이 비용을 물지 않도록 별도 진입점으로 분리했다.
 *
 * `fizzex/compute` 와 마찬가지로 DOM·프레임워크에 의존하지 않는다.
 */

export {
  getSemanticMeaning,
  buildSemanticMap,
  buildAstAncestorMap,
  getCatalogDetail,
  containsVariable,
} from '../analyzer/semantic/index.js';
export type {
  SemanticResult,
  AncestorEntry,
  CatalogMatchResult,
  CatalogDetail,
  CatalogCategory,
  ElementMeaning,
  ElementKind,
  DerivedValueConfig,
  ConstraintConfig,
  MilestoneConfig,
  AnchorConfig,
} from '../analyzer/semantic/index.js';

// 형식(form) → 시각화 후보 조회
export { getVisualizersForForm } from '../analyzer/semantic/loader.js';
export type { VisualizerRef } from '../analyzer/semantic/types.js';
