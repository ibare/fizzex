import { describe, it, expect } from 'vitest';
import { createBaselineSnapshot } from './baseline.js';

describe('createBaselineSnapshot', () => {
  it('scene preset이 catalog default를 덮어씀', () => {
    const snap = createBaselineSnapshot({ A: 2 }, { A: 1, omega: 4.5 }, {});
    expect(snap.params).toEqual({ A: 2, omega: 4.5 });
  });

  it('scene에 누락된 id는 catalog default 유지', () => {
    const snap = createBaselineSnapshot({ A: 5 }, { A: 1, omega: 4.5, phi: 0 }, {});
    expect(snap.params.omega).toBe(4.5);
    expect(snap.params.phi).toBe(0);
  });

  it('formulas 복제', () => {
    const formulas = { x: 1, y: 'abc' };
    const snap = createBaselineSnapshot({}, {}, formulas);
    expect(snap.formulas).toEqual(formulas);
    expect(snap.formulas).not.toBe(formulas);
  });

  it('빈 입력 허용', () => {
    const snap = createBaselineSnapshot({}, {}, {});
    expect(snap.params).toEqual({});
    expect(snap.formulas).toEqual({});
  });

  it('원본 mutate 불가 (새 객체 반환)', () => {
    const scene = { A: 1 };
    const defaults = { A: 0, omega: 1 };
    const snap = createBaselineSnapshot(scene, defaults, {});
    snap.params.A = 999;
    expect(scene.A).toBe(1);
    expect(defaults.A).toBe(0);
  });
});
