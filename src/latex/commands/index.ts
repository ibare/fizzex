/**
 * 명령어 레지스트리 통합 모듈
 *
 * 각 카테고리별 핸들러를 통합하여 단일 레지스트리 제공
 */

import type { CommandHandler, CommandContext, CommandResult } from './types.js';
import { greekHandlers } from './greek.js';
import { operatorHandlers } from './operators.js';
import { functionHandlers } from './functions.js';
import { basicHandlers } from './basic.js';
import { bigOpHandlers } from './bigops.js';
import { accentHandlers } from './accents.js';
import { spaceHandlers } from './spaces.js';

// 타입 재export
export type { CommandHandler, CommandContext, CommandResult };

/**
 * 통합 명령어 레지스트리
 *
 * 우선순위:
 * 1. 기본 명령어 (frac, sqrt 등)
 * 2. 대형 연산자 (int, sum, lim 등)
 * 3. 수학 함수 (sin, cos, log 등)
 * 4. 악센트 (hat, vec, dot 등)
 * 5. 그리스 문자
 * 6. 연산자 및 기호
 * 7. 공백
 */
export const commandRegistry: Map<string, CommandHandler> = new Map([
  ...basicHandlers,
  ...bigOpHandlers,
  ...functionHandlers,
  ...accentHandlers,
  ...greekHandlers,
  ...operatorHandlers,
  ...spaceHandlers,
]);

/**
 * 명령어 핸들러 조회
 */
export function getCommandHandler(cmdName: string): CommandHandler | undefined {
  return commandRegistry.get(cmdName);
}

/**
 * 명령어 존재 여부 확인
 */
export function hasCommand(cmdName: string): boolean {
  return commandRegistry.has(cmdName);
}

/**
 * 등록된 명령어 목록
 */
export function getCommandNames(): string[] {
  return Array.from(commandRegistry.keys());
}

/**
 * 카테고리별 명령어 개수
 */
export const commandStats = {
  basic: basicHandlers.size,
  bigOps: bigOpHandlers.size,
  functions: functionHandlers.size,
  accents: accentHandlers.size,
  greek: greekHandlers.size,
  operators: operatorHandlers.size,
  spaces: spaceHandlers.size,
  total: commandRegistry.size,
};
