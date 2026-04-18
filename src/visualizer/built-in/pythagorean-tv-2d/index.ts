/**
 * 피타고라스 정리 — TV 화면 (2D).
 *
 * 화면 가로·세로(m)에서 대각선을 구해 인치로 환산한다.
 * 55인치 16:9 예: 가로 1.218m, 세로 0.685m → c ≈ 1.397m ≈ 55인치.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { PythagoreanTvRenderer } from './renderer';

export default (function create(): FizzexVisualizer {
  let renderer: PythagoreanTvRenderer | null = null;

  return {
    id: 'pythagorean-tv-2d',
    name: 'TV 화면 — 피타고라스',

    parameters: [
      {
        id: 'a',
        name: 'a',
        role: '화면 가로',
        min: 0.1,
        max: 3,
        default: 1.218,
        step: 0.001,
        unit: 'm',
        scale: 'linear',
      },
      {
        id: 'b',
        name: 'b',
        role: '화면 세로',
        min: 0.1,
        max: 2,
        default: 0.685,
        step: 0.001,
        unit: 'm',
        scale: 'linear',
      },
    ],

    derivedValues: [
      {
        id: 'c',
        label: '대각선',
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
      renderer = new PythagoreanTvRenderer(container, options);
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
