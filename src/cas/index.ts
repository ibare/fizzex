/**
 * Fizzex CAS (Computer Algebra System)
 *
 * Nerdamer 기반 심볼릭 수학 연산
 *
 * @example
 * ```typescript
 * import { simplify, factor, solve, diff, integrate } from 'fizzex/cas';
 *
 * // 단순화
 * const result1 = await simplify('\\frac{2x}{2}');
 * console.log(result1.resultLatex); // 'x'
 *
 * // 인수분해
 * const result2 = await factor('x^2 - 1');
 * console.log(result2.resultLatex); // '(x-1)(x+1)'
 *
 * // 방정식 풀이
 * const result3 = await solve('x^2 - 4 = 0');
 * console.log(result3.solutions); // ['2', '-2']
 *
 * // 미분
 * const result4 = await diff('x^3');
 * console.log(result4.resultLatex); // '3x^2'
 *
 * // 적분
 * const result5 = await integrate('x^2');
 * console.log(result5.resultLatex); // 'x^3/3'
 * ```
 */

// CAS 연산 함수들
export {
  simplify,
  expand,
  factor,
  solve,
  diff,
  integrate,
  evaluate,
  performOperation,
} from './cas-service';

// 타입
export type {
  CASResult,
  CASOperation,
  CASService,
  DiffOptions,
  IntegrateOptions,
  SolveOptions,
} from './types';

// 유틸리티 (고급 사용자용)
export { latexToNerdamer, cleanNerdamerLatex, splitEquation } from './latex-converter';
