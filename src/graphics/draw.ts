/**
 * 2D Canvas 드로잉 공용 헬퍼.
 *
 * 여러 Visualizer에서 공용으로 필요한 소형 드로잉 유틸리티만 모은다.
 * Three.js 의존성이 없어 2D 전용 Visualizer에서도 직접 경로로 import 가능하다
 * (`import { ... } from '../../../graphics/draw'`).
 */

/** `#RRGGBB` 헥스 색상을 alpha 투명도를 붙인 `rgba(...)` 문자열로 변환한다. */
export function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * 둥근 모서리 사각형 경로를 현재 ctx에 쌓는다.
 * fill / stroke 는 호출자 책임. 경로만 생성하고 반환 없음.
 */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/** 값의 절대 크기에 따라 소수점 자리수를 적응적으로 축약한다. */
export function formatN(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '-';
  const abs = Math.abs(n);
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 10) return n.toFixed(1);
  return n.toFixed(digits);
}
