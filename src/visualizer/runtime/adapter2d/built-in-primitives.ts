/**
 * 내장 2D primitive 등록.
 *
 * adapter2d/index.ts가 import 시 이 모듈의 side effect로 registry에 등록된다.
 * 제어 흐름 요소(group/if/repeat/match/layout/viewport/clip)는 primitive가 아니므로
 * 여기 없다 — render.ts가 직접 분기한다.
 */

import type { ElementNode } from '../types/element.js';
import { registerPrimitive2D } from './primitive-registry.js';
import * as shapes from './render-shapes.js';

type NarrowFor<K extends string> = Extract<ElementNode, { kind: K }>;

registerPrimitive2D({
  kind: 'rect',
  draw: (ctx, node, rc) => shapes.drawRect(ctx, node as NarrowFor<'rect'>, rc),
});
registerPrimitive2D({
  kind: 'roundRect',
  draw: (ctx, node, rc) => shapes.drawRoundRect(ctx, node as NarrowFor<'roundRect'>, rc),
});
registerPrimitive2D({
  kind: 'circle',
  draw: (ctx, node, rc) => shapes.drawCircleEl(ctx, node as NarrowFor<'circle'>, rc),
});
registerPrimitive2D({
  kind: 'ellipse',
  draw: (ctx, node, rc) => shapes.drawEllipseEl(ctx, node as NarrowFor<'ellipse'>, rc),
});
registerPrimitive2D({
  kind: 'arc',
  draw: (ctx, node, rc) => shapes.drawArcEl(ctx, node as NarrowFor<'arc'>, rc),
});
registerPrimitive2D({
  kind: 'filledArc',
  draw: (ctx, node, rc) => shapes.drawFilledArcEl(ctx, node as NarrowFor<'filledArc'>, rc),
});
registerPrimitive2D({
  kind: 'line',
  draw: (ctx, node, rc) => shapes.drawLineEl(ctx, node as NarrowFor<'line'>, rc),
});
registerPrimitive2D({
  kind: 'polyline',
  draw: (ctx, node, rc) => shapes.drawPolylineEl(ctx, node as NarrowFor<'polyline'>, rc),
});
registerPrimitive2D({
  kind: 'polygon',
  draw: (ctx, node, rc) => shapes.drawPolygonEl(ctx, node as NarrowFor<'polygon'>, rc),
});
registerPrimitive2D({
  kind: 'path',
  draw: (ctx, node, rc) => shapes.drawPathEl(ctx, node as NarrowFor<'path'>, rc),
});
registerPrimitive2D({
  kind: 'text',
  draw: (ctx, node, rc) => shapes.drawTextEl(ctx, node as NarrowFor<'text'>, rc),
});
registerPrimitive2D({
  kind: 'image',
  draw: (ctx, node, rc) => shapes.drawImageEl(ctx, node as NarrowFor<'image'>, rc),
});
registerPrimitive2D({
  kind: 'functionCurve',
  draw: (ctx, node, rc) => shapes.drawFunctionCurveEl(ctx, node as NarrowFor<'functionCurve'>, rc),
});
