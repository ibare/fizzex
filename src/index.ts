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

// React 컴포넌트
export {
  MathCanvas,
  StructureViewer,
  SuggestionChips,
  SuggestionPopover,
} from './react';
export type {
  MathCanvasProps,
  StructureViewerProps,
  SuggestionChipsProps,
  SuggestionPopoverProps,
} from './react';

// 수식 분석기
export { analyzeExpression, matchVisualization } from './analyzer';
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
