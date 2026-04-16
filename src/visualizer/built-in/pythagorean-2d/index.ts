/**
 * 피타고라스 정리 — 2D Visualizer
 *
 * a^2 + b^2 = c^2
 * 직각삼각형 + 세 정사각형 추상 시각화 위에 4개 프리셋(자유탐구/사다리/TV/지름길)의
 * 현실 장면이 붙는다. 같은 삼각형이 맥락에 따라 다른 의미를 갖는 체감을 준다.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { PythagoreanRenderer } from './renderer';

const pythagorean2dVisualizer: FizzexVisualizer = {
  id: 'pythagorean-2d',
  name: '직각삼각형 2D',

  parameters: [
    {
      id: 'a',
      name: 'a',
      role: '직각변',
      min: 0.1,
      max: 200,
      default: 3,
      step: 0.1,
      unit: 'm',
      scale: 'log',
    },
    {
      id: 'b',
      name: 'b',
      role: '직각변',
      min: 0.1,
      max: 200,
      default: 4,
      step: 0.1,
      unit: 'm',
      scale: 'log',
    },
  ],

  derivedValues: [
    {
      id: 'c',
      label: '빗변',
      unit: 'm',
      formulaElement: 'c',
      compute: (p: ParameterValues, ctx?: ComputeContext) => {
        // AST가 `c = sqrt(a^2 + b^2)` 형태로 변형되면 equationValue로 c가 풀린다.
        // 표준 형태 `a^2 + b^2 = c^2`에서는 equationValue가 c를 풀지 못하므로
        // 아래 fallback이 작동한다. 두 경로 모두 수식 기반(=카탈로그 의미)에 부합.
        if (ctx?.equationValue != null && Number.isFinite(ctx.equationValue) && ctx.equationValue > 0) {
          return ctx.equationValue;
        }
        const a = p.a ?? 0;
        const b = p.b ?? 0;
        return Math.sqrt(a * a + b * b);
      },
    },
  ],

  presets: [
    {
      id: 'explore',
      name: '자유탐구',
      description: '격자 위에서 정수 변의 관계를 탐색',
      emoji: '🔺',
      values: { a: 3, b: 4 },
    },
    {
      id: 'ladder',
      name: '사다리',
      description: '벽에 기댄 사다리 — 각도와 안전성',
      emoji: '🪜',
      values: { a: 1.2, b: 4.8 },
    },
    {
      id: 'tv',
      name: 'TV 화면',
      description: '16:9 55인치 — 대각선이 인치',
      emoji: '📺',
      values: { a: 1.218, b: 0.685 },
    },
    {
      id: 'shortcut',
      name: '지름길',
      description: '블록을 돌기 vs 가로지르기',
      emoji: '🚶',
      values: { a: 80, b: 60 },
    },
  ],

  // ─── 라이프사이클 ───

  mount(container, options) {
    (this as unknown as { _renderer: PythagoreanRenderer })._renderer =
      new PythagoreanRenderer(container, options, this.presets);
  },

  update(context) {
    const r = (this as unknown as { _renderer?: PythagoreanRenderer })._renderer;
    r?.update(context);
  },

  resize(width, height) {
    const r = (this as unknown as { _renderer?: PythagoreanRenderer })._renderer;
    r?.resize(width, height);
  },

  unmount() {
    const r = (this as unknown as { _renderer?: PythagoreanRenderer })._renderer;
    r?.destroy();
    delete (this as unknown as { _renderer?: PythagoreanRenderer })._renderer;
  },
};

export default pythagorean2dVisualizer;
