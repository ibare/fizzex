/**
 * 이차함수 — 분수 (2D).
 *
 * a<0 포물선 = 하나의 물줄기. 꼭짓점 = 최고점.
 * |a|가 작을수록 더 높이 솟는다.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { QuadraticFountainRenderer } from './renderer';

export default (function create(): FizzexVisualizer {
  let renderer: QuadraticFountainRenderer | null = null;

  return {
    id: 'quadratic-fountain-2d',
    name: '분수 — 이차함수',

    parameters: [
      { id: 'a', name: 'a', role: '이차항 계수', min: -2, max: 2, default: -2, step: 0.01 },
      { id: 'b', name: 'b', role: '일차항 계수', min: -10, max: 10, default: 4, step: 0.1 },
      { id: 'c', name: 'c', role: '상수항', min: -20, max: 20, default: 0, step: 0.1 },
      { id: 'x', name: 'x', role: '현재 관심점', min: -10, max: 10, default: 1, step: 0.1 },
    ],

    derivedValues: [
      {
        id: 'y',
        label: 'y',
        formulaElement: 'y',
        compute: (p: ParameterValues, ctx?: ComputeContext) => {
          if (ctx?.equationValue != null && Number.isFinite(ctx.equationValue)) {
            return ctx.equationValue;
          }
          const a = p.a ?? 0;
          const b = p.b ?? 0;
          const c = p.c ?? 0;
          const x = p.x ?? 0;
          return a * x * x + b * x + c;
        },
      },
    ],

    mount(container, options) {
      renderer = new QuadraticFountainRenderer(container, options);
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
