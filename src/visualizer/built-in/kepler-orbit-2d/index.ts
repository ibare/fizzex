/**
 * 케플러 제3법칙 — 2D 위성 궤도 Visualizer
 *
 * T^2 = (4pi^2 / GM) * a^3
 * 궤도 반지름(a)을 변경하면 공전 주기, 속도, 고도가 실시간으로 변한다.
 * 위에서 내려다본 원형 궤도 뷰.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { KeplerOrbitRenderer } from './renderer';

// ─── 물리 상수 (AST 평가 + fallback 겸용) ───

const G = 6.674e-11; // 만유인력 상수 (N m^2 / kg^2)
const M_EARTH = 5.972e24; // 지구 질량 (kg)
const R_EARTH = 6371; // 지구 반지름 (km)
const GM = G * M_EARTH;

// ─── Visualizer 구현체 ───

const keplerOrbitVisualizer: FizzexVisualizer = {
  id: 'kepler-orbit-2d',
  name: '2D 궤도',

  constants: { G, M: M_EARTH },

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
      siMultiplier: 1000, // km → m
    },
  ],

  derivedValues: [
    {
      id: 'period',
      label: '공전 주기',
      format: 'time',
      formulaElement: 'T',
      compute: (p: ParameterValues, ctx?: ComputeContext) => {
        // AST 우선: equationValue = T (좌변 invert 완료, SI, s).
        // evaluateEquation 이 좌변 패턴(T^n)을 분석해 이미 cbrt/sqrt 등을 적용한 결과.
        // 좌변 지수가 변경되면 자동으로 다른 거듭제곱근이 적용된다.
        if (ctx?.equationValue != null && !isNaN(ctx.equationValue)) {
          return ctx.equationValue;
        }
        // fallback: AST 없을 때 직접 계산
        const a_m = p.a * 1000;
        return 2 * Math.PI * Math.sqrt(a_m ** 3 / GM);
      },
    },
    {
      id: 'velocity',
      label: '궤도 속도',
      unit: 'km/s',
      compute: (p: ParameterValues, ctx?: ComputeContext) => {
        // AST 우선: period 파생값 활용
        const T = ctx?.derived?.['period'];
        if (T != null && T > 0) {
          return (2 * Math.PI * p.a * 1000 / T) / 1000;
        }
        // fallback
        const a_m = p.a * 1000;
        const period = 2 * Math.PI * Math.sqrt(a_m ** 3 / GM);
        return (2 * Math.PI * a_m / period) / 1000;
      },
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

  update(context) {
    const r = (this as unknown as { _renderer?: KeplerOrbitRenderer })._renderer;
    r?.update(context);
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
