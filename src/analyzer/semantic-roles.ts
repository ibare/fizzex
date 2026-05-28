/**
 * 구조적 의미 시스템 — re-export wrapper
 *
 * 실제 구현은 ./semantic/ 하위 모듈에 있다.
 * 기존 import 경로 호환을 위해 유지.
 */

export {
  getSemanticMeaning,
  buildSemanticMap,
  buildAstAncestorMap,
  containsVariable,
  getCatalogDetail,
} from './semantic/index.js';

export type { SemanticResult, AncestorEntry } from './semantic/index.js';
