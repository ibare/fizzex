import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../runtime/validator';
import spec from './spec.json';

describe('complex-plane-2d spec.json', () => {
  it('validateSpec 통과', () => {
    expect(() => validateSpec(spec)).not.toThrow();
  });

  it('parsed spec이 핵심 필드를 보존', () => {
    const parsed = validateSpec(spec);
    expect(parsed.id).toBe('complex-plane-2d');
    expect(parsed.renderer).toBe('2d');
    expect(parsed.catalog).toBe('algebra/complex-plane');
    expect(parsed.scenes).toHaveLength(3);
    expect(parsed.scenes.map((s) => s.id)).toEqual(['argand', 'polar', 'euler']);
  });

  it('userBindings 에 complex z 한 슬롯', () => {
    const parsed = validateSpec(spec);
    expect(parsed.userBindings).toEqual([
      { name: 'z', outputKind: 'complex', required: true },
    ]);
  });

  it('overlay 가 Re/Im/|z|/arg(z) 네 줄 포함', () => {
    const parsed = validateSpec(spec);
    expect(parsed.overlay?.lines).toHaveLength(4);
  });
});
