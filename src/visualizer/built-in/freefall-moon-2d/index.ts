/**
 * 자유낙하 — 달 (2D).
 *
 * 달 중력가속도 g ≈ 1.625 m/s² (지구의 1/6).
 * 크레이터 지평선 + 우주복 실루엣 + 느리게 떨어지는 공.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { FreefallMoonRenderer } from './renderer';

export default (function create(): FizzexVisualizer {
  let renderer: FreefallMoonRenderer | null = null;

  return {
    id: 'freefall-moon-2d',
    name: '달 자유낙하',

    parameters: [
      { id: 'v_0', name: 'v_0', role: '초기 속도', min: 0, max: 50, default: 0, step: 0.5, unit: 'm/s' },
      { id: 'a', name: 'a', role: '중력 가속도', min: 0.5, max: 30, default: 1.625, step: 0.01, unit: 'm/s²' },
      { id: 't', name: 't', role: '시간', min: 0, max: 10, default: 3, step: 0.05, unit: 's' },
    ],

    derivedValues: [
      {
        id: 's',
        label: '낙하 거리',
        unit: 'm',
        formulaElement: 's',
        compute: (p: ParameterValues, ctx?: ComputeContext) => {
          if (ctx?.equationValue != null && Number.isFinite(ctx.equationValue)) {
            return ctx.equationValue;
          }
          const v0 = p.v_0 ?? 0;
          const a = p.a ?? 0;
          const t = p.t ?? 0;
          return v0 * t + 0.5 * a * t * t;
        },
      },
    ],

    mount(container, options) {
      renderer = new FreefallMoonRenderer(container, options);
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
