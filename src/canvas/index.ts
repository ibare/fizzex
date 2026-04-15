/**
 * Canvas Scene 시스템
 *
 * 시각화 프리미티브, 씬 그래프, 애니메이션 인프라.
 */

// SceneSurface (Surface 확장)
export type { SceneSurface } from './scene-surface';
export { CanvasSceneSurface, MockSceneSurface } from './scene-surface';

// 이징 함수
export { Easing } from './easing';
export type { EasingFn } from './easing';

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
} from './primitives';
export type {
  AxisStyle,
  GridStyle,
  ArrowStyle,
  DashedLineStyle,
  LabelStyle,
  DotStyle,
} from './primitives';

// 씬 그래프
export { DisplayObject, CustomShape } from './display-object';
export { Container } from './container';

// 애니메이션
export { Tween } from './tween';
export type { TweenConfig } from './tween';
export { Timeline } from './timeline';

// Stage (Canvas 수명주기)
export { Stage } from './stage';
export type { StageConfig } from './stage';

// 수식 객체 (Box+Projector 래핑)
export { MathFormulaObject } from './math-formula-object';
export type { MathFormulaConfig } from './math-formula-object';
