import type { ExprString } from './expr';

/**
 * Shape 공용 스타일. 각 필드는 Expression으로 평가될 수 있다 (설계 §7).
 */
export interface StyleSpec {
  fill?: FillSpec;
  stroke?: ExprString;
  lineWidth?: ExprString | number;
  lineDash?: Array<ExprString | number>;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  opacity?: ExprString | number;
  font?: ExprString;
  textAlign?: 'left' | 'center' | 'right' | 'start' | 'end';
  textBaseline?: 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging' | 'ideographic';
  shadowColor?: ExprString;
  shadowBlur?: ExprString | number;
  shadowOffsetX?: ExprString | number;
  shadowOffsetY?: ExprString | number;
}

export type FillSpec = ExprString | LinearGradient | RadialGradient;

export interface LinearGradient {
  kind: 'linear';
  x0: ExprString;
  y0: ExprString;
  x1: ExprString;
  y1: ExprString;
  stops: Array<[ExprString | number, ExprString]>;
}

export interface RadialGradient {
  kind: 'radial';
  cx0: ExprString;
  cy0: ExprString;
  r0: ExprString | number;
  cx1: ExprString;
  cy1: ExprString;
  r1: ExprString | number;
  stops: Array<[ExprString | number, ExprString]>;
}

/**
 * 2D transform — translate/rotate/scale의 선언형 합성 (설계 §6).
 */
export interface TransformSpec {
  translate?: [ExprString | number, ExprString | number];
  rotate?: ExprString | number;
  scale?: [ExprString | number, ExprString | number] | (ExprString | number);
  origin?: [ExprString | number, ExprString | number];
}
