/**
 * quadratic-* Visualizer 공용 수학 유틸.
 *
 * y = a x² + b x + c의 값·꼭짓점·실수근만 제공한다.
 * 화면 좌표 매핑과 곡선 그리기는 graphics 호스트(createTimeValueViewport,
 * drawFunctionCurve)가 담당하므로 여기엔 두지 않는다.
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
