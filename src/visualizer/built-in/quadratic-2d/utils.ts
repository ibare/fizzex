/**
 * quadratic-2d 공용 유틸 + 공통 타입
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

/** y = ax² + bx + c 값 계산 */
export function quadY(a: number, b: number, c: number, x: number): number {
  return a * x * x + b * x + c;
}

/** 꼭짓점 (대칭축, 극값) */
export function quadVertex(a: number, b: number, c: number): { vx: number; vy: number } {
  if (Math.abs(a) < 1e-9) return { vx: 0, vy: c };
  const vx = -b / (2 * a);
  const vy = a * vx * vx + b * vx + c;
  return { vx, vy };
}

/** 실수근 ([]·[r]·[r1,r2]) */
export function quadRoots(a: number, b: number, c: number): number[] {
  if (Math.abs(a) < 1e-9) {
    if (Math.abs(b) < 1e-9) return [];
    return [-c / b];
  }
  const D = b * b - 4 * a * c;
  if (D < 0) return [];
  if (D === 0) return [-b / (2 * a)];
  const sq = Math.sqrt(D);
  return [(-b - sq) / (2 * a), (-b + sq) / (2 * a)];
}

/** 장면 그리기 공통 인자 */
export interface SceneDrawArgs {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  w: number;
  h: number;
  a: number;
  b: number;
  c: number;
  /** 현재 관심점 x */
  xCur: number;
  /** y(xCur) */
  yCur: number;
  /** 꼭짓점 */
  vx: number;
  vy: number;
  /** 실수근 (0~2개) */
  roots: number[];
  /** 애니메이션 시각 (초) — 장식 */
  animT: number;
  color: string;
  isDark: boolean;
  alpha?: number;
}

/** 포물선을 Canvas 좌표로 투영해 그릴 때 필요한 뷰 */
export interface ParabolaView {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** Canvas 영역 */
  left: number;
  top: number;
  width: number;
  height: number;
}

export function worldToCanvas(view: ParabolaView, wx: number, wy: number): { cx: number; cy: number } {
  const cx = view.left + ((wx - view.xMin) / (view.xMax - view.xMin)) * view.width;
  const cy = view.top + view.height - ((wy - view.yMin) / (view.yMax - view.yMin)) * view.height;
  return { cx, cy };
}

export function drawParabola(
  ctx: CanvasRenderingContext2D,
  view: ParabolaView,
  a: number,
  b: number,
  c: number,
  opts: { strokeStyle: string; lineWidth: number; dash?: number[] },
): void {
  ctx.save();
  ctx.strokeStyle = opts.strokeStyle;
  ctx.lineWidth = opts.lineWidth;
  if (opts.dash) ctx.setLineDash(opts.dash);
  ctx.beginPath();
  const N = 96;
  for (let i = 0; i <= N; i++) {
    const wx = view.xMin + (i / N) * (view.xMax - view.xMin);
    const wy = quadY(a, b, c, wx);
    const { cx, cy } = worldToCanvas(view, wx, wy);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  if (opts.dash) ctx.setLineDash([]);
  ctx.restore();
}
