import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../runtime/validator';
import spec from './spec.json';

describe('compound-interest-2d spec.json', () => {
  it('validateSpec 통과', () => {
    expect(() => validateSpec(spec)).not.toThrow();
  });

  it('핵심 필드 보존', () => {
    const parsed = validateSpec(spec);
    expect(parsed.id).toBe('compound-interest-2d');
    expect(parsed.catalog).toBe('finance/compound-interest');
    expect(parsed.renderer).toBe('2d');
    expect(parsed.scenes).toHaveLength(4);
    expect(parsed.scenes.map((s) => s.id)).toEqual(['savings', 'stock', 'deposit', 'inflation']);
  });

  it('scene 스타일·아이콘 보존', () => {
    const parsed = validateSpec(spec);
    expect(parsed.scenes[0].style?.color).toBe('#059669');
    expect(parsed.scenes[0].style?.icon).toBe('🏦');
    expect(parsed.scenes[1].style?.color).toBe('#2563EB');
    expect(parsed.scenes[2].style?.color).toBe('#D97706');
    expect(parsed.scenes[3].style?.color).toBe('#DC2626');
  });

  it('root let에 A·tMax·inverse·powerNow 포함', () => {
    const parsed = validateSpec(spec);
    const letKeys = Object.keys(parsed.root.let ?? {});
    expect(letKeys).toEqual(expect.arrayContaining(['A', 'tMax', 'inverse', 'powerNow']));
  });

  it('overlay에 A·2배 주기 라인', () => {
    const parsed = validateSpec(spec);
    expect(parsed.overlay?.lines).toHaveLength(2);
  });
});
