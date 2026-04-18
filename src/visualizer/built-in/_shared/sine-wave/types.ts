/**
 * sine-wave Visualizer 계열 공용 타입.
 */

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

export interface SceneDrawArgs {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  w: number;
  h: number;
  A: number;
  y0: number;
  yNorm: number;
  animT: number;
  color: string;
  isDark: boolean;
}
