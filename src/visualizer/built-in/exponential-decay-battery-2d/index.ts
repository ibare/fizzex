/**
 * 지수 감소 — 배터리 (2D).
 *
 * N = N₀ e^{rt}. 스마트폰 방전의 교육적 근사. 반감기 ≈ 3시간.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { ExponentialDecayBatteryRenderer } from './renderer';
import { LN2, decayRatio, halfLifeFromR } from '../_shared/exponential-decay/math';

export default (function create(): FizzexVisualizer {
  let renderer: ExponentialDecayBatteryRenderer | null = null;

  return {
    id: 'exponential-decay-battery-2d',
    name: '지수 감소 — 배터리',

    parameters: [
      { id: 'N_0', name: 'N₀', role: '초기 잔량 (%)', min: 1, max: 100, default: 100, step: 1 },
      { id: 'r', name: 'r', role: '증가율 (< 0 : 감소)', min: -2, max: 2, default: -LN2 / 3, step: 0.01 },
      { id: 't', name: 't', role: '경과 (시간)', min: 0, max: 15, default: 0, step: 0.1, unit: '시간' },
    ],

    derivedValues: [
      {
        id: 'N',
        label: 'N',
        formulaElement: 'N(t)',
        compute: (p: ParameterValues, ctx?: ComputeContext) => {
          if (ctx?.equationValue != null && Number.isFinite(ctx.equationValue)) {
            return ctx.equationValue;
          }
          return (p.N_0 ?? 1) * decayRatio(p.r ?? 0, p.t ?? 0);
        },
      },
      {
        id: 'halfLife',
        label: '반감기 t½',
        compute: (p: ParameterValues) => halfLifeFromR(p.r ?? 0),
      },
    ],

    mount(container, options) {
      renderer = new ExponentialDecayBatteryRenderer(container, options);
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
