/**
 * 카탈로그 데이터 zod 스키마 — 빌드·테스트 시점 검증 전용.
 *
 * 런타임(loader/matcher)은 이 스키마를 부르지 않는다. 카탈로그 JSON은
 * `import ... with { type: 'json' }` 로 번들에 정적으로 박히므로 런타임에
 * 잘못될 경로가 존재하지 않는다 — 잘못된 데이터는 반드시 빌드 시점에
 * 잘못되어 있고 거기서 실패한다.
 */

import { z } from 'zod';
import { CATALOG_CATEGORY_IDS, ELEMENT_KIND_IDS } from '../types.js';

const idRegex = /^[a-z][a-z0-9-]*$/;

const visualizerRefSchema = z.object({
  id: z.string().regex(idRegex, 'visualizer id는 소문자·숫자·하이픈'),
  name: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().optional(),
  default: z.boolean().optional(),
});

const catalogIndexEntryBase = {
  id: z.string().regex(idRegex, 'catalog id는 소문자·숫자·하이픈'),
  category: z.enum(CATALOG_CATEGORY_IDS),
  visualizers: z.array(visualizerRefSchema).min(1).optional(),
};

/**
 * 인덱스 항목은 patternType 으로 갈린다.
 *
 * 화학식 항목에 signature 를 허용하면 `["chem"]` 한 토큰으로 점수 1.0 이 나와
 * 어떤 화학식이든 그 항목으로 오탐한다. 타입 수준에서 막는다.
 */
const catalogIndexEntrySchema = z.discriminatedUnion('patternType', [
  z.object({
    ...catalogIndexEntryBase,
    patternType: z.enum(['exact', 'structural']),
    requiredNodeTypes: z.array(z.string().min(1)).min(1).optional(),
    requiredVariables: z.array(z.string().min(1)).min(1).optional(),
    complexity: z
      .tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])
      .optional(),
    // signature 는 중복 원소를 허용한다. 중복은 다중도 요구사항이다 —
    // 예: 피타고라스의 `power.exponent:2` ×3 은 "제곱이 세 개"를 뜻한다.
    signature: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    ...catalogIndexEntryBase,
    patternType: z.literal('chem'),
    chemFormula: z.string().min(1),
  }),
]);

export const catalogIndexSchema = z
  .object({
    version: z.string().min(1),
    entries: z.array(catalogIndexEntrySchema).min(1),
  })
  .superRefine((index, ctx) => {
    const seen = new Set<string>();
    index.entries.forEach((entry, i) => {
      if (seen.has(entry.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['entries', i, 'id'],
          message: `중복 id "${entry.id}"`,
        });
      }
      seen.add(entry.id);

      if (entry.patternType === 'chem') return;

      if (entry.complexity && entry.complexity[0] > entry.complexity[1]) {
        ctx.addIssue({
          code: 'custom',
          path: ['entries', i, 'complexity'],
          message: `complexity min(${entry.complexity[0]}) > max(${entry.complexity[1]})`,
        });
      }
    });
  });

// 도메인 타입(ElementMeaning)과 필수 필드 집합이 정확히 일치해야 한다 —
// 느슨하면 validateCatalogDetailFile 의 단일 `as` 캐스팅이 간극을 덮어버린다.
const elementMeaningSchema = z.object({
  role: z.string().min(1),
  description: z.string().min(1),
  kind: z.enum(ELEMENT_KIND_IDS),
  value: z.number().optional(),
  unit: z.string().optional(),
});

export const catalogDetailSchema = z
  .object({
    name: z.string().min(1),
    oneLiner: z.string().min(1),
    description: z.string().min(1),
    discoverer: z.string().optional(),
    field: z.string().min(1),
    significance: z.string().optional(),
    elementMeanings: z.record(z.string(), elementMeaningSchema),
    relatedFormulas: z.array(z.string()).optional(),
  })
  .catchall(z.unknown());
// "비어 있으면 안 된다" 는 여기서 판정하지 않는다. 화학식 항목의 기호는 변수가
// 아니라 화학종이라 elementMeanings 로 가리킬 수 없다(findElementKey 참조).
// 항목의 patternType 을 아는 곳, 즉 scripts/validate-semantic-data.ts 가 본다.

export const catalogDetailFileSchema = z.record(z.string(), catalogDetailSchema);
