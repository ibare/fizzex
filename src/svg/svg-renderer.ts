/**
 * 수식 → SVG.
 *
 * DOM·Canvas 없이 도는 조판 경로다. Box 트리 생성과 레이아웃은 Canvas 경로와
 * 같은 코드를 쓰고, 투영 대상만 `SvgSurface` 로 바꾼다 — 두 출력이 갈리지 않는
 * 이유이자, 여기에 조판 로직이 한 줄도 없는 이유다.
 */

import { astToBox } from '../box/ast-to-box.js';
import { layoutBox } from '../box/box-layout.js';
import { CanvasFontMetrics } from '../box/font-metrics.js';
import { Projector } from '../box/projector.js';
import type { BoxRenderConfig } from '../box/types.js';
import { parseLatex } from '../latex/index.js';
import type { RootNode } from '../types.js';
import { createFontMeasurer } from './font-measurer.js';
import { SvgSurface } from './svg-surface.js';
import type { SvgRenderOptions, SvgRenderResult } from './types.js';

const DEFAULT_FONT_SIZE = 20;
const DEFAULT_COLOR = '#000000';
const DEFAULT_PADDING = 4;

/**
 * 조판 설정의 fontFamily 자리를 채우는 값.
 *
 * 글자를 `<text>` 가 아니라 글리프 윤곽선으로 내보내므로 이 이름은 출력 어디에도
 * 나타나지 않는다. `getFont()` 가 만드는 CSS font 문자열의 형식을 지키기 위해서만
 * 존재한다 — 실제 글자꼴은 주입된 폰트가 결정한다.
 */
const FONT_FAMILY_PLACEHOLDER = 'serif';

/** AST 를 SVG 로 조판한다 */
export function renderAstToSVG(ast: RootNode, options: SvgRenderOptions): SvgRenderResult {
  const {
    font,
    fontSize = DEFAULT_FONT_SIZE,
    color = DEFAULT_COLOR,
    backgroundColor,
    padding = DEFAULT_PADDING,
    displayMode,
  } = options;

  const config: BoxRenderConfig = {
    baseFontSize: fontSize,
    fontFamily: FONT_FAMILY_PLACEHOLDER,
    color,
    cursorColor: 'transparent',
    showPlaceholders: false,
    ...(displayMode === undefined ? {} : { displayMode }),
  };

  const metrics = new CanvasFontMetrics(createFontMeasurer(font), config);
  const box = astToBox(ast, metrics, 1.0);
  layoutBox(box, padding, padding + box.height);

  const surface = new SvgSurface(font);
  new Projector(surface, config, metrics).render(box);

  const width = Math.ceil(box.width + padding * 2);
  const height = Math.ceil(box.height + box.depth + padding * 2);

  const background =
    backgroundColor === undefined
      ? ''
      : `<rect width="100%" height="100%" fill="${backgroundColor}"/>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}">${background}${surface.toElements().join('')}</svg>`;

  return {
    svg,
    width,
    height,
    // 인라인 배치용 — 아래에서 위로 잰 baseline 위치
    baseline: box.depth + padding,
  };
}

/** LaTeX 를 SVG 로 조판한다 */
export function renderLatexToSVG(latex: string, options: SvgRenderOptions): SvgRenderResult {
  return renderAstToSVG(parseLatex(latex).ast, options);
}
