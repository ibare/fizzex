/**
 * 공백 명령어 핸들러
 */

import type { CommandHandler } from './types.js';
import { createSpace } from './helpers.js';

/** 공백 핸들러 생성 */
function spaceHandler(width: number): CommandHandler {
  return (ctx) => ({ nodes: [createSpace(width)], consumed: ctx.pos });
}

/** 공백 핸들러 레지스트리 */
export const spaceHandlers: Map<string, CommandHandler> = new Map([
  // 가변 공백
  [',', spaceHandler(0.167)],  // thin space (3/18 em)
  [':', spaceHandler(0.222)],  // medium space (4/18 em)
  [';', spaceHandler(0.278)],  // thick space (5/18 em)
  ['!', spaceHandler(-0.167)], // negative thin space
  [' ', spaceHandler(0.333)],  // inter-word space

  // 고정 공백
  ['quad', spaceHandler(1.0)],   // 1em
  ['qquad', spaceHandler(2.0)],  // 2em
  ['enspace', spaceHandler(0.5)], // 0.5em
  ['thinspace', spaceHandler(0.167)],

  // 특수 공백
  ['hspace', (ctx) => {
    // \hspace{...}에서 값을 파싱 (간단히 기본값 사용)
    if (ctx.latex[ctx.pos] === '{') {
      let pos = ctx.pos + 1;
      let depth = 1;
      while (pos < ctx.latex.length && depth > 0) {
        if (ctx.latex[pos] === '{') depth++;
        else if (ctx.latex[pos] === '}') depth--;
        pos++;
      }
      return { nodes: [createSpace(1.0)], consumed: pos };
    }
    return { nodes: [createSpace(1.0)], consumed: ctx.pos };
  }],
]);
