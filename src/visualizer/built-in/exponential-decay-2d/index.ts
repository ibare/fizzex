/**
 * 지수 감소 / 반감기 — 2D Visualizer
 *
 * N = N₀ e^{rt}. r < 0이면 지수 감소. 반감기 t_½ = ln(2)/|r|.
 * exponential-growth AST를 재활용 (감소는 r<0 구간).
 * 프리셋: 카페인/탄소-14/약물/배터리 — 모두 음수 r, 반감기 상수.
 *
 * 시간 단위는 장면 내부에서 해석 (5단위 = 5시간 | 5,730년 | 3시간 등).
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { ExponentialDecayRenderer } from './renderer';

const LN2 = Math.log(2);

const quadratic2dVisualizer: FizzexVisualizer = {
  id: 'exponential-decay-2d',
  name: '지수 감소 2D',

  parameters: [
    {
      id: 'N_0',
      name: 'N₀',
      role: '초기량',
      min: 1,
      max: 500,
      default: 95,
      step: 1,
    },
    {
      id: 'r',
      name: 'r',
      role: '증가율 (< 0 : 감소)',
      min: -2,
      max: 2,
      default: -LN2 / 5,
      step: 0.01,
    },
    {
      id: 't',
      name: 't',
      role: '경과 시간',
      min: 0,
      max: 30,
      default: 0,
      step: 0.1,
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
        const N0 = p.N_0 ?? 1;
        const r = p.r ?? 0;
        const t = p.t ?? 0;
        return N0 * Math.exp(r * t);
      },
    },
    {
      id: 'halfLife',
      label: '반감기 t½',
      compute: (p: ParameterValues) => {
        const r = p.r ?? 0;
        if (r >= 0) return Infinity;
        return LN2 / -r;
      },
    },
  ],

  presets: [
    {
      id: 'caffeine',
      name: '카페인',
      description: '커피 한 잔의 카페인이 사라지는 과정 (반감기 5시간)',
      emoji: '☕',
      values: { N_0: 95, r: -LN2 / 5, t: 0 },
    },
    {
      id: 'carbon14',
      name: '탄소-14',
      description: '고대 유물의 연대 측정 (반감기 5,730년)',
      emoji: '⚛️',
      values: { N_0: 100, r: -LN2 / 8, t: 0 },
    },
    {
      id: 'drug',
      name: '약물',
      description: '진통제 혈중 농도 (반감기 2시간)',
      emoji: '💊',
      values: { N_0: 400, r: -LN2 / 2, t: 0 },
    },
    {
      id: 'battery',
      name: '배터리',
      description: '스마트폰 배터리 방전 (교육적 근사, 반감기 3시간)',
      emoji: '🔋',
      values: { N_0: 100, r: -LN2 / 3, t: 0 },
    },
  ],

  mount(container, options) {
    (this as unknown as { _renderer: ExponentialDecayRenderer })._renderer =
      new ExponentialDecayRenderer(container, options, this.presets);
  },

  update(context) {
    const r = (this as unknown as { _renderer?: ExponentialDecayRenderer })._renderer;
    r?.update(context);
  },

  resize(width, height) {
    const r = (this as unknown as { _renderer?: ExponentialDecayRenderer })._renderer;
    r?.resize(width, height);
  },

  unmount() {
    const r = (this as unknown as { _renderer?: ExponentialDecayRenderer })._renderer;
    r?.destroy();
    delete (this as unknown as { _renderer?: ExponentialDecayRenderer })._renderer;
  },
};

export default quadratic2dVisualizer;
