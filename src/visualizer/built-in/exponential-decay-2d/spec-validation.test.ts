import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../runtime/validator';
import spec from './spec.json';

describe('exponential-decay-2d spec.json', () => {
  it('validateSpec 통과', () => {
    expect(() => validateSpec(spec)).not.toThrow();
  });

  it('핵심 필드 보존', () => {
    const parsed = validateSpec(spec);
    expect(parsed.id).toBe('exponential-decay-2d');
    expect(parsed.catalog).toBe('exponential-functions/exponential-decay');
    expect(parsed.renderer).toBe('2d');
    expect(parsed.scenes).toHaveLength(4);
    expect(parsed.scenes.map((s) => s.id)).toEqual(['caffeine', 'battery', 'carbon14', 'drug']);
  });

  it('scene 스타일·아이콘 보존', () => {
    const parsed = validateSpec(spec);
    expect(parsed.scenes[0].style?.color).toBe('#92400E');
    expect(parsed.scenes[0].style?.icon).toBe('☕');
    expect(parsed.scenes[1].style?.color).toBe('#0EA5E9');
    expect(parsed.scenes[2].style?.color).toBe('#7C3AED');
    expect(parsed.scenes[3].style?.color).toBe('#DC2626');
  });

  it('root let에 halfLife·ratio·tMax·topH 포함', () => {
    const parsed = validateSpec(spec);
    const letKeys = Object.keys(parsed.root.let ?? {});
    expect(letKeys).toEqual(expect.arrayContaining(['halfLife', 'ratio', 'tMax', 'topH']));
  });

  it('overlay에 N·t½ 라인', () => {
    const parsed = validateSpec(spec);
    expect(parsed.overlay?.lines).toHaveLength(2);
  });
});
