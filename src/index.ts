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
} from './editor.js';

// Box 모델 (레이아웃 시스템)
export * from './box/index.js';

// LaTeX 지원
export { parseLatex, astToLatex } from './latex/index.js';

// 자동완성 제안
export {
  getSuggestions,
  getAllSuggestions,
  getAllSuggestionsForContext,
  searchSuggestions,
  analyzeCursorContext,
} from './suggestion/index.js';
export type {
  Suggestion,
  SuggestionWithAction,
  SuggestionAction,
  SuggestionCategory,
  CursorContext,
} from './suggestion/index.js';

// i18n
export {
  FizzexI18nProvider,
  useFizzexLabels,
  useSuggestionLabel,
  useLocalizedSuggestions,
  useCategoryLabel,
  defaultLabels,
} from './i18n/index.js';
export type {
  FizzexLabels,
  PartialFizzexLabels,
  FizzexI18nProviderProps,
} from './i18n/index.js';

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
} from './fonts/index.js';
export type {
  FontLoadStatus,
  FontLoadResult,
  MathFontConfig,
  FontGlyphMapping,
} from './fonts/index.js';

// React 컴포넌트 — 새 이름 (primary)
export {
  EditorView,
  StreamView,
  SuggestionChips,
  SuggestionPopover,
  ExpressionExplorer,
} from './react/index.js';
export type {
  EditorViewProps,
  StreamViewProps,
  SuggestionChipsProps,
  SuggestionPopoverProps,
  ExpressionExplorerProps,
} from './react/index.js';

// 수식 분석기
export { analyzeExpression, getSemanticMeaning, buildSemanticMap, buildAstAncestorMap } from './analyzer/index.js';
export type {
  ExpressionAnalysis,
  MathDomain,
  FunctionInfo,
  FunctionCategory,
  PolynomialInfo,
  ExpressionFeature,
  VisualizationCapability,
  VariableClassification,
  SemanticResult,
  AncestorEntry,
} from './analyzer/index.js';

// Evaluator — 동기 AST 수치 평가 표준 표면 (scalar / matrix / complex / autodiff)
export {
  evaluateSync,
  evaluate,
  evaluateMatrixSync,
  evaluateMatrix,
  differentiateAt,
  differentiate,
  evaluateComplexSync,
  evaluateComplex,
  analyzeBindings,
  analyzeEvaluability,
} from './evaluator/index.js';
export type {
  Bindings,
  EvalResult,
  EvalStatus,
  EvalDetail,
  BindingAnalysis,
  EvaluabilityAnalysis,
  Matrix,
  MatrixValue,
  MatrixResult,
  Dual,
  DiffResult,
  Complex,
  ComplexResult,
} from './evaluator/index.js';


// Tolerant Parser
export { determineRenderMode } from './latex/tolerant/index.js';
export type {
  SemanticSafety,
  NormalizationRecord,
  Diagnostic,
  RenderMode,
  RenderDecision,
} from './latex/tolerant/index.js';

// Streaming Parser
export { StreamTokenizer, FizzexStreamParser } from './latex/streaming/index.js';
export type {
  StreamToken,
  StreamOutput,
  StreamParserOptions,
  StreamParserState,
  TokenizerState,
  TokenizerOptions,
} from './latex/streaming/index.js';

// Confidence Indicator
export { ConfidenceIndicator, DEFAULT_CONFIDENCE_CONFIG } from './box/index.js';
export type { ConfidenceLevel, ConfidenceRegion, ConfidenceIndicatorConfig } from './box/index.js';

// Headless 어댑터 — 새 이름 (primary)
export { DOMRendererView } from './headless/index.js';
export { DOMEditorView } from './headless/index.js';
export { DOMStreamView, classifyConfidence, buildConfidenceRegions } from './headless/index.js';
export type { DOMStreamViewConfig } from './headless/index.js';

// Headless Explorer
export { ExplorerOverlay } from './headless/index.js';
export type { ExplorerOverlayConfig, ExplorerTriggerOptions } from './headless/index.js';
export { ExplorerVisualizerController } from './headless/index.js';

// Visualizer 프레임워크 — JSON spec 기반 런타임
export {
  createVisualizer,
  createVisualizerRegistry,
  compileSpec,
} from './visualizer/index.js';
export type {
  CreateVisualizerOptions,
  CreateVisualizerBaseOptions,
  CreateVisualizerFromRegistryOptions,
  CreateVisualizerFromSpecOptions,
  CreatedVisualizer,
  CreatedVisualizerInstance,
  CompiledVisualizer,
  Visualizer2DInstance,
  Visualizer3DInstance,
  VisualizerRegistry,
  VisualizerRegistryOptions,
  VisualizerRegistryManifest,
  VisualizerRegistryManifestEntry,
  VisualizerRegistryLoadOptions,
  VisualizerSpec,
  SceneSpec,
  SceneStyle,
  I18nText,
  UserBindingSpec,
  OutputKind,
  ApplyUserBindingsResult,
  AppliedBinding,
  AppliedBindingValue,
  SkippedBinding,
  SkipReason,
  UserBindingInput,
  UserBindingInputs,
} from './visualizer/index.js';
export { resolveI18n, applyUserBindings } from './visualizer/index.js';
export { getVisualizersForCatalog } from './analyzer/semantic/loader.js';
export type { VisualizerRef } from './analyzer/semantic/types.js';

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
  BoundaryCursor,
  IntraCursor,
  EditorState,
} from './types.js';
export { boundary, intra } from './types.js';

// PNG 익스포터
export {
  renderAstToPNG,
  renderStateToPNG,
  renderLatexToPNG,
  renderAstToPNGWithCanvas,
  calculateVerticalAlign,
  ensureFontsLoaded,
} from './export/index.js';
export type {
  MathPNGResult,
  MathPNGOptions,
} from './export/index.js';
