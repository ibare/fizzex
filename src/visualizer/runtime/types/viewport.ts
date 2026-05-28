import type { ExprString } from './expr.js';

/**
 * 좌표계 선언 (설계 §8). 현재 호스트가 지원하는 3종.
 */
export type ViewportSpec =
  | TimeValueViewport
  | FitBoxViewport
  | PolarViewport
  | FrameRectViewport;

interface ViewportBase {
  rect?: RectSpec;
}

export interface TimeValueViewport extends ViewportBase {
  kind: 'time-value';
  xMin: ExprString;
  xMax: ExprString;
  yMin: ExprString;
  yMax: ExprString;
  yUp?: boolean;
  padding?: EdgePadding;
}

export interface FitBoxViewport extends ViewportBase {
  kind: 'fit-box';
  bbox: { minX: ExprString; maxX: ExprString; minY: ExprString; maxY: ExprString };
  yUp?: boolean;
  hAlign?: 'start' | 'center' | 'end';
  vAlign?: 'start' | 'center' | 'end';
  padding?: EdgePadding;
}

export interface PolarViewport extends ViewportBase {
  kind: 'polar';
  rMax: ExprString;
  cx?: ExprString;
  cy?: ExprString;
  padding?: EdgePadding;
}

export interface FrameRectViewport extends ViewportBase {
  kind: 'frame-rect';
}

export type RectSpec =
  | { ref: string } // layout area 등 이름 참조
  | { x: ExprString; y: ExprString; w: ExprString; h: ExprString };

export interface EdgePadding {
  top?: ExprString | number;
  right?: ExprString | number;
  bottom?: ExprString | number;
  left?: ExprString | number;
}
