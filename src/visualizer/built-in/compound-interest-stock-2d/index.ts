/**
 * 복리 — 주식 장기투자 (2D).
 *
 * A = P(1 + r/n)^(n·t). 연평균 7% 장기 투자 시나리오, 40년.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { CompoundInterestStockRenderer } from './renderer';
import { compoundA, doubleTime } from '../_shared/compound-interest/math';

export default (function create(): FizzexVisualizer {
  let renderer: CompoundInterestStockRenderer | null = null;

  return {
    id: 'compound-interest-stock-2d',
    name: '복리 — 주식 장기투자',

    parameters: [
      { id: 'P', name: 'P', role: '원금 (만원)', min: 10, max: 10000, default: 1000, step: 10, unit: '만원' },
      { id: 'r', name: 'r', role: '연 수익률 (0.07 = 7%)', min: 0, max: 0.2, default: 0.07, step: 0.005 },
      { id: 'n', name: 'n', role: '연 복리 횟수', min: 1, max: 12, default: 1, step: 1 },
      { id: 't', name: 't', role: '경과 (년)', min: 0, max: 40, default: 10, step: 0.5, unit: '년' },
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
        label: '2배 시점',
        unit: '년',
        compute: (p: ParameterValues) => doubleTime(p.r ?? 0),
      },
    ],

    mount(container, options) {
      renderer = new CompoundInterestStockRenderer(container, options);
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
