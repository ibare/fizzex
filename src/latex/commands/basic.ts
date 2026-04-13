/**
 * 기본 명령어 핸들러 (frac, sqrt, text 등)
 */

import type { CommandHandler } from './types';
import { createFrac, createBinom, createSqrt, createText, createParen, createAbs, createSpace, mapMathFont } from './helpers';
import type { MathFontStyle } from './helpers';

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

/** \binom{n}{k} */
export const binomHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  const numResult = ctx.parseGroup(ctx.latex, pos);
  pos = numResult.consumed;
  while (pos < ctx.latex.length && ctx.latex[pos] === ' ') pos++;
  const denResult = ctx.parseGroup(ctx.latex, pos);
  return {
    nodes: [createBinom(numResult.nodes, denResult.nodes)],
    consumed: denResult.consumed,
  };
};

/** 수학 폰트 명령어 핸들러 생성 */
function createMathFontHandler(style: MathFontStyle): CommandHandler {
  return (ctx) => {
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
    const content = ctx.latex.substring(start, pos);
    const mapped = mapMathFont(content, style);
    return {
      nodes: [createText(mapped)],
      consumed: pos + 1,
    };
  };
}

/** 폰트 선언 명령어 핸들러 생성 (\rm, \bf 등 — 중괄호 없이 사용 가능) */
function createFontDeclarationHandler(style: MathFontStyle | null): CommandHandler {
  return (ctx) => {
    let pos = ctx.pos;
    while (pos < ctx.latex.length && ctx.latex[pos] === ' ') pos++;

    // 중괄호가 있으면 createMathFontHandler와 동일하게 동작
    if (ctx.latex[pos] === '{') {
      pos++;
      const start = pos;
      let depth = 1;
      while (pos < ctx.latex.length && depth > 0) {
        if (ctx.latex[pos] === '{') depth++;
        else if (ctx.latex[pos] === '}') depth--;
        if (depth > 0) pos++;
      }
      const content = ctx.latex.substring(start, pos);
      if (style === null) {
        return { nodes: [createText(content)], consumed: pos + 1 };
      }
      return { nodes: [createText(mapMathFont(content, style))], consumed: pos + 1 };
    }

    // 중괄호 없음: 그룹 끝(}) 또는 다음 명령어(\) 또는 문자열 끝까지 소비
    const start = pos;
    while (pos < ctx.latex.length && ctx.latex[pos] !== '}' && ctx.latex[pos] !== '\\') {
      pos++;
    }
    const content = ctx.latex.substring(start, pos).trim();
    if (!content) return { nodes: [], consumed: pos };
    if (style === null) {
      return { nodes: [createText(content)], consumed: pos };
    }
    return { nodes: [createText(mapMathFont(content, style))], consumed: pos };
  };
}

/** \phantom{...} — 내용의 너비만큼 투명 공백 */
const phantomHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  if (ctx.latex[pos] !== '{') return { nodes: [], consumed: pos };
  pos++;
  const start = pos;
  let depth = 1;
  while (pos < ctx.latex.length && depth > 0) {
    if (ctx.latex[pos] === '{') depth++;
    else if (ctx.latex[pos] === '}') depth--;
    if (depth > 0) pos++;
  }
  const content = ctx.latex.substring(start, pos);
  // 글자 수 기반 너비 근사 (1문자 ≈ 0.5em)
  const width = Math.max(content.length * 0.5, 0.167);
  return { nodes: [createSpace(width)], consumed: pos + 1 };
};

/** \vphantom{...} — 내용의 높이만 확보 (너비 0) */
const vphantomHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  if (ctx.latex[pos] !== '{') return { nodes: [], consumed: pos };
  pos++;
  let depth = 1;
  while (pos < ctx.latex.length && depth > 0) {
    if (ctx.latex[pos] === '{') depth++;
    else if (ctx.latex[pos] === '}') depth--;
    if (depth > 0) pos++;
  }
  // 인자를 소비하되 출력 없음
  return { nodes: [], consumed: pos + 1 };
};

/** 기본 명령어 핸들러 레지스트리 */
export const basicHandlers: Map<string, CommandHandler> = new Map([
  ['frac', fracHandler],
  ['dfrac', fracHandler],
  ['tfrac', fracHandler],
  ['cfrac', fracHandler],
  ['binom', binomHandler],
  ['dbinom', binomHandler],
  ['tbinom', binomHandler],
  ['sqrt', sqrtHandler],
  ['text', textHandler],
  ['mathrm', textHandler],
  ['textrm', textHandler],
  ['textbf', createMathFontHandler('mathbf')],
  ['textit', createMathFontHandler('mathit')],
  ['textsf', createMathFontHandler('mathsf')],
  ['texttt', createMathFontHandler('mathtt')],
  ['mathbf', createMathFontHandler('mathbf')],
  ['mathit', createMathFontHandler('mathit')],
  ['mathsf', createMathFontHandler('mathsf')],
  ['mathtt', createMathFontHandler('mathtt')],
  ['mathcal', createMathFontHandler('mathcal')],
  ['mathbb', createMathFontHandler('mathbb')],
  ['mathfrak', createMathFontHandler('mathfrak')],
  ['rm', createFontDeclarationHandler(null)],
  ['bf', createFontDeclarationHandler('mathbf')],
  ['it', createFontDeclarationHandler('mathit')],
  ['sf', createFontDeclarationHandler('mathsf')],
  ['tt', createFontDeclarationHandler('mathtt')],
  ['phantom', phantomHandler],
  ['hphantom', phantomHandler],
  ['vphantom', vphantomHandler],
  ['left', leftHandler],
]);
