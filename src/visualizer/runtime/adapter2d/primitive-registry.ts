/**
 * 2D primitive registry — `kind` → 그리기 함수 매핑.
 *
 * Primitive는 픽셀을 그리는 leaf element이다. 제어 흐름 요소(group, if, repeat,
 * match, layout, viewport, clip)는 primitive가 아니므로 여기 등록되지 않는다.
 *
 * 내장 primitive는 `built-in-primitives.ts` 모듈이 import 시 자동 등록한다.
 * 호스트 확장 primitive 등록 공개 API는 후속 phase에서 설계 확정 후 export한다.
 */

import type { ElementNode } from '../types/element';
import type { RenderContext } from './render-context';

export type Primitive2DDraw = (
  ctx: CanvasRenderingContext2D,
  node: ElementNode,
  rc: RenderContext,
) => void;

export interface Primitive2D {
  readonly kind: string;
  readonly draw: Primitive2DDraw;
}

const registry = new Map<string, Primitive2D>();

export function registerPrimitive2D(primitive: Primitive2D): void {
  if (registry.has(primitive.kind)) {
    throw new Error(`registerPrimitive2D: duplicate kind "${primitive.kind}"`);
  }
  registry.set(primitive.kind, primitive);
}

export function lookupPrimitive2D(kind: string): Primitive2D | undefined {
  return registry.get(kind);
}

export function hasPrimitive2D(kind: string): boolean {
  return registry.has(kind);
}
