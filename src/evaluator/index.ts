/**
 * Evaluator 공개 표면 (barrel)
 *
 * 핫패스 / 콜드패스 / 분석 API 를 단일 진입점으로 노출한다.
 */
export { evaluateSync, evaluate } from './evaluate.js';
export { analyzeBindings, analyzeEvaluability } from './analyze.js';
export { evaluateMatrixSync, evaluateMatrix } from './matrix.js';
export { differentiateAt, differentiate } from './autodiff.js';
export { evaluateComplexSync, evaluateComplex } from './complex.js';
export type {
  BindingAnalysis,
  EvaluabilityAnalysis,
} from './analyze.js';
export type {
  Bindings,
  EvalResult,
  EvalStatus,
  EvalDetail,
} from './types.js';
export type { Matrix, MatrixValue, MatrixResult } from './matrix.js';
export type { Dual, DiffResult } from './autodiff.js';
export type { Complex, ComplexResult } from './complex.js';
