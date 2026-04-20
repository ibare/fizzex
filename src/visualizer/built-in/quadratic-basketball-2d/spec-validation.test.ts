import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../runtime/validator';
import spec from './spec.json';

describe('quadratic-basketball-2d spec.json', () => {
  it('validateSpec 통과', () => {
    expect(() => validateSpec(spec)).not.toThrow();
  });

  it('핵심 필드 보존', () => {
    const parsed = validateSpec(spec);
    expect(parsed.id).toBe('quadratic-basketball-2d');
    expect(parsed.catalog).toBe('linear-functions/quadratic-standard');
    expect(parsed.renderer).toBe('2d');
    expect(parsed.scenes).toHaveLength(1);
    expect(parsed.scenes[0].id).toBe('basketball');
    expect(parsed.scenes[0].params).toEqual({ a: -0.5, b: 2.5, c: 2, x: 2.5 });
  });

  it('viewport main이 time-value', () => {
    const parsed = validateSpec(spec);
    expect(parsed.viewports?.main.kind).toBe('time-value');
  });

  it('root let에 D·vx·vy·landX 포함', () => {
    const parsed = validateSpec(spec);
    const letKeys = Object.keys(parsed.root.let ?? {});
    expect(letKeys).toEqual(expect.arrayContaining(['D', 'vx', 'vy', 'landX']));
  });
});
