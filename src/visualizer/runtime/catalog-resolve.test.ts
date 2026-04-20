import { describe, it, expect } from 'vitest';
import {
  splitCatalogRef,
  resolveCatalog,
  extractCatalogDefaults,
  extractCatalogParameters,
} from './catalog-resolve';

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
