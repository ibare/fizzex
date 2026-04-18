/**
 * 피타고라스 정리 — 지름길 (2D).
 *
 * 직사각형 블록을 L자로 돌아가면 a+b, 가로지르면 c.
 * 정수 세 변(예: 80, 60, 100)에서 절약률을 직관적으로 체감.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { PythagoreanShortcutRenderer } from './renderer';

export default (function create(): FizzexVisualizer {
  let renderer: PythagoreanShortcutRenderer | null = null;

  return {
    id: 'pythagorean-shortcut-2d',
    name: '지름길 — 피타고라스',

    parameters: [
      {
        id: 'a',
        name: 'a',
        role: '블록 가로',
        min: 1,
        max: 200,
        default: 80,
        step: 1,
        unit: 'm',
        scale: 'linear',
      },
      {
        id: 'b',
        name: 'b',
        role: '블록 세로',
        min: 1,
        max: 200,
        default: 60,
        step: 1,
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
      renderer = new PythagoreanShortcutRenderer(container, options);
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
