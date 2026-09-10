/**
 * 공백 명령어 핸들러
 */

import type { CommandHandler } from './types.js';
import { createSpace } from './helpers.js';

/** 공백 핸들러 생성 */
function spaceHandler(width: number): CommandHandler {
  return (ctx) => ({ nodes: [createSpace(width)], consumed: ctx.pos });
}

/**
 * thin space (3/18 em).
 *
 * spec 의 `operatorSpacing_thin` 과 같은 값이다. 화학식의 항 사이 공백도 이 폭을 쓴다 —
 * `latex/` 는 `box/` 를 import 할 수 없어(compute 클로저) MathConstants 를 참조하지 못하므로
 * 여기 명명 상수를 둔다.
 */
export const THIN_SPACE_EM = 0.167;

/** 공백 핸들러 레지스트리 */
export const spaceHandlers: Map<string, CommandHandler> = new Map([
  // 가변 공백
  [',', spaceHandler(THIN_SPACE_EM)],  // thin space (3/18 em)
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
