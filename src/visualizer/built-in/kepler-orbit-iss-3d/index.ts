/**
 * 케플러 제3법칙 — ISS 3D 궤도 (Three.js).
 */

import type { FizzexVisualizer, ParameterValues, ComputeContext } from '../../types';
import { KeplerOrbitIss3DRenderer } from './renderer';
import { G, M_EARTH, R_EARTH } from '../_shared/kepler-orbit/constants';
import { computePeriod, computeVelocity } from '../_shared/kepler-orbit/math';

export default (function create(): FizzexVisualizer {
  let renderer: KeplerOrbitIss3DRenderer | null = null;

  return {
    id: 'kepler-orbit-iss-3d',
    name: 'ISS 3D 궤도',

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
      renderer = new KeplerOrbitIss3DRenderer(container, options);
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
