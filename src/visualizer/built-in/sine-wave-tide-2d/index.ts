/**
 * 사인파 — 조수 (2D).
 *
 * y = A sin(ωt + φ). 해수면 수위가 만조·기준·간조 사이를 오가며 배가 함께 뜬다.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { SineWaveTideRenderer } from './renderer';

export default (function create(): FizzexVisualizer {
  let renderer: SineWaveTideRenderer | null = null;

  return {
    id: 'sine-wave-tide-2d',
    name: '사인파 — 조수',

    parameters: [
      { id: 'A', name: 'A', role: '진폭', min: 0.1, max: 2, default: 1, step: 0.05 },
      { id: '\\omega', name: 'ω', role: '각속도', min: 0.1, max: 8, default: 1, step: 0.1, unit: 'rad/s' },
      { id: '\\varphi', name: 'φ', role: '위상', min: -Math.PI, max: Math.PI, default: 0, step: 0.05, unit: 'rad' },
      { id: 't', name: 't', role: '시간', min: 0, max: 20, default: 0, step: 0.05, unit: 's' },
    ],

    derivedValues: [
      {
        id: 'x',
        label: '변위',
        formulaElement: 'x',
        compute: (p: ParameterValues, ctx?: ComputeContext) => {
          if (ctx?.equationValue != null && Number.isFinite(ctx.equationValue)) {
            return ctx.equationValue;
          }
          const A = p.A ?? 1;
          const omega = p['\\omega'] ?? p.omega ?? 1;
          const phi = p['\\varphi'] ?? p.phi ?? 0;
          const t = p.t ?? 0;
          return A * Math.sin(omega * t + phi);
        },
      },
    ],

    mount(container, options) {
      renderer = new SineWaveTideRenderer(container, options);
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
