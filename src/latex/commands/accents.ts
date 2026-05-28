/**
 * 악센트 명령어 핸들러
 */

import type { AccentNode } from '../../types.js';
import type { CommandHandler } from './types.js';
import { createAccent, createOverline, createUnderline, createOverbrace, createXArrow } from './helpers.js';

/** 악센트 핸들러 생성 */
function accentHandler(accentType: AccentNode['accentType']): CommandHandler {
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

/** overbrace/underbrace 핸들러 생성 */
function braceHandler(variant: 'overbrace' | 'underbrace'): CommandHandler {
  return (ctx) => {
    const contentResult = ctx.parseGroup(ctx.latex, ctx.pos);
    return {
      nodes: [createOverbrace(contentResult.nodes, variant)],
      consumed: contentResult.consumed,
    };
  };
}

/** xleftarrow/xrightarrow 핸들러 생성 */
function xarrowHandler(direction: 'left' | 'right' | 'both'): CommandHandler {
  return (ctx) => {
    let pos = ctx.pos;

    // 선택적 아래 텍스트: [below]
    let below: import('../../types.js').MathNode[] | undefined;
    if (ctx.latex[pos] === '[') {
      pos++; // skip '['
      const belowResult = ctx.parseExpression(ctx.latex, pos, [']']);
      below = belowResult.nodes;
      pos = belowResult.consumed;
      if (ctx.latex[pos] === ']') pos++; // skip ']'
    }

    // 필수 위 텍스트: {above}
    const aboveResult = ctx.parseGroup(ctx.latex, pos);
    pos = aboveResult.consumed;

    return {
      nodes: [createXArrow(aboveResult.nodes, below, direction)],
      consumed: pos,
    };
  };
}

/** 악센트 핸들러 레지스트리 */
export const accentHandlers: Map<string, CommandHandler> = new Map([
  ['hat', accentHandler('hat')],
  ['widehat', accentHandler('widehat')],
  ['vec', accentHandler('vec')],
  ['overrightarrow', accentHandler('overrightarrow')],
  ['overleftarrow', accentHandler('overleftarrow')],
  ['overleftrightarrow', accentHandler('overleftrightarrow')],
  ['dot', accentHandler('dot')],
  ['ddot', accentHandler('ddot')],
  ['tilde', accentHandler('tilde')],
  ['widetilde', accentHandler('widetilde')],
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
  ['overbrace', braceHandler('overbrace')],
  ['underbrace', braceHandler('underbrace')],
  ['xleftarrow', xarrowHandler('left')],
  ['xrightarrow', xarrowHandler('right')],
  ['xleftrightarrow', xarrowHandler('both')],
]);
