/**
 * 이차함수 자유탐구 (2D).
 *
 * 좌표평면 + 촘촘한 격자 + 포물선 + 꼭짓점·근 마커.
 * a·b·c를 바꾸며 포물선의 변화(폭/방향/이동)를 체감.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { QuadraticSandboxRenderer } from './renderer';

export default (function create(): FizzexVisualizer {
  let renderer: QuadraticSandboxRenderer | null = null;

  return {
    id: 'quadratic-sandbox-2d',
    name: '자유 탐구 — 이차함수',

    parameters: [
      { id: 'a', name: 'a', role: '이차항 계수', min: -2, max: 2, default: 1, step: 0.01 },
      { id: 'b', name: 'b', role: '일차항 계수', min: -10, max: 10, default: 0, step: 0.1 },
      { id: 'c', name: 'c', role: '상수항', min: -20, max: 20, default: 0, step: 0.1 },
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
      renderer = new QuadraticSandboxRenderer(container, options);
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
