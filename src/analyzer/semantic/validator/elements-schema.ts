/**
 * 원소 이름표 zod 스키마 — 빌드·테스트 시점 검증 전용.
 *
 * 카탈로그 스키마와 같은 이유로 런타임은 부르지 않는다. JSON 은 번들에 정적으로
 * 박히므로 잘못된 데이터는 반드시 빌드 시점에 잘못되어 있다.
 */

import { z } from 'zod';
import { CHEMICAL_ELEMENT_COUNT } from '../types.js';

const elementEntrySchema = z.object({
  name: z.string().min(1),
  z: z.number().int().min(1).max(CHEMICAL_ELEMENT_COUNT),
  desc: z.string().min(1),
});

export const chemicalElementsSchema = z
  .object({
    // `{z}` 와 `{desc}` 는 치환 자리다. 하나라도 빠지면 그 정보가 화면에서 사라진다.
    descriptionFormat: z.string().includes('{z}').includes('{desc}'),
    bySymbol: z.record(
      z.string().regex(/^[A-Z][a-z]?$/, '원소 기호는 대문자 하나 + 소문자 하나까지'),
      elementEntrySchema,
    ),
  })
  .superRefine((data, ctx) => {
    const entries = Object.entries(data.bySymbol);

    if (entries.length !== CHEMICAL_ELEMENT_COUNT) {
      ctx.addIssue({
        code: 'custom',
        path: ['bySymbol'],
        message: `원소가 ${entries.length}개다 — ${CHEMICAL_ELEMENT_COUNT}개여야 한다`,
      });
    }

    // 원자 번호는 1부터 빠짐없이 이어져야 한다. 빠진 번호는 곧 빠진 원소다.
    const seen = new Map<number, string>();
    for (const [symbol, entry] of entries) {
      const dup = seen.get(entry.z);
      if (dup) {
        ctx.addIssue({
          code: 'custom',
          path: ['bySymbol', symbol, 'z'],
          message: `원자 번호 ${entry.z}이(가) "${dup}"와 겹친다`,
        });
      }
      seen.set(entry.z, symbol);
    }
    for (let z = 1; z <= CHEMICAL_ELEMENT_COUNT; z++) {
      if (!seen.has(z)) {
        ctx.addIssue({
          code: 'custom',
          path: ['bySymbol'],
          message: `원자 번호 ${z}인 원소가 없다`,
        });
      }
    }
  });
