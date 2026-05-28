/**
 * Canvas 없이 동작하는 결정적 FontMetrics
 *
 * CanvasFontMetrics와 동일한 shape을 제공하여 astToBox/box-builder에서 사용 가능.
 * 실제 Canvas 측정 대신 New Computer Modern Math 폰트의 비율 기반 고정값 반환.
 */

import type { BoxRenderConfig } from '../../box/types.js';
import {
  getDelimiterGlyphs,
  selectGlyphForHeight,
} from '../../fonts/glyph-mappings.js';

const DEFAULT_BASE_FONT_SIZE = 20;

export class DeterministicFontMetrics {
  private config: BoxRenderConfig;

  constructor(baseFontSize: number = DEFAULT_BASE_FONT_SIZE) {
    this.config = {
      baseFontSize,
      fontFamily: 'NewComputerModernMath',
      color: '#000000',
      cursorColor: '#000000',
    };
  }

  updateConfig(config: BoxRenderConfig): void {
    this.config = config;
  }

  /** 문자 너비 — 카테고리별 고정 비율 (em 단위 기반) */
  measureWidth(char: string, fontSize: number, _italic: boolean): number {
    const actualSize = this.config.baseFontSize * fontSize;
    const code = char.codePointAt(0) ?? 0;

    // 숫자: 0.5em 폭
    if (code >= 0x30 && code <= 0x39) return actualSize * 0.5;
    // 라틴 소문자: 0.45em
    if (code >= 0x61 && code <= 0x7a) return actualSize * 0.45;
    // 라틴 대문자: 0.65em
    if (code >= 0x41 && code <= 0x5a) return actualSize * 0.65;
    // 그리스: 0.55em
    if ((code >= 0x0391 && code <= 0x03c9) || (code >= 0x1d6fc && code <= 0x1d714)) return actualSize * 0.55;
    // 연산자 (+, -, =, <, > 등): 0.7em
    if ('+-=<>×÷±∓≤≥≠≈∼≡'.includes(char)) return actualSize * 0.7;
    // 괄호: 0.35em
    if ('()[]{}|'.includes(char)) return actualSize * 0.35;
    // 큰 연산자 (Σ, Π, ∫ 등): 0.8em
    if ('ΣΠ∫∑∏'.includes(char)) return actualSize * 0.8;
    // 기본: 0.5em
    return actualSize * 0.5;
  }

  /** 문자열 너비 */
  measureStringWidth(str: string, fontSize: number, italic: boolean): number {
    let width = 0;
    for (const char of str) {
      width += this.measureWidth(char, fontSize, italic);
    }
    return width;
  }

  /** baseline 위 높이 — New Computer Modern Math sTypoAscender=806/1000 */
  getHeight(fontSize: number): number {
    return this.config.baseFontSize * fontSize * 0.806;
  }

  /** baseline 아래 깊이 — sTypoDescender=194/1000 */
  getDepth(fontSize: number): number {
    return this.config.baseFontSize * fontSize * 0.194;
  }

  /** CSS 폰트 문자열 */
  getFont(fontSize: number, italic: boolean): string {
    const style = italic ? 'italic ' : '';
    const actualSize = this.config.baseFontSize * fontSize;
    return `${style}${actualSize}px ${this.config.fontFamily}`;
  }

  /** 실제 폰트 크기 (px) */
  getActualFontSize(fontSize: number): number {
    return this.config.baseFontSize * fontSize;
  }

  /** 구분자 글리프 선택 */
  getDelimiterGlyph(
    type: '(' | '[' | '{' | '|',
    isOpen: boolean,
    heightEm: number
  ): { type: 'single'; char: string } | { type: 'extensible'; parts: unknown } {
    const pair = getDelimiterGlyphs(type);
    const glyphs = isOpen ? pair.open : pair.close;
    return selectGlyphForHeight(glyphs, heightEm);
  }

  /** 구분자 글리프 쌍 */
  getDelimiterPair(type: '(' | '[' | '{' | '|') {
    return getDelimiterGlyphs(type);
  }
}

/** 기본 baseFontSize=20으로 메트릭스 생성 */
export function createDeterministicMetrics(baseFontSize: number = DEFAULT_BASE_FONT_SIZE): DeterministicFontMetrics {
  return new DeterministicFontMetrics(baseFontSize);
}
