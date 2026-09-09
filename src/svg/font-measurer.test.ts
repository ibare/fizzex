/**
 * 폭 측정자 계약 테스트.
 *
 * 측정할 크기는 인자가 아니라 `font` 프로퍼티 대입으로 들어온다. 이 통로가 끊기면
 * 캐시 키는 크기별로 갈리는데 반환값은 전부 같아져, 분수·지수처럼 축소된 글자의
 * 폭이 조용히 기준 크기로 계산된다. 타입 검사로는 잡히지 않아 테스트로 고정한다.
 */

import { describe, it, expect } from 'vitest';
import { createFontMeasurer } from './font-measurer.js';
import type { MathFont } from './types.js';

/** advance width 가 문자마다 다른 최소 폰트 */
const stubFont: MathFont = {
  unitsPerEm: 1000,
  charToGlyph: (char: string) => ({
    advanceWidth: char === 'i' ? 250 : 500,
    getPath: () => ({ toPathData: () => '' }),
  }),
};

describe('createFontMeasurer', () => {
  it('font 에 대입된 크기를 폭에 반영한다', () => {
    const measurer = createFontMeasurer(stubFont);

    measurer.font = '20px serif';
    const atTwenty = measurer.measureText('x').width;
    measurer.font = '10px serif';
    const atTen = measurer.measureText('x').width;

    expect(atTwenty).toBe(10); // 500/1000 * 20
    expect(atTen).toBe(5);
    // 크기 대입을 무시하는 구현이면 두 값이 같아진다.
    expect(atTwenty).not.toBe(atTen);
  });

  it('문자마다 다른 advance width 를 더한다', () => {
    const measurer = createFontMeasurer(stubFont);
    measurer.font = '20px serif';

    expect(measurer.measureText('i').width).toBe(5);
    expect(measurer.measureText('xi').width).toBe(15);
  });

  it('font 가 비어 있으면 0 을 낸다', () => {
    const measurer = createFontMeasurer(stubFont);
    expect(measurer.measureText('x').width).toBe(0);
  });

  it('italic 접두가 붙은 문자열에서도 크기를 읽는다', () => {
    const measurer = createFontMeasurer(stubFont);
    measurer.font = 'italic 16px serif';
    expect(measurer.measureText('x').width).toBe(8);
  });

  it('advanceWidth 가 없는 글리프를 0 으로 다룬다', () => {
    const measurer = createFontMeasurer({
      unitsPerEm: 1000,
      charToGlyph: () => ({ getPath: () => ({ toPathData: () => '' }) }),
    });
    measurer.font = '20px serif';
    expect(measurer.measureText('x').width).toBe(0);
  });
});
