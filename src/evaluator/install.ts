/**
 * 평가자 등록 묶음
 *
 * 등록 목록이 호출처마다 복제되면, 하나를 빠뜨렸을 때 **그 경로에서만** 조용히
 * 실패한다. 타입 검사도 전체 테스트도 초록인 채로 한쪽 API 만 죽는다.
 * 그래서 목록은 여기 한 곳에만 둔다 — 등록이 늘면 이 파일만 고친다.
 */
import { installCoreHandlers } from './core.js';
import { installArithmeticHandlers } from './arithmetic.js';
import { installFunctionHandlers } from './functions.js';
import { installCalculusHandlers } from './calculus.js';
import { installMathOpEvaluator } from './mathop.js';

export function installEvaluatorHandlers(): void {
  installCoreHandlers();
  installArithmeticHandlers();
  installFunctionHandlers();
  installCalculusHandlers();
  installMathOpEvaluator();
}
