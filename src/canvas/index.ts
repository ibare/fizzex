/**
 * Canvas Scene 시스템
 *
 * 시각화 프리미티브, 씬 그래프, 애니메이션 인프라.
 */

// SceneSurface (Surface 확장)
export type { SceneSurface } from './scene-surface.js';
export { CanvasSceneSurface, MockSceneSurface } from './scene-surface.js';

// 이징 함수
export { Easing } from './easing.js';
export type { EasingFn } from './easing.js';

// 차트 프리미티브
export {
  setupHiDPI,
  drawAxis,
  drawCartesianGrid,
  drawPolarGrid,
  drawArrow,
  drawDashedLine,
  drawLabel,
  drawDot,
} from './primitives.js';
export type {
  AxisStyle,
  GridStyle,
  ArrowStyle,
  DashedLineStyle,
  LabelStyle,
  DotStyle,
} from './primitives.js';

// 씬 그래프
export { DisplayObject, CustomShape } from './display-object.js';
export { Container } from './container.js';

// 애니메이션
export { Tween } from './tween.js';
export type { TweenConfig } from './tween.js';
export { Timeline } from './timeline.js';

// Stage (Canvas 수명주기)
export { Stage } from './stage.js';
export type { StageConfig } from './stage.js';

// 수식 객체 (Box+Projector 래핑)
export { MathFormulaObject } from './math-formula-object.js';
export type { MathFormulaConfig } from './math-formula-object.js';
