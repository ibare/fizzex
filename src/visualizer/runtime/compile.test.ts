import { describe, it, expect, beforeAll } from 'vitest';
import { compileSpec } from './compile.js';
import sineWaveSpec from '../../../registries/default/sine-wave-2d/spec.json' with { type: 'json' };
import { loadLocale, setLocale } from '../../locales/registry.js';

// 이 파일은 한국어 설명을 기대한다. 기본 언어는 영어이므로 명시적으로 받아 둔다 —
// 덤으로 로케일 로딩이 실제로 동작하는지도 함께 검증된다.
beforeAll(async () => {
  await loadLocale('ko');
  setLocale('ko');
});


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
