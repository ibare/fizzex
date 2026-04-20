/**
 * 2D 어댑터 공용 RenderContext (설계 §5·§7·§8).
 *
 * 한 프레임의 렌더링에 필요한 주입 의존을 묶는다. 이 구조체는 **어댑터 내부**에서만 사용.
 * - `exprCtx`: Expression 평가용 Context 체인 (`params`/`formulas`/`state`/`scene`/`theme`/`viewport`/`frame` 네임스페이스가 locals로 들어온다)
 * - `frame`: rAF 프레임 정보
 * - `theme`: 현재 활성 테마 (dark/light 판정)
 * - `viewports`: 스펙이 선언한 모든 viewport의 즉시 평가 구현체 (id → Viewport2D)
 * - `currentViewportId`: `viewport` Element로 스코프된 현재 기본 viewport (Element가 자기 `viewport` 필드로 오버라이드 가능)
 * - `imageCache`: `image` Element가 매 프레임 Image 객체를 새로 만들지 않도록 공유 캐시
 */

import type { FrameInfo, Viewport2D } from '../../../graphics/types';
import type { ExprString } from '../types/expr';
import type { Context } from '../expr/context';
import { parseExpr, type ExprAst } from '../expr/parse';
import { evalNode } from '../expr/eval';

export interface RenderContext {
  exprCtx: Context;
  frame: FrameInfo;
  viewports: Map<string, Viewport2D>;
  currentViewportId?: string;
  imageCache: Map<string, HTMLImageElement>;
  /** Expression AST 캐시. 매 프레임 같은 문자열 재파싱 방지 (경량 최적화). */
  astCache: Map<string, ExprAst>;
}

export interface RenderContextInit {
  exprCtx: Context;
  frame: FrameInfo;
  viewports?: Map<string, Viewport2D>;
  currentViewportId?: string;
  imageCache?: Map<string, HTMLImageElement>;
}

export function createRenderContext(init: RenderContextInit): RenderContext {
  return {
    exprCtx: init.exprCtx,
    frame: init.frame,
    viewports: init.viewports ?? new Map(),
    currentViewportId: init.currentViewportId,
    imageCache: init.imageCache ?? new Map(),
    astCache: new Map(),
  };
}

/** `exprCtx`에 새 locals를 쌓아 파생 RenderContext를 반환. let·repeat 스코프용. */
export function extendRenderContext(rc: RenderContext, locals: Record<string, unknown>): RenderContext {
  return { ...rc, exprCtx: rc.exprCtx.extend(locals) };
}

function ast(expr: ExprString, rc: RenderContext): ExprAst {
  const cached = rc.astCache.get(expr);
  if (cached) return cached;
  const parsed = parseExpr(expr);
  rc.astCache.set(expr, parsed);
  return parsed;
}

export function evalExpr(expr: ExprString, rc: RenderContext): unknown {
  return evalNode(ast(expr, rc), rc.exprCtx);
}

export function evalNum(expr: ExprString, rc: RenderContext): number {
  const v = evalExpr(expr, rc);
  if (typeof v !== 'number') {
    throw new TypeError(`adapter2d: expected number from "${expr}", got ${typeof v}`);
  }
  return v;
}

export function evalBool(expr: ExprString, rc: RenderContext): boolean {
  return Boolean(evalExpr(expr, rc));
}

export function evalStr(expr: ExprString, rc: RenderContext): string {
  const v = evalExpr(expr, rc);
  if (typeof v !== 'string') {
    throw new TypeError(`adapter2d: expected string from "${expr}", got ${typeof v}`);
  }
  return v;
}

/** `ExprString | number` 필드용. 문자열이면 평가, 숫자면 그대로. */
export function evalNumOr(v: ExprString | number, rc: RenderContext): number {
  return typeof v === 'number' ? v : evalNum(v, rc);
}

/** `ExprString | boolean` 필드용. */
export function evalBoolOr(v: ExprString | boolean, rc: RenderContext): boolean {
  return typeof v === 'boolean' ? v : evalBool(v, rc);
}

export function currentViewport(rc: RenderContext): Viewport2D | undefined {
  return rc.currentViewportId ? rc.viewports.get(rc.currentViewportId) : undefined;
}
