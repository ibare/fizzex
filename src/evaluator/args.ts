/**
 * 쉼표로 나뉜 호출 인자 해석
 *
 * `\operatorname{normpdf}(x, μ, σ)` 나 `\max(a, b)` 처럼 괄호 안을 쉼표로 가르는
 * 표기를 다룬다. 파서는 쉼표를 값이 `,` 인 NumberNode 로 내놓으므로,
 * 인자 경계는 AST 구조가 아니라 그 토큰으로 판별한다.
 *
 * `../types.js` 만 import 하는 leaf 다 — registry 나 핸들러 설치 부수효과가 없다.
 */
import type { MathNode, ParenNode, RowNode, NumberNode } from '../types.js';

/**
 * 인자 목록이 괄호 하나로 싸여 있으면 그 안의 자식들을 돌려준다.
 *
 * 괄호가 아니거나 여럿이면 `null` — 호출 형태가 아니라는 뜻이다.
 */
export function unwrapArgumentParen(argument: MathNode[]): MathNode[] | null {
  if (argument.length !== 1) return null;
  const head = argument[0];
  if (head.type !== 'paren') return null;
  const content = (head as ParenNode).content;
  // paren content 는 보통 [RowNode { children }] 로 래핑된다.
  if (content.length === 1 && content[0].type === 'row') {
    return (content[0] as RowNode).children;
  }
  return content;
}

/** 쉼표 토큰을 경계로 인자 구간을 가른다 */
export function splitByComma(cells: MathNode[]): MathNode[][] {
  const segments: MathNode[][] = [];
  let current: MathNode[] = [];
  for (const c of cells) {
    if (c.type === 'number' && (c as NumberNode).value === ',') {
      segments.push(current);
      current = [];
      continue;
    }
    current.push(c);
  }
  segments.push(current);
  return segments;
}
