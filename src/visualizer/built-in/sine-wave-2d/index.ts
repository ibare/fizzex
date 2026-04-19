/**
 * 사인파 — 2D (통합).
 *
 * y = A sin(ωt + φ). 앵커(스피커/진자/조수/전압계)로 현실 비유를 전환하며
 * 진폭·주기·위상의 역할을 같은 수식으로 체감한다.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { SineWave2DRenderer } from './renderer';

export default (function create(): FizzexVisualizer {
  let renderer: SineWave2DRenderer | null = null;

  return {
    id: 'sine-wave-2d',
    name: '사인파 — 2D',

    parameters: [
      { id: 'A', name: 'A', role: '진폭', min: 0.1, max: 2, default: 1, step: 0.05 },
      { id: '\\omega', name: 'ω', role: '각속도', min: 0.1, max: 8, default: 4.5, step: 0.1, unit: 'rad/s' },
      { id: '\\varphi', name: 'φ', role: '위상', min: -Math.PI, max: Math.PI, default: 0, step: 0.05, unit: 'rad' },
      { id: 't', name: 't', role: '시간', min: 0, max: 20, default: 0, step: 0.05, unit: 's' },
    ],

    anchors: [
      {
        id: 'speaker',
        name: '스피커',
        icon: '🔊',
        description: '진동판이 공기를 밀어내 음파를 만든다',
        params: { A: 1, '\\omega': 4.5, '\\varphi': 0 },
      },
      {
        id: 'pendulum',
        name: '진자',
        icon: '⚖️',
        description: '줄에 매달린 추가 좌우로 흔들린다',
        params: { A: 1, '\\omega': 2, '\\varphi': 0 },
      },
      {
        id: 'tide',
        name: '조수',
        icon: '🌊',
        description: '해수면이 만조·간조 사이를 오간다',
        params: { A: 1, '\\omega': 1, '\\varphi': 0 },
      },
      {
        id: 'voltmeter',
        name: '전압계',
        icon: '⚡',
        description: '교류 전압이 + / – 로 교차한다',
        params: { A: 1, '\\omega': 3, '\\varphi': 0 },
      },
    ],

    derivedValues: [
      {
        id: 'x',
        label: '변위',
        formulaElement: 'x',
        compute: (p: ParameterValues, ctx?: ComputeContext) => {
          if (ctx?.equationValue != null && Number.isFinite(ctx.equationValue)) {
            return ctx.equationValue;
          }
          const A = p.A ?? 1;
          const omega = p['\\omega'] ?? p.omega ?? 1;
          const phi = p['\\varphi'] ?? p.phi ?? 0;
          const t = p.t ?? 0;
          return A * Math.sin(omega * t + phi);
        },
      },
    ],

    mount(container, options) {
      renderer = new SineWave2DRenderer(container, options);
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
