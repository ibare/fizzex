/**
 * 대형 연산자 핸들러 (적분, 시그마, 극한, 곱)
 */

import type { MathNode } from '../../types.js';
import type { CommandHandler } from './types.js';
import {
  createIntegral,
  createSum,
  createLimit,
  createProduct,
  createVariable,
  createOperator,
  createParen,
  createPower,
  createSubscript,
} from './helpers.js';

/** 적분 핸들러 생성 */
function integralHandler(integralType: 'int' | 'iint' | 'iiint' | 'oint'): CommandHandler {
  return (ctx) => {
    let pos = ctx.pos;
    let lower: MathNode[] = [];
    let upper: MathNode[] = [];

    // 하한/상한 파싱
    if (ctx.latex[pos] === '_') {
      pos++;
      const lowerResult = ctx.parseGroup(ctx.latex, pos);
      lower = lowerResult.nodes;
      pos = lowerResult.consumed;
    }
    if (ctx.latex[pos] === '^') {
      pos++;
      const upperResult = ctx.parseGroup(ctx.latex, pos);
      upper = upperResult.nodes;
      pos = upperResult.consumed;
    }
    if (ctx.latex[pos] === '_') {
      pos++;
      const lowerResult = ctx.parseGroup(ctx.latex, pos);
      lower = lowerResult.nodes;
      pos = lowerResult.consumed;
    }

    while (pos < ctx.latex.length && ctx.latex[pos] === ' ') pos++;

    // 피적분함수 파싱
    const integrandNodes: MathNode[] = [];
    let differential = '';

    while (pos < ctx.latex.length) {
      while (pos < ctx.latex.length && ctx.latex[pos] === ' ') pos++;
      if (pos >= ctx.latex.length) break;
      if ('}])'.includes(ctx.latex[pos])) break;
      if (ctx.latex[pos] === '\\' && /^\\(end|right)/.test(ctx.latex.substring(pos))) break;

      if (ctx.latex[pos] === '\\' && ctx.latex[pos + 1] === ',') {
        pos += 2;
        while (pos < ctx.latex.length && ctx.latex[pos] === ' ') pos++;
      }

      if (ctx.latex[pos] === 'd' && pos + 1 < ctx.latex.length) {
        const nextChar = ctx.latex[pos + 1];
        if (/[a-zA-Z]/.test(nextChar) && nextChar !== '\\') {
          differential = nextChar;
          pos += 2;
          break;
        }
        if (nextChar === '\\') {
          differential = '';
          pos += 1;
          break;
        }
      }

      if (/[0-9]/.test(ctx.latex[pos])) {
        const numResult = ctx.parseNumber(ctx.latex, pos);
        integrandNodes.push(...numResult.nodes);
        pos = numResult.consumed;
      } else if (/[a-zA-Z]/.test(ctx.latex[pos]) && ctx.latex[pos] !== '\\') {
        integrandNodes.push(createVariable(ctx.latex[pos]));
        pos++;
      } else if (ctx.latex[pos] === '\\') {
        const cmdResult = ctx.parseCommand(ctx.latex, pos);
        integrandNodes.push(...cmdResult.nodes);
        pos = cmdResult.consumed;
      } else if ('+-=<>'.includes(ctx.latex[pos])) {
        integrandNodes.push(createOperator(ctx.latex[pos]));
        pos++;
      } else if (ctx.latex[pos] === '^') {
        pos++;
        const expResult = ctx.parseGroup(ctx.latex, pos);
        const base = integrandNodes.length > 0 ? [integrandNodes.pop()!] : [];
        integrandNodes.push(createPower(base, expResult.nodes));
        pos = expResult.consumed;
      } else if (ctx.latex[pos] === '_') {
        pos++;
        const subResult = ctx.parseGroup(ctx.latex, pos);
        const base = integrandNodes.length > 0 ? [integrandNodes.pop()!] : [];
        integrandNodes.push(createSubscript(base, subResult.nodes));
        pos = subResult.consumed;
      } else if (ctx.latex[pos] === '(') {
        pos++;
        const innerResult = ctx.parseExpression(ctx.latex, pos, [')']);
        integrandNodes.push(createParen(innerResult.nodes, '(', false));
        pos = innerResult.consumed + 1;
      } else if (ctx.latex[pos] === '{') {
        pos++;
        const innerResult = ctx.parseExpression(ctx.latex, pos, ['}']);
        integrandNodes.push(...innerResult.nodes);
        pos = innerResult.consumed + 1;
      } else {
        pos++;
      }
    }

    return {
      nodes: [createIntegral(lower, upper, integrandNodes, differential, integralType)],
      consumed: pos,
    };
  };
}

