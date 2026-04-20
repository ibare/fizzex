/**
 * 2D/3D 공용 Expression 평가 컨텍스트 (설계 §17.2).
 *
 * adapter2d의 RenderContext와 adapter3d의 RenderContext3D는 각각 Canvas ctx /
 * Three.js Scene 등 부가 의존이 다르지만, Expression 평가에 쓰는 부분은 동일:
 *   - `exprCtx`  : context chain (params/state/scene/frame 등)
 *   - `astCache` : 문자열 → AST 캐시
 *
 * animation·overlay·interaction처럼 양쪽 어댑터 모두에서 쓰이는 모듈은 이
 * 최소 인터페이스만 소비해 렌더러 독립성을 유지한다.
 */

import type { ExprString } from '../types/expr';
import type { Context } from './context';
import { parseExpr, type ExprAst } from './parse';
import { evalNode } from './eval';

export interface EvalContext {
  exprCtx: Context;
  astCache: Map<string, ExprAst>;
}

function ast(expr: ExprString, rc: EvalContext): ExprAst {
  const cached = rc.astCache.get(expr);
  if (cached) return cached;
  const parsed = parseExpr(expr);
  rc.astCache.set(expr, parsed);
  return parsed;
}

export function evalExpr(expr: ExprString, rc: EvalContext): unknown {
  return evalNode(ast(expr, rc), rc.exprCtx);
}

export function evalNum(expr: ExprString, rc: EvalContext, label = 'evalNum'): number {
  const v = evalExpr(expr, rc);
  if (typeof v !== 'number') {
    throw new TypeError(`${label}: expected number from "${expr}", got ${typeof v}`);
  }
  return v;
}

export function evalBool(expr: ExprString, rc: EvalContext): boolean {
  return Boolean(evalExpr(expr, rc));
}

export function evalStr(expr: ExprString, rc: EvalContext, label = 'evalStr'): string {
  const v = evalExpr(expr, rc);
  if (typeof v !== 'string') {
    throw new TypeError(`${label}: expected string from "${expr}", got ${typeof v}`);
  }
  return v;
}

export function evalNumOr(v: ExprString | number, rc: EvalContext): number {
  return typeof v === 'number' ? v : evalNum(v, rc);
}

export function evalBoolOr(v: ExprString | boolean, rc: EvalContext): boolean {
  return typeof v === 'boolean' ? v : evalBool(v, rc);
}

/**
 * EvalContext는 각 어댑터가 고유 확장 필드(viewports·Scene 등)를 가진 구체
 * 타입이므로, 확장된 구체 타입을 유지한 채 locals만 쌓는 헬퍼를 제공한다.
 */
export function extendEvalContext<T extends EvalContext>(rc: T, locals: Record<string, unknown>): T {
  return { ...rc, exprCtx: rc.exprCtx.extend(locals) };
}
