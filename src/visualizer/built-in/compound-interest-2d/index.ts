/**
 * 복리 — 2D (통합).
 *
 * A = P(1 + r/n)^(n·t). 앵커(예금/주식/적금/인플레이션)로 현실 시나리오를 전환하며
 * 배증 주기와 복리의 가속 효과를 체감한다.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { CompoundInterest2DRenderer } from './renderer';
import { compoundA, doubleTime } from '../_shared/compound-interest/math';

export default (function create(): FizzexVisualizer {
  let renderer: CompoundInterest2DRenderer | null = null;

  return {
    id: 'compound-interest-2d',
    name: '복리 — 2D',

    parameters: [
      { id: 'P', name: 'P', role: '원금 (만원)', min: 10, max: 10000, default: 1000, step: 10, unit: '만원' },
      { id: 'r', name: 'r', role: '연이율 (0.03 = 3%)', min: 0, max: 0.2, default: 0.03, step: 0.005 },
      { id: 'n', name: 'n', role: '연 복리 횟수', min: 1, max: 12, default: 1, step: 1 },
      { id: 't', name: 't', role: '경과 (년)', min: 0, max: 40, default: 10, step: 0.5, unit: '년' },
    ],

    anchors: [
      {
        id: 'savings',
        name: '예금',
        icon: '🏦',
        description: '연 3% 일반 예금 시나리오',
        params: { P: 1000, r: 0.03, n: 1, t: 10 },
      },
      {
        id: 'stock',
        name: '주식 장기투자',
        icon: '📈',
        description: '연평균 7% 장기 투자',
        params: { P: 1000, r: 0.07, n: 1, t: 10 },
      },
      {
        id: 'deposit',
        name: '고금리 적금',
        icon: '💰',
        description: '연 5% 적금 — 72법칙 약 14년',
        params: { P: 100, r: 0.05, n: 1, t: 5 },
      },
      {
        id: 'inflation',
        name: '인플레이션',
        icon: '🛒',
        description: '연 3% 인플레이션 — 구매력 감소',
        params: { P: 1000, r: 0.03, n: 1, t: 20 },
      },
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
        label: '배증 주기',
        unit: '년',
        compute: (p: ParameterValues) => doubleTime(p.r ?? 0),
      },
      {
        id: 'purchasingPower',
        label: '현재가치',
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
      renderer = new CompoundInterest2DRenderer(container, options);
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
