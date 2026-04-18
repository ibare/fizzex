/**
 * 자유낙하 — 화성 (2D).
 *
 * 화성 중력가속도 g ≈ 3.721 m/s² (지구의 ~38%).
 * 붉은 지형과 탐사 로버 실루엣.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { FreefallMarsRenderer } from './renderer';

export default (function create(): FizzexVisualizer {
  let renderer: FreefallMarsRenderer | null = null;

  return {
    id: 'freefall-mars-2d',
    name: '화성 자유낙하',

    parameters: [
      { id: 'v_0', name: 'v_0', role: '초기 속도', min: 0, max: 50, default: 0, step: 0.5, unit: 'm/s' },
      { id: 'a', name: 'a', role: '중력 가속도', min: 0.5, max: 30, default: 3.721, step: 0.01, unit: 'm/s²' },
      { id: 't', name: 't', role: '시간', min: 0, max: 10, default: 2.5, step: 0.05, unit: 's' },
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
      renderer = new FreefallMarsRenderer(container, options);
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
