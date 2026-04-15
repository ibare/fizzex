/**
 * 케플러 제3법칙 — 위성 궤도 Visualizer
 *
 * T^2 = (4pi^2 / GM) * a^3
 * 궤도 반지름(a)을 변경하면 공전 주기, 속도, 고도가 실시간으로 변한다.
 */

import type { FizzexVisualizer, ParameterValues } from '../../types';
import { KeplerOrbitRenderer } from './renderer';

// ─── 물리 상수 ───

const G = 6.674e-11; // 만유인력 상수 (N m^2 / kg^2)
const M_EARTH = 5.972e24; // 지구 질량 (kg)
const R_EARTH = 6371; // 지구 반지름 (km)
const GM = G * M_EARTH;

// ─── 계산 함수 ───

function calcPeriod(a_km: number): number {
  const a_m = a_km * 1000;
  return 2 * Math.PI * Math.sqrt((a_m * a_m * a_m) / GM);
}

function calcVelocity(a_km: number): number {
  const period = calcPeriod(a_km);
  return (2 * Math.PI * a_km * 1000) / period; // m/s
}

// ─── Visualizer 구현체 ───

const keplerOrbitVisualizer: FizzexVisualizer = {
  id: 'kepler-orbit',
  name: '위성 궤도',

  parameters: [
    {
      id: 'a',
      name: 'a',
      role: '궤도 반지름',
      min: 6500,
      max: 400000,
      default: 6771,
      step: 1,
      unit: 'km',
      scale: 'log',
    },
  ],

  derivedValues: [
    {
      id: 'period',
      label: '공전 주기',
      format: 'time',
      compute: (p: ParameterValues) => calcPeriod(p.a),
    },
    {
      id: 'velocity',
      label: '궤도 속도',
      unit: 'km/s',
      compute: (p: ParameterValues) => calcVelocity(p.a) / 1000,
    },
    {
      id: 'altitude',
      label: '고도',
      unit: 'km',
      format: 'distance',
      compute: (p: ParameterValues) => p.a - R_EARTH,
    },
    {
      id: 'earthRatio',
      label: '지구 대비',
      unit: '배',
      compute: (p: ParameterValues) => p.a / R_EARTH,
    },
  ],

  presets: [
    {
      id: 'iss',
      name: '국제우주정거장',
      description: '고도 400km, 90분 주기',
      emoji: '🛸',
      values: { a: 6771 },
    },
    {
      id: 'gps',
      name: 'GPS 위성',
      description: '고도 20,200km, 12시간 주기',
      emoji: '📡',
      values: { a: 26560 },
    },
    {
      id: 'geo',
      name: '정지궤도 위성',
      description: '고도 35,786km, 정확히 24시간',
      emoji: '📺',
      values: { a: 42164 },
    },
    {
      id: 'moon',
      name: '달',
      description: '384,400km, 27.3일 주기',
      emoji: '🌙',
      values: { a: 384400 },
    },
  ],

  // ─── 라이프사이클 (renderer에 위임) ───

  mount(container, options) {
    (this as unknown as { _renderer: KeplerOrbitRenderer })._renderer =
      new KeplerOrbitRenderer(container, options, this.presets);
  },

  update(params) {
    const r = (this as unknown as { _renderer?: KeplerOrbitRenderer })._renderer;
    r?.update(params);
  },

  resize(width, height) {
    const r = (this as unknown as { _renderer?: KeplerOrbitRenderer })._renderer;
    r?.resize(width, height);
  },

  unmount() {
    const r = (this as unknown as { _renderer?: KeplerOrbitRenderer })._renderer;
    r?.destroy();
    delete (this as unknown as { _renderer?: KeplerOrbitRenderer })._renderer;
  },

  onParameterChange(callback) {
    const r = (this as unknown as { _renderer?: KeplerOrbitRenderer })._renderer;
    r?.setParameterChangeCallback(callback);
  },
};

export default keplerOrbitVisualizer;
