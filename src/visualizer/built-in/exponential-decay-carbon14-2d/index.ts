/**
 * 지수 감소 — 탄소-14 (2D).
 *
 * N = N₀ e^{rt}. 고대 유물 연대 측정. 단위 시간 ≈ 5,730년(반감기).
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { ExponentialDecayCarbon14Renderer } from './renderer';
import { LN2, decayRatio, halfLifeFromR } from '../_shared/exponential-decay/math';

export default (function create(): FizzexVisualizer {
  let renderer: ExponentialDecayCarbon14Renderer | null = null;

  return {
    id: 'exponential-decay-carbon14-2d',
    name: '지수 감소 — 탄소-14',

    parameters: [
      { id: 'N_0', name: 'N₀', role: '초기 원자 수', min: 1, max: 500, default: 100, step: 1 },
      { id: 'r', name: 'r', role: '증가율 (< 0 : 감소)', min: -2, max: 2, default: -LN2 / 8, step: 0.01 },
      { id: 't', name: 't', role: '경과 (단위)', min: 0, max: 30, default: 0, step: 0.1 },
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
      renderer = new ExponentialDecayCarbon14Renderer(container, options);
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
