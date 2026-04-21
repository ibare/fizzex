import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../runtime/validator';
import spec from './spec.json';

describe('sine-wave-2d spec.json', () => {
  it('validateSpec 통과', () => {
    expect(() => validateSpec(spec)).not.toThrow();
  });

  it('parsed spec이 핵심 필드를 보존', () => {
    const parsed = validateSpec(spec);
    expect(parsed.id).toBe('sine-wave-2d');
    expect(parsed.renderer).toBe('2d');
    expect(parsed.scenes).toHaveLength(4);
    expect(parsed.scenes.map((s) => s.id)).toEqual([
      'speaker',
      'pendulum',
      'tide',
      'voltmeter',
    ]);
  });

  it('state에 autoT·userDrivenT 포함', () => {
    const parsed = validateSpec(spec);
    const ids = (parsed.state ?? []).map((s) => s.id);
    expect(ids).toContain('autoT');
    expect(ids).toContain('userDrivenT');
  });

  it('viewport abstractWave 정의', () => {
    const parsed = validateSpec(spec);
    expect(parsed.viewports?.abstractWave.kind).toBe('time-value');
  });
});
