/**
 * 삼각함수 사인파 — 2D Visualizer
 *
 * y = A sin(ω t + φ). 소리·전기·조수·진자가 같은 수식 구조.
 * 상단 추상: 회전 원 → 파형 펼침 ("사인은 회전의 그림자")
 * 하단 장면: 프리셋별 현실 은유 (스피커/전압계/조수/진자)
 *
 * 스타일화 모드(기본): ω를 사용자 편집 가능한 상수처럼 다룬다.
 * 실제 시간 스케일 모드(displayParameter timeScale)는 차후 확장.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { SineWaveRenderer } from './renderer';

const sineWave2dVisualizer: FizzexVisualizer = {
  id: 'sine-wave-2d',
  name: '사인파 2D',

  parameters: [
    {
      id: 'A',
      name: 'A',
      role: '진폭',
      min: 0.1,
      max: 2,
      default: 1,
      step: 0.05,
    },
    {
      id: '\\omega',
      name: 'ω',
      role: '각속도',
      min: 0.1,
      max: 8,
      default: 2,
      step: 0.1,
      unit: 'rad/s',
    },
    {
      id: '\\varphi',
      name: 'φ',
      role: '위상',
      min: -Math.PI,
      max: Math.PI,
      default: 0,
      step: 0.05,
      unit: 'rad',
    },
    {
      id: 't',
      name: 't',
      role: '시간',
      min: 0,
      max: 20,
      default: 0,
      step: 0.05,
      unit: 's',
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

  presets: [
    {
      id: 'speaker',
      name: '라(A4) 음',
      description: '스피커 진동판 → 공기 → 소리',
      emoji: '🎵',
      values: { A: 1, '\\omega': 4.5, '\\varphi': 0 },
    },
    {
      id: 'voltmeter',
      name: '가정용 교류',
      description: '아날로그 전압계 바늘의 왕복',
      emoji: '⚡',
      values: { A: 1, '\\omega': 3, '\\varphi': 0 },
    },
    {
      id: 'tide',
      name: '조수',
      description: '해수면 오르내림, 배가 같이 뜬다',
      emoji: '🌊',
      values: { A: 1, '\\omega': 1, '\\varphi': 0 },
    },
    {
      id: 'pendulum',
      name: '진자',
      description: '추의 각도 흔들림 (최대 45°)',
      emoji: '🔔',
      values: { A: 1, '\\omega': 2, '\\varphi': 0 },
    },
  ],

  mount(container, options) {
    (this as unknown as { _renderer: SineWaveRenderer })._renderer =
      new SineWaveRenderer(container, options, this.presets);
  },

  update(context) {
    const r = (this as unknown as { _renderer?: SineWaveRenderer })._renderer;
    r?.update(context);
  },

  resize(width, height) {
    const r = (this as unknown as { _renderer?: SineWaveRenderer })._renderer;
    r?.resize(width, height);
  },

  unmount() {
    const r = (this as unknown as { _renderer?: SineWaveRenderer })._renderer;
    r?.destroy();
    delete (this as unknown as { _renderer?: SineWaveRenderer })._renderer;
  },
};

export default sineWave2dVisualizer;
