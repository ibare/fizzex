/**
 * spec + catalog → 런타임 투입 가능한 Compiled 산출물 (설계 §14.4).
 *
 * 파이프라인:
 *   1. validateSpec (zod)
 *   2. resolveCatalog (category/id 분리 → getCatalogDetail)
 *   3. extractCatalogDefaults로 parameter 기본값 추출
 *   4. displayOptions 유효성 재확인 (validator에서도 체크하지만 런타임 안전망)
 *
 * 충돌 감지는 Phase 5에선 보수적으로 최소한: 카탈로그에 없는 param id가
 * scene.params에 있어도 허용(scene은 추가 파생 param 선언 용도 — 미래 확장).
 */

import type { VisualizerSpec } from './types/spec.js';
import type { CatalogDetail } from '../../analyzer/semantic/types.js';
import { validateSpec } from './validator/index.js';
import {
  resolveCatalog,
  extractCatalogDefaults,
} from './catalog-resolve.js';
import { isDisplayOptionId } from './types/display-options.js';

export interface CompiledVisualizer {
  readonly spec: VisualizerSpec;
  readonly catalog: CatalogDetail;
  readonly catalogDefaults: Readonly<Record<string, number>>;
}

export function compileSpec(raw: unknown): CompiledVisualizer {
  const spec = validateSpec(raw);
  const catalog = resolveCatalog(spec.catalog);
  const catalogDefaults = extractCatalogDefaults(catalog);

  for (const id of spec.displayOptions ?? []) {
    if (!isDisplayOptionId(id)) {
      throw new Error(`compile: unknown displayOption "${id}"`);
    }
  }

  return { spec, catalog, catalogDefaults };
}
