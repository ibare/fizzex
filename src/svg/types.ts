/**
 * SVG 렌더 백엔드의 공개 타입.
 *
 * 폰트는 주입받는다 — fizzex 는 폰트 파일을 스스로 찾지 않는다. 패키지 경로를
 * 코드에 박으면 publish 후 존재하지 않는 경로가 되고, 호스트가 어떤 폰트를 쓸지
 * 고를 자유도 사라진다. 호스트는 `fizzex/webfonts/NewCMMath-Regular.otf` 를
 * 읽어 넘기면 된다.
 */

/** 글리프 윤곽선. `toPathData` 는 SVG path 의 `d` 문자열을 낸다 */
export interface FontGlyphPath {
  toPathData(decimalPlaces: number): string;
}

/** 글리프 하나 */
export interface FontGlyph {
  /** 폰트 단위 전진폭. 없으면 0 으로 본다 */
  advanceWidth?: number | undefined;
  getPath(x: number, y: number, fontSize: number): FontGlyphPath;
}

/**
 * 조판에 쓸 수학 폰트.
 *
 * 구조적 타입이라 opentype.js 의 `Font` 인스턴스가 그대로 들어맞는다. 그래서
 * fizzex 는 opentype.js 에 의존하지 않고, 호스트가 쓰는 폰트 라이브러리를
 * 강제하지도 않는다.
 */
export interface MathFont {
  unitsPerEm: number;
  charToGlyph(char: string): FontGlyph;
}

/** SVG 렌더 옵션 */
export interface SvgRenderOptions {
  /** 조판에 쓸 폰트 (필수 — 주입 전용) */
  font: MathFont;
  /** 기준 폰트 크기 (px, 기본 20) */
  fontSize?: number;
  /** 글자 색 (기본 '#000000') */
  color?: string;
  /** 배경색. 생략하면 배경을 그리지 않는다(투명) */
  backgroundColor?: string;
  /** 바깥 여백 (px, 기본 4) */
  padding?: number;
  /** 표시 모드 — 독립 수식(display) 인지 본문 내 수식(inline) 인지 */
  displayMode?: 'display' | 'inline';
}

/** SVG 렌더 결과 */
export interface SvgRenderResult {
  /** 완성된 `<svg>` 문서 */
  svg: string;
  /** 너비 (px) */
  width: number;
  /** 높이 (px) */
  height: number;
  /** 인라인 배치용 baseline 위치 — 아래에서 위로 잰 px */
  baseline: number;
}
