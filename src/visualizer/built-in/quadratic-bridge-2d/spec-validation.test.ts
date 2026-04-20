import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../runtime/validator';
import spec from './spec.json';

describe('quadratic-bridge-2d spec.json', () => {
  it('validateSpec 통과', () => {
    expect(() => validateSpec(spec)).not.toThrow();
  });

  it('핵심 필드 보존', () => {
    const parsed = validateSpec(spec);
    expect(parsed.id).toBe('quadratic-bridge-2d');
    expect(parsed.catalog).toBe('linear-functions/quadratic-standard');
    expect(parsed.renderer).toBe('2d');
    expect(parsed.scenes).toHaveLength(1);
    expect(parsed.scenes[0].id).toBe('bridge');
    expect(parsed.scenes[0].params).toEqual({ a: -0.05, b: 0, c: 5 });
  });

  it('viewport main이 time-value', () => {
    const parsed = validateSpec(spec);
    expect(parsed.viewports?.main.kind).toBe('time-value');
  });

  it('root let에 hasRoots·r1·r2·vx·vy 포함', () => {
    const parsed = validateSpec(spec);
    const letKeys = Object.keys(parsed.root.let ?? {});
    expect(letKeys).toEqual(expect.arrayContaining(['hasRoots', 'r1', 'r2', 'vx', 'vy']));
  });
});
