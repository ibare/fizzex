/**
 * 지수 감소 — 카페인 (2D).
 *
 * N = N₀ e^{rt}. r < 0 구간. 커피 한 잔의 카페인 반감기 ≈ 5시간.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { ExponentialDecayCaffeineRenderer } from './renderer';
import { LN2, decayRatio, halfLifeFromR } from '../_shared/exponential-decay/math';

export default (function create(): FizzexVisualizer {
  let renderer: ExponentialDecayCaffeineRenderer | null = null;

  return {
    id: 'exponential-decay-caffeine-2d',
    name: '지수 감소 — 카페인',

    parameters: [
      { id: 'N_0', name: 'N₀', role: '초기량 (mg)', min: 1, max: 500, default: 95, step: 1 },
      { id: 'r', name: 'r', role: '증가율 (< 0 : 감소)', min: -2, max: 2, default: -LN2 / 5, step: 0.01 },
      { id: 't', name: 't', role: '경과 (시간)', min: 0, max: 20, default: 0, step: 0.1, unit: '시간' },
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
      renderer = new ExponentialDecayCaffeineRenderer(container, options);
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
