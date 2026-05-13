import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../runtime/validator';
import spec from './spec.json';

describe('tangent-explore-2d spec.json', () => {
  it('validateSpec 통과', () => {
    expect(() => validateSpec(spec)).not.toThrow();
  });

  it('parsed spec 이 핵심 필드를 보존', () => {
    const parsed = validateSpec(spec);
    expect(parsed.id).toBe('tangent-explore-2d');
    expect(parsed.renderer).toBe('2d');
    expect(parsed.catalog).toBe('calculus/tangent');
    expect(parsed.scenes.map((s) => s.id)).toEqual(['default', 'compare']);
  });

  it('userBindings 에 scalar f 한 슬롯', () => {
    const parsed = validateSpec(spec);
    expect(parsed.userBindings).toEqual([
      { name: 'f', outputKind: 'scalar', required: true },
    ]);
  });

  it('derivatives 에 fPrime (source=f, variable=x, order=1)', () => {
    const parsed = validateSpec(spec);
    expect(parsed.derivatives).toEqual([
      { source: 'f', variable: 'x', order: 1, binding: 'fPrime' },
    ]);
  });

  it('overlay 가 x / f(x) / f\'(x) 세 줄 포함', () => {
    const parsed = validateSpec(spec);
    expect(parsed.overlay?.lines).toHaveLength(3);
  });
});
