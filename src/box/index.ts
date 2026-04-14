/**
 * Box 모델 모듈
 */

export * from './types';
export { CanvasFontMetrics, MathConstants } from './font-metrics';
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
} from './box-builder';
export { astToBox } from './ast-to-box';
export {
  layoutBox,
  collectBoxPositions,
  hitTest,
  findBoxBySourceId,
  getCursorXPosition,
} from './box-layout';
export { BoxRenderer } from './box-renderer';
export { ConfidenceIndicator, DEFAULT_CONFIDENCE_CONFIG } from './confidence-indicator';
export type { ConfidenceLevel, ConfidenceRegion, ConfidenceIndicatorConfig } from './confidence-indicator';
export { buildExplorerMap, explorerHitTest, getBoxBounds } from './explorer-map';
export type { ExplorerBoxInfo, BoxBounds, ExplorerHitResult } from './explorer-map';
