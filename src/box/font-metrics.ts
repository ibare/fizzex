/**
 * 폰트 메트릭스
 *
 * Canvas를 사용하여 문자의 실제 크기를 측정
 */

import type { FontMetrics, BoxRenderConfig } from './types';
import {
  getDelimiterGlyphs,
  selectGlyphForHeight,
  type DelimiterGlyphs,
  type ExtensibleGlyph,
} from '../fonts/glyph-mappings';
import { LRUCache } from '../utils/lru-cache';

/** 폰트 메트릭스 캐시 기본 크기 */
const DEFAULT_CACHE_SIZE = 1000;

/** Canvas 기반 폰트 메트릭스 */
export class CanvasFontMetrics implements FontMetrics {
  private ctx: CanvasRenderingContext2D;
  private config: BoxRenderConfig;
  private cache: LRUCache<string, number>;

  constructor(
    ctx: CanvasRenderingContext2D,
    config: BoxRenderConfig,
    cacheSize: number = DEFAULT_CACHE_SIZE
  ) {
    this.ctx = ctx;
    this.config = config;
    this.cache = new LRUCache<string, number>(cacheSize);
  }

  /** 설정 업데이트 */
  updateConfig(config: BoxRenderConfig): void {
    this.config = config;
    this.cache.clear();
  }