/** 시그마/곱/대형 연산자 핸들러 생성 */
function bigOpHandler(creator: typeof createSum | typeof createProduct, symbol?: string): CommandHandler {
  return (ctx) => {
    let pos = ctx.pos;
    let lower: MathNode[] = [];
    let upper: MathNode[] = [];

    // 하한 파싱
    if (ctx.latex[pos] === '_') {
      pos++;
      const lowerResult = ctx.parseGroup(ctx.latex, pos);
      lower = lowerResult.nodes;
      pos = lowerResult.consumed;
    }

    // 상한 파싱
    if (ctx.latex[pos] === '^') {
      pos++;
      const upperResult = ctx.parseGroup(ctx.latex, pos);
      upper = upperResult.nodes;
      pos = upperResult.consumed;
    }

    // 본체 파싱 (다음 토큰)
    while (pos < ctx.latex.length && ctx.latex[pos] === ' ') pos++;
    const bodyNodes: MathNode[] = [];

    if (pos < ctx.latex.length && ctx.latex[pos] === '{') {
      const bodyResult = ctx.parseGroup(ctx.latex, pos);
      bodyNodes.push(...bodyResult.nodes);
      pos = bodyResult.consumed;
    } else if (pos < ctx.latex.length && ctx.latex[pos] === '\\') {
      const cmdResult = ctx.parseCommand(ctx.latex, pos);
      bodyNodes.push(...cmdResult.nodes);
      pos = cmdResult.consumed;
    } else if (pos < ctx.latex.length && /[a-zA-Z0-9]/.test(ctx.latex[pos])) {
      if (/[0-9]/.test(ctx.latex[pos])) {
        const numResult = ctx.parseNumber(ctx.latex, pos);
        bodyNodes.push(...numResult.nodes);
        pos = numResult.consumed;
      } else {
        bodyNodes.push(createVariable(ctx.latex[pos]));
        pos++;
      }
    }

    return {
      nodes: [creator === createSum ? createSum(lower, upper, bodyNodes, symbol) : creator(lower, upper, bodyNodes)],
      consumed: pos,
    };
  };
}

/** 극한 핸들러 */
const limHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  let variable = '';
  let approach: MathNode[] = [];

  // 하한 파싱 (_{ ... })
  if (ctx.latex[pos] === '_') {
    pos++;
    const lowerResult = ctx.parseGroup(ctx.latex, pos);

    // 하한에서 변수와 접근값 추출
    const lowerNodes = lowerResult.nodes;
    for (let i = 0; i < lowerNodes.length; i++) {
      const node = lowerNodes[i];
      if (node.type === 'variable' && !variable) {
        variable = node.name;
      } else if (node.type === 'operator' && node.operator === '→') {
        approach = lowerNodes.slice(i + 1);
        break;
      }
    }

    pos = lowerResult.consumed;
  }

  // 본체 파싱
  while (pos < ctx.latex.length && ctx.latex[pos] === ' ') pos++;
  const bodyNodes: MathNode[] = [];

  if (pos < ctx.latex.length && ctx.latex[pos] === '{') {
    const bodyResult = ctx.parseGroup(ctx.latex, pos);
    bodyNodes.push(...bodyResult.nodes);
    pos = bodyResult.consumed;
  } else if (pos < ctx.latex.length && ctx.latex[pos] === '\\') {
    const cmdResult = ctx.parseCommand(ctx.latex, pos);
    bodyNodes.push(...cmdResult.nodes);
    pos = cmdResult.consumed;
  } else if (pos < ctx.latex.length && /[a-zA-Z0-9]/.test(ctx.latex[pos])) {
    if (/[0-9]/.test(ctx.latex[pos])) {
      const numResult = ctx.parseNumber(ctx.latex, pos);
      bodyNodes.push(...numResult.nodes);
      pos = numResult.consumed;
    } else {
      bodyNodes.push(createVariable(ctx.latex[pos]));
      pos++;
    }
  }

  return {
    nodes: [createLimit(variable, approach, bodyNodes)],
    consumed: pos,
  };
};

/** 대형 연산자 핸들러 레지스트리 */
export const bigOpHandlers: Map<string, CommandHandler> = new Map([
  // 적분
  ['int', integralHandler('int')],
  ['iint', integralHandler('iint')],
  ['iiint', integralHandler('iiint')],
  ['oint', integralHandler('oint')],
  ['iiiint', integralHandler('iiint')],  // 근사: 4중→3중 적분
  ['oiint', integralHandler('oint')],    // 근사: 이중 윤곽→단일 윤곽
  ['oiiint', integralHandler('oint')],   // 근사: 3중 윤곽→단일 윤곽
  ['smallint', integralHandler('int')],  // 작은 적분→일반 적분
  ['intop', integralHandler('int')],     // 적분 (limits 위치 기본값)

  // 시그마/합
  ['sum', bigOpHandler(createSum)],

  // 곱
  ['prod', bigOpHandler(createProduct)],

  // 여곱
  ['coprod', bigOpHandler(createSum, '∐')],

  // 대형 집합/논리 연산자
  ['bigcap', bigOpHandler(createSum, '∩')],
  ['bigcup', bigOpHandler(createSum, '∪')],
  ['bigvee', bigOpHandler(createSum, '∨')],
  ['bigwedge', bigOpHandler(createSum, '∧')],
  ['bigoplus', bigOpHandler(createSum, '⊕')],
  ['bigotimes', bigOpHandler(createSum, '⊗')],
  ['bigodot', bigOpHandler(createSum, '⊙')],
  ['biguplus', bigOpHandler(createSum, '⊎')],
  ['bigsqcup', bigOpHandler(createSum, '⊔')],

  // 극한
  ['lim', limHandler],
  ['limsup', limHandler],
  ['liminf', limHandler],
]);
