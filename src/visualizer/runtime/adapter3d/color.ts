/**
 * 3D 어댑터 전용 색상 파서.
 *
 * Expression builtins(`hexAlpha`, `rgba`)는 2D가 ctx.fillStyle에 그대로
 * 꽂아넣을 수 있는 CSS 문자열(`"rgba(r,g,b,a)"`, `"#RRGGBB"`)을 반환한다.
 * 3D에서는 `THREE.Color`(opaque)와 opacity(0..1)를 분리해야 한다.
 */

import * as THREE from 'three';

export interface ParsedColor {
  color: THREE.Color;
  opacity: number;
}

const RGBA_RE = /^rgba?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s*,\s*(-?\d+(?:\.\d+)?))?\s*\)$/;

export function parseColorSpec(spec: unknown): ParsedColor {
  if (typeof spec === 'number') {
    return { color: new THREE.Color(spec), opacity: 1 };
  }
  if (typeof spec !== 'string') {
    throw new TypeError(`adapter3d: expected color string, got ${typeof spec}`);
  }
  const trimmed = spec.trim();
  const match = RGBA_RE.exec(trimmed);
  if (match) {
    const r = clamp01(Number(match[1]) / 255);
    const g = clamp01(Number(match[2]) / 255);
    const b = clamp01(Number(match[3]) / 255);
    const a = match[4] !== undefined ? clamp01(Number(match[4])) : 1;
    return { color: new THREE.Color(r, g, b), opacity: a };
  }
  return { color: new THREE.Color(trimmed), opacity: 1 };
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
