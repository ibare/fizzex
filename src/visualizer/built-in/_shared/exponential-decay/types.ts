/**
 * exponential-decay Visualizer 계열 공용 타입.
 */

export interface AbstractArgs {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  w: number;
  h: number;
  N0: number;
  r: number;
  r_std: number;
  t: number;
  halfLife: number;
  isStandard: boolean;
  color: string;
  isDark: boolean;
  tMax: number;
}

export interface SceneDrawArgs {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  w: number;
  h: number;
  N0: number;
  r: number;
  t: number;
  ratio: number;
  ratio_std: number;
  isStandard: boolean;
  halfLife: number;
  animT: number;
  color: string;
  isDark: boolean;
}
