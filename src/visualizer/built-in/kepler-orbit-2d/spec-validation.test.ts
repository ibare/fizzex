import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../runtime/validator';
import spec from './spec.json';

describe('kepler-orbit-2d spec.json', () => {
  it('validateSpec 통과', () => {
    expect(() => validateSpec(spec)).not.toThrow();
  });

  it('핵심 필드 보존', () => {
    const parsed = validateSpec(spec);
    expect(parsed.id).toBe('kepler-orbit-2d');
    expect(parsed.catalog).toBe('astronomy/kepler-third');
    expect(parsed.renderer).toBe('2d');
    expect(parsed.scenes).toHaveLength(4);
    expect(parsed.scenes.map((s) => s.id)).toEqual(['iss', 'gps', 'geo', 'moon']);
  });

  it('앵커별 a 값 보존', () => {
    const parsed = validateSpec(spec);
    expect(parsed.scenes[0].params?.a).toBe(6771);
    expect(parsed.scenes[1].params?.a).toBe(26560);
    expect(parsed.scenes[2].params?.a).toBe(42164);
    expect(parsed.scenes[3].params?.a).toBe(384400);
  });

  it('앵커별 스타일·아이콘 보존', () => {
    const parsed = validateSpec(spec);
    expect(parsed.scenes[0].style?.color).toBe('#ffd466');
    expect(parsed.scenes[0].style?.icon).toBe('🛰️');
    expect(parsed.scenes[1].style?.color).toBe('#60a5fa');
    expect(parsed.scenes[2].style?.color).toBe('#a78bfa');
    expect(parsed.scenes[3].style?.color).toBe('#e2e8f0');
  });

  it('root let에 궤도·애니메이션 핵심 변수 포함', () => {
    const parsed = validateSpec(spec);
    const letKeys = Object.keys(parsed.root.let ?? {});
    expect(letKeys).toEqual(expect.arrayContaining(['scale', 'earthPx', 'orbitPx', 'T', 'angle', 'satX', 'satY']));
  });

  it('overlay에 T 라인', () => {
    const parsed = validateSpec(spec);
    expect(parsed.overlay?.lines).toHaveLength(1);
  });
});
