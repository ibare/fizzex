/**
 * 기본 명령어 핸들러 (frac, sqrt, text 등)
 */

import type { CommandHandler } from './types';
import { createFrac, createSqrt, createText, createParen, createAbs } from './helpers';

/** \frac{num}{den} */
export const fracHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  const numResult = ctx.parseGroup(ctx.latex, pos);
  pos = numResult.consumed;
  while (pos < ctx.latex.length && ctx.latex[pos] === ' ') pos++;
  const denResult = ctx.parseGroup(ctx.latex, pos);
  return {
    nodes: [createFrac(numResult.nodes, denResult.nodes)],
    consumed: denResult.consumed,
  };
};

/** \sqrt[n]{x} 또는 \sqrt{x} */
export const sqrtHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  let index: import('../../types').MathNode[] | undefined;
  if (ctx.latex[pos] === '[') {
    const indexResult = ctx.parseExpression(ctx.latex, pos + 1, [']']);
    index = indexResult.nodes;
    pos = indexResult.consumed + 1;
  }
  const contentResult = ctx.parseGroup(ctx.latex, pos);
  return {
    nodes: [createSqrt(contentResult.nodes, index)],
    consumed: contentResult.consumed,
  };
};

/** \text{...} */
export const textHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  if (ctx.latex[pos] !== '{') {
    return { nodes: [], consumed: pos };
  }
  pos++;
  const start = pos;
  let depth = 1;
  while (pos < ctx.latex.length && depth > 0) {
    if (ctx.latex[pos] === '{') depth++;
    else if (ctx.latex[pos] === '}') depth--;
    if (depth > 0) pos++;
  }
  const textContent = ctx.latex.substring(start, pos);
  return {
    nodes: [createText(textContent)],
    consumed: pos + 1,
  };
};

/** \left ... \right 처리 */
export const leftHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  const openChar = ctx.latex[pos];
  if (!openChar || !'([{|.'.includes(openChar)) {
    return { nodes: [], consumed: pos };
  }
  pos++;

  const innerResult = ctx.parseExpression(ctx.latex, pos, ['\\right']);
  pos = innerResult.consumed;

  // \right 건너뛰기
  if (ctx.latex.substring(pos, pos + 6) === '\\right') {
    pos += 6;
    const closeChar = ctx.latex[pos];
    if (closeChar && ')]}|.'.includes(closeChar)) {
      pos++;
    }
  }

  // 괄호 타입 결정
  let parenType: '(' | '[' | '{' = '(';
  if (openChar === '[') parenType = '[';
  else if (openChar === '{' || openChar === '\\') parenType = '{';
  else if (openChar === '|') {
    // 절댓값 처리
    return {
      nodes: [createAbs(innerResult.nodes)],
      consumed: pos,
    };
  }

  return {
    nodes: [createParen(innerResult.nodes, parenType, true)],
    consumed: pos,
  };
};

/** 기본 명령어 핸들러 레지스트리 */
export const basicHandlers: Map<string, CommandHandler> = new Map([
  ['frac', fracHandler],
  ['dfrac', fracHandler],
  ['tfrac', fracHandler],
  ['sqrt', sqrtHandler],
  ['text', textHandler],
  ['mathrm', textHandler],
  ['textrm', textHandler],
  ['textbf', textHandler],
  ['textit', textHandler],
  ['mathbf', textHandler],
  ['mathit', textHandler],
  ['mathsf', textHandler],
  ['mathtt', textHandler],
  ['mathcal', textHandler],
  ['mathbb', textHandler],
  ['mathfrak', textHandler],
  ['left', leftHandler],
]);
