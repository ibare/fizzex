/**
 * 화학식 문법의 단일 진실
 *
 * `-` `^` `v` `*` 처럼 문맥에 따라 뜻이 달라지는 문자의 해석 규칙과, 노드 ↔ 표기 철자표를
 * 여기 한 곳에 모은다. 파서와 직렬화기가 같은 표를 보게 해서 왕복이 어긋나지 않게 하는 것이 목적이다.
 *
 * 이 모듈은 `box/` 를 import 하지 않는다 — compute 클로저 제약(subpath-isolation) 때문이다.
 */

import type { XArrowNode } from '../../types.js';

/**
 * 토크나이저 모드.
 *
 * 같은 문자가 어디에 있느냐로 뜻이 갈린다. `-` 는 본문에서는 화살표의 일부지만
 * 첨자 안에서는 음전하다. 룩백 없이 (모드 × 다음 문자)만으로 판정한다.
 */
export type ChemMode = 'body' | 'script';

/**
 * 반응 화살표 표기 ↔ 방향.
 *
 * **긴 것부터** 늘어놓았다. `<=>>` 가 `<=>` 로 먼저 끊기면 안 되므로 순서가 곧 규칙이다.
 */
export const CHEM_ARROWS: ReadonlyArray<
  readonly [notation: string, direction: XArrowNode['direction']]
> = [
  ['<=>>', 'equilibriumForward'],
  ['<<=>', 'equilibriumReverse'],
  ['<=>', 'equilibrium'],
  ['<->', 'both'],
  ['->', 'right'],
  ['<-', 'left'],
] as const;

/** 가역 반응 화살표인가 — 두 줄로 그려진다 */
export function isEquilibriumDirection(direction: XArrowNode['direction']): boolean {
  return direction.startsWith('equilibrium');
}

/** 화살표 방향 → 표기 (직렬화용) */
export function arrowNotation(direction: XArrowNode['direction']): string {
  const found = CHEM_ARROWS.find(([, d]) => d === direction);
  return found ? found[0] : '->';
}

/** 위치 pos 에서 시작하는 화살표를 최장 일치로 찾는다 */
export function matchArrow(
  latex: string,
  pos: number
): { notation: string; direction: XArrowNode['direction'] } | null {
  for (const [notation, direction] of CHEM_ARROWS) {
    if (latex.startsWith(notation, pos)) return { notation, direction };
  }
  return null;
}

/**
 * 첨자를 시작할 수 있는 문자인가.
 *
 * `^` 가 첨자인지 기체 발생 화살표(↑)인지를 가르는 유일한 판정이다.
 */
export function canStartScript(ch: string | undefined): boolean {
  if (ch === undefined) return false;
  return (
    ch === '{' ||
    ch === '+' ||
    ch === '-' ||
    ch === '\\' ||
    (ch >= '0' && ch <= '9') ||
    (ch >= 'a' && ch <= 'z') ||
    (ch >= 'A' && ch <= 'Z')
  );
}

/** 항이 끝났다고 볼 수 있는 문자 (`^`/`v` 가 상태 화살표인지 판정할 때 쓴다) */
export function isTermEnd(ch: string | undefined): boolean {
  return ch === undefined || ch === ' ' || ch === '}';
}

/** 기체 발생 화살표 (`\ce{H2 ^}`) */
export const GAS_MARK = '↑';
/** 침전 화살표 (`\ce{BaSO4 v}`) */
export const PRECIPITATE_MARK = '↓';
/** 수화물 중심점 (`\ce{CuSO4 * 5H2O}`) */
export const HYDRATE_MARK = '·';
/** 음전하 — ASCII 하이픈이 아니라 진짜 마이너스 기호를 쓴다 */
export const MINUS_SIGN = '−';

/** 전하 부호인가 (`Ca^2+` 의 `+`, `SO4^2-` 의 `−`) */
export function isChargeSign(text: string): boolean {
  return text === '+' || text === MINUS_SIGN;
}

/**
 * 본문에 놓인 text 노드 ↔ 화학 표기.
 *
 * 상태 화살표와 음전하는 화면에 보이는 글자와 입력 표기가 다르다.
 */
export const CHEM_TEXT_NOTATION: ReadonlyMap<string, string> = new Map([
  [GAS_MARK, ' ^'],
  [PRECIPITATE_MARK, ' v'],
  [MINUS_SIGN, '-'],
]);

/** 아래첨자를 중괄호 없이 적을 수 있는가 (`H2` 처럼) */
export function isBareSubscript(s: string): boolean {
  return /^[0-9]+$/.test(s);
}

/** 위첨자를 중괄호 없이 적을 수 있는가 (`^2-`, `^+`, `^2` 처럼) */
export function isBareSuperscript(s: string): boolean {
  return /^[0-9]*[+-]$/.test(s) || /^[0-9]+$/.test(s);
}

/**
 * 두 표기를 이어 붙이면 다른 토큰으로 읽히는가.
 *
 * `-` 뒤에 `>` 가 오면 `->` 화살표가 되어 버린다. 직렬화기가 이걸 만나면 수식 구간으로 감싸 피한다.
 */
export function wouldCollide(left: string, right: string): boolean {
  if (left.length === 0 || right.length === 0) return false;
  const joined = left[left.length - 1] + right[0];
  return CHEM_ARROWS.some(([notation]) => notation.startsWith(joined));
}

/** 원소 기호 한 덩어리를 읽는다 (`[A-Z][a-z]*`) — 주기율표 없이 형태로만 자른다 */
export function readElement(latex: string, pos: number): string | null {
  const first = latex[pos];
  if (first === undefined || first < 'A' || first > 'Z') return null;
  let end = pos + 1;
  while (end < latex.length && latex[end] >= 'a' && latex[end] <= 'z') end++;
  return latex.slice(pos, end);
}
