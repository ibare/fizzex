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
  createScripts,
  createParen,
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

// 계산 표면 — 파싱 / 평가 / 분석
// 정의 지점은 './compute/index.js' 하나다. 새 계산 API 는 그쪽에 추가한다.
export {
  // LaTeX ↔ AST
  parseLatex,
  astToLatex,
  // 관대 파싱
  tolerantParse,
  determineRenderMode,
  // 스트리밍 파싱
  StreamTokenizer,
  FizzexStreamParser,
  // 수치 평가
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
  MATH_CONSTANT_NAMES,
  MATH_CONSTANT_VALUES,
  isMathConstantName,
  // 수식 분석
  analyzeExpression,
  analyzePolynomialProfile,
  analyzePolynomial,
  getDegreeLabel,
  classifyVariables,
  detectDomains,
  determinePrimaryDomain,
  getFunctionCategory,
  createFunctionInfoList,
  findNodes,
  hasEquality,
  hasInequality,
} from './compute/index.js';
export type {
  LatexParseResult,
  ParseError,
  ParseErrorType,
  ParseErrorSeverity,
  TolerantParseOptions,
  TolerantParseResult,
  ParserMode,
  DelimiterDetection,
  UnknownCommandPolicy,
  Diagnostic,
  SemanticSafety,
  NormalizationRecord,
  OffsetMap,
  RenderMode,
  RenderDecision,
  StreamToken,
  StreamTokenType,
  StreamOutput,
  StreamOutputText,
  StreamOutputMathComplete,
  StreamOutputMathPending,
  StreamOutputMathFailed,
  StreamOutputAmbiguousDelimiter,
  StreamParserOptions,
  StreamParserState,
  TokenizerState,
  TokenizerOptions,
  LexicalContext,
  Bindings,
  EvalResult,
  EvalStatus,
  EvalDetail,
  BindingAnalysis,
  EvaluabilityAnalysis,
  MathConstantValues,
  Matrix,
  MatrixValue,
  MatrixResult,
  Dual,
  DiffResult,
  Complex,
  ComplexResult,
  ExpressionAnalysis,
  MathDomain,
  FunctionInfo,
  FunctionCategory,
  PolynomialInfo,
  ExpressionFeature,
  VisualizationCapability,
  VariableClassification,
  PolynomialProfile,
  PolynomialShape,
  PolynomialCoefficient,
  MathNode,
  MathNodeType,
  MathNodeBase,
  ParseStatus,
  SourceRange,
  RootNode,
  RowNode,
  NumberNode,
  VariableNode,
  OperatorNode,
  FracNode,
  ScriptsNode,
  ChemNode,
  SqrtNode,
  ParenNode,
  AbsNode,
  FuncNode,
  IntegralNode,
  SumNode,
  LimitNode,
  ProductNode,
  OverlineNode,
  AccentNode,
  OversetNode,
  CancelNode,
  XArrowNode,
  MatrixNode,
  AlignNode,
  CasesNode,
  GatherNode,
  ArrayNode,
  TextNode,
  SpaceNode,
  LiteralNode,
  ErrorNode,
  OpaqueNode,
} from './compute/index.js';

// 구조적 의미 — 카탈로그 데이터가 함께 실린다 ('fizzex/semantic')
export {
  getSemanticMeaning,
  buildSemanticMap,
  buildAstAncestorMap,
  getCatalogDetail,
  containsVariable,
  getVisualizersForForm,
} from './semantic/index.js';
export type {
  SemanticResult,
  AncestorEntry,
  CatalogMatchResult,
  CatalogDetail,
  CatalogCategory,
  ElementMeaning,
  ElementKind,
  DerivedValueConfig,
  ConstraintConfig,
  MilestoneConfig,
  AnchorConfig,
  VisualizerRef,
} from './semantic/index.js';

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
export type { ExplorerOverlayConfig, ExplorerTriggerOptions, ExplorerTriggerHandle } from './headless/index.js';
export { judgeExplorable } from './headless/index.js';
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
// 에디터 상태·커서 타입 — AST 노드 타입은 위 './compute/index.js' 블록이 재수출한다
export type {
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
