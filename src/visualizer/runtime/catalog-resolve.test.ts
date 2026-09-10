import { describe, it, expect, beforeAll } from 'vitest';
import {
  splitCatalogRef,
  resolveCatalog,
  extractCatalogDefaults,
  extractCatalogParameters,
} from './catalog-resolve.js';
import { loadLocale, setLocale } from '../../locales/registry.js';

// 이 파일은 한국어 설명을 기대한다. 기본 언어는 영어이므로 명시적으로 받아 둔다 —
// 덤으로 로케일 로딩이 실제로 동작하는지도 함께 검증된다.
beforeAll(async () => {
  await loadLocale('ko');
  setLocale('ko');
});


describe('splitCatalogRef', () => {
  it('category/id 분리', () => {
    expect(splitCatalogRef('physics/simple-harmonic')).toEqual({
      category: 'physics',
      id: 'simple-harmonic',
    });
  });

  it('슬래시 없음 → throw', () => {
    expect(() => splitCatalogRef('sine-wave')).toThrow(/invalid ref/);
  });

  it('앞/뒤 슬래시 → throw', () => {
    expect(() => splitCatalogRef('/sine-wave')).toThrow(/invalid ref/);
    expect(() => splitCatalogRef('trig/')).toThrow(/invalid ref/);
  });
});

describe('resolveCatalog + extract 계열', () => {
  it('physics/simple-harmonic 로드 성공', () => {
    const detail = resolveCatalog('physics/simple-harmonic');
    expect(detail).toBeTruthy();
    expect(detail.name).toBeTruthy();
  });

  it('존재하지 않는 참조 → throw', () => {
    expect(() => resolveCatalog('nonexistent-category/nope')).toThrow(/unknown ref/);
  });

  it('extractCatalogDefaults는 parameterConfig에서 id→default 추출', () => {
    const detail = resolveCatalog('physics/simple-harmonic');
    const defaults = extractCatalogDefaults(detail);
    for (const cfg of detail.parameterConfig ?? []) {
      expect(defaults[cfg.id]).toBe(cfg.default);
    }
  });

  it('parameterConfig 없는 경우 빈 객체', () => {
    const empty = { name: 'x', oneLiner: '', description: '', field: '', elementMeanings: {} };
    expect(extractCatalogDefaults(empty)).toEqual({});
    expect(extractCatalogParameters(empty)).toEqual([]);
  });
});
