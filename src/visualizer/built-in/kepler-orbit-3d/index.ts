/**
 * 케플러 제3법칙 — 3D 궤도 (통합).
 *
 * T² = (4π² / GM) · a³. 3D 관점에서 앵커(ISS/GPS/정지궤도/달) 전환.
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { KeplerOrbit3DRenderer } from './renderer';
import { G, M_EARTH, R_EARTH } from '../_shared/kepler-orbit/constants';
import { computePeriod, computeVelocity } from '../_shared/kepler-orbit/math';

export default (function create(): FizzexVisualizer {
  let renderer: KeplerOrbit3DRenderer | null = null;

  return {
    id: 'kepler-orbit-3d',
    name: '지구 궤도 — 3D',

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
        siMultiplier: 1000,
      },
    ],

    anchors: [
      {
        id: 'iss',
        name: 'ISS',
        icon: '🛰️',
        description: '국제우주정거장 — 고도 ≈ 400 km, 약 90분 주기',
        params: { a: 6771 },
      },
      {
        id: 'gps',
        name: 'GPS',
        icon: '📡',
        description: 'GPS 위성 — 고도 ≈ 20,200 km, 약 12시간 주기',
        params: { a: 26560 },
      },
      {
        id: 'geo',
        name: '정지궤도',
        icon: '🌐',
        description: '정지궤도 — 고도 ≈ 35,786 km, 정확히 24시간',
        params: { a: 42164 },
      },
      {
        id: 'moon',
        name: '달',
        icon: '🌙',
        description: '달 — 약 27.3일 주기',
        params: { a: 384400 },
      },
    ],

    derivedValues: [
      {
        id: 'period',
        label: '공전 주기',
        format: 'time',
        formulaElement: 'T',
        compute: (p: ParameterValues, ctx?: ComputeContext) => {
          if (ctx?.equationValue != null && !isNaN(ctx.equationValue)) {
            return ctx.equationValue;
          }
          return computePeriod(p.a ?? 0);
        },
      },
      {
        id: 'velocity',
        label: '궤도 속도',
        unit: 'km/s',
        compute: (p: ParameterValues, ctx?: ComputeContext) => {
          const T = ctx?.derived?.['period'];
          if (T != null && T > 0) return computeVelocity(p.a ?? 0, T);
          return computeVelocity(p.a ?? 0, computePeriod(p.a ?? 0));
        },
      },
      {
        id: 'altitude',
        label: '고도',
        unit: 'km',
        format: 'distance',
        compute: (p: ParameterValues) => (p.a ?? 0) - R_EARTH,
      },
      {
        id: 'earthRatio',
        label: '지구 대비',
        unit: '배',
        compute: (p: ParameterValues) => (p.a ?? 0) / R_EARTH,
      },
    ],

    mount(container, options) {
      renderer = new KeplerOrbit3DRenderer(container, options);
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
    onParameterChange(callback) {
      renderer?.setParameterChangeCallback(callback);
    },
  };
})();
