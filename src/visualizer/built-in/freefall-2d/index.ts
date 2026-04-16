/**
 * 자유낙하 — 2D Visualizer
 *
 * s = v_0 t + 1/2 a t^2 (등가속도 운동 변위). v_0 = 0 기본, a = 행성 중력가속도.
 * 프리셋: 지구/달/화성/목성 — 같은 t에서 행성별 낙하거리 차이를 체감.
 * correct(프리셋 표준 g)과 current(사용자 편집 g) 이중 포물선으로
 * "상수 편집 금지 원칙"이 선명하게 드러나도록 설계.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { FreefallRenderer } from './renderer';

const freefall2dVisualizer: FizzexVisualizer = {
  id: 'freefall-2d',
  name: '자유낙하 2D',

  parameters: [
    {
      id: 'v_0',
      name: 'v_0',
      role: '초기 속도',
      min: 0,
      max: 50,
      default: 0,
      step: 0.5,
      unit: 'm/s',
    },
    {
      id: 'a',
      name: 'a',
      role: '중력 가속도',
      min: 0.5,
      max: 30,
      default: 9.807,
      step: 0.01,
      unit: 'm/s²',
    },
    {
      id: 't',
      name: 't',
      role: '시간',
      min: 0,
      max: 10,
      default: 1.5,
      step: 0.05,
      unit: 's',
    },
  ],

  derivedValues: [
    {
      id: 's',
      label: '낙하 거리',
      unit: 'm',
      formulaElement: 's',
      compute: (p: ParameterValues, ctx?: ComputeContext) => {
        if (ctx?.equationValue != null && Number.isFinite(ctx.equationValue)) {
          return ctx.equationValue;
        }
        const v0 = p.v_0 ?? 0;
        const a = p.a ?? 0;
        const t = p.t ?? 0;
        return v0 * t + 0.5 * a * t * t;
      },
    },
  ],

  presets: [
    {
      id: 'earth',
      name: '지구',
      description: '도시 건물 측면 — 63빌딩/롯데타워 이정표',
      emoji: '🌍',
      values: { v_0: 0, a: 9.807, t: 1.5 },
    },
    {
      id: 'moon',
      name: '달',
      description: '크레이터 지평선 — 지구의 1/6 중력',
      emoji: '🌙',
      values: { v_0: 0, a: 1.625, t: 3 },
    },
    {
      id: 'mars',
      name: '화성',
      description: '붉은 지형과 탐사 로버 — 38% 중력',
      emoji: '🔴',
      values: { v_0: 0, a: 3.721, t: 2.5 },
    },
    {
      id: 'jupiter',
      name: '목성',
      description: '가스 행성 대기 — 지구의 2.5배 중력',
      emoji: '🟠',
      values: { v_0: 0, a: 24.79, t: 1 },
    },
  ],

  mount(container, options) {
    (this as unknown as { _renderer: FreefallRenderer })._renderer =
      new FreefallRenderer(container, options, this.presets);
  },

  update(context) {
    const r = (this as unknown as { _renderer?: FreefallRenderer })._renderer;
    r?.update(context);
  },

  resize(width, height) {
    const r = (this as unknown as { _renderer?: FreefallRenderer })._renderer;
    r?.resize(width, height);
  },

  unmount() {
    const r = (this as unknown as { _renderer?: FreefallRenderer })._renderer;
    r?.destroy();
    delete (this as unknown as { _renderer?: FreefallRenderer })._renderer;
  },
};

export default freefall2dVisualizer;
