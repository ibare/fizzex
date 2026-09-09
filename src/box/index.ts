/**
 * Box 모델 모듈
 */

export * from './types.js';
export { CanvasFontMetrics, MathConstants } from './font-metrics.js';
export {
  createGlyph,
  createGlyphString,
  createHBox,
  createVBox,
  createRule,
  createKern,
  createFraction,
  createPower,
  createSubscript,
  createParenthesized,
  createAbsoluteValue,
  createOperator,
  createIntegralBox,
  createSumBox,
  createLimitBox,
  createProductBox,
  createOverlineBox,
  createUnderlineBox,
  createOversetBox,
  createBoxedBox,
  createCancelBox,
  createOverbraceBox,
  createXArrowBox,
  createSingleDelimiter,
  createMatrixBox,
  createTextBox,
} from './box-builder.js';
export { astToBox } from './ast-to-box.js';
export {
  layoutBox,
  collectBoxPositions,
  hitTest,
  findBoxBySourceId,
  getCursorXPosition,
} from './box-layout.js';
export { Projector } from './projector.js';
// 투영 대상 추상화 — Projector 를 직접 조립하는 호스트가 자기 표면을 타입으로
// 표현하려면 필요하다. 구현체는 내보내지 않는다 — Canvas 소비자는 ctx 를 그대로
// 넘기면 Projector 가 CanvasSurface 로 감싸고, MockSurface 는 테스트 도구다.
export type { Surface } from './surface.js';
export { ConfidenceIndicator, DEFAULT_CONFIDENCE_CONFIG } from './confidence-indicator.js';
export type { ConfidenceLevel, ConfidenceRegion, ConfidenceIndicatorConfig } from './confidence-indicator.js';
export { buildExplorerMap, explorerHitTest, getBoxBounds } from './explorer-map.js';
export type { ExplorerBoxInfo, BoxBounds, ExplorerHitResult } from './explorer-map.js';
