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
