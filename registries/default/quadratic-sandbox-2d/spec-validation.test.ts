import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../runtime/validator';
import spec from './spec.json';

describe('quadratic-sandbox-2d spec.json', () => {
  it('validateSpec 통과', () => {
    expect(() => validateSpec(spec)).not.toThrow();
  });

  it('핵심 필드 보존', () => {
    const parsed = validateSpec(spec);
    expect(parsed.id).toBe('quadratic-sandbox-2d');
    expect(parsed.catalog).toBe('linear-functions/quadratic-standard');
    expect(parsed.renderer).toBe('2d');
    expect(parsed.scenes).toHaveLength(1);
    expect(parsed.scenes[0].id).toBe('sandbox');
    expect(parsed.scenes[0].params).toEqual({ a: 1, b: 0, c: 0, x: 0 });
  });

  it('state에 vx·vy·halfSpan·yLow·yHigh·yPad 모두 포함', () => {
    const parsed = validateSpec(spec);
    const ids = (parsed.state ?? []).map((s) => s.id).sort();
    expect(ids).toEqual(['halfSpan', 'vx', 'vy', 'yHigh', 'yLow', 'yPad']);
  });

  it('viewport plot이 time-value', () => {
    const parsed = validateSpec(spec);
    expect(parsed.viewports?.plot.kind).toBe('time-value');
  });
});
