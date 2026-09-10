/**
 * 화학식 토크나이저
 *
 * 상태는 커서 위치 하나뿐이다. 모드는 호출자가 매번 넘긴다 — 토크나이저가 모드를 기억하지
 * 않기 때문에 일반 파서로 빠져나갔다 `seek` 로 돌아와도 늘 같은 결과를 낸다.
 *
 * 공백을 버리지 않는다. mhchem 에서 `H2O (l)` 과 `H2O(l)` 은 다른 표기이므로
 * 공백이 토큰으로 남아야 한다.
 */

import type { XArrowNode } from '../../types.js';
import { canStartScript, isTermEnd, matchArrow, readElement } from './grammar.js';
import type { ChemMode } from './grammar.js';

export type ChemTokenKind =
  | 'element' // Cu, S, O
  | 'lower' // aq, cat — 소문자 런
  | 'digits' // 2, 227
  | 'arrow' // -> <=> ...
  | 'plus' // 화학종 구분자 +
  | 'sign' // 전하 부호 (script 모드의 + -)
  | 'hydrate' // 수화물 중심점 *
  | 'gas' // 기체 발생 ^
  | 'precipitate' // 침전 v
  | 'caret' // 위첨자 시작 ^
  | 'underscore' // 아래첨자 시작 _
  | 'lparen'
  | 'rparen'
  | 'lbracket'
  | 'rbracket'
  | 'lbrace'
  | 'rbrace'
  | 'space'
  | 'command' // \Delta — 일반 파서로 위임
  | 'mathshift' // $ — 일반 파서로 위임
  | 'end' // 깊이 0 의 }
  | 'eof'
  | 'stray';

export interface ChemToken {
  kind: ChemTokenKind;
  /** 원본 문자열 조각 */
  value: string;
  /** ctx.latex 기준 절대 인덱스 */
  start: number;
  end: number;
  /** kind === 'arrow' 일 때만 */
  direction?: XArrowNode['direction'];
}

export interface ChemTokenizer {
  readonly pos: number;
  /** 지금이 항의 시작 위치인가 (계수·상태 화살표 판정에 쓴다) */
  readonly atTermStart: boolean;
  peek(mode: ChemMode): ChemToken;
  next(mode: ChemMode): ChemToken;
  /** 일반 파서 재진입 후 절대 인덱스로 커서를 되돌린다 */
  seek(absolutePos: number, atTermStart?: boolean): void;
}

export function createChemTokenizer(latex: string, start: number): ChemTokenizer {
  let pos = start;
  let termStart = true;

  function scan(mode: ChemMode): ChemToken {
    const at = pos;
    const tok = (kind: ChemTokenKind, end: number, direction?: XArrowNode['direction']): ChemToken => ({
      kind,
      value: latex.slice(at, end),
      start: at,
      end,
      ...(direction ? { direction } : {}),
    });

    if (at >= latex.length) return tok('eof', at);

    const ch = latex[at];

    // 공백 — 연속은 하나로 접되 의미는 남긴다
    if (ch === ' ') {
      let end = at;
      while (end < latex.length && latex[end] === ' ') end++;
      return tok('space', end);
    }

    if (ch === '}') return tok('end', at + 1);
    if (ch === '{') return tok('lbrace', at + 1);
    if (ch === '$') return tok('mathshift', at + 1);

    // 명령어 — 일반 파서가 처리한다
    if (ch === '\\') {
      let end = at + 1;
      if (end < latex.length && /[a-zA-Z]/.test(latex[end])) {
        while (end < latex.length && /[a-zA-Z]/.test(latex[end])) end++;
      } else {
        end++;
      }
      return tok('command', end);
    }

    // 첨자 안에서는 화살표를 찾지 않는다 — `-` 는 무조건 음전하다
    if (mode === 'body') {
      const arrow = matchArrow(latex, at);
      if (arrow) return tok('arrow', at + arrow.notation.length, arrow.direction);
    }

    if (ch === '^') {
      if (mode === 'body' && termStart && isTermEnd(latex[at + 1])) {
        return tok('gas', at + 1);
      }
      if (canStartScript(latex[at + 1])) return tok('caret', at + 1);
      return tok('stray', at + 1);
    }

    if (ch === '_') return tok('underscore', at + 1);

    if (ch === '+' || ch === '-') {
      return tok(mode === 'script' ? 'sign' : ch === '+' ? 'plus' : 'stray', at + 1);
    }

    if (ch === '*') return tok('hydrate', at + 1);
    if (ch === '(') return tok('lparen', at + 1);
    if (ch === ')') return tok('rparen', at + 1);
    if (ch === '[') return tok('lbracket', at + 1);
    if (ch === ']') return tok('rbracket', at + 1);

    if (ch >= '0' && ch <= '9') {
      let end = at;
      while (end < latex.length && latex[end] >= '0' && latex[end] <= '9') end++;
      return tok('digits', end);
    }

    // 침전 화살표는 항 시작의 홀로 선 v 일 때만 — Vanadium 의 v 를 잡아먹지 않는다
    if (ch === 'v' && mode === 'body' && termStart && isTermEnd(latex[at + 1])) {
      return tok('precipitate', at + 1);
    }

    const element = readElement(latex, at);
    if (element) return tok('element', at + element.length);

    if (ch >= 'a' && ch <= 'z') {
      let end = at;
      while (end < latex.length && latex[end] >= 'a' && latex[end] <= 'z') end++;
      return tok('lower', end);
    }

    return tok('stray', at + 1);
  }

  /** 이 토큰을 소비하고 나면 다음이 항의 시작인가 */
  function termStartAfter(token: ChemToken): boolean {
    switch (token.kind) {
      case 'space':
      case 'arrow':
      case 'plus':
      case 'hydrate':
        return true;
      default:
        return false;
    }
  }

  return {
    get pos() {
      return pos;
    },
    get atTermStart() {
      return termStart;
    },
    peek(mode) {
      return scan(mode);
    },
    next(mode) {
      const token = scan(mode);
      pos = token.end;
      if (token.kind !== 'eof') termStart = termStartAfter(token);
      return token;
    },
    seek(absolutePos, atTermStart = false) {
      pos = absolutePos;
      termStart = atTermStart;
    },
  };
}
