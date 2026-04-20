import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../runtime/validator';
import spec from './spec.json';

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

  it('camera·state 선언', () => {
    const parsed = validateSpec(spec);
    expect(parsed.camera?.kind).toBe('perspective');
    expect(parsed.camera?.state.theta).toBe('camTheta');
    expect(parsed.camera?.state.phi).toBe('camPhi');
    expect(parsed.camera?.state.distance).toBe('camDistance');
    const stateIds = (parsed.state ?? []).map((s) => s.id);
    expect(stateIds).toEqual(['camTheta', 'camPhi', 'camDistance']);
  });

  it('animation.onFrame에 카메라 자동회전·거리 맞춤', () => {
    const parsed = validateSpec(spec);
    const steps = parsed.animation?.onFrame ?? [];
    expect(steps).toHaveLength(2);
    expect(steps[0].set).toBe('state.camTheta');
    expect(steps[1].set).toBe('state.camDistance');
  });

  it('overlay에 T·v 라인', () => {
    const parsed = validateSpec(spec);
    expect(parsed.overlay?.lines).toHaveLength(2);
  });
});
