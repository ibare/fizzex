import { describe, it, expect } from 'vitest';
import { validateSpec, VisualizerSpecValidationError } from './index';

const baseValidSpec = {
  $schema: 'fizzex-visualizer/v1',
  id: 'sine-wave-2d',
  catalog: 'trigonometry-basic/sine-wave',
  name: { en: 'Sine Wave — 2D', ko: '사인파 — 2D' },
  description: { en: 'sin(ωt+φ)', ko: '사인파' },
  renderer: '2d',
  scenes: [
    {
      id: 'speaker',
      name: { en: 'Speaker', ko: '스피커' },
      style: { color: '#7C3AED', icon: '🔊' },
      params: { A: 1 },
    },
  ],
  viewports: {
    plot: {
      kind: 'time-value',
      xMin: '0',
      xMax: '10',
      yMin: '-1',
      yMax: '1',
    },
  },
  root: { kind: 'group', children: [] },
};

describe('validateSpec — valid inputs', () => {
  it('accepts minimal sine-wave-2d', () => {
    const spec = validateSpec(baseValidSpec);
    expect(spec.id).toBe('sine-wave-2d');
    expect(spec.catalog).toBe('trigonometry-basic/sine-wave');
  });

  it('accepts displayOptions with timeScale', () => {
    const spec = validateSpec({ ...baseValidSpec, displayOptions: ['timeScale'] });
    expect(spec.displayOptions).toEqual(['timeScale']);
  });

  it('accepts localFormulas', () => {
    const spec = validateSpec({
      ...baseValidSpec,
      localFormulas: [
        {
          id: 'peakAt',
          label: { en: 'Peak', ko: '정점' },
          symbol: 't_{peak}',
          expr: '(pi/2 - \\varphi) / \\omega',
        },
      ],
    });
    expect(spec.localFormulas?.[0].id).toBe('peakAt');
  });
});

describe('validateSpec — invalid inputs', () => {
  it('rejects missing en in name', () => {
    const bad = { ...baseValidSpec, name: { ko: '사인파' } };
    expect(() => validateSpec(bad)).toThrow(VisualizerSpecValidationError);
  });

  it('rejects catalog without slash', () => {
    const bad = { ...baseValidSpec, catalog: 'sine-wave' };
    expect(() => validateSpec(bad)).toThrow(/catalog must be/);
  });

  it('rejects unknown displayOptions', () => {
    const bad = { ...baseValidSpec, displayOptions: ['bogusFeature'] };
    expect(() => validateSpec(bad)).toThrow(VisualizerSpecValidationError);
  });

  it('rejects empty scenes', () => {
    const bad = { ...baseValidSpec, scenes: [] };
    expect(() => validateSpec(bad)).toThrow(/at least one scene/);
  });

  it('rejects duplicate scene ids', () => {
    const bad = {
      ...baseValidSpec,
      scenes: [
        { id: 's', name: { en: 'S' } },
        { id: 's', name: { en: 'S2' } },
      ],
    };
    expect(() => validateSpec(bad)).toThrow(/duplicate scene id/);
  });

  it('rejects duplicate localFormula ids', () => {
    const bad = {
      ...baseValidSpec,
      localFormulas: [
        { id: 'x', label: { en: 'x' }, expr: '1' },
        { id: 'x', label: { en: 'x2' }, expr: '2' },
      ],
    };
    expect(() => validateSpec(bad)).toThrow(/duplicate localFormula id/);
  });

  it('rejects invalid renderer', () => {
    const bad = { ...baseValidSpec, renderer: 'webgpu' };
    expect(() => validateSpec(bad)).toThrow(VisualizerSpecValidationError);
  });

  it('rejects bad $schema prefix', () => {
    const bad = { ...baseValidSpec, $schema: 'other-thing/v1' };
    expect(() => validateSpec(bad)).toThrow(VisualizerSpecValidationError);
  });
});

describe('validateSpec — camera (3D)', () => {
  const spec3d = {
    ...baseValidSpec,
    id: 'kepler-orbit-3d',
    renderer: '3d' as const,
    state: [
      { id: 'camTheta', type: 'number' as const, default: 0 },
      { id: 'camPhi', type: 'number' as const, default: 1 },
      { id: 'camDistance', type: 'number' as const, default: 5 },
    ],
    camera: {
      kind: 'perspective' as const,
      fov: 50,
      near: 0.1,
      far: 2000,
      state: { theta: 'camTheta', phi: 'camPhi', distance: 'camDistance' },
    },
  };

  it('accepts valid 3D spec with camera + state', () => {
    const spec = validateSpec(spec3d);
    expect(spec.camera?.kind).toBe('perspective');
  });

  it('3D without camera → error', () => {
    const { camera: _c, ...rest } = spec3d;
    void _c;
    expect(() => validateSpec(rest)).toThrow(/camera is required/);
  });

  it('2D with camera → error', () => {
    const bad = { ...spec3d, renderer: '2d' as const };
    expect(() => validateSpec(bad)).toThrow(/camera must not be set/);
  });

  it('camera.state.theta 참조가 state[]에 없으면 error', () => {
    const bad = {
      ...spec3d,
      camera: { ...spec3d.camera, state: { ...spec3d.camera.state, theta: 'wrongId' } },
    };
    expect(() => validateSpec(bad)).toThrow(/unknown state id "wrongId"/);
  });
});
