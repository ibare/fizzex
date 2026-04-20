import { describe, it, expect } from 'vitest';
import { compileSpec } from './compile';
import sineWaveSpec from '../built-in/sine-wave-2d/spec.json';

describe('compileSpec', () => {
  it('sine-wave-2d 스펙 + 카탈로그 병합 성공', () => {
    const compiled = compileSpec(sineWaveSpec);
    expect(compiled.spec.id).toBe('sine-wave-2d');
    expect(compiled.catalog).toBeTruthy();
    expect(typeof compiled.catalogDefaults).toBe('object');
  });

  it('catalogDefaults는 parameterConfig에서 파생', () => {
    const compiled = compileSpec(sineWaveSpec);
    for (const cfg of compiled.catalog.parameterConfig ?? []) {
      expect(compiled.catalogDefaults[cfg.id]).toBe(cfg.default);
    }
  });

  it('잘못된 스펙 → validator throw', () => {
    expect(() => compileSpec({})).toThrow();
  });

  it('존재하지 않는 카탈로그 참조 → throw', () => {
    const bad = { ...sineWaveSpec, catalog: 'nope/none' };
    expect(() => compileSpec(bad)).toThrow(/unknown ref/);
  });
});
