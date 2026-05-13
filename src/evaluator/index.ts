/**
 * Evaluator 공개 표면 (barrel)
 *
 * 핫패스 / 콜드패스 / 분석 API 를 단일 진입점으로 노출한다.
 */
export { evaluateSync, evaluate } from './evaluate';
export { analyzeBindings, analyzeEvaluability } from './analyze';
export { evaluateMatrixSync, evaluateMatrix } from './matrix';
export { differentiateAt, differentiate } from './autodiff';
export type {
  BindingAnalysis,
  EvaluabilityAnalysis,
} from './analyze';
export type {
  Bindings,
  EvalResult,
  EvalStatus,
  EvalDetail,
} from './types';
export type { Matrix, MatrixValue, MatrixResult } from './matrix';
export type { Dual, DiffResult } from './autodiff';
