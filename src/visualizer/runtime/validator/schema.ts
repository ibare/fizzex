/**
 * VisualizerSpec zod 스키마 (설계 §14.2).
 * 런타임 · 편집기 · 테스트 공용 단일 진실.
 */

import { z } from 'zod';
import { DISPLAY_OPTION_IDS } from '../types/display-options';

const exprString = z.string().min(1);

const i18nTextSchema = z
  .object({ en: z.string().min(1) })
  .catchall(z.string())
  .refine((obj) => typeof obj.en === 'string' && obj.en.length > 0, {
    message: 'i18n.en is required',
  });

const styleSchema = z
  .object({
    fill: z.union([exprString, z.record(z.string(), z.unknown())]).optional(),
    stroke: exprString.optional(),
    lineWidth: z.union([exprString, z.number()]).optional(),
    lineDash: z.array(z.union([exprString, z.number()])).optional(),
    lineCap: z.enum(['butt', 'round', 'square']).optional(),
    lineJoin: z.enum(['miter', 'round', 'bevel']).optional(),
    opacity: z.union([exprString, z.number()]).optional(),
    font: exprString.optional(),
    textAlign: z.enum(['left', 'center', 'right', 'start', 'end']).optional(),
    textBaseline: z
      .enum(['top', 'middle', 'bottom', 'alphabetic', 'hanging', 'ideographic'])
      .optional(),
    shadowColor: exprString.optional(),
    shadowBlur: z.union([exprString, z.number()]).optional(),
    shadowOffsetX: z.union([exprString, z.number()]).optional(),
    shadowOffsetY: z.union([exprString, z.number()]).optional(),
  })
  .partial();

const transformSchema = z
  .object({
    translate: z.tuple([z.union([exprString, z.number()]), z.union([exprString, z.number()])]).optional(),
    rotate: z.union([exprString, z.number()]).optional(),
    scale: z
      .union([
        z.tuple([z.union([exprString, z.number()]), z.union([exprString, z.number()])]),
        exprString,
        z.number(),
      ])
      .optional(),
    origin: z.tuple([z.union([exprString, z.number()]), z.union([exprString, z.number()])]).optional(),
  })
  .partial();

// ElementNode는 재귀. lazy + discriminated 대신 loose object + kind 분기.
type ElementSchemaType = z.ZodType<unknown>;
const elementSchema: ElementSchemaType = z.lazy(() =>
  z.object({
    kind: z.string(),
    id: z.string().optional(),
    visible: exprString.optional(),
    opacity: z.union([exprString, z.number()]).optional(),
    transform: transformSchema.optional(),
    style: styleSchema.optional(),
    viewport: z.string().optional(),
    let: z.record(z.string(), exprString).optional(),
  }).catchall(z.unknown()),
);

const sceneStyleSchema = z
  .object({
    color: z.string().optional(),
    icon: z.string().optional(),
  })
  .catchall(z.string())
  .partial();

const sceneSchema = z.object({
  id: z.string().min(1),
  name: i18nTextSchema,
  description: i18nTextSchema.optional(),
  style: sceneStyleSchema.optional(),
  params: z.record(z.string(), z.number()).optional(),
});

const stateDeclSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['number', 'bool', 'string']),
  default: z.union([z.number(), z.boolean(), z.string()]),
  onParamChange: z.string().optional(),
});

const animationSchema = z
  .object({
    onFrame: z
      .array(
        z.object({
          set: z.string().min(1),
          to: exprString,
        }),
      )
      .optional(),
  })
  .partial();

const viewportSchema = z.object({
  kind: z.enum(['time-value', 'fit-box', 'polar', 'frame-rect']),
}).catchall(z.unknown());

const gestureSchema = z.object({
  kind: z.enum(['pointer', 'drag', 'wheel']),
  hitTest: z.unknown().optional(),
  when: exprString.optional(),
  do: z.array(z.unknown()).min(1),
});

const interactionSchema = z
  .object({
    gestures: z.array(gestureSchema).optional(),
  })
  .partial();

