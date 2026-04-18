/**
 * 지수 감소 — 약물 혈중 농도 (2D).
 *
 * N = N₀ e^{rt}. 진통제 반감기 ≈ 2시간.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { ExponentialDecayDrugRenderer } from './renderer';
import { LN2, decayRatio, halfLifeFromR } from '../_shared/exponential-decay/math';

export default (function create(): FizzexVisualizer {
  let renderer: ExponentialDecayDrugRenderer | null = null;

  return {
    id: 'exponential-decay-drug-2d',
    name: '지수 감소 — 약물',

    parameters: [
      { id: 'N_0', name: 'N₀', role: '초기 용량 (mg)', min: 1, max: 1000, default: 400, step: 10 },
      { id: 'r', name: 'r', role: '증가율 (< 0 : 감소)', min: -2, max: 2, default: -LN2 / 2, step: 0.01 },
      { id: 't', name: 't', role: '경과 (시간)', min: 0, max: 12, default: 0, step: 0.1, unit: '시간' },
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
      renderer = new ExponentialDecayDrugRenderer(container, options);
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
