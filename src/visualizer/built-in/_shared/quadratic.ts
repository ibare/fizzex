/**
 * quadratic-* Visualizer 공용 수학·뷰 유틸.
 *
 * y = a x² + b x + c 수학(극값/근/값)과 포물선을 Canvas 좌표계에 투영해 그리는
 * 작은 뷰 헬퍼를 모은다. 각 Visualizer 렌더러(sandbox/bridge/basketball/fountain)가
 * 동일 수학을 중복 구현하지 않도록 한 곳에 두었다.
 */

/** y = a x² + b x + c 값 */
export function quadY(a: number, b: number, c: number, x: number): number {
  return a * x * x + b * x + c;
}

/** 꼭짓점 (대칭축, 극값). a≈0이면 상수함수 취급. */
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

/** 월드 좌표 → Canvas 좌표 매핑에 필요한 뷰 정의 */
export interface ParabolaView {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
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

/** 포물선을 96분할로 그린다. stroke 색·두께·점선 지정 가능. */
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
