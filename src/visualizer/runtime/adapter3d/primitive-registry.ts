/**
 * 3D primitive registry — `kind` → Object3D 빌더 매핑.
 *
 * Primitive는 leaf Object3D를 만들어 반환하는 요소이다. 제어 흐름 요소
 * (group, if, repeat, match)는 primitive가 아니며 여기 등록되지 않는다.
 * `shaderMaterial`은 post-build deferred 처리이므로 primitive가 아니다.
 *
 * 내장 primitive는 `built-in-primitives.ts` 모듈이 import 시 자동 등록한다.
 */

import type { Object3D } from 'three';
import type { ElementNode } from '../types/element';
import type { RenderContext3D } from './render-context';

export type Primitive3DBuild = (node: ElementNode, rc: RenderContext3D) => Object3D;

export interface Primitive3D {
  readonly kind: string;
  readonly build: Primitive3DBuild;
}

const registry = new Map<string, Primitive3D>();

export function registerPrimitive3D(primitive: Primitive3D): void {
  if (registry.has(primitive.kind)) {
    throw new Error(`registerPrimitive3D: duplicate kind "${primitive.kind}"`);
  }
  registry.set(primitive.kind, primitive);
}

export function lookupPrimitive3D(kind: string): Primitive3D | undefined {
  return registry.get(kind);
}

export function hasPrimitive3D(kind: string): boolean {
  return registry.has(kind);
}
