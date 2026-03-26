/**
 * LaTeX 명령어 레지스트리
 *
 * 하위 호환성을 위한 래퍼 모듈.
 * 실제 구현은 ./commands/ 디렉토리에 카테고리별로 분리됨.
 *
 * @see ./commands/index.ts - 통합 레지스트리
 * @see ./commands/greek.ts - 그리스 문자
 * @see ./commands/operators.ts - 연산자 및 기호
 * @see ./commands/functions.ts - 수학 함수
 * @see ./commands/basic.ts - 기본 명령어 (frac, sqrt 등)
 * @see ./commands/bigops.ts - 대형 연산자 (int, sum, lim 등)
 * @see ./commands/accents.ts - 악센트 기호
 * @see ./commands/spaces.ts - 공백
 */

// 모든 export를 ./commands에서 재export
export {
  commandRegistry,
  getCommandHandler,
  hasCommand,
  getCommandNames,
  commandStats,
  type CommandHandler,
  type CommandContext,
  type CommandResult,
} from './commands';
