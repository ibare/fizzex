/**
 * Fizzex - Canvas 기반 수식 에디터
 *
 * 거품처럼 가볍고 쉬운 수식 입력
 */

// 에디터
export {
  MathEditor,
  createInitialState,
  createStateFromLatex,
  createEmptyRoot,
  createNumber,
  createVariable,
  createOperator,
  createFrac,
  createPower,
  createParen,
  createSubscript,
  createAbs,
  createIntegral,
  createSum,
  createLimit,
  createProduct,
  createOverline,
  createMatrix,
  createText,
} from './editor';

// Box 모델 (레이아웃 시스템)
export * from './box';

// LaTeX 지원
export { parseLatex, astToLatex } from './latex';

// 자동완성 제안
export {
  getSuggestions,
  getAllSuggestions,
  getAllSuggestionsForContext,
  searchSuggestions,
  analyzeCursorContext,
} from './suggestion';
export type {
  Suggestion,
  SuggestionWithAction,
  SuggestionAction,
  SuggestionCategory,
  CursorContext,
} from './suggestion';

// i18n
export {
  FizzexI18nProvider,
  useFizzexLabels,
  useSuggestionLabel,
  useLocalizedSuggestions,
  useCategoryLabel,
  defaultLabels,
} from './i18n';
export type {
  FizzexLabels,
  PartialFizzexLabels,
  FizzexI18nProviderProps,
} from './i18n';

// 폰트
export {
  loadMathFont,
  setMathFontUrl,
  getFontLoadStatus,
  getAvailableFontFamily,
  NEW_CM_MATH_CONFIG,
  setFontMapping,
  getFontMapping,
  getFontFamily,
} from './fonts';
export type {
  FontLoadStatus,
  FontLoadResult,
  MathFontConfig,
  FontGlyphMapping,
} from './fonts';

// React 컴포넌트 — 새 이름 (primary)
export {
  EditorView,
  StreamView,
  StructureViewer,
  SuggestionChips,
  SuggestionPopover,
  ExpressionExplorer,
} from './react';
export type {
  EditorViewProps,
  StreamViewProps,
  StructureViewerProps,
  SuggestionChipsProps,
  SuggestionPopoverProps,
  ExpressionExplorerProps,
} from './react';

// React 컴포넌트 — 하위 호환 alias (deprecated)
export {
  EditorView as MathCanvas,
  StreamView as StreamingMath,
} from './react';
export type {
  EditorViewProps as MathCanvasProps,
  StreamViewProps as StreamingMathProps,
} from './react';

// 수식 분석기
export { analyzeExpression, matchVisualization, getSemanticMeaning, buildSemanticMap, buildAstAncestorMap } from './analyzer';
export type {
  ExpressionAnalysis,
  MathDomain,
  FunctionInfo,
  FunctionCategory,
  PolynomialInfo,
  ExpressionFeature,
  VisualizationCapability,
  VisualizationType,
  VariableClassification,
  VisualizationParams,
  NumberLineParams,
  UnitCircleParams,
  PolarGraphParams,
  FunctionGraph2DParams,
  VisualizationMatch,
  SemanticResult,
  AncestorEntry,
} from './analyzer';

// CAS (Computer Algebra System)
export {
  simplify,
  expand,
  factor,
  solve,
  diff,
  integrate,
  evaluate,
  performOperation,
} from './cas';
export type {
  CASResult,
  CASOperation,
  DiffOptions,
  IntegrateOptions,
  SolveOptions,
} from './cas';

// 시각화
export {
  FunctionGraph,
  UnitCircle,
  NumberLine,
  PolarGraph,
  AutoVisualizer,
  GraphRenderer,
  calculatePoints,
  canGraph,
} from './visualizer';
export type {
  FunctionGraphProps,
  UnitCircleProps,
  NumberLineProps,
  NumberLinePoint,
  NumberLineInterval,
  PolarGraphProps,
  AutoVisualizerProps,
  GraphConfig,
  GraphRange,
} from './visualizer';

// Tolerant Parser
export { determineRenderMode } from './latex/tolerant';
export type {
  SemanticSafety,
  NormalizationRecord,
  Diagnostic,
  RenderMode,
  RenderDecision,
} from './latex/tolerant';

// Streaming Parser
export { StreamTokenizer, FizzexStreamParser } from './latex/streaming';
export type {
  StreamToken,
  StreamOutput,
  StreamParserOptions,
  StreamParserState,
  TokenizerState,
  TokenizerOptions,
} from './latex/streaming';

// Confidence Indicator
export { ConfidenceIndicator, DEFAULT_CONFIDENCE_CONFIG } from './box';
export type { ConfidenceLevel, ConfidenceRegion, ConfidenceIndicatorConfig } from './box';

// Headless 어댑터 — 새 이름 (primary)
export { DOMRendererView } from './headless';
export { DOMEditorView } from './headless';
export { DOMStreamView, classifyConfidence, buildConfidenceRegions } from './headless';
export type { DOMStreamViewConfig } from './headless';

// Headless 어댑터 — 하위 호환 alias (deprecated)
export { DOMRendererView as FizzexRenderer } from './headless';
export { DOMEditorView as FizzexEditor } from './headless';
export { DOMStreamView as FizzexStreamRenderer } from './headless';
export type { DOMStreamViewConfig as StreamRendererConfig } from './headless';

// Headless Explorer
export { ExplorerOverlay } from './headless';
export type { ExplorerOverlayConfig, ExplorerTriggerOptions } from './headless';

// 타입
export type {
  MathNode,
  MathNodeType,
  ParseStatus,
  SourceRange,
  RootNode,
  NumberNode,
  VariableNode,
  OperatorNode,
  FracNode,
  PowerNode,
  SubscriptNode,
  SqrtNode,
  ParenNode,
  AbsNode,
  FuncNode,
  IntegralNode,
  SumNode,
  LimitNode,
  ProductNode,
  OverlineNode,
  MatrixNode,
  TextNode,
  RowNode,
  LiteralNode,
  ErrorNode,
  OpaqueNode,
  CursorPosition,
  EditorState,
} from './types';

// PNG 익스포터
export {
  renderAstToPNG,
  renderStateToPNG,
  renderLatexToPNG,
  renderAstToPNGWithCanvas,
  calculateVerticalAlign,
  ensureFontsLoaded,
} from './export';
export type {
  MathPNGResult,
  MathPNGOptions,
} from './export';
