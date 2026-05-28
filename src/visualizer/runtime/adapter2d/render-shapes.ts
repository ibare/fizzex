/**
 * 13개 2D Shape Element 드로잉 함수 (설계 §6).
 *
 * 각 함수 시그니처는 `(ctx, node, rc) => void`. 공통 전처리(visibility/opacity/transform/style/let)는
 * `render.ts`의 진입점이 담당하고, 여기선 도형별 경로 쌓기 + fill/stroke만.
 * stroke/fill 결정: `node.style.stroke`가 있으면 stroke, `node.style.fill`이 있으면 fill. 둘 다면 fill → stroke.
 */

import type {
  RectEl,
  RoundRectEl,
  CircleEl,
  EllipseEl,
  ArcEl,
  FilledArcEl,
  LineEl,
  PolylineEl,
  PolygonEl,
  PathEl,
  TextEl,
  ImageEl,
  FunctionCurveEl,
} from '../types/element.js';
import {
  drawArc,
  drawCircle,
  drawEllipse,
  drawFilledArc,
  drawImage,
  drawLine,
  drawPath,
  drawPolygon,
  drawPolyline,
  roundRect,
  type Point2D,
} from '../../../graphics/draw.js';
import { drawFunctionCurve } from '../../../graphics/curves.js';
import {
  currentViewport,
  evalExpr,
  evalNum,
  evalNumOr,
  evalStr,
  extendRenderContext,
  type RenderContext,
} from './render-context.js';

/** stroke/fill 결정. 각 shape 공용. */
function strokeOrFill(ctx: CanvasRenderingContext2D, node: { style?: { stroke?: unknown; fill?: unknown } }): void {
  const hasFill = node.style?.fill !== undefined;
  const hasStroke = node.style?.stroke !== undefined;
  if (hasFill) ctx.fill();
  if (hasStroke) ctx.stroke();
}

/**
 * viewport 활성화 시 (wx, wy)를 스크린 좌표로 투영한다. 미설정이면 그대로 통과.
 * 셰이프의 `"viewport"` 필드 선언을 실제 드로잉에 반영하는 유일한 지점.
 */
function project(x: number, y: number, rc: RenderContext): Point2D {
  const vp = currentViewport(rc);
  return vp ? vp.toScreen(x, y) : { x, y };
}

/**
 * rect·roundRect·image용. (x,y)와 (x+w, y+h) 두 모서리를 각각 투영하고
 * yUp 뒤집힘에 대비해 축 별 min/abs로 정규화한 스크린 rect를 돌려준다.
 */
function projectRect(
  x: number,
  y: number,
  w: number,
  h: number,
  rc: RenderContext,
): { x: number; y: number; w: number; h: number } {
  const vp = currentViewport(rc);
  if (!vp) return { x, y, w, h };
  const p1 = vp.toScreen(x, y);
  const p2 = vp.toScreen(x + w, y + h);
  return {
    x: Math.min(p1.x, p2.x),
    y: Math.min(p1.y, p2.y),
    w: Math.abs(p2.x - p1.x),
    h: Math.abs(p2.y - p1.y),
  };
}

export function drawRect(ctx: CanvasRenderingContext2D, node: RectEl, rc: RenderContext): void {
  const r = projectRect(evalNumOr(node.x, rc), evalNumOr(node.y, rc), evalNumOr(node.w, rc), evalNumOr(node.h, rc), rc);
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  strokeOrFill(ctx, node);
}

export function drawRoundRect(ctx: CanvasRenderingContext2D, node: RoundRectEl, rc: RenderContext): void {
  const r = projectRect(evalNumOr(node.x, rc), evalNumOr(node.y, rc), evalNumOr(node.w, rc), evalNumOr(node.h, rc), rc);
  roundRect(ctx, r.x, r.y, r.w, r.h, evalNumOr(node.r, rc));
  strokeOrFill(ctx, node);
}

export function drawCircleEl(ctx: CanvasRenderingContext2D, node: CircleEl, rc: RenderContext): void {
  const p = project(evalNumOr(node.cx, rc), evalNumOr(node.cy, rc), rc);
  drawCircle(ctx, p.x, p.y, evalNumOr(node.r, rc));
  strokeOrFill(ctx, node);
}

export function drawEllipseEl(ctx: CanvasRenderingContext2D, node: EllipseEl, rc: RenderContext): void {
  const rot = node.rotation === undefined ? 0 : evalNumOr(node.rotation, rc);
  const p = project(evalNumOr(node.cx, rc), evalNumOr(node.cy, rc), rc);
  drawEllipse(ctx, p.x, p.y, evalNumOr(node.rx, rc), evalNumOr(node.ry, rc), rot);
  strokeOrFill(ctx, node);
}

export function drawArcEl(ctx: CanvasRenderingContext2D, node: ArcEl, rc: RenderContext): void {
  const p = project(evalNumOr(node.cx, rc), evalNumOr(node.cy, rc), rc);
  drawArc(
    ctx,
    p.x,
    p.y,
    evalNumOr(node.r, rc),
    evalNumOr(node.startAngle, rc),
    evalNumOr(node.endAngle, rc),
  );
  strokeOrFill(ctx, node);
}

