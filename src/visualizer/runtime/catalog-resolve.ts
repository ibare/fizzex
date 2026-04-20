/**
 * `catalog` 참조 해소 (설계 §14.1, §14.4).
 *
 * 스펙의 `catalog: "<category>/<id>"` 슬래시 참조를 parser로 분해하고
 * `analyzer/semantic/loader`의 `getCatalogDetail`로 로드한다.
 * 로드 실패 시 throw (하위 호환 미보유 — 잘못된 참조는 개발 시 즉시 발견).
 *
 * `extractCatalogDefaults`는 `parameterConfig`에서 `{id → default}` 맵만 추출.
 * baseline.ts의 머지 로직에 투입된다.
 */

import { getCatalogDetail } from '../../analyzer/semantic-roles';
import type { CatalogDetail, CatalogParameterConfig } from '../../analyzer/semantic/types';

export interface CatalogRef {
  category: string;
  id: string;
}

export function splitCatalogRef(ref: string): CatalogRef {
  const slash = ref.indexOf('/');
  if (slash <= 0 || slash === ref.length - 1) {
    throw new Error(`catalog: invalid ref "${ref}" (expected "<category>/<id>")`);
  }
  return { category: ref.slice(0, slash), id: ref.slice(slash + 1) };
}

export function resolveCatalog(ref: string): CatalogDetail {
  const { category, id } = splitCatalogRef(ref);
  const detail = getCatalogDetail(id, category);
  if (!detail) {
    throw new Error(`catalog: unknown ref "${ref}" (category="${category}", id="${id}")`);
  }
  return detail;
}

export function extractCatalogDefaults(detail: CatalogDetail): Record<string, number> {
  const out: Record<string, number> = {};
  for (const cfg of detail.parameterConfig ?? []) {
    out[cfg.id] = cfg.default;
  }
  return out;
}

export function extractCatalogParameters(detail: CatalogDetail): readonly CatalogParameterConfig[] {
  return detail.parameterConfig ?? [];
}
