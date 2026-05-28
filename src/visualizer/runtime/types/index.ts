export type { I18nText } from './i18n.js';
export { resolveI18n } from './i18n.js';
export type { ExprString, ExprAst } from './expr.js';
export type { DisplayOptionId } from './display-options.js';
export { DISPLAY_OPTION_IDS, isDisplayOptionId } from './display-options.js';
export type { StateDecl, AnimationStep, AnimationSpec } from './state.js';
export type { SceneSpec, SceneStyle } from './scene.js';
export type {
  InteractionSpec,
  GestureSpec,
  GestureKind,
  HitTestSpec,
  InteractionAction,
} from './interaction.js';
export type { OverlaySpec, OverlayLine, OverlayStyle } from './overlay.js';
export type {
  ViewportSpec,
  TimeValueViewport,
  FitBoxViewport,
  PolarViewport,
  FrameRectViewport,
  RectSpec,
  EdgePadding,
} from './viewport.js';
export type {
  StyleSpec,
  FillSpec,
  LinearGradient,
  RadialGradient,
  TransformSpec,
} from './style.js';
export type {
  ElementNode,
  ElementKind,
  RectEl,
  RoundRectEl,
  CircleEl,
  EllipseEl,
  ArcEl,
  FilledArcEl,
  LineEl,
  PolylineEl,
  PolygonEl,
  PathEl,
  TextEl,
  ImageEl,
  FunctionCurveEl,
  GroupEl,
  IfEl,
  RepeatEl,
  MatchEl,
  LayoutEl,
  LayoutArea,
  ViewportScopeEl,
  ClipEl,
  SphereEl,
  BufferLineEl,
  PointsEl,
  LightEl,
  ShaderMaterialEl,
} from './element.js';
export type { LocalFormula } from './formula.js';
export type { ThemeSpec } from './theme.js';
export type { UserBindingSpec, OutputKind } from './user-binding.js';
export type { DerivativeSpec } from './derivative.js';
export type { VisualizerSpec, RendererKind } from './spec.js';
