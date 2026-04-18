/**
 * compound-interest Visualizer 계열 공용 타입.
 */

export interface AbstractArgs {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  w: number;
  h: number;
  P: number;
  r: number;
  n: number;
  t: number;
  r_std: number;
  A: number;
  isStandard: boolean;
  tMax: number;
  inverse: boolean;
  color: string;
  isDark: boolean;
}

export interface SceneDrawArgs {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  w: number;
  h: number;
  P: number;
  r: number;
  n: number;
  t: number;
  A: number;
  A_std: number;
  isStandard: boolean;
  tMax: number;
  animT: number;
  color: string;
  isDark: boolean;
}
