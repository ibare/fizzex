/**
 * 수학 함수 명령어 핸들러
 */

import type { CommandHandler } from './types';
import { createFunc, createVariable, createParen } from './helpers';

/** 수학 함수 핸들러 생성 */
function mathFunctionHandler(funcName: string): CommandHandler {
  return (ctx) => {
    let pos = ctx.pos;
    while (pos < ctx.latex.length && ctx.latex[pos] === ' ') pos++;

    // 괄호로 시작하면 괄호 포함
    if (pos < ctx.latex.length && ctx.latex[pos] === '(') {
      pos++;
      const innerResult = ctx.parseExpression(ctx.latex, pos, [')']);
      pos = innerResult.consumed + 1;
      const parenNode = createParen(innerResult.nodes, '(', false);
      return { nodes: [createFunc(funcName, [parenNode])], consumed: pos };
    }

    // 중괄호로 시작하면 그룹 내용만
    if (pos < ctx.latex.length && ctx.latex[pos] === '{') {
      const argResult = ctx.parseGroup(ctx.latex, pos);
      return { nodes: [createFunc(funcName, argResult.nodes)], consumed: argResult.consumed };
    }

    // 단일 변수
    if (pos < ctx.latex.length && /[a-zA-Z]/.test(ctx.latex[pos]) && ctx.latex[pos] !== '\\') {
      const variable = createVariable(ctx.latex[pos]);
      return { nodes: [createFunc(funcName, [variable])], consumed: pos + 1 };
    }

    // 숫자
    if (pos < ctx.latex.length && /[0-9]/.test(ctx.latex[pos])) {
      const numResult = ctx.parseNumber(ctx.latex, pos);
      return { nodes: [createFunc(funcName, numResult.nodes)], consumed: numResult.consumed };
    }

    // 명령어
    if (pos < ctx.latex.length && ctx.latex[pos] === '\\') {
      const cmdResult = ctx.parseCommand(ctx.latex, pos);
      return { nodes: [createFunc(funcName, cmdResult.nodes)], consumed: cmdResult.consumed };
    }

    // 인자 없이 함수 이름만
    return { nodes: [createFunc(funcName, [])], consumed: pos };
  };
}

/** 수학 함수 핸들러 레지스트리 */
export const functionHandlers: Map<string, CommandHandler> = new Map([
  // 삼각함수
  ['sin', mathFunctionHandler('sin')],
  ['cos', mathFunctionHandler('cos')],
  ['tan', mathFunctionHandler('tan')],
  ['cot', mathFunctionHandler('cot')],
  ['sec', mathFunctionHandler('sec')],
  ['csc', mathFunctionHandler('csc')],

  // 역삼각함수
  ['arcsin', mathFunctionHandler('arcsin')],
  ['arccos', mathFunctionHandler('arccos')],
  ['arctan', mathFunctionHandler('arctan')],
  ['arccot', mathFunctionHandler('arccot')],
  ['arcsec', mathFunctionHandler('arcsec')],
  ['arccsc', mathFunctionHandler('arccsc')],

  // 쌍곡선함수
  ['sinh', mathFunctionHandler('sinh')],
  ['cosh', mathFunctionHandler('cosh')],
  ['tanh', mathFunctionHandler('tanh')],
  ['coth', mathFunctionHandler('coth')],
  ['sech', mathFunctionHandler('sech')],
  ['csch', mathFunctionHandler('csch')],

  // 로그/지수 함수
  ['log', mathFunctionHandler('log')],
  ['ln', mathFunctionHandler('ln')],
  ['lg', mathFunctionHandler('lg')],
  ['exp', mathFunctionHandler('exp')],

  // 기타 함수
  ['det', mathFunctionHandler('det')],
  ['dim', mathFunctionHandler('dim')],
  ['ker', mathFunctionHandler('ker')],
  ['hom', mathFunctionHandler('hom')],
  ['arg', mathFunctionHandler('arg')],
  ['deg', mathFunctionHandler('deg')],
  ['gcd', mathFunctionHandler('gcd')],
  ['lcm', mathFunctionHandler('lcm')],
  ['min', mathFunctionHandler('min')],
  ['max', mathFunctionHandler('max')],
  ['sup', mathFunctionHandler('sup')],
  ['inf', mathFunctionHandler('inf')],
  ['mod', mathFunctionHandler('mod')],
  ['Pr', mathFunctionHandler('Pr')],
]);
