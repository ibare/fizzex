/**
 * 3D 어댑터 RenderContext (설계 §5·§12).
 *
 * 2D 버전과 달리:
 *   - Canvas2D ctx 대신 THREE.Scene을 부모 Object3D로 사용
 *   - viewports 불필요 (3D는 좌표계가 world-space)
 *   - `idMap`: Element.id → THREE.Object3D 매핑 (shaderMaterial.attachTo 용)
 *   - `disposables`: 프레임 재구축 시 dispose 대상 수집
 *
 * Expression 평가 파이프라인은 2D와 동일한 parse/eval/context 모듈 사용.
 */

import type * as THREE from 'three';
import type { FrameInfo } from '../../../graphics/types';
import type { ExprString } from '../types/expr';
import type { Context } from '../expr/context';
import { parseExpr, type ExprAst } from '../expr/parse';
import { evalNode } from '../expr/eval';

export interface RenderContext3D {
  THREE: typeof THREE;
  exprCtx: Context;
  frame: FrameInfo;
  idMap: Map<string, THREE.Object3D>;
  astCache: Map<string, ExprAst>;
}

export interface RenderContext3DInit {
  THREE: typeof THREE;
  exprCtx: Context;
  frame: FrameInfo;
  idMap?: Map<string, THREE.Object3D>;
  astCache?: Map<string, ExprAst>;
}

export function createRenderContext3D(init: RenderContext3DInit): RenderContext3D {
  return {
    THREE: init.THREE,
    exprCtx: init.exprCtx,
    frame: init.frame,
    idMap: init.idMap ?? new Map(),
    astCache: init.astCache ?? new Map(),
  };
}

export function extendRenderContext3D(
  rc: RenderContext3D,
  locals: Record<string, unknown>,
): RenderContext3D {
  return { ...rc, exprCtx: rc.exprCtx.extend(locals) };
}

function ast(expr: ExprString, rc: RenderContext3D): ExprAst {
  const cached = rc.astCache.get(expr);
  if (cached) return cached;
  const parsed = parseExpr(expr);
  rc.astCache.set(expr, parsed);
  return parsed;
}

export function evalExpr3D(expr: ExprString, rc: RenderContext3D): unknown {
  return evalNode(ast(expr, rc), rc.exprCtx);
}

export function evalNum3D(expr: ExprString, rc: RenderContext3D): number {
  const v = evalExpr3D(expr, rc);
  if (typeof v !== 'number') {
    throw new TypeError(`adapter3d: expected number from "${expr}", got ${typeof v}`);
  }
  return v;
}

export function evalBool3D(expr: ExprString, rc: RenderContext3D): boolean {
  return Boolean(evalExpr3D(expr, rc));
}

export function evalStr3D(expr: ExprString, rc: RenderContext3D): string {
  const v = evalExpr3D(expr, rc);
  if (typeof v !== 'string') {
    throw new TypeError(`adapter3d: expected string from "${expr}", got ${typeof v}`);
  }
  return v;
}

export function evalNumOr3D(v: ExprString | number, rc: RenderContext3D): number {
  return typeof v === 'number' ? v : evalNum3D(v, rc);
}
