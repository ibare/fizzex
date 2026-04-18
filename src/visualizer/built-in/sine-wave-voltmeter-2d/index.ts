/**
 * 사인파 — 교류 전압계 (2D).
 *
 * y = A sin(ωt + φ). 가정용 220Vrms(peak ≈ 311V) 교류를 아날로그 바늘과 디지털로 동시에 표시.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { SineWaveVoltmeterRenderer } from './renderer';

export default (function create(): FizzexVisualizer {
  let renderer: SineWaveVoltmeterRenderer | null = null;

  return {
    id: 'sine-wave-voltmeter-2d',
    name: '사인파 — 전압계',

    parameters: [
      { id: 'A', name: 'A', role: '진폭', min: 0.1, max: 2, default: 1, step: 0.05 },
      { id: '\\omega', name: 'ω', role: '각속도', min: 0.1, max: 8, default: 3, step: 0.1, unit: 'rad/s' },
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
      renderer = new SineWaveVoltmeterRenderer(container, options);
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
