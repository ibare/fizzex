import type { ExprString } from './expr';
import type { StyleSpec, TransformSpec } from './style';

/**
 * 2D Shape Element + 제어 구조 + 3D Element의 discriminated union (설계 §4, §5, §12).
 * `kind` 필드로 분기. 도메인 특화(스피커·진자 등) 금지.
 */

interface ElementBase {
  id?: string;
  visible?: ExprString;
  opacity?: ExprString | number;
  transform?: TransformSpec;
  style?: StyleSpec;
  viewport?: string;
  let?: Record<string, ExprString | number | boolean>;
}

// ─── 2D 기하 Shape ───

export interface RectEl extends ElementBase {
  kind: 'rect';
  x: ExprString | number;
  y: ExprString | number;
  w: ExprString | number;
  h: ExprString | number;
}

export interface RoundRectEl extends ElementBase {
  kind: 'roundRect';
  x: ExprString | number;
  y: ExprString | number;
  w: ExprString | number;
  h: ExprString | number;
  r: ExprString | number;
}

export interface CircleEl extends ElementBase {
  kind: 'circle';
  cx: ExprString | number;
  cy: ExprString | number;
  r: ExprString | number;
}

export interface EllipseEl extends ElementBase {
  kind: 'ellipse';
  cx: ExprString | number;
  cy: ExprString | number;
  rx: ExprString | number;
  ry: ExprString | number;
  rotation?: ExprString | number;
  startAngle?: ExprString | number;
  endAngle?: ExprString | number;
}

export interface ArcEl extends ElementBase {
  kind: 'arc';
  cx: ExprString | number;
  cy: ExprString | number;
  r: ExprString | number;
  startAngle: ExprString | number;
  endAngle: ExprString | number;
}

export interface FilledArcEl extends ElementBase {
  kind: 'filledArc';
  cx: ExprString | number;
  cy: ExprString | number;
  r: ExprString | number;
  startAngle: ExprString | number;
  endAngle: ExprString | number;
}

export interface LineEl extends ElementBase {
  kind: 'line';
  x1: ExprString | number;
  y1: ExprString | number;
  x2: ExprString | number;
  y2: ExprString | number;
}

export interface PolylineEl extends ElementBase {
  kind: 'polyline';
  points: ExprString; // → Array<[x, y]>
  closed?: boolean;
}

export interface PolygonEl extends ElementBase {
  kind: 'polygon';
  points: ExprString;
}

export interface PathEl extends ElementBase {
  kind: 'path';
  d: ExprString; // SVG path-like Expression
}

export interface TextEl extends ElementBase {
  kind: 'text';
  x: ExprString | number;
  y: ExprString | number;
  text: ExprString; // Expression으로 평가. format 포함 가능
}

export interface ImageEl extends ElementBase {
  kind: 'image';
  x: ExprString | number;
  y: ExprString | number;
  w: ExprString | number;
  h: ExprString | number;
  src: string;
}

export interface FunctionCurveEl extends ElementBase {
  kind: 'functionCurve';
  fn: ExprString; // `x`를 변수로 쓰는 Expression
  xMin: ExprString;
  xMax: ExprString;
  samples?: number;
}

// ─── 제어 컨테이너 ───

export interface GroupEl extends ElementBase {
  kind: 'group';
  children: ElementNode[];
}

export interface IfEl extends ElementBase {
  kind: 'if';
  cond: ExprString;
  then: ElementNode;
  else?: ElementNode;
}

export interface RepeatEl extends ElementBase {
  kind: 'repeat';
  of: { range: [ExprString | number, ExprString | number]; step?: ExprString | number } | { items: ExprString };
  as: string;
  children: ElementNode[];
}

export interface MatchEl extends ElementBase {
  kind: 'match';
  on: ExprString;
  cases: Record<string, ElementNode>;
  default?: ElementNode;
}

export interface LayoutEl extends ElementBase {
  kind: 'layout';
  direction: 'vertical' | 'horizontal';
  areas: LayoutArea[];
}

export interface LayoutArea {
  id: string;
  ratio?: number;
  size?: ExprString | number;
  children: ElementNode[];
}

export interface ViewportScopeEl extends ElementBase {
  kind: 'viewport';
  use: string;
  children: ElementNode[];
}

export interface ClipEl extends ElementBase {
  kind: 'clip';
  shape: ElementNode;
  children: ElementNode[];
}

// ─── 3D Element (Phase 6에서 어댑터 구현) ───

export interface SphereEl extends ElementBase {
  kind: 'sphere';
  cx: ExprString;
  cy: ExprString;
  cz: ExprString;
  r: ExprString | number;
  segments?: number;
}

export interface BufferLineEl extends ElementBase {
  kind: 'bufferLine';
  points: ExprString; // Array<[x,y,z]>
}

export interface PointsEl extends ElementBase {
  kind: 'points';
  positions: ExprString;
  size?: ExprString | number;
}

export interface LightEl extends ElementBase {
  kind: 'light';
  lightType: 'directional' | 'ambient' | 'point';
  intensity?: ExprString | number;
  position?: [ExprString, ExprString, ExprString];
  color?: ExprString;
}

export interface ShaderMaterialEl extends ElementBase {
  kind: 'shaderMaterial';
  vertex: string;
  fragment: string;
  uniforms?: Record<string, ExprString>;
  attachTo?: string; // id 참조
}

// ─── 유니언 ───

export type ElementNode =
  | RectEl
  | RoundRectEl
  | CircleEl
  | EllipseEl
  | ArcEl
  | FilledArcEl
  | LineEl
  | PolylineEl
  | PolygonEl
  | PathEl
  | TextEl
  | ImageEl
  | FunctionCurveEl
  | GroupEl
  | IfEl
  | RepeatEl
  | MatchEl
  | LayoutEl
  | ViewportScopeEl
  | ClipEl
  | SphereEl
  | BufferLineEl
  | PointsEl
  | LightEl
  | ShaderMaterialEl;

export type ElementKind = ElementNode['kind'];
