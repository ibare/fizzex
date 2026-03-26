/**
 * 명령어 핸들러 타입 정의
 */

import type { MathNode } from '../../types';

/** 명령어 파싱 결과 */
export interface CommandResult {
  nodes: MathNode[];
  consumed: number;
}

/** 명령어 핸들러 컨텍스트 */
export interface CommandContext {
  latex: string;
  pos: number;
  parseExpression: (latex: string, start: number, stopChars?: string[]) => CommandResult;
  parseGroup: (latex: string, start: number) => CommandResult;
  parseNumber: (latex: string, start: number) => CommandResult;
  parseCommand: (latex: string, start: number) => CommandResult;
}

/** 명령어 핸들러 타입 */
export type CommandHandler = (ctx: CommandContext) => CommandResult;
