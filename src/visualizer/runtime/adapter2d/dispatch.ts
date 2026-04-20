/**
 * ElementKind → 렌더러 함수 맵. exhaustive 검사는 `render.ts` 진입점의 switch에서.
 * 여기선 2D에서 처리 가능한 kind만 등록한다. 3D Element(sphere 등)를 만나면
 * `render.ts`에서 "Phase 6 어댑터" 경고 또는 throw.
 */

import type { ElementNode } from '../types/element';
import * as shapes from './render-shapes';
import * as containers from './render-containers';
import type { RenderRootFn } from './render-containers';
import type { RenderContext } from './render-context';

export type Shape2DRenderer = (ctx: CanvasRenderingContext2D, node: ElementNode, rc: RenderContext) => void;
export type Container2DRenderer = (
  ctx: CanvasRenderingContext2D,
  node: ElementNode,
  rc: RenderContext,
  renderRoot: RenderRootFn,
) => void;

// discriminated union을 narrow하는 얇은 캐스팅 래퍼. ElementNode 전체를 받고 kind별 구체 타입으로 좁힘.
export const SHAPE_RENDERERS: Record<string, Shape2DRenderer> = {
  rect: (ctx, node, rc) => shapes.drawRect(ctx, node as Extract<ElementNode, { kind: 'rect' }>, rc),
  roundRect: (ctx, node, rc) => shapes.drawRoundRect(ctx, node as Extract<ElementNode, { kind: 'roundRect' }>, rc),
  circle: (ctx, node, rc) => shapes.drawCircleEl(ctx, node as Extract<ElementNode, { kind: 'circle' }>, rc),
  ellipse: (ctx, node, rc) => shapes.drawEllipseEl(ctx, node as Extract<ElementNode, { kind: 'ellipse' }>, rc),
  arc: (ctx, node, rc) => shapes.drawArcEl(ctx, node as Extract<ElementNode, { kind: 'arc' }>, rc),
  filledArc: (ctx, node, rc) => shapes.drawFilledArcEl(ctx, node as Extract<ElementNode, { kind: 'filledArc' }>, rc),
  line: (ctx, node, rc) => shapes.drawLineEl(ctx, node as Extract<ElementNode, { kind: 'line' }>, rc),
  polyline: (ctx, node, rc) => shapes.drawPolylineEl(ctx, node as Extract<ElementNode, { kind: 'polyline' }>, rc),
  polygon: (ctx, node, rc) => shapes.drawPolygonEl(ctx, node as Extract<ElementNode, { kind: 'polygon' }>, rc),
  path: (ctx, node, rc) => shapes.drawPathEl(ctx, node as Extract<ElementNode, { kind: 'path' }>, rc),
  text: (ctx, node, rc) => shapes.drawTextEl(ctx, node as Extract<ElementNode, { kind: 'text' }>, rc),
  image: (ctx, node, rc) => shapes.drawImageEl(ctx, node as Extract<ElementNode, { kind: 'image' }>, rc),
  functionCurve: (ctx, node, rc) =>
    shapes.drawFunctionCurveEl(ctx, node as Extract<ElementNode, { kind: 'functionCurve' }>, rc),
};

export const CONTAINER_RENDERERS: Record<string, Container2DRenderer> = {
  group: (ctx, node, rc, rr) => containers.renderGroup(ctx, node as GroupEl, rc, rr),
  if: (ctx, node, rc, rr) => containers.renderIf(ctx, node as IfEl, rc, rr),
  repeat: (ctx, node, rc, rr) => containers.renderRepeat(ctx, node as RepeatEl, rc, rr),
  match: (ctx, node, rc, rr) => containers.renderMatch(ctx, node as MatchEl, rc, rr),
  layout: (ctx, node, rc, rr) => containers.renderLayout(ctx, node as LayoutEl, rc, rr),
  viewport: (ctx, node, rc, rr) => containers.renderViewportScope(ctx, node as ViewportScopeEl, rc, rr),
  clip: (ctx, node, rc, rr) => containers.renderClip(ctx, node as ClipEl, rc, rr),
};

// re-export 좁힌 타입 (import 축소용).
type GroupEl = Extract<ElementNode, { kind: 'group' }>;
type IfEl = Extract<ElementNode, { kind: 'if' }>;
type RepeatEl = Extract<ElementNode, { kind: 'repeat' }>;
type MatchEl = Extract<ElementNode, { kind: 'match' }>;
type LayoutEl = Extract<ElementNode, { kind: 'layout' }>;
type ViewportScopeEl = Extract<ElementNode, { kind: 'viewport' }>;
type ClipEl = Extract<ElementNode, { kind: 'clip' }>;

/** 3D kind 집합 — `render.ts` 진입점에서 skip/경고용. */
export const KIND_3D: ReadonlySet<string> = new Set(['sphere', 'bufferLine', 'points', 'light', 'shaderMaterial']);
