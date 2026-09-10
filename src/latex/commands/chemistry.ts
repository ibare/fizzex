/**
 * 화학식 명령어 (`\ce`)
 *
 * mhchem 의 화학식 표기를 지원한다. 본문 해석은 `latex/chem/` 서브파서가 맡는다.
 */

import type { CommandHandler } from './types.js';
import { parseChem } from '../chem/index.js';
import { reportError } from '../parse-errors.js';

/** `\ce{...}` — 화학식 */
export const ceHandler: CommandHandler = (ctx) => {
  if (ctx.latex[ctx.pos] !== '{') {
    reportError(
      'invalid_argument',
      '\\ce is missing its {...} formula argument',
      ctx.pos,
      ctx.latex,
      ctx.commandName,
      ['{']
    );
    return { nodes: [], consumed: ctx.pos };
  }
  return parseChem(ctx.latex, ctx.pos + 1, ctx);
};

/** 화학 명령어 핸들러 레지스트리 */
export const chemistryHandlers: Map<string, CommandHandler> = new Map([
  ['ce', ceHandler],
]);
