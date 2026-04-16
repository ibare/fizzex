/**
 * 이차함수 포물선 — 2D Visualizer
 *
 * y = a x² + b x + c. 계수 a/b/c 각각이 포물선 형태의 어느 측면을 바꾸는지 체감.
 * 프리셋: 자유탐구/다리아치/농구/분수. 각 프리셋은 동일 수식의 다른 현실 맥락.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { QuadraticRenderer } from './renderer';

const quadratic2dVisualizer: FizzexVisualizer = {
  id: 'quadratic-2d',
  name: '이차함수 2D',

  parameters: [
    {
      id: 'a',
      name: 'a',
      role: '이차항 계수',
      min: -2,
      max: 2,
      default: 1,
      step: 0.01,
    },
    {
      id: 'b',
      name: 'b',
      role: '일차항 계수',
      min: -10,
      max: 10,
      default: 0,
      step: 0.1,
    },
    {
      id: 'c',
      name: 'c',
      role: '상수항',
      min: -20,
      max: 20,
      default: 0,
      step: 0.1,
    },
    {
      id: 'x',
      name: 'x',
      role: '현재 관심점',
      min: -10,
      max: 10,
      default: 0,
      step: 0.1,
    },
  ],

  derivedValues: [
    {
      id: 'y',
      label: 'y',
      formulaElement: 'y',
      compute: (p: ParameterValues, ctx?: ComputeContext) => {
        if (ctx?.equationValue != null && Number.isFinite(ctx.equationValue)) {
          return ctx.equationValue;
        }
        const a = p.a ?? 0;
        const b = p.b ?? 0;
        const c = p.c ?? 0;
        const x = p.x ?? 0;
        return a * x * x + b * x + c;
      },
    },
  ],

  presets: [
    {
      id: 'sandbox',
      name: '자유 탐구',
      description: '격자 위의 포물선 — a·b·c 변화 체감',
      emoji: '🔢',
      values: { a: 1, b: 0, c: 0, x: 0 },
    },
    {
      id: 'bridge',
      name: '다리 아치',
      description: '교각과 아치가 그리는 이차함수',
      emoji: '🌉',
      values: { a: -0.05, b: 0, c: 5, x: 0 },
    },
    {
      id: 'basketball',
      name: '농구 자유투',
      description: '발사 높이 → 최고점 → 착지의 궤적',
      emoji: '🏀',
      values: { a: -0.5, b: 2.5, c: 2, x: 2.5 },
    },
    {
      id: 'fountain',
      name: '분수',
      description: '물줄기의 최고 높이 = 꼭짓점',
      emoji: '⛲',
      values: { a: -2, b: 4, c: 0, x: 1 },
    },
  ],

  mount(container, options) {
    (this as unknown as { _renderer: QuadraticRenderer })._renderer =
      new QuadraticRenderer(container, options, this.presets);
  },

  update(context) {
    const r = (this as unknown as { _renderer?: QuadraticRenderer })._renderer;
    r?.update(context);
  },

  resize(width, height) {
    const r = (this as unknown as { _renderer?: QuadraticRenderer })._renderer;
    r?.resize(width, height);
  },

  unmount() {
    const r = (this as unknown as { _renderer?: QuadraticRenderer })._renderer;
    r?.destroy();
    delete (this as unknown as { _renderer?: QuadraticRenderer })._renderer;
  },
};

export default quadratic2dVisualizer;
