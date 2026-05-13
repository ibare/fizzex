import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../runtime/validator';
import spec from './spec.json';

describe('linear-transform-2d spec.json', () => {
  it('validateSpec 통과', () => {
    expect(() => validateSpec(spec)).not.toThrow();
  });

  it('parsed spec이 핵심 필드를 보존', () => {
    const parsed = validateSpec(spec);
    expect(parsed.id).toBe('linear-transform-2d');
    expect(parsed.renderer).toBe('2d');
    expect(parsed.catalog).toBe('algebra/linear-transform-2x2');
    expect(parsed.scenes).toHaveLength(3);
    expect(parsed.scenes.map((s) => s.id)).toEqual(['basis', 'square', 'grid']);
  });

  it('userBindings 에 matrix M 한 슬롯', () => {
    const parsed = validateSpec(spec);
    expect(parsed.userBindings).toEqual([
      { name: 'M', outputKind: 'matrix', required: true },
    ]);
  });

  it('overlay 가 M 네 성분 + det(M) 다섯 줄 포함', () => {
    const parsed = validateSpec(spec);
    expect(parsed.overlay?.lines).toHaveLength(5);
  });
});
