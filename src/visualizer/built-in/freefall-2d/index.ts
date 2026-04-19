/**
 * 자유낙하 — 2D (통합).
 *
 * s = v_0 t + 1/2 a t². 앵커(지구·달·화성·목성)로 행성을 전환하며
 * 같은 식에서 중력가속도 a만 달라졌을 때 거리 감각이 어떻게 변하는지 체감한다.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { Freefall2DRenderer } from './renderer';

export default (function create(): FizzexVisualizer {
  let renderer: Freefall2DRenderer | null = null;

  return {
    id: 'freefall-2d',
    name: '자유낙하 — 2D',

    parameters: [
      { id: 'v_0', name: 'v_0', role: '초기 속도', min: 0, max: 50, default: 0, step: 0.5, unit: 'm/s' },
      { id: 'a', name: 'a', role: '중력 가속도', min: 0.5, max: 30, default: 9.807, step: 0.01, unit: 'm/s²' },
      { id: 't', name: 't', role: '시간', min: 0, max: 10, default: 1.5, step: 0.05, unit: 's' },
    ],

    anchors: [
      {
        id: 'earth',
        name: '지구',
        icon: '🌍',
        description: '지구 중력 g ≈ 9.807 m/s² — 건물 이정표 기준',
        params: { v_0: 0, a: 9.807, t: 1.5 },
      },
      {
        id: 'moon',
        name: '달',
        icon: '🌙',
        description: '달 중력 g ≈ 1.625 m/s² — 지구의 1/6',
        params: { v_0: 0, a: 1.625, t: 3 },
      },
      {
        id: 'mars',
        name: '화성',
        icon: '🔴',
        description: '화성 중력 g ≈ 3.721 m/s² — 지구의 ~38%',
        params: { v_0: 0, a: 3.721, t: 2.5 },
      },
      {
        id: 'jupiter',
        name: '목성',
        icon: '🪐',
        description: '목성 중력 g ≈ 24.79 m/s² — 지구의 2.5배',
        params: { v_0: 0, a: 24.79, t: 1 },
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

    mount(container, options) {
      renderer = new Freefall2DRenderer(container, options);
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
