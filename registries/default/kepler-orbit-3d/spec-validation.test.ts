import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../../src/visualizer/runtime/validator/index.js';
import spec from './spec.json' with { type: 'json' };

describe('kepler-orbit-3d spec.json', () => {
  it('validateSpec 통과', () => {
    expect(() => validateSpec(spec)).not.toThrow();
  });

  it('핵심 필드 보존', () => {
    const parsed = validateSpec(spec);
    expect(parsed.id).toBe('kepler-orbit-3d');
    expect(parsed.catalog).toBe('astronomy/kepler-third');
    expect(parsed.renderer).toBe('3d');
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

  // 카메라 조작은 호스트(Graphics3D의 OrbitControls)가 소유한다 — spec은 초기 pose와
  // controls 옵션만 선언한다. 8289910 refactor(3d) 참조.
  it('camera는 초기 pose와 controls 옵션만 선언', () => {
    const parsed = validateSpec(spec);
    expect(parsed.camera?.kind).toBe('perspective');
    expect(parsed.camera?.theta).toBe(1.0472);
    expect(parsed.camera?.phi).toBe(1.0472);
    expect(parsed.camera?.distance).toBe('max((a / 6371) * 1.8, 2.5)');
    expect(parsed.camera?.controls?.autoRotate).toBe(true);
    expect(parsed.camera?.controls?.autoRotateSpeed).toBe(1.5);
  });

  it('카메라 제어용 state·animation을 spec이 소유하지 않는다', () => {
    const parsed = validateSpec(spec);
    expect(parsed.state).toBeUndefined();
    expect(parsed.animation).toBeUndefined();
  });

  it('overlay에 T·v 라인', () => {
    const parsed = validateSpec(spec);
    expect(parsed.overlay?.lines).toHaveLength(2);
  });
});
