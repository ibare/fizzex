/**
 * Fizzex 계산 표면 — `fizzex/compute`
 *
 * DOM·Canvas·프레임워크 없이 도는 수식 처리만 모은 진입점.
 * Node 워커처럼 react 가 설치되지 않은 컨텍스트에서 쓰라고 있는 계약이다.
 *
 * 담는 것: LaTeX 파싱(관대 파싱·스트리밍 포함), 수치 평가, 수식 분석.
 * 담지 않는 것: 레이아웃(box), 폰트, 캔버스, 시각화, 에디터 상태·커서,
 * 그리고 의미 카탈로그(`fizzex/semantic` — 한국어 설명 텍스트라 payload 가 크다).
 */

// ── LaTeX ↔ AST ──────────────────────────────────────────────
export { parseLatex, astToLatex } from '../latex/index.js';
export type {
  LatexParseResult,
  ParseError,
  ParseErrorType,
  ParseErrorSeverity,
} from '../latex/index.js';

// ── 관대 파싱 — 불완전한 입력을 부분 AST 로 ──────────────────
export { tolerantParse, determineRenderMode } from '../latex/tolerant/index.js';
export type {
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
} from '../latex/tolerant/index.js';

// ── 스트리밍 파싱 — LLM 출력을 조각 단위로 ───────────────────
export { StreamTokenizer, FizzexStreamParser } from '../latex/streaming/index.js';
export type {
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
} from '../latex/streaming/index.js';

// ── 수치 평가 (scalar / matrix / complex / autodiff) ─────────
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
  MATH_CONSTANT_NAMES,
  MATH_CONSTANT_VALUES,
  isMathConstantName,
} from '../evaluator/index.js';
export type {
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
} from '../evaluator/index.js';

// ── 수식 분석 ────────────────────────────────────────────────
export {
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
} from '../analyzer/index.js';
export type {
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
} from '../analyzer/index.js';

// ── AST 타입 ─────────────────────────────────────────────────
// 유니온 멤버를 전부 내보낸다 — AST 를 순회하는 소비자가 각 분기를 명명할 수 있어야 한다.
export type {
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
} from '../types.js';
