/**
 * 형식(form) 데이터 zod 스키마 — 빌드·테스트 시점 검증 전용.
 *
 * 카탈로그 스키마와 같은 정책이다: 데이터는 번들에 정적으로 박히므로 런타임에
 * 잘못될 경로가 없고, 잘못된 데이터는 반드시 빌드 시점에 잘못되어 있다.
 *
 * 템플릿 파싱을 요구하는 검증(선언한 슬롯이 템플릿에 실제로 등장하는가 등)은
 * 여기서 하지 않는다 — zod 는 LaTeX 를 모른다. 그쪽은 검증 스크립트가 맡는다.
 */

import { z } from 'zod';

const idRegex = /^[a-z][a-z0-9-]*$/;

/** 슬롯 이름은 spec.userBindings.name 과 문자열이 정확히 같아야 한다 (`\omega`, `v_0` 등). */
const slotNameSchema = z.string().min(1);

const rangeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
    default: z.number(),
  })
  .refine((r) => r.min < r.max, { message: 'range.min 은 max 보다 작아야 한다' })
  .refine((r) => r.min <= r.default && r.default <= r.max, {
    message: 'range.default 가 [min, max] 밖이다',
  });

const slotSchema = z.object({
  name: slotNameSchema,
  outputKind: z.enum(['scalar', 'matrix', 'complex']),
  /**
   * formula — 수식 매칭으로 채운다.
   * viewer  — 사용자가 움직이는 관찰 축이다. 수식에서 읽는 값이 아니므로
   *           `shapes[].slots` 에 등장하면 안 된다.
   */
  source: z.enum(['formula', 'viewer']),
  /** 대응하는 항이 없어도 되는 슬롯. 곱셈 자리는 1, 덧셈 자리는 0 으로 파생된다. */
  optional: z.boolean().optional(),
  range: rangeSchema,
});

const shapeSchema = z.object({
  /** 메타변수 sigil 없는 정상 LaTeX. 슬롯·free 로 지정되지 않은 토큰은 전부 리터럴이다. */
  latex: z.string().min(1),
  slots: z.array(slotNameSchema),
  free: z.array(slotNameSchema),
});

const visualizerRefSchema = z.object({
  id: z.string().regex(idRegex),
  icon: z.string().optional(),
  default: z.boolean().optional(),
});

const exampleSchema = z.object({
  latex: z.string().min(1),
  slots: z.record(z.string(), z.string()),
});

const formSchema = z
  .object({
    id: z.string().regex(idRegex, 'form id 는 소문자·숫자·하이픈'),
    slots: z.array(slotSchema).min(1),
    shapes: z.array(shapeSchema).min(1),
    /** 이 형식이 일반화하는 형식들. 진짜 포함관계일 때만 선언한다. */
    subsumes: z.array(z.string()).optional(),
    visualizers: z.array(visualizerRefSchema),
    examples: z.array(exampleSchema).min(1),
    counterExamples: z.array(z.string().min(1)).min(1),
  })
  .superRefine((form, ctx) => {
    const bySlot = new Map(form.slots.map((s) => [s.name, s]));
    if (bySlot.size !== form.slots.length) {
      ctx.addIssue({ code: 'custom', path: ['slots'], message: '슬롯 이름이 중복된다' });
    }
    const formulaSlots = new Set(
      form.slots.filter((s) => s.source === 'formula').map((s) => s.name),
    );

    form.shapes.forEach((shape, i) => {
      for (const name of shape.slots) {
        const slot = bySlot.get(name);
        if (!slot) {
          ctx.addIssue({
            code: 'custom',
            path: ['shapes', i, 'slots'],
            message: `선언되지 않은 슬롯 "${name}"`,
          });
          continue;
        }
        if (slot.source === 'viewer') {
          ctx.addIssue({
            code: 'custom',
            path: ['shapes', i, 'slots'],
            message: `viewer 슬롯 "${name}" 은 수식에서 읽는 값이 아니다`,
          });
        }
      }
      const overlap = shape.slots.filter((n) => shape.free.includes(n));
      if (overlap.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['shapes', i],
          message: `slots 와 free 가 겹친다: ${overlap.join(', ')}`,
        });
      }
    });

    // 어떤 shape 에도 등장하지 않는 formula 슬롯은 채울 방법이 없다.
    const usedInShapes = new Set(form.shapes.flatMap((s) => s.slots));
    for (const name of formulaSlots) {
      if (!usedInShapes.has(name)) {
        ctx.addIssue({
          code: 'custom',
          path: ['slots'],
          message: `formula 슬롯 "${name}" 이 어떤 shape 에도 없다 — 채울 경로가 없다`,
        });
      }
    }

    form.examples.forEach((ex, i) => {
      for (const key of Object.keys(ex.slots)) {
        if (!formulaSlots.has(key)) {
          ctx.addIssue({
            code: 'custom',
            path: ['examples', i, 'slots'],
            message: `example 이 formula 슬롯이 아닌 "${key}" 를 선언한다`,
          });
        }
      }
      for (const name of formulaSlots) {
        if (bySlot.get(name)?.optional) continue;
        if (!(name in ex.slots)) {
          ctx.addIssue({
            code: 'custom',
            path: ['examples', i, 'slots'],
            message: `필수 슬롯 "${name}" 의 기대 바인딩이 없다`,
          });
        }
      }
    });

    if (form.visualizers.length > 0) {
      const defaults = form.visualizers.filter((v) => v.default);
      if (defaults.length > 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['visualizers'],
          message: 'default 는 form 당 최대 1개',
        });
      }
    }
  });

export const formIndexSchema = z
  .object({
    version: z.string().min(1),
    forms: z.array(formSchema).min(1),
  })
  .superRefine((index, ctx) => {
    const ids = new Set(index.forms.map((f) => f.id));
    index.forms.forEach((form, i) => {
      for (const sub of form.subsumes ?? []) {
        if (!ids.has(sub)) {
          ctx.addIssue({
            code: 'custom',
            path: ['forms', i, 'subsumes'],
            message: `존재하지 않는 형식 "${sub}"`,
          });
        }
        if (sub === form.id) {
          ctx.addIssue({ code: 'custom', path: ['forms', i, 'subsumes'], message: '자기 자신' });
        }
      }
    });
    const seen = new Set<string>();
    const vizSeen = new Map<string, string>();
    index.forms.forEach((form, i) => {
      if (seen.has(form.id)) {
        ctx.addIssue({ code: 'custom', path: ['forms', i, 'id'], message: `중복 form id "${form.id}"` });
      }
      seen.add(form.id);
      // 한 viz 는 정확히 한 form 에만 속한다 — 아니면 같은 칩이 두 곳에서 뜬다.
      for (const v of form.visualizers) {
        const owner = vizSeen.get(v.id);
        if (owner) {
          ctx.addIssue({
            code: 'custom',
            path: ['forms', i, 'visualizers'],
            message: `viz "${v.id}" 가 "${owner}" 와 중복 소유된다`,
          });
        }
        vizSeen.set(v.id, form.id);
      }
    });
  });

const slotTextSchema = z.object({
  role: z.string().min(1),
  description: z.string().min(1),
});

export const formTextSchema = z.record(
  z.string(),
  z.object({
    name: z.string().min(1),
    oneLiner: z.string().min(1),
    slots: z.record(z.string(), slotTextSchema),
  }),
);
