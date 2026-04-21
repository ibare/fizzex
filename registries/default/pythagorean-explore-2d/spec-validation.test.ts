import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../runtime/validator';
import spec from './spec.json';

describe('pythagorean-explore-2d spec.json', () => {
  it('validateSpec 통과', () => {
    expect(() => validateSpec(spec)).not.toThrow();
  });

  it('핵심 필드 보존', () => {
    const parsed = validateSpec(spec);
    expect(parsed.id).toBe('pythagorean-explore-2d');
    expect(parsed.catalog).toBe('geometry/pythagorean-theorem');
    expect(parsed.renderer).toBe('2d');
    expect(parsed.scenes).toHaveLength(1);
    expect(parsed.scenes[0].params).toEqual({ a: 3, b: 4 });
  });

  it('viewport diagram이 fit-box', () => {
    const parsed = validateSpec(spec);
    expect(parsed.viewports?.diagram.kind).toBe('fit-box');
  });

  it('overlay에 c 계산 라인', () => {
    const parsed = validateSpec(spec);
    expect(parsed.overlay?.lines).toHaveLength(1);
    expect(parsed.overlay?.lines?.[0].format).toBe('.3f');
  });
});
