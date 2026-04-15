/**
 * 의미 데이터 로더
 *
 * JSON 데이터를 정적 import로 번들에 포함시키고,
 * locale별 접근 인터페이스를 제공한다.
 */

import type { CatalogIndexEntry, CatalogDetail } from './types';

// 번들 포함 (항상 로드) — 한국어 기본
import koLayer1 from './data/layer1/ko.json';
import koLayer2 from './data/layer2/ko.json';
import koFallback from './data/fallback/ko.json';

// 카탈로그 인덱스 (번들 포함)
import catalogIndex from './data/catalog/index.json';

// 카탈로그 상세 (번들 포함 — 초기 5분야)
import koAlgebra from './data/catalog/ko/algebra.json';
import koCalculus from './data/catalog/ko/calculus.json';
import koGeometry from './data/catalog/ko/geometry.json';
import koPhysics from './data/catalog/ko/physics.json';
import koStatistics from './data/catalog/ko/statistics.json';

// ─── 타입 ───

export interface Layer1TextEntry {
  role: string;
  description: string;
  refinements?: Record<string, string>;
}

export interface Layer2TextEntry {
  role: string | null;
  description: string;
}

export interface FallbackTexts {
  roles: Record<string, string>;
  descriptions: Record<string, string>;
  specialVariables: Record<string, string>;
  operators: Record<string, string>;
  functions: Record<string, string>;
  accents: Record<string, { role: string; description: string }>;
  defaultAccent: { role: string; description: string };
  defaultOperator: string;
  defaultFunction: string;
}

export interface SemanticTexts {
  layer1: Record<string, Layer1TextEntry>;
  layer2: Record<string, Layer2TextEntry>;
  fallback: FallbackTexts;
}

// ─── 캐시 ───

const textCache = new Map<string, SemanticTexts>();

// ─── public API ───

/**
 * 현재 locale의 텍스트 데이터를 반환한다.
 * 번들에 포함된 한국어 데이터는 동기적으로 즉시 반환.
 */
export function getSemanticTexts(locale = 'ko'): SemanticTexts {
  const cached = textCache.get(locale);
  if (cached) return cached;

  if (locale === 'ko') {
    const texts: SemanticTexts = {
      layer1: koLayer1 as Record<string, Layer1TextEntry>,
      layer2: koLayer2 as Record<string, Layer2TextEntry>,
      fallback: koFallback as FallbackTexts,
    };
    textCache.set('ko', texts);
    return texts;
  }

  // 다른 locale은 아직 지원하지 않음 — 한국어 폴백
  return getSemanticTexts('ko');
}

// ─── 카탈로그 ───

/** 카탈로그 상세 데이터 캐시 (카테고리별) */
const catalogDetailCache = new Map<string, Record<string, CatalogDetail>>();

/** 전체 카탈로그 상세 (5분야 통합) */
const allKoCatalogDetails: Record<string, Record<string, CatalogDetail>> = {
  algebra: koAlgebra as Record<string, CatalogDetail>,
  calculus: koCalculus as Record<string, CatalogDetail>,
  geometry: koGeometry as Record<string, CatalogDetail>,
  physics: koPhysics as Record<string, CatalogDetail>,
  statistics: koStatistics as Record<string, CatalogDetail>,
};

/**
 * 카탈로그 인덱스를 반환한다 (번들에 포함, 동기).
 */
export function getCatalogIndex(): CatalogIndexEntry[] {
  return catalogIndex.entries as CatalogIndexEntry[];
}

/**
 * 카탈로그 상세 데이터를 반환한다 (동기, 번들 포함).
 */
export function getCatalogDetail(
  catalogId: string,
  category: string,
  _locale = 'ko',
): CatalogDetail | null {
  const cacheKey = `${_locale}:${category}`;
  let categoryData = catalogDetailCache.get(cacheKey);

  if (!categoryData) {
    categoryData = allKoCatalogDetails[category];
    if (categoryData) {
      catalogDetailCache.set(cacheKey, categoryData);
    }
  }

  return categoryData?.[catalogId] ?? null;
}
