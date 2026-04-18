/**
 * 피타고라스 정리 — 사다리 (2D).
 *
 * 벽에 기댄 사다리. a(바닥거리), b(닿은 높이), c(사다리 길이).
 * 바닥각이 70~80°일 때 안전. 이 각도에서 a:b≈1:4.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { PythagoreanLadderRenderer } from './renderer';

export default (function create(): FizzexVisualizer {
  let renderer: PythagoreanLadderRenderer | null = null;

  return {
    id: 'pythagorean-ladder-2d',
    name: '사다리 — 피타고라스',

    parameters: [
      {
        id: 'a',
        name: 'a',
        role: '바닥 거리',
        min: 0.1,
        max: 10,
        default: 1.2,
        step: 0.1,
        unit: 'm',
        scale: 'linear',
      },
      {
        id: 'b',
        name: 'b',
        role: '사다리 높이',
        min: 0.1,
        max: 10,
        default: 4.8,
        step: 0.1,
        unit: 'm',
        scale: 'linear',
      },
    ],

    derivedValues: [
      {
        id: 'c',
        label: '사다리 길이',
        unit: 'm',
        formulaElement: 'c',
        compute: (p: ParameterValues, ctx?: ComputeContext) => {
          if (ctx?.equationValue != null && Number.isFinite(ctx.equationValue) && ctx.equationValue > 0) {
            return ctx.equationValue;
          }
          const a = p.a ?? 0;
          const b = p.b ?? 0;
          return Math.sqrt(a * a + b * b);
        },
      },
    ],

    mount(container, options) {
      renderer = new PythagoreanLadderRenderer(container, options);
    },
    update(context) {
      renderer?.update(context);
    },
    resize(width, height) {
      renderer?.resize(width, height);
    },
    unmount() {
      renderer?.destroy();
      renderer = null;
    },
  };
})();
