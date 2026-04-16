/**
 * 복리 — 2D Visualizer
 *
 * A = P(1 + r/n)^(n·t). n=1이면 연복리 A = P(1+r)^t.
 * 프리셋: 예금/주식/적금/인플레이션 — 같은 수식 구조, 시나리오만 다름.
 *
 * P는 만원 단위. r은 소수(0.03 = 3%). t는 년.
 * Desmos에서 하기 어려운 경험: 경제적으로 유의미한 범위로 묶이고,
 * 원금 기준선 + 72법칙 마커로 "시간이 돈을 번다"를 체감.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { CompoundInterestRenderer } from './renderer';
import { compoundA } from './utils';

const compoundInterestVisualizer: FizzexVisualizer = {
  id: 'compound-interest-2d',
  name: '복리 2D',

  parameters: [
    {
      id: 'P',
      name: 'P',
      role: '원금 (만원)',
      min: 10,
      max: 10000,
      default: 1000,
      step: 10,
      unit: '만원',
    },
    {
      id: 'r',
      name: 'r',
      role: '연이율 (0.03 = 3%)',
      min: 0,
      max: 0.2,
      default: 0.03,
      step: 0.005,
    },
    {
      id: 'n',
      name: 'n',
      role: '연 복리 횟수',
      min: 1,
      max: 12,
      default: 1,
      step: 1,
    },
    {
      id: 't',
      name: 't',
      role: '경과 (년)',
      min: 0,
      max: 40,
      default: 0,
      step: 0.5,
      unit: '년',
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
        const P = p.P ?? 0;
        const r = p.r ?? 0;
        const n = p.n ?? 1;
        const t = p.t ?? 0;
        return compoundA(P, r, n, t);
      },
    },
    {
      id: 'tDouble',
      label: '2배 시점',
      unit: '년',
      compute: (p: ParameterValues) => {
        const r = p.r ?? 0;
        if (r <= 0) return Infinity;
        return Math.log(2) / Math.log(1 + r);
      },
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

  presets: [
    {
      id: 'savings',
      name: '예금',
      description: '안정적인 연 3% 예금 (30년까지)',
      emoji: '🏦',
      values: { P: 1000, r: 0.03, n: 1, t: 10 },
    },
    {
      id: 'stock',
      name: '주식 장기투자',
      description: '연평균 7% 수익률의 장기 투자',
      emoji: '📈',
      values: { P: 1000, r: 0.07, n: 1, t: 10 },
    },
    {
      id: 'deposit',
      name: '고금리 적금',
      description: '소액 5% 적금 — 72법칙 약 14년',
      emoji: '💰',
      values: { P: 100, r: 0.05, n: 1, t: 5 },
    },
    {
      id: 'inflation',
      name: '인플레이션',
      description: '연 3% 인플레이션 — 구매력 감소',
      emoji: '📉',
      values: { P: 1000, r: 0.03, n: 1, t: 20 },
    },
  ],

  mount(container, options) {
    (this as unknown as { _renderer: CompoundInterestRenderer })._renderer =
      new CompoundInterestRenderer(container, options, this.presets);
  },

  update(context) {
    const r = (this as unknown as { _renderer?: CompoundInterestRenderer })._renderer;
    r?.update(context);
  },

  resize(width, height) {
    const r = (this as unknown as { _renderer?: CompoundInterestRenderer })._renderer;
    r?.resize(width, height);
  },

  unmount() {
    const r = (this as unknown as { _renderer?: CompoundInterestRenderer })._renderer;
    r?.destroy();
    delete (this as unknown as { _renderer?: CompoundInterestRenderer })._renderer;
  },
};

export default compoundInterestVisualizer;
