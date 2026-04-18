/**
 * 이차함수 — 다리 아치 (2D).
 *
 * a<0 포물선을 다리 아치로 매핑.
 * 근 = 교각 위치 · 꼭짓점 = 아치 정점 높이.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { QuadraticBridgeRenderer } from './renderer';

export default (function create(): FizzexVisualizer {
  let renderer: QuadraticBridgeRenderer | null = null;

  return {
    id: 'quadratic-bridge-2d',
    name: '다리 아치 — 이차함수',

    parameters: [
      { id: 'a', name: 'a', role: '이차항 계수', min: -2, max: 2, default: -0.05, step: 0.01 },
      { id: 'b', name: 'b', role: '일차항 계수', min: -10, max: 10, default: 0, step: 0.1 },
      { id: 'c', name: 'c', role: '상수항', min: -20, max: 20, default: 5, step: 0.1 },
      { id: 'x', name: 'x', role: '현재 관심점', min: -10, max: 10, default: 0, step: 0.1 },
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
      renderer = new QuadraticBridgeRenderer(container, options);
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
