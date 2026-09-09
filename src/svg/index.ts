/**
 * Fizzex SVG 표면 — `fizzex/svg`
 *
 * 수식을 벡터 SVG 로 조판한다. DOM·Canvas·헤드리스 브라우저가 필요 없어서 Node
 * 서버(PDF 프린트 등)에서 그대로 돈다.
 *
 * 글자는 글리프 윤곽선 `<path>` 로 나간다 — 폰트를 임베드하거나 수신자에게
 * 설치를 요구하지 않는다. 폰트는 호스트가 주입한다. `fizzex/webfonts/` 로
 * 배송되는 파일을 opentype.js 같은 라이브러리로 읽어 넘기면 된다.
 */

export { renderAstToSVG, renderLatexToSVG } from './svg-renderer.js';
// 타입만 내보낸다 — SvgSurface·createFontMeasurer 는 렌더 함수가 내부에서 조립한다.
// 이들을 직접 쥐려면 Projector 를 손수 조립해야 하는데 그 통로(Surface)는 열려
// 있지 않다. 실제 요구가 생기면 그때 열면 되고, 반대 방향은 어렵다.
export type {
  MathFont,
  FontGlyph,
  FontGlyphPath,
  SvgRenderOptions,
  SvgRenderResult,
} from './types.js';
