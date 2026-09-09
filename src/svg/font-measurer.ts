/**
 * 폰트 파일 기반 폭 측정자.
 *
 * `CanvasFontMetrics` 는 폭을 알아낼 때만 Canvas 를 쓴다 — 나머지 값은 전부 순수
 * 계산이다. 그 한 구멍을 폰트의 advance width 로 막으면 Canvas 없이도 같은
 * 레이아웃이 나온다. 그래서 Node 용 메트릭스 클래스를 따로 만들지 않는다.
 */

import { parseFontString } from '../box/font-metrics.js';
import type { TextMeasurer } from '../box/types.js';
import type { MathFont } from './types.js';

/** 글리프 하나의 전진폭을 px 로 환산한다 */
function advanceWidthPx(font: MathFont, char: string, fontSizePx: number): number {
  const glyph = font.charToGlyph(char);
  return ((glyph.advanceWidth ?? 0) / font.unitsPerEm) * fontSizePx;
}

/**
 * `CanvasFontMetrics` 생성자에 넘길 폭 측정자를 만든다.
 *
 * 측정할 크기는 인자가 아니라 `font` 프로퍼티 대입으로 들어온다 —
 * `CanvasFontMetrics.measureWidth` 가 `ctx.font = ...` 후 `measureText` 를 부르는
 * Canvas 관례를 그대로 따르기 때문이다. 그 값을 무시하면 분수·지수처럼 축소된
 * 글자의 폭이 전부 기준 크기로 계산된다.
 */
export function createFontMeasurer(font: MathFont): TextMeasurer {
  return {
    font: '',
    measureText(text: string): { width: number } {
      const { fontSizePx } = parseFontString(this.font);
      if (fontSizePx <= 0) return { width: 0 };
      let width = 0;
      for (const char of text) {
        width += advanceWidthPx(font, char, fontSizePx);
      }
      return { width };
    },
  };
}
