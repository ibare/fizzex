/**
 * 피타고라스 정리 — 자유탐구 (2D).
 *
 * a² + b² = c² 을 직각삼각형과 세 변 위의 정사각형으로 시각화.
 * 현실 맥락 장식 없이 순수 기하학적 증명 다이어그램만 보여준다.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { PythagoreanExploreRenderer } from './renderer';

export default (function create(): FizzexVisualizer {
  let renderer: PythagoreanExploreRenderer | null = null;

  return {
    id: 'pythagorean-explore-2d',
    name: '피타고라스 자유탐구',

    parameters: [
      {
        id: 'a',
        name: 'a',
        role: '직각변',
        min: 0.1,
        max: 200,
        default: 3,
        step: 0.1,
        unit: 'm',
        scale: 'log',
      },
      {
        id: 'b',
        name: 'b',
        role: '직각변',
        min: 0.1,
        max: 200,
        default: 4,
        step: 0.1,
        unit: 'm',
        scale: 'log',
      },
    ],

    derivedValues: [
      {
        id: 'c',
        label: '빗변',
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
      renderer = new PythagoreanExploreRenderer(container, options);
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
