/**
 * 복리 — 인플레이션 (2D).
 *
 * A = P(1 + r/n)^(n·t). 연 3% 인플레이션 — 구매력(P²/A) 감소 역방향 시각화.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { CompoundInterestInflationRenderer } from './renderer';
import { compoundA, doubleTime } from '../_shared/compound-interest/math';

export default (function create(): FizzexVisualizer {
  let renderer: CompoundInterestInflationRenderer | null = null;

  return {
    id: 'compound-interest-inflation-2d',
    name: '복리 — 인플레이션',

    parameters: [
      { id: 'P', name: 'P', role: '원금 (만원)', min: 10, max: 10000, default: 1000, step: 10, unit: '만원' },
      { id: 'r', name: 'r', role: '연 인플레이션율 (0.03 = 3%)', min: 0, max: 0.2, default: 0.03, step: 0.005 },
      { id: 'n', name: 'n', role: '연 복리 횟수', min: 1, max: 12, default: 1, step: 1 },
      { id: 't', name: 't', role: '경과 (년)', min: 0, max: 30, default: 20, step: 0.5, unit: '년' },
    ],

    derivedValues: [
      {
        id: 'A',
        label: 'A',
        formulaElement: 'A',
        unit: '만원',
        compute: (p: ParameterValues, ctx?: ComputeContext) => {
          if (ctx?.equationValue != null && Number.isFinite(ctx.equationValue)) {
            return ctx.equationValue;
          }
          return compoundA(p.P ?? 0, p.r ?? 0, p.n ?? 1, p.t ?? 0);
        },
      },
      {
        id: 'tDouble',
        label: '절반 시점',
        unit: '년',
        compute: (p: ParameterValues) => doubleTime(p.r ?? 0),
      },
      {
        id: 'purchasingPower',
        label: '구매력',
        unit: '만원',
        compute: (p: ParameterValues, ctx?: ComputeContext) => {
          const P = p.P ?? 0;
          const A = ctx?.equationValue ?? ctx?.derived?.A
            ?? compoundA(P, p.r ?? 0, p.n ?? 1, p.t ?? 0);
          return A > 0 ? (P * P) / A : 0;
        },
      },
    ],

    mount(container, options) {
      renderer = new CompoundInterestInflationRenderer(container, options);
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
