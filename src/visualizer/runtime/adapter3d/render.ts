/**
 * 3D 어댑터 진입점 (설계 §12, §14.6).
 *
 * `renderRoot3d(parent, node, rc)`:
 *   1. visibility — false면 스킵
 *   2. let 바인딩 순차 평가 (2D와 동일)
 *   3. kind dispatch:
 *      - group/if/repeat/match — 컨테이너 처리, 자식 재귀
 *      - sphere/bufferLine/points/light — leaf Object3D 생성 후 parent에 add
 *      - shaderMaterial — idMap에서 attachTo 찾아 material 교체 (post-build)
 *      - 2D kind는 throw (renderer 선택이 잘못된 경우 방어)
 *
 * D2 결정에 따라 매 프레임 scene을 비우고 전체 재구축(repeat 포함). scene을
 * 비우는 책임은 mount-3d에 있다.
 */

import type { Object3D } from 'three';
import type { ElementNode, RepeatEl } from '../types/element';
import type { RenderContext3D } from './render-context';
import {
  evalBool3D,
  evalExpr3D,
  evalNum3D,
  evalNumOr3D,
  extendRenderContext3D,
} from './render-context';
import { applyTransform3D } from './transform-apply';
import { applyShaderMaterial } from './shader-apply';
import { lookupPrimitive3D } from './primitive-registry';
import './built-in-primitives';

type ShaderDeferred = { el: Extract<ElementNode, { kind: 'shaderMaterial' }>; rc: RenderContext3D };

export function renderRoot3d(
  parent: Object3D,
  node: ElementNode,
  rc: RenderContext3D,
  deferred: ShaderDeferred[] = [],
  isEntry = true,
): void {
  if (node.visible !== undefined && !evalBool3D(node.visible, rc)) return;

  let active = rc;
  if (node.let) {
    for (const [k, expr] of Object.entries(node.let)) {
      const value = typeof expr === 'string' ? evalExpr3D(expr, active) : expr;
      active = extendRenderContext3D(active, { [k]: value });
    }
  }

  const created = dispatchKind(node, active, parent, deferred);
  if (created) {
    if (node.id) active.idMap.set(node.id, created);
    if (node.opacity !== undefined) applyOpacity(created, evalNumOr3D(node.opacity, active));
    applyTransform3D(created, node.transform, active);
    parent.add(created);
  }

  if (isEntry) {
    for (const d of deferred) applyShaderMaterial(d.el, d.rc);
  }
}

function dispatchKind(
  node: ElementNode,
  rc: RenderContext3D,
  parent: Object3D,
  deferred: ShaderDeferred[],
): Object3D | null {
  const primitive = lookupPrimitive3D(node.kind);
  if (primitive) return primitive.build(node, rc);

  switch (node.kind) {
    case 'shaderMaterial':
      deferred.push({ el: node, rc });
      return null;
    case 'group': {
      const group = new rc.THREE.Group();
      for (const child of node.children) {
        renderRoot3d(group, child, rc, deferred, false);
      }
      return group;
    }
    case 'if': {
      const cond = evalBool3D(node.cond, rc);
      const branch = cond ? node.then : node.else;
      if (!branch) return null;
      const group = new rc.THREE.Group();
      renderRoot3d(group, branch, rc, deferred, false);
      return group;
    }
    case 'match': {
      const on = evalExpr3D(node.on, rc);
      const key = typeof on === 'string' ? on : String(on);
      const branch = node.cases[key] ?? node.default;
      if (!branch) return null;
      const group = new rc.THREE.Group();
      renderRoot3d(group, branch, rc, deferred, false);
      return group;
    }
    case 'repeat':
      return renderRepeat(node, rc, deferred);
    case 'viewport':
    case 'clip':
      throw new Error(`adapter3d: kind "${node.kind}" is 2D-only`);
    case 'layout':
      throw new Error('adapter3d: layout is 2D-only');
    case 'rect':
    case 'roundRect':
    case 'circle':
    case 'ellipse':
    case 'arc':
    case 'filledArc':
    case 'line':
    case 'polyline':
    case 'polygon':
    case 'path':
    case 'text':
    case 'image':
    case 'functionCurve':
      throw new Error(`adapter3d: 2D shape "${node.kind}" cannot be rendered in 3D`);
    default:
      throw new Error(`adapter3d: unhandled element kind "${(node as { kind: string }).kind}"`);
  }
}

function renderRepeat(node: RepeatEl, rc: RenderContext3D, deferred: ShaderDeferred[]): Object3D {
  const group = new rc.THREE.Group();
  const iter = resolveRepeatIter(node, rc);
  for (const value of iter) {
    const childRc = extendRenderContext3D(rc, { [node.as]: value });
    for (const child of node.children) {
      renderRoot3d(group, child, childRc, deferred, false);
    }
  }
  return group;
}

function resolveRepeatIter(node: RepeatEl, rc: RenderContext3D): readonly unknown[] {
  if ('range' in node.of) {
    const [startRaw, endRaw] = node.of.range;
    const start = evalNumOr3D(startRaw, rc);
    const end = evalNumOr3D(endRaw, rc);
    const step = node.of.step !== undefined ? evalNumOr3D(node.of.step, rc) : 1;
    if (step === 0) throw new Error('adapter3d: repeat step must be non-zero');
    const out: number[] = [];
    if (step > 0) {
      for (let v = start; v < end; v += step) out.push(v);
    } else {
      for (let v = start; v > end; v += step) out.push(v);
    }
    return out;
  }
  const items = evalExpr3D(node.of.items, rc);
  if (!Array.isArray(items)) {
    throw new TypeError('adapter3d: repeat items must be array');
  }
  return items;
}

function applyOpacity(obj: Object3D, alpha: number): void {
  obj.traverse((child) => {
    const asMesh = child as { material?: unknown };
    const mat = asMesh.material;
    if (!mat) return;
    if (Array.isArray(mat)) {
      for (const m of mat) setMaterialOpacity(m, alpha);
    } else {
      setMaterialOpacity(mat, alpha);
    }
  });
}

function setMaterialOpacity(mat: unknown, alpha: number): void {
  if (!mat || typeof mat !== 'object') return;
  const m = mat as { opacity?: number; transparent?: boolean };
  if (typeof m.opacity === 'number') {
    m.opacity *= alpha;
    if (m.opacity < 1) m.transparent = true;
  }
}
