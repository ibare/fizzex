/**
 * 연산자 명령어 핸들러
 */

import type { CommandHandler } from './types';
import { createOperator, createVariable } from './helpers';

/** 단순 연산자 반환 핸들러 생성 */
function operatorHandler(symbol: string): CommandHandler {
  return (ctx) => ({ nodes: [createOperator(symbol)], consumed: ctx.pos });
}

/** 단순 변수 반환 핸들러 생성 */
function variableHandler(symbol: string): CommandHandler {
  return (ctx) => ({ nodes: [createVariable(symbol)], consumed: ctx.pos });
}

/** 연산자 핸들러 레지스트리 */
export const operatorHandlers: Map<string, CommandHandler> = new Map([
  // 기본 연산자
  ['times', operatorHandler('×')],
  ['div', operatorHandler('÷')],
  ['cdot', operatorHandler('·')],
  ['pm', operatorHandler('±')],
  ['mp', operatorHandler('∓')],
  ['ast', operatorHandler('∗')],
  ['star', operatorHandler('⋆')],
  ['circ', operatorHandler('∘')],
  ['bullet', operatorHandler('•')],

  // 관계 연산자
  ['ne', operatorHandler('≠')],
  ['neq', operatorHandler('≠')],
  ['le', operatorHandler('≤')],
  ['leq', operatorHandler('≤')],
  ['ge', operatorHandler('≥')],
  ['geq', operatorHandler('≥')],
  ['ll', operatorHandler('≪')],
  ['gg', operatorHandler('≫')],
  ['equiv', operatorHandler('≡')],
  ['sim', operatorHandler('∼')],
  ['simeq', operatorHandler('≃')],
  ['approx', operatorHandler('≈')],
  ['cong', operatorHandler('≅')],
  ['propto', operatorHandler('∝')],

  // 집합 연산자
  ['in', operatorHandler('∈')],
  ['notin', operatorHandler('∉')],
  ['subset', operatorHandler('⊂')],
  ['supset', operatorHandler('⊃')],
  ['subseteq', operatorHandler('⊆')],
  ['supseteq', operatorHandler('⊇')],
  ['cup', operatorHandler('∪')],
  ['cap', operatorHandler('∩')],
  ['setminus', operatorHandler('∖')],

  // 논리 연산자
  ['land', operatorHandler('∧')],
  ['lor', operatorHandler('∨')],
  ['lnot', operatorHandler('¬')],
  ['neg', operatorHandler('¬')],
  ['forall', operatorHandler('∀')],
  ['exists', operatorHandler('∃')],
  ['nexists', operatorHandler('∄')],

  // 화살표
  ['to', operatorHandler('→')],
  ['rightarrow', operatorHandler('→')],
  ['leftarrow', operatorHandler('←')],
  ['leftrightarrow', operatorHandler('↔')],
  ['Rightarrow', operatorHandler('⇒')],
  ['Leftarrow', operatorHandler('⇐')],
  ['Leftrightarrow', operatorHandler('⇔')],
  ['implies', operatorHandler('⟹')],
  ['iff', operatorHandler('⟺')],
  ['mapsto', operatorHandler('↦')],
  ['uparrow', operatorHandler('↑')],
  ['downarrow', operatorHandler('↓')],

  // 기타 기호
  ['infty', variableHandler('∞')],
  ['partial', variableHandler('∂')],
  ['nabla', variableHandler('∇')],
  ['prime', variableHandler('′')],
  ['emptyset', variableHandler('∅')],
  ['varnothing', variableHandler('∅')],
  ['angle', variableHandler('∠')],
  ['perp', operatorHandler('⊥')],
  ['parallel', operatorHandler('∥')],
  ['mid', operatorHandler('∣')],

  // 점 기호
  ['ldots', operatorHandler('…')],
  ['cdots', operatorHandler('⋯')],
  ['vdots', operatorHandler('⋮')],
  ['ddots', operatorHandler('⋱')],
  ['dots', operatorHandler('…')],
]);
