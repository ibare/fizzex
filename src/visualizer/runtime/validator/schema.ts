/**
 * VisualizerSpec zod 스키마 (설계 §14.2).
 * 런타임 · 편집기 · 테스트 공용 단일 진실.
 */

import { z } from 'zod';
import { DISPLAY_OPTION_IDS } from '../types/display-options.js';

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
    let: z.record(z.string(), z.union([exprString, z.number(), z.boolean()])).optional(),
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

const outputKindSchema = z.enum(['scalar', 'matrix', 'complex']);

const userBindingSchema = z.object({
  name: z.string().min(1),
  description: i18nTextSchema.optional(),
  outputKind: outputKindSchema,
  required: z.boolean(),
});

const derivativeSchema = z.object({
  source: z.string().min(1),
  variable: z.string().min(1),
  order: z.literal(1),
  binding: z.string().min(1),
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

const cameraLookAtSchema = z.tuple([
  z.union([exprString, z.number()]),
  z.union([exprString, z.number()]),
  z.union([exprString, z.number()]),
]);

const cameraControlsSchema = z
  .object({
    autoRotate: z.boolean().optional(),
    autoRotateSpeed: z.number().optional(),
    minDistance: z.number().positive().optional(),
    maxDistance: z.number().positive().optional(),
    enableZoom: z.boolean().optional(),
    enableRotate: z.boolean().optional(),
    enablePan: z.boolean().optional(),
    dampingFactor: z.number().min(0).max(1).optional(),
  })
  .strict();

const cameraSchema = z.object({
  kind: z.literal('perspective'),
  fov: z.number().positive().optional(),
  near: z.number().positive().optional(),
  far: z.number().positive().optional(),
  distance: z.union([exprString, z.number()]),
  theta: z.union([exprString, z.number()]),
  phi: z.union([exprString, z.number()]),
  lookAt: cameraLookAtSchema.optional(),
  controls: cameraControlsSchema.optional(),
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
    userBindings: z.array(userBindingSchema).optional(),
    derivatives: z.array(derivativeSchema).optional(),
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

    if (spec.userBindings) {
      const bindingNames = new Set<string>();
      for (const [i, b] of spec.userBindings.entries()) {
        if (bindingNames.has(b.name)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['userBindings', i, 'name'],
            message: `duplicate userBindings.name: ${b.name}`,
          });
        }
        bindingNames.add(b.name);
      }

      // scalar 의 required binding 만 scenes[].params 에 fallback 기본값이 있어야 한다.
      // matrix·complex 는 호스트가 LaTeX AST 채널로 주입되며 scene preset (Record<string,number>)
      // 으로는 표현할 수 없으므로 검증 대상에서 제외 (V3).
      for (const [bi, b] of spec.userBindings.entries()) {
        if (!b.required) continue;
        if (b.outputKind !== 'scalar') continue;
        for (const [si, scene] of spec.scenes.entries()) {
          const params = (scene.params ?? {}) as Record<string, number>;
          if (!(b.name in params)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['userBindings', bi, 'name'],
              message: `required scalar userBinding "${b.name}" missing in scenes[${si}].params (id: ${scene.id})`,
            });
          }
        }
      }
    }

    if (spec.derivatives) {
      const bindingByName = new Map<string, z.infer<typeof userBindingSchema>>();
      for (const b of spec.userBindings ?? []) bindingByName.set(b.name, b);

      const userBindingNames = new Set(bindingByName.keys());
      const derivativeBindings = new Set<string>();

      for (const [i, d] of spec.derivatives.entries()) {
        const source = bindingByName.get(d.source);
        if (!source) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['derivatives', i, 'source'],
            message: `unknown userBindings.source: ${d.source}`,
          });
        } else if (source.outputKind !== 'scalar') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['derivatives', i, 'source'],
            message: `derivative source "${d.source}" must be scalar (got ${source.outputKind})`,
          });
        }

        if (userBindingNames.has(d.binding)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['derivatives', i, 'binding'],
            message: `derivative binding "${d.binding}" collides with userBindings.name`,
          });
        }

        if (derivativeBindings.has(d.binding)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['derivatives', i, 'binding'],
            message: `duplicate derivative binding: ${d.binding}`,
          });
        }
        derivativeBindings.add(d.binding);
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
  });
