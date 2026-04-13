/**
 * 악센트 명령어 핸들러
 */

import type { CommandHandler } from './types';
import { createAccent, createOverline, createUnderline } from './helpers';

/** 악센트 핸들러 생성 */
function accentHandler(
  accentType: 'hat' | 'vec' | 'dot' | 'ddot' | 'tilde' | 'bar' | 'breve' | 'check' | 'acute' | 'grave' | 'mathring'
): CommandHandler {
  return (ctx) => {
    const contentResult = ctx.parseGroup(ctx.latex, ctx.pos);
    return {
      nodes: [createAccent(contentResult.nodes, accentType)],
      consumed: contentResult.consumed,
    };
  };
}

/** 윗줄 핸들러 */
const overlineHandler: CommandHandler = (ctx) => {
  const contentResult = ctx.parseGroup(ctx.latex, ctx.pos);
  return {
    nodes: [createOverline(contentResult.nodes)],
    consumed: contentResult.consumed,
  };
};

/** 악센트 핸들러 레지스트리 */
export const accentHandlers: Map<string, CommandHandler> = new Map([
  ['hat', accentHandler('hat')],
  ['widehat', accentHandler('hat')],
  ['vec', accentHandler('vec')],
  ['overrightarrow', accentHandler('vec')],
  ['dot', accentHandler('dot')],
  ['ddot', accentHandler('ddot')],
  ['tilde', accentHandler('tilde')],
  ['widetilde', accentHandler('tilde')],
  ['bar', accentHandler('bar')],
  ['overline', overlineHandler],
  ['underline', (ctx) => {
    const contentResult = ctx.parseGroup(ctx.latex, ctx.pos);
    return { nodes: [createUnderline(contentResult.nodes)], consumed: contentResult.consumed };
  }],
  ['breve', accentHandler('breve')],
  ['check', accentHandler('check')],
  ['acute', accentHandler('acute')],
  ['grave', accentHandler('grave')],
  ['mathring', accentHandler('mathring')],
]);
