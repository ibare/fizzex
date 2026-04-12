/**
 * 그리스 문자 명령어 핸들러
 */

import type { CommandHandler } from './types';
import { createVariable } from './helpers';

/** 단순 변수 반환 핸들러 생성 */
function variableHandler(symbol: string): CommandHandler {
  return (ctx) => ({ nodes: [createVariable(symbol)], consumed: ctx.pos });
}

/** 그리스 문자 핸들러 레지스트리 */
export const greekHandlers: Map<string, CommandHandler> = new Map([
  // 소문자 그리스 문자
  ['alpha', variableHandler('α')],
  ['beta', variableHandler('β')],
  ['gamma', variableHandler('γ')],
  ['delta', variableHandler('δ')],
  ['epsilon', variableHandler('ε')],
  ['varepsilon', variableHandler('ε')],
  ['zeta', variableHandler('ζ')],
  ['eta', variableHandler('η')],
  ['theta', variableHandler('θ')],
  ['vartheta', variableHandler('ϑ')],
  ['iota', variableHandler('ι')],
  ['kappa', variableHandler('κ')],
  ['lambda', variableHandler('λ')],
  ['mu', variableHandler('μ')],
  ['nu', variableHandler('ν')],
  ['xi', variableHandler('ξ')],
  ['pi', variableHandler('π')],
  ['varpi', variableHandler('ϖ')],
  ['rho', variableHandler('ρ')],
  ['varrho', variableHandler('ϱ')],
  ['sigma', variableHandler('σ')],
  ['varsigma', variableHandler('ς')],
  ['tau', variableHandler('τ')],
  ['upsilon', variableHandler('υ')],
  ['phi', variableHandler('φ')],
  ['varphi', variableHandler('ϕ')],
  ['chi', variableHandler('χ')],
  ['psi', variableHandler('ψ')],
  ['omega', variableHandler('ω')],

  // 대문자 그리스 문자
  ['Gamma', variableHandler('Γ')],
  ['Delta', variableHandler('Δ')],
  ['Theta', variableHandler('Θ')],
  ['Lambda', variableHandler('Λ')],
  ['Xi', variableHandler('Ξ')],
  ['Pi', variableHandler('Π')],
  ['Sigma', variableHandler('Σ')],
  ['Upsilon', variableHandler('Υ')],
  ['Phi', variableHandler('Φ')],
  ['Psi', variableHandler('Ψ')],
  ['Omega', variableHandler('Ω')],

  // 확장 그리스 문자 및 히브리 문자
  ['digamma', variableHandler('ϝ')],
  ['varkappa', variableHandler('ϰ')],
  ['beth', variableHandler('ℶ')],
  ['gimel', variableHandler('ℷ')],
  ['daleth', variableHandler('ℸ')],
]);
