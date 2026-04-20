import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../runtime/validator';
import spec from './spec.json';

describe('freefall-2d spec.json', () => {
  it('validateSpec 통과', () => {
    expect(() => validateSpec(spec)).not.toThrow();
  });

  it('핵심 필드 보존', () => {
    const parsed = validateSpec(spec);
    expect(parsed.id).toBe('freefall-2d');
    expect(parsed.catalog).toBe('physics/kinematic-displacement');
    expect(parsed.renderer).toBe('2d');
    expect(parsed.scenes).toHaveLength(4);
    expect(parsed.scenes.map((s) => s.id)).toEqual(['earth', 'moon', 'mars', 'jupiter']);
  });

  it('scene 스타일·파라미터 보존', () => {
    const parsed = validateSpec(spec);
    expect(parsed.scenes[0].style?.color).toBe('#0E7490');
    expect(parsed.scenes[0].params?.a).toBeCloseTo(9.807);
    expect(parsed.scenes[1].params?.a).toBeCloseTo(1.625);
    expect(parsed.scenes[2].params?.a).toBeCloseTo(3.721);
    expect(parsed.scenes[3].params?.a).toBeCloseTo(24.79);
  });

  it('root let에 hCur·hView·groundY·ballY 포함', () => {
    const parsed = validateSpec(spec);
    const letKeys = Object.keys(parsed.root.let ?? {});
    expect(letKeys).toEqual(expect.arrayContaining(['hCur', 'hView', 'groundY', 'ballY']));
  });

  it('overlay에 s 라인', () => {
    const parsed = validateSpec(spec);
    expect(parsed.overlay?.lines).toHaveLength(1);
  });
});
