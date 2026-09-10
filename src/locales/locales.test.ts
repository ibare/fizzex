import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadLocale,
  setLocale,
  getLocale,
  getLoadedLocales,
  registerLocale,
  resetLocales,
  getBundle,
} from './registry.js';
import { getUiTexts, fill } from './ui.js';
import { formatSummary } from './summary-format.js';
import { LOCALES, DEFAULT_LOCALE, isLocale, isRtl } from './types.js';
import type { LocaleBundle } from './types.js';
import { getSemanticTexts, getCatalogDetail } from '../analyzer/semantic/loader.js';
import type { AnalysisSummary } from '../analyzer/types.js';

describe('로케일 레지스트리', () => {
  beforeEach(() => {
    resetLocales();
  });

  describe('아무 언어도 받지 않았을 때', () => {
    it('설명이 비어 나가되 크래시하지 않는다', () => {
      // 조회는 동기라서 데이터가 없으면 기다릴 수가 없다. 빈 값을 내는 것이 계약이다.
      const texts = getSemanticTexts();
      expect(texts.layer1).toEqual({});
      expect(texts.fallback.roles).toEqual({});
      expect(getCatalogDetail('euler-identity', 'algebra')).toBeNull();
    });

    it('UI 문구는 영어로 나온다', () => {
      // UI 는 마흔 개 남짓이라 영어본을 번들에 싣는다 — 언어를 안 받아도 버튼은 보여야 한다.
      expect(getUiTexts().explorer.close).toBe('Close');
    });

    it('한 번만 경고한다', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      getBundle();
      getBundle();
      getBundle();
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    });
  });

  describe('언어 받기', () => {
    it('받은 언어가 조회에 반영된다', async () => {
      await loadLocale('ko');
      setLocale('ko');

      expect(getLoadedLocales()).toContain('ko');
      expect(getSemanticTexts().layer1['frac.numerator']?.role).toBe('분자');
      expect(getCatalogDetail('euler-identity', 'algebra')?.name).toBe('오일러 항등식');
      expect(getUiTexts().explorer.close).toBe('닫기');
    });

    it('같은 언어를 동시에 불러도 한 번만 내려받는다', async () => {
      await Promise.all([loadLocale('ko'), loadLocale('ko'), loadLocale('ko')]);
      expect(getLoadedLocales()).toEqual(['ko']);
    });

    it('두 언어를 함께 들고 있을 수 있다', async () => {
      await loadLocale('ko');
      await loadLocale('ja');

      expect(getSemanticTexts('ko').layer1['frac.numerator']?.role).toBe('분자');
      expect(getSemanticTexts('ja').layer1['frac.numerator']?.role).not.toBe('분자');
    });

    it('받지 않은 언어를 물으면 기본 언어로 물러선다', async () => {
      await loadLocale('en');
      // 한 언어만 받아 둔 호스트가 다른 언어를 요청해도 화면이 비면 안 된다
      expect(getSemanticTexts('ja').layer1['frac.numerator']?.role).toBe('Numerator');
    });
  });

  describe('언어 고르기', () => {
    it('지원하지 않는 코드는 무시하고 기본을 유지한다', () => {
      setLocale('kr');
      setLocale('en-US');
      expect(getLocale()).toBe(DEFAULT_LOCALE);
    });

    it('기본은 영어다', () => {
      expect(DEFAULT_LOCALE).toBe('en');
      expect(getLocale()).toBe('en');
    });

    it('아랍어만 오른쪽에서 왼쪽으로 읽는다', () => {
      expect(LOCALES.filter(isRtl)).toEqual(['ar']);
    });

    it('지원 언어를 판별한다', () => {
      expect(isLocale('ja')).toBe(true);
      expect(isLocale('de')).toBe(false);
    });
  });

  it('손에 든 번들을 직접 등록할 수 있다', () => {
    // 빌드 시점에 언어가 정해진 호스트를 위한 문
    const stub = {
      locale: 'en',
      ui: getUiTexts(),
      semantic: { layer1: { probe: { role: '탐침', description: '' } } },
    } as unknown as LocaleBundle;

    registerLocale(stub);
    expect(getSemanticTexts('en').layer1['probe']?.role).toBe('탐침');
  });
});

describe('요약 조립', () => {
  beforeEach(() => {
    resetLocales();
  });

  const polynomial: AnalysisSummary = {
    variables: ['x'],
    degree: 2,
    functions: [],
    domains: ['polynomial'],
  };

  it('받은 언어로 문장을 만든다', async () => {
    await loadLocale('ko');
    setLocale('ko');
    const line = formatSummary(polynomial);
    expect(line).toContain('변수 x의');
    expect(line).toContain('2차 다항식');
  });

  it('언어를 바꾸면 문장도 바뀐다', async () => {
    await loadLocale('ko');
    await loadLocale('en');

    setLocale('ko');
    const ko = formatSummary(polynomial);
    setLocale('en');
    const en = formatSummary(polynomial);

    expect(ko).not.toBe(en);
    expect(en).toContain('degree-2 polynomial');
  });

  it('화학식은 변수도 차수도 말하지 않는다', async () => {
    await loadLocale('en');
    setLocale('en');

    expect(
      formatSummary({
        chemistry: { reaction: false, reversible: false },
        variables: [],
        functions: [],
        domains: [],
      })
    ).toBe('Chemical formula');

    expect(
      formatSummary({
        chemistry: { reaction: true, reversible: true },
        variables: [],
        functions: [],
        domains: [],
      })
    ).toBe('Reversible chemical equation');
  });

  it('변수가 없으면 상수 표현식이다', async () => {
    await loadLocale('en');
    setLocale('en');
    expect(formatSummary({ variables: [], functions: [], domains: [] })).toBe(
      'Constant expression'
    );
  });
});

describe('문구 채우기', () => {
  it('자리를 값으로 바꾼다', () => {
    expect(fill('{name} is outside the domain', { name: 'x' })).toBe('x is outside the domain');
  });

  it('값이 없는 자리는 그대로 둔다', () => {
    // 번역이 자리 이름을 잘못 적었을 때 빈칸이 되어 사라지는 것보다 눈에 띄는 편이 낫다
    expect(fill('{a} and {b}', { a: '1' })).toBe('1 and {b}');
  });

  it('숫자도 받는다', () => {
    expect(fill('{value}s', { value: 3.5 })).toBe('3.5s');
  });
});
