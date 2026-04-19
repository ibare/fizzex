/**
 * freefall Visualizer 계열 공용 타입.
 */

export interface SceneDrawArgs {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  v0: number;
  a: number;
  t: number;
  hCur: number;
  isDark: boolean;
}

export function formatMeter(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${(n / 1000).toFixed(2)}km`;
  if (abs >= 100) return `${n.toFixed(0)}m`;
  if (abs >= 10) return `${n.toFixed(1)}m`;
  return `${n.toFixed(2)}m`;
}
