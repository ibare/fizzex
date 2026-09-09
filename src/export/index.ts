/**
 * Fizzex Export 모듈
 *
 * 수식을 다양한 형식으로 내보내기
 */

export {
  renderAstToPNG,
  renderStateToPNG,
  renderLatexToPNG,
  renderAstToPNGWithCanvas,
  calculateVerticalAlign,
  ensureFontsLoaded,
} from './png-renderer.js';

export type {
  MathPNGResult,
  MathPNGOptions,
} from './png-renderer.js';

// 폰트 URL 주입 — 브라우저 번들(`fizzex/browser`)의 유일한 설정 지점.
// Playwright 같은 호스트는 about:blank 에 번들을 주입하므로 기본값
// `/fonts/NewCMMath-Regular.woff2` 를 받을 수 없다. `fizzex/webfonts/*` 로
// 배송되는 파일을 file:// 또는 정적 URL 로 물려야 폰트가 fallback 으로 떨어지지 않는다.
export { setMathFontUrl } from '../fonts/font-loader.js';
