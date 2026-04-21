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

  it('accepts let with number and boolean primitives', () => {
    const spec = validateSpec({
      ...baseValidSpec,
      root: {
        kind: 'group',
        let: { w: 110, active: true, expr: 'a + 1' },
        children: [],
      },
    });
    expect(spec.root).toBeDefined();
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
    camera: {
      kind: 'perspective' as const,
      fov: 50,
      near: 0.1,
      far: 2000,
      distance: 5,
      theta: 1.0472,
      phi: 1.0472,
      controls: {
        autoRotate: true,
        autoRotateSpeed: 1.5,
        minDistance: 1,
        maxDistance: 100,
      },
    },
  };

  it('accepts valid 3D spec with camera', () => {
    const spec = validateSpec(spec3d);
    expect(spec.camera?.kind).toBe('perspective');
    if (spec.camera?.kind === 'perspective') {
      expect(spec.camera.distance).toBe(5);
      expect(spec.camera.controls?.autoRotate).toBe(true);
    }
  });

  it('accepts ExprString for distance/theta/phi', () => {
    const spec = validateSpec({
      ...spec3d,
      camera: { ...spec3d.camera, distance: 'max(a/6371*1.8, 2.5)', theta: 'pi/3', phi: 'pi/3' },
    });
    expect(spec.camera?.kind).toBe('perspective');
  });

  it('accepts lookAt tuple', () => {
    const spec = validateSpec({
      ...spec3d,
      camera: { ...spec3d.camera, lookAt: [0, 1, 2] as const },
    });
    if (spec.camera?.kind === 'perspective') {
      expect(spec.camera.lookAt).toEqual([0, 1, 2]);
    }
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

  it('unknown controls field → error (strict)', () => {
    const bad = {
      ...spec3d,
      camera: { ...spec3d.camera, controls: { autoRotate: true, bogus: 1 } },
    };
    expect(() => validateSpec(bad)).toThrow();
  });
});