  /** 문자 너비 측정 */
  measureWidth(char: string, fontSize: number, italic: boolean): number {
    const cacheKey = `${char}:${fontSize}:${italic}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) return cached;

    this.ctx.font = this.getFont(fontSize, italic);
    const width = this.ctx.measureText(char).width;
    this.cache.set(cacheKey, width);
    return width;
  }

  /** 문자열 너비 측정 */
  measureStringWidth(str: string, fontSize: number, italic: boolean): number {
    let width = 0;
    for (const char of str) {
      width += this.measureWidth(char, fontSize, italic);
    }
    return width;
  }

  /** baseline 위쪽 높이 (픽셀) */
  getHeight(fontSize: number): number {
    // New Computer Modern Math: sTypoAscender = 806 / unitsPerEm = 1000
    const actualSize = this.config.baseFontSize * fontSize;
    return actualSize * 0.806;
  }

  /** baseline 아래쪽 깊이 (픽셀) */
  getDepth(fontSize: number): number {
    // New Computer Modern Math: sTypoDescender = -194 / unitsPerEm = 1000
    const actualSize = this.config.baseFontSize * fontSize;
    return actualSize * 0.194;
  }

  /** 폰트 문자열 생성 */
  getFont(fontSize: number, italic: boolean): string {
    const style = italic ? 'italic ' : '';
    const actualSize = this.config.baseFontSize * fontSize;
    return `${style}${actualSize}px ${this.config.fontFamily}`;
  }

  /** 실제 폰트 크기 (px) */
  getActualFontSize(fontSize: number): number {
    return this.config.baseFontSize * fontSize;
  }

  /**
   * 구분자(괄호 등)에 적합한 글리프 선택
   *
   * @param type 구분자 타입 ('(' | '[' | '{' | '|')
   * @param isOpen 열림 구분자 여부
   * @param heightEm 필요한 높이 (em 단위)
   * @returns 글리프 정보
   */
  getDelimiterGlyph(
    type: '(' | '[' | '{' | '|',
    isOpen: boolean,
    heightEm: number
  ): { type: 'single'; char: string } | { type: 'extensible'; parts: ExtensibleGlyph } {
    const pair = getDelimiterGlyphs(type);
    const glyphs = isOpen ? pair.open : pair.close;
    return selectGlyphForHeight(glyphs, heightEm);
  }

  /**
   * 구분자 글리프 쌍 가져오기
   */
  getDelimiterPair(type: '(' | '[' | '{' | '|'): {
    open: DelimiterGlyphs;
    close: DelimiterGlyphs;
  } {
    return getDelimiterGlyphs(type);
  }
}

/**
 * TeX 표준 기반 수학 조판 상수
 *
 * 이 상수들은 The TeXbook (Donald E. Knuth) 및 TeX 수식 조판 표준을 참고하여 정의됨.
 * 모든 단위는 em (현재 폰트 크기 기준 상대 단위)으로 표시됨.
 *
 * 주요 참고 문헌:
 * - The TeXbook, Appendix G: Generating Boxes from Formulas
 * - https://www.tug.org/TUGboat/tb30-1/tb94vieth.pdf (TeX Math Parameters)
 * - KaTeX source: src/fontMetrics.js
 * - MathJax source: ts/output/common/FontData.ts
 */
export const MathConstants = {
  /**
   * 분수선 두께 (em 단위)
   *
   * TeX의 \fontdimen8 (default_rule_thickness) 기반.
   * 표준 TeX 값: 0.04em (Computer Modern 폰트 기준)
   *
   * @see The TeXbook, Appendix G, Rule 15
   */
  fractionRuleThickness: 0.04,

  /**
   * 분수 분자/분모와 분수선 사이 간격 (em 단위)
   *
   * TeX의 \fontdimen9 (num1), \fontdimen11 (num3) 및
   * \fontdimen12 (denom1), \fontdimen13 (denom2) 를 단순화한 값.
   * Display style에서 분자/분모 간격은 더 넓음.
   *
   * 표준 TeX 범위: 0.12em ~ 0.36em (스타일에 따라 다름)
   * 현재 값은 text style 기준의 중간값.
   *
   * @see The TeXbook, Appendix G, Rules 15a-15e
   */
  fractionGap: 0.2,

  /**
   * 지수(위첨자)의 크기 비율
   *
   * 기본 폰트 크기 대비 지수 텍스트 크기 비율.
   * TeX의 scriptfont 크기 비율 기반.
   *
   * 표준 TeX 값:
   * - scriptscriptfont: 0.5 (매우 작은 지수)
   * - scriptfont: 0.7 (일반 지수)
   *
   * @see The TeXbook, Chapter 17 (More About Math)
   */
  exponentScale: 0.8,

  /**
   * 지수의 위쪽 이동량 (baseline 기준, em 단위)
   *
   * TeX의 \fontdimen13 (sup1), \fontdimen14 (sup2), \fontdimen15 (sup3) 기반.
   * x-height의 일정 비율로 설정됨.
   *
   * 표준 TeX 범위: 0.36em ~ 0.47em (스타일에 따라 다름)
   * 현재 값은 cramped style 아닌 경우의 중간값.
   *
   * @see The TeXbook, Appendix G, Rules 18a-18f
   */
  exponentShift: 0.4,

  /**
   * 첨자(아래첨자)의 크기 비율
   *
   * 기본 폰트 크기 대비 첨자 텍스트 크기 비율.
   * 지수와 동일한 scriptfont 크기 사용.
   *
   * @see The TeXbook, Chapter 17 (More About Math)
   */
  subscriptScale: 0.8,

  /**
   * 첨자의 아래쪽 이동량 (baseline 기준, em 단위)
   *
   * TeX의 \fontdimen16 (sub1), \fontdimen17 (sub2) 기반.
   *
   * 표준 TeX 범위: 0.15em ~ 0.25em
   * 현재 값은 cramped style의 중간값.
   *
   * @see The TeXbook, Appendix G, Rules 18a-18f
   */
  subscriptShift: 0.2,

  /**
   * 괄호 내부 여백 (em 단위)
   *
   * \left...\right 구분자 내부 콘텐츠 양쪽에 추가되는 공백.
   * TeX의 \nulldelimiterspace 기반.
   *
   * 표준 TeX 값: 1.2pt ≈ 0.12em (10pt 폰트 기준)
   *
   * @see The TeXbook, Appendix G, Rule 19
   */
  parenPadding: 0.1,

  /**
   * 이항 연산자 좌우 간격 (em 단위)
   *
   * +, -, ×, ÷ 등 이항 연산자(Bin) 주변 간격.
   * TeX의 \medmuskip 기반.
   *
   * 표준 TeX 값:
   * - \thinmuskip (Op): 3mu ≈ 0.17em
   * - \medmuskip (Bin): 4mu ≈ 0.22em
   * - \thickmuskip (Rel): 5mu ≈ 0.28em
   *
   * 현재 값은 medmuskip에 근사.
   *
   * @see The TeXbook, Chapter 18 (Fine Points of Mathematics Typing)
   */
  operatorSpacing: 0.2,

  /**
   * 루트 기호 내부 여백 (em 단위)
   *
   * √ 기호 내부 콘텐츠 상단과 vinculum(가로선) 사이 간격.
   * TeX의 \fontdimen5 (x_height) 기반으로 계산됨.
   *
   * 표준 TeX 값: 0.1em ~ 0.25em (display/text style에 따라)
   *
   * @see The TeXbook, Appendix G, Rules 11, 11'
   */
  sqrtPadding: 0.1,

  /**
   * x-height (em 단위)
   *
   * TeX의 \fontdimen5 (sigma5). 소문자 'x'의 높이.
   * 위첨자/아래첨자 조건 판정, 악센트 배치 등에 사용.
   *
   * 표준 TeX 값: 0.431em (Computer Modern 폰트 기준)
   *
   * @see The TeXbook, Appendix G
   */
  xHeight: 0.431,

  /**
   * 분수 분자 shift (display style, em 단위)
   *
   * TeX의 \fontdimen8 (sigma8, num1).
   * 분자 baseline이 수학 축으로부터 위로 이동하는 거리.
   *
   * @see The TeXbook, Appendix G, Rule 15d
   */
  fracNumDisplayShift: 0.677,

  /**
   * 분수 분자 shift (text style, em 단위)
   *
   * TeX의 \fontdimen9 (sigma9, num2).
   *
   * @see The TeXbook, Appendix G, Rule 15e
   */
  fracNumTextShift: 0.394,

  /**
   * 분수 분모 shift (display style, em 단위)
   *
   * TeX의 \fontdimen11 (sigma11, denom1).
   * 분모 baseline이 수학 축으로부터 아래로 이동하는 거리.
   *
   * @see The TeXbook, Appendix G, Rule 15d
   */
  fracDenomDisplayShift: 0.686,

  /**
   * 분수 분모 shift (text style, em 단위)
   *
   * TeX의 \fontdimen12 (sigma12, denom2).
   *
   * @see The TeXbook, Appendix G, Rule 15e
   */
  fracDenomTextShift: 0.345,

  /**
   * 수학 축 높이 (em 단위)
   *
   * TeX의 \fontdimen22 (sigma22). 분수선, 연산자 등이
   * 수직 중앙에 배치되는 기준선.
   *
   * 표준 TeX 값: 0.250em (Computer Modern 폰트 기준)
   *
   * @see The TeXbook, Appendix G, Rule 15
   */
  axisHeight: 0.25,

  /**
   * 큰 연산자 상한 간격 (em 단위)
   *
   * TeX의 \fontdimen9 (xi9, big_op_spacing1).
   * 큰 연산자와 상한(upper limit) 사이의 최소 간격.
   *
   * @see The TeXbook, Appendix G, Rule 13
   */
  upperLimitGap: 0.111,

  /**
   * 큰 연산자 하한 간격 (em 단위)
   *
   * TeX의 \fontdimen10 (xi10, big_op_spacing2).
   * 큰 연산자와 하한(lower limit) 사이의 최소 간격.
   *
   * @see The TeXbook, Appendix G, Rule 13
   */
  lowerLimitGap: 0.166,

  /**
   * sigma18: sup_drop — 위첨자 초기 위치 계산 (base.height - supDrop)
   * 큰 base(적분 등)에서 위첨자를 상단 근처에 배치하는 데 사용
   * @see The TeXbook, Appendix G, Rule 18c
   */
  supDrop: 0.386,

  /**
   * sigma19: sub_drop — 아래첨자 초기 위치 계산 (base.depth + subDrop)
   * 큰 base(적분 등)에서 아래첨자를 하단 근처에 배치하는 데 사용
   * @see The TeXbook, Appendix G, Rule 18a
   */
  subDrop: 0.05,
} as const;

/** MathConstants 타입 */
export type MathConstantsType = typeof MathConstants;
