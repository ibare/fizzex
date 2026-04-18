/**
 * 복리 — 고금리 적금 (2D).
 *
 * A = P(1 + r/n)^(n·t). 소액 5% 적금 — 72법칙 약 14년.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { CompoundInterestDepositRenderer } from './renderer';
import { compoundA, doubleTime } from '../_shared/compound-interest/math';

export default (function create(): FizzexVisualizer {
  let renderer: CompoundInterestDepositRenderer | null = null;

  return {
    id: 'compound-interest-deposit-2d',
    name: '복리 — 고금리 적금',

    parameters: [
      { id: 'P', name: 'P', role: '원금 (만원)', min: 10, max: 5000, default: 100, step: 10, unit: '만원' },
      { id: 'r', name: 'r', role: '연이율 (0.05 = 5%)', min: 0, max: 0.2, default: 0.05, step: 0.005 },
      { id: 'n', name: 'n', role: '연 복리 횟수', min: 1, max: 12, default: 1, step: 1 },
      { id: 't', name: 't', role: '경과 (년)', min: 0, max: 20, default: 5, step: 0.5, unit: '년' },
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
      renderer = new CompoundInterestDepositRenderer(container, options);
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
