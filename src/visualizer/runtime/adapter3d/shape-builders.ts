/**
 * 3D leaf Element builders (설계 §12.2~§12.6).
 *
 * Element → THREE.Object3D 한 개 생성. style/transform/visibility는 상위
 * `renderRoot3d`가 일괄 적용하므로 여기선 geometry + material 만 담당.
 *
 * 반환된 Object3D는 호출자(parent)가 `add`한다. dispose 책임은 호출자.
 */

import * as THREE from 'three';
import type {
  BufferLineEl,
  LightEl,
  PointsEl,
  SphereEl,
} from '../types/element.js';
import type { RenderContext3D } from './render-context.js';
import { evalExpr3D, evalNum3D, evalNumOr3D } from './render-context.js';
import { parseColorSpec } from './color.js';

export function buildSphere(el: SphereEl, rc: RenderContext3D): THREE.Mesh {
  const cx = evalNum3D(el.cx, rc);
  const cy = evalNum3D(el.cy, rc);
  const cz = evalNum3D(el.cz, rc);
  const r = evalNumOr3D(el.r, rc);
  const seg = el.segments ?? 32;
  const geom = new THREE.SphereGeometry(r, seg, seg);
  const fill = el.style?.fill;
  if (fill !== undefined && typeof fill !== 'string') {
    throw new Error('adapter3d: sphere fill must be a color string (gradients are 2D-only)');
  }
  const mat = buildBasicMaterial(fill, el.style?.opacity, rc);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(cx, cy, cz);
  return mesh;
}

export function buildBufferLine(el: BufferLineEl, rc: RenderContext3D): THREE.Line {
  const raw = evalExpr3D(el.points, rc);
  const positions = flattenTriples(raw, 'bufferLine.points');
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const { color, opacity } = resolveStrokeColor(el.style?.stroke, el.style?.opacity, rc);
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
  });
  return new THREE.Line(geom, mat);
}

export function buildPoints(el: PointsEl, rc: RenderContext3D): THREE.Points {
  const raw = evalExpr3D(el.positions, rc);
  const positions = flattenTriples(raw, 'points.positions');
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const fill = el.style?.fill;
  const colorExpr = typeof fill === 'string' ? fill : el.style?.stroke;
  const { color, opacity } = resolveStrokeColor(colorExpr, el.style?.opacity, rc);
  const size = el.size !== undefined ? evalNumOr3D(el.size, rc) : 1;
  const mat = new THREE.PointsMaterial({
    color,
    size,
    transparent: opacity < 1,
    opacity,
    sizeAttenuation: false,
  });
  return new THREE.Points(geom, mat);
}

export function buildLight(el: LightEl, rc: RenderContext3D): THREE.Light {
  const intensity = el.intensity !== undefined ? evalNumOr3D(el.intensity, rc) : 1;
  const color = el.color !== undefined
    ? parseColorSpec(evalExpr3D(el.color, rc)).color
    : new THREE.Color(0xffffff);
  if (el.lightType === 'ambient') {
    return new THREE.AmbientLight(color, intensity);
  }
  if (el.lightType === 'directional') {
    const light = new THREE.DirectionalLight(color, intensity);
    if (el.position) {
      light.position.set(
        evalNum3D(el.position[0], rc),
        evalNum3D(el.position[1], rc),
        evalNum3D(el.position[2], rc),
      );
    }
    return light;
  }
  if (el.lightType === 'point') {
    const light = new THREE.PointLight(color, intensity);
    if (el.position) {
      light.position.set(
        evalNum3D(el.position[0], rc),
        evalNum3D(el.position[1], rc),
        evalNum3D(el.position[2], rc),
      );
    }
    return light;
  }
  const never: never = el.lightType;
  throw new Error(`adapter3d: unknown light type ${never as string}`);
}

function buildBasicMaterial(
  fill: string | undefined,
  opacityField: string | number | undefined,
  rc: RenderContext3D,
): THREE.MeshBasicMaterial {
  const { color, opacity } = resolveStrokeColor(fill, opacityField, rc);
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
  });
}

function resolveStrokeColor(
  colorExpr: string | undefined,
  opacityExpr: string | number | undefined,
  rc: RenderContext3D,
): { color: THREE.Color; opacity: number } {
  const parsed = colorExpr !== undefined
    ? parseColorSpec(evalExpr3D(colorExpr, rc))
    : { color: new THREE.Color(0xffffff), opacity: 1 };
  if (opacityExpr !== undefined) {
    const ov = typeof opacityExpr === 'number' ? opacityExpr : evalNum3D(opacityExpr, rc);
    parsed.opacity *= ov;
  }
  return parsed;
}

function flattenTriples(raw: unknown, label: string): Float32Array {
  if (!Array.isArray(raw)) {
    throw new TypeError(`adapter3d ${label}: expected array, got ${typeof raw}`);
  }
  if (raw.length === 0) return new Float32Array(0);
  const first = raw[0];
  if (Array.isArray(first)) {
    const out = new Float32Array(raw.length * 3);
    for (let i = 0; i < raw.length; i += 1) {
      const row = raw[i];
      if (!Array.isArray(row) || row.length < 3) {
        throw new TypeError(`adapter3d ${label}[${i}]: expected [x,y,z]`);
      }
      out[i * 3 + 0] = num(row[0], `${label}[${i}][0]`);
      out[i * 3 + 1] = num(row[1], `${label}[${i}][1]`);
      out[i * 3 + 2] = num(row[2], `${label}[${i}][2]`);
    }
    return out;
  }
  if (raw.length % 3 !== 0) {
    throw new TypeError(`adapter3d ${label}: flat array length must be multiple of 3`);
  }
  const out = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    out[i] = num(raw[i], `${label}[${i}]`);
  }
  return out;
}

function num(v: unknown, label: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new TypeError(`adapter3d ${label}: expected finite number`);
  }
  return v;
}
