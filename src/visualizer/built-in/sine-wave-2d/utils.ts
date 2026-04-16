/**
 * sine-wave-2d 공용 유틸 + 공통 타입
 */

export function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

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

/** 장면 그리기 공통 인자 */
export interface SceneDrawArgs {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 진폭 A (정규화 -1~1 범위 기준) */
  A: number;
  /** 현재 순간 y₀ = A sin(ωt + φ) 값. 각 장면은 이 스칼라만 시각 매핑 */
  y0: number;
  /** y0 / A (정규화 -1~1) — 파형 위치 해석용 */
  yNorm: number;
  /** 애니메이션용 내부 시각 (초) */
  animT: number;
  color: string;
  isDark: boolean;
  alpha?: number;
}

/** 각 프리셋이 공유하는 추상 시각화 데이터 */
export interface AbstractArgs {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  w: number;
  h: number;
  A: number;
  omega: number;
  phi: number;
  t: number;
  y_cur: number;
  y_std: number;
  color: string;
  isDark: boolean;
  isStandard: boolean;
}
