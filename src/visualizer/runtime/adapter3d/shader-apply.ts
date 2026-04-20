/**
 * shaderMaterial Element 처리 (설계 §12.5 shader material).
 *
 * shaderMaterial은 자체 Object3D를 만들지 않는다. 대신 `attachTo`로
 * 지정된 다른 Element의 id를 찾아 그 Mesh의 `.material`을 `ShaderMaterial`로
 * 교체한다. 기존 material은 dispose.
 *
 * uniforms는 매 프레임 재평가되지 않는다 — 초기 마운트 시 한 번. 애니메이션
 * 용 시변 uniform은 `onFrame` animation이나 state 조정으로 shaderMaterial
 * 자체를 재생성하는 방식으로 처리 (MVP; 최적화는 후속).
 */

import * as THREE from 'three';
import type { ShaderMaterialEl } from '../types/element';
import type { RenderContext3D } from './render-context';
import { evalExpr3D } from './render-context';
import { parseColorSpec } from './color';

export function applyShaderMaterial(el: ShaderMaterialEl, rc: RenderContext3D): void {
  if (!el.attachTo) {
    throw new Error('adapter3d: shaderMaterial requires attachTo id');
  }
  const target = rc.idMap.get(el.attachTo);
  if (!target) {
    throw new Error(`adapter3d: shaderMaterial.attachTo "${el.attachTo}" not found`);
  }
  if (!(target instanceof THREE.Mesh)) {
    throw new Error(`adapter3d: shaderMaterial.attachTo "${el.attachTo}" is not a Mesh`);
  }

  const uniforms: Record<string, THREE.IUniform> = {};
  for (const [key, expr] of Object.entries(el.uniforms ?? {})) {
    uniforms[key] = { value: resolveUniform(expr, rc) };
  }

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: el.vertex,
    fragmentShader: el.fragment,
  });

  const prev = target.material;
  if (Array.isArray(prev)) {
    for (const m of prev) m.dispose();
  } else {
    prev.dispose();
  }
  target.material = mat;
}

function resolveUniform(expr: string, rc: RenderContext3D): unknown {
  const v = evalExpr3D(expr, rc);
  if (typeof v === 'string') {
    return parseColorSpec(v).color;
  }
  return v;
}