export function drawFilledArcEl(ctx: CanvasRenderingContext2D, node: FilledArcEl, rc: RenderContext): void {
  const p = project(evalNumOr(node.cx, rc), evalNumOr(node.cy, rc), rc);
  drawFilledArc(
    ctx,
    p.x,
    p.y,
    evalNumOr(node.r, rc),
    evalNumOr(node.startAngle, rc),
    evalNumOr(node.endAngle, rc),
  );
  strokeOrFill(ctx, node);
}

export function drawLineEl(ctx: CanvasRenderingContext2D, node: LineEl, rc: RenderContext): void {
  const a = project(evalNumOr(node.x1, rc), evalNumOr(node.y1, rc), rc);
  const b = project(evalNumOr(node.x2, rc), evalNumOr(node.y2, rc), rc);
  drawLine(ctx, a.x, a.y, b.x, b.y);
  if (node.style?.stroke !== undefined) ctx.stroke();
}

/**
 * `points` Expression 결과 → `Point2D[]` 정규화. 튜플 `[x,y]`와 `{x,y}` 양쪽 허용.
 * viewport 활성화 시 각 점을 toScreen으로 투영한다.
 */
function resolvePoints(expr: string, rc: RenderContext): Point2D[] {
  const v = evalExpr(expr, rc);
  if (!Array.isArray(v)) throw new TypeError(`polyline/polygon points must be array, got ${typeof v}`);
  return v.map((p, i) => {
    if (Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number') {
      return project(p[0], p[1], rc);
    }
    if (p && typeof p === 'object' && 'x' in p && 'y' in p) {
      const r = p as { x: unknown; y: unknown };
      if (typeof r.x === 'number' && typeof r.y === 'number') return project(r.x, r.y, rc);
    }
    throw new TypeError(`points[${i}] invalid`);
  });
}

export function drawPolylineEl(ctx: CanvasRenderingContext2D, node: PolylineEl, rc: RenderContext): void {
  const pts = resolvePoints(node.points, rc);
  if (node.closed) {
    drawPolygon(ctx, pts);
    strokeOrFill(ctx, node);
  } else {
    drawPolyline(ctx, pts);
    if (node.style?.fill !== undefined) ctx.fill();
    if (node.style?.stroke !== undefined) ctx.stroke();
  }
}

export function drawPolygonEl(ctx: CanvasRenderingContext2D, node: PolygonEl, rc: RenderContext): void {
  drawPolygon(ctx, resolvePoints(node.points, rc));
  strokeOrFill(ctx, node);
}

export function drawPathEl(ctx: CanvasRenderingContext2D, node: PathEl, rc: RenderContext): void {
  drawPath(ctx, evalStr(node.d, rc));
  strokeOrFill(ctx, node);
}

export function drawTextEl(ctx: CanvasRenderingContext2D, node: TextEl, rc: RenderContext): void {
  const p = project(evalNumOr(node.x, rc), evalNumOr(node.y, rc), rc);
  const raw = evalExpr(node.text, rc);
  const text = typeof raw === 'string' ? raw : String(raw);
  if (node.style?.fill !== undefined) ctx.fillText(text, p.x, p.y);
  if (node.style?.stroke !== undefined) ctx.strokeText(text, p.x, p.y);
  // fill·stroke 지정이 없으면 ctx.fillStyle 기본(검정)으로 fillText.
  if (node.style?.fill === undefined && node.style?.stroke === undefined) {
    ctx.fillText(text, p.x, p.y);
  }
}

export function drawImageEl(ctx: CanvasRenderingContext2D, node: ImageEl, rc: RenderContext): void {
  const img = ensureImage(node.src, rc);
  if (!img.complete || img.naturalWidth === 0) return; // 로드 대기 중: skip.
  const r = projectRect(evalNumOr(node.x, rc), evalNumOr(node.y, rc), evalNumOr(node.w, rc), evalNumOr(node.h, rc), rc);
  drawImage(ctx, img, r.x, r.y, r.w, r.h);
}

function ensureImage(src: string, rc: RenderContext): HTMLImageElement {
  const cached = rc.imageCache.get(src);
  if (cached) return cached;
  const img = new Image();
  img.src = src;
  rc.imageCache.set(src, img);
  return img;
}

export function drawFunctionCurveEl(
  ctx: CanvasRenderingContext2D,
  node: FunctionCurveEl,
  rc: RenderContext,
): void {
  const viewport = currentViewport(rc);
  if (!viewport) throw new Error('functionCurve: no active viewport');
  const xMin = evalNum(node.xMin, rc);
  const xMax = evalNum(node.xMax, rc);
  const samples = node.samples ?? 96;

  // fn 평가: x를 locals로 extend한 뒤 Expression 평가.
  drawFunctionCurve(
    ctx,
    viewport,
    (x) => {
      const scoped = extendRenderContext(rc, { x });
      const v = evalExpr(node.fn, scoped);
      return typeof v === 'number' ? v : Number.NaN;
    },
    { xMin, xMax, segments: samples },
  );
}
