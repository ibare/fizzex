/**
 * 지수 감소 — 2D (통합).
 *
 * N = N₀ e^{rt}. 앵커(카페인/배터리/탄소-14/약물)로 현실 비유를 전환하며
 * 반감기의 일정성을 체감한다.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { ExponentialDecay2DRenderer } from './renderer';
import { LN2, decayRatio, halfLifeFromR } from '../_shared/exponential-decay/math';

export default (function create(): FizzexVisualizer {
  let renderer: ExponentialDecay2DRenderer | null = null;

  return {
    id: 'exponential-decay-2d',
    name: '지수 감소 — 2D',

    parameters: [
      { id: 'N_0', name: 'N₀', role: '초기량', min: 1, max: 1000, default: 95, step: 1 },
      { id: 'r', name: 'r', role: '증가율 (< 0 : 감소)', min: -2, max: 2, default: -LN2 / 5, step: 0.01 },
      { id: 't', name: 't', role: '경과 시간', min: 0, max: 30, default: 0, step: 0.1 },
    ],

    anchors: [
      {
        id: 'caffeine',
        name: '카페인',
        icon: '☕',
        description: '커피 한 잔의 카페인 — 반감기 ≈ 5시간',
        params: { N_0: 95, r: -LN2 / 5 },
      },
      {
        id: 'battery',
        name: '배터리',
        icon: '🔋',
        description: '스마트폰 방전 근사 — 반감기 ≈ 3시간',
        params: { N_0: 100, r: -LN2 / 3 },
      },
      {
        id: 'carbon14',
        name: '탄소-14',
        icon: '⚛️',
        description: '고대 유물 연대 측정 — 단위 시간 ≈ 5,730년',
        params: { N_0: 100, r: -LN2 / 8 },
      },
      {
        id: 'drug',
        name: '약물',
        icon: '💊',
        description: '진통제 혈중 농도 — 반감기 ≈ 2시간',
        params: { N_0: 400, r: -LN2 / 2 },
      },
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
      renderer = new ExponentialDecay2DRenderer(container, options);
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
