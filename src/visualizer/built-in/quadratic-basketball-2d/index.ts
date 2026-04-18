/**
 * 이차함수 — 농구 자유투 (2D).
 *
 * 포물선 = 농구공의 궤적. c = 발사 높이, 꼭짓점 = 최고점, 두 번째 근 = 착지점.
 * x 슬라이더로 공의 현재 위치를 움직여 본다.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { QuadraticBasketballRenderer } from './renderer';

export default (function create(): FizzexVisualizer {
  let renderer: QuadraticBasketballRenderer | null = null;

  return {
    id: 'quadratic-basketball-2d',
    name: '농구 자유투 — 이차함수',

    parameters: [
      { id: 'a', name: 'a', role: '이차항 계수', min: -2, max: 2, default: -0.5, step: 0.01 },
      { id: 'b', name: 'b', role: '일차항 계수', min: -10, max: 10, default: 2.5, step: 0.1 },
      { id: 'c', name: 'c', role: '상수항', min: -20, max: 20, default: 2, step: 0.1 },
      { id: 'x', name: 'x', role: '현재 관심점', min: -10, max: 10, default: 2.5, step: 0.1 },
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
      renderer = new QuadraticBasketballRenderer(container, options);
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
