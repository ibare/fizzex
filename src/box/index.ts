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
export { ConfidenceIndicator, DEFAULT_CONFIDENCE_CONFIG } from './confidence-indicator.js';
export type { ConfidenceLevel, ConfidenceRegion, ConfidenceIndicatorConfig } from './confidence-indicator.js';
export { buildExplorerMap, explorerHitTest, getBoxBounds } from './explorer-map.js';
export type { ExplorerBoxInfo, BoxBounds, ExplorerHitResult } from './explorer-map.js';