const overlayLineSchema = z.object({
  label: i18nTextSchema.optional(),
  value: exprString.optional(),
  format: z.string().optional(),
  visible: exprString.optional(),
  style: z.unknown().optional(),
});

const overlaySchema = z
  .object({
    lines: z.array(overlayLineSchema).optional(),
  })
  .partial();

const localFormulaSchema = z.object({
  id: z.string().min(1),
  label: i18nTextSchema,
  symbol: z.string().optional(),
  expr: exprString,
});

const themeSchema = z
  .object({
    brand: exprString.optional(),
    background: exprString.optional(),
    gridLine: exprString.optional(),
    axis: exprString.optional(),
    text: exprString.optional(),
    divider: exprString.optional(),
  })
  .partial();

const cameraTargetSchema = z.tuple([
  z.union([exprString, z.number()]),
  z.union([exprString, z.number()]),
  z.union([exprString, z.number()]),
]);

const cameraSchema = z.object({
  kind: z.literal('perspective'),
  fov: z.number().positive().optional(),
  near: z.number().positive().optional(),
  far: z.number().positive().optional(),
  state: z.object({
    theta: z.string().min(1),
    phi: z.string().min(1),
    distance: z.string().min(1),
    target: cameraTargetSchema.optional(),
  }),
});

const catalogRefRegex = /^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/;

export const visualizerSpecSchema = z
  .object({
    $schema: z.string().regex(/^fizzex-visualizer\//),
    id: z.string().min(1),
    catalog: z
      .string()
      .regex(catalogRefRegex, 'catalog must be "<category>/<id>"'),
    name: i18nTextSchema,
    description: i18nTextSchema,
    renderer: z.enum(['2d', '3d']),
    displayOptions: z
      .array(z.enum(DISPLAY_OPTION_IDS as [typeof DISPLAY_OPTION_IDS[number], ...typeof DISPLAY_OPTION_IDS[number][]]))
      .optional(),
    scenes: z.array(sceneSchema).min(1, 'at least one scene required'),
    localFormulas: z.array(localFormulaSchema).optional(),
    state: z.array(stateDeclSchema).optional(),
    animation: animationSchema.optional(),
    viewports: z.record(z.string(), viewportSchema),
    camera: cameraSchema.optional(),
    root: elementSchema,
    overlay: overlaySchema.optional(),
    interaction: interactionSchema.optional(),
    theme: themeSchema.optional(),
  })
  .superRefine((spec, ctx) => {
    const sceneIds = new Set<string>();
    for (const [i, scene] of spec.scenes.entries()) {
      if (sceneIds.has(scene.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scenes', i, 'id'],
          message: `duplicate scene id: ${scene.id}`,
        });
      }
      sceneIds.add(scene.id);
    }

    if (spec.localFormulas) {
      const formulaIds = new Set<string>();
      for (const [i, f] of spec.localFormulas.entries()) {
        if (formulaIds.has(f.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['localFormulas', i, 'id'],
            message: `duplicate localFormula id: ${f.id}`,
          });
        }
        formulaIds.add(f.id);
      }
    }

    if (spec.state) {
      const stateIds = new Set<string>();
      for (const [i, s] of spec.state.entries()) {
        if (stateIds.has(s.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['state', i, 'id'],
            message: `duplicate state id: ${s.id}`,
          });
        }
        stateIds.add(s.id);
      }
    }

    if (spec.renderer === '3d' && !spec.camera) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['camera'],
        message: 'camera is required when renderer === "3d"',
      });
    }
    if (spec.renderer === '2d' && spec.camera) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['camera'],
        message: 'camera must not be set when renderer === "2d"',
      });
    }
    if (spec.camera) {
      const stateIds = new Set((spec.state ?? []).map((s) => s.id));
      const refs = spec.camera.state;
      for (const key of ['theta', 'phi', 'distance'] as const) {
        const ref = refs[key];
        if (!stateIds.has(ref)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['camera', 'state', key],
            message: `camera.state.${key} references unknown state id "${ref}"`,
          });
        }
      }
    }
  });
