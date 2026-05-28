/**
 * 구조적 의미 시스템 — Expression Explorer용
 *
 * 수식의 각 요소가 구조 안에서 갖는 의미를 다계층 규칙으로 해석한다.
 */

// 엔진
export { getSemanticMeaning, buildSemanticMap, buildAstAncestorMap } from './engine.js';

// 헬퍼 (public)
export { containsVariable } from './helpers.js';

// 카탈로그 조회
export { getCatalogDetail } from './loader.js';

// 타입
export type {
  SemanticResult, AncestorEntry, CatalogMatchResult, CatalogDetail, CatalogCategory,
  ElementMeaning, ElementKind, DerivedValueConfig, ConstraintConfig, MilestoneConfig, AnchorConfig,
} from './types.js';
