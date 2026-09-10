/**
 * 카탈로그 데이터 검증 진입점 — 빌드·테스트 시점 전용.
 *
 * `src/visualizer/runtime/validator/index.ts` 관례를 따른다:
 * safeParse → 실패 시 issues 를 보존한 전용 Error → 메시지에 path 포함.
 */

import type { z } from 'zod';
import type { CatalogIndexEntry, CatalogDetail } from '../types.js';
import type { ChemicalElementTexts } from '../loader.js';
import { catalogIndexSchema, catalogDetailFileSchema } from './catalog-schema.js';
import { chemicalElementsSchema } from './elements-schema.js';

export class CatalogValidationError extends Error {
  constructor(
    public readonly source: string,
    public readonly issues: z.core.$ZodIssue[],
  ) {
    super(
      `Catalog validation failed (${source}):\n` +
        issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n'),
    );
    this.name = 'CatalogValidationError';
  }
}

/** 카탈로그 인덱스를 검증·반환. 실패 시 CatalogValidationError throw. */
export function validateCatalogIndex(input: unknown): CatalogIndexEntry[] {
  const result = catalogIndexSchema.safeParse(input);
  if (!result.success) {
    throw new CatalogValidationError('catalog/index.json', result.error.issues);
  }
  return result.data.entries as CatalogIndexEntry[];
}

/** 카테고리별 상세 JSON을 검증·반환. 실패 시 CatalogValidationError throw. */
export function validateCatalogDetailFile(
  source: string,
  input: unknown,
): Record<string, CatalogDetail> {
  const result = catalogDetailFileSchema.safeParse(input);
  if (!result.success) {
    throw new CatalogValidationError(source, result.error.issues);
  }
  return result.data as Record<string, CatalogDetail>;
}

/** 화학 원소 이름표를 검증·반환. 실패 시 CatalogValidationError throw. */
export function validateChemicalElements(
  source: string,
  input: unknown,
): ChemicalElementTexts {
  const result = chemicalElementsSchema.safeParse(input);
  if (!result.success) {
    throw new CatalogValidationError(source, result.error.issues);
  }
  return result.data as ChemicalElementTexts;
}

export { catalogIndexSchema, catalogDetailSchema, catalogDetailFileSchema } from './catalog-schema.js';
export { chemicalElementsSchema } from './elements-schema.js';
