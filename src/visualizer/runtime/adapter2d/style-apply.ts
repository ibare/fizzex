/**
 * StyleSpec·TransformSpec → Canvas2D ctx 적용 (설계 §6·§7).
 *
 * `applyStyle`·`applyTransform`은 ctx를 변이시키므로 호출자가 save/restore를 관리해야 한다.
 * `resolveFill`은 단색 문자열 또는 CanvasGradient 중 하나를 반환.
 */

import type { StyleSpec, TransformSpec, FillSpec, LinearGradient, RadialGradient } from '../types/style.js';
import {
  createLinearGradientFill,
  createRadialGradientFill,
  type GradientStop,
} from '../../../graphics/draw.js';
import { evalNum, evalNumOr, evalStr, type RenderContext } from './render-context.js';

export function applyTransform(
  ctx: CanvasRenderingContext2D,
  t: TransformSpec | undefined,
  rc: RenderContext,
): void {
  if (!t) return;
  const tx = t.translate ? evalNumOr(t.translate[0], rc) : 0;
  const ty = t.translate ? evalNumOr(t.translate[1], rc) : 0;
  const rot = t.rotate === undefined ? 0 : evalNumOr(t.rotate, rc);
  let sx = 1;
  let sy = 1;
  if (Array.isArray(t.scale)) {
    sx = evalNumOr(t.scale[0], rc);
    sy = evalNumOr(t.scale[1], rc);
  } else if (t.scale !== undefined) {
    const s = evalNumOr(t.scale, rc);
    sx = s;
    sy = s;
  }
  const ox = t.origin ? evalNumOr(t.origin[0], rc) : 0;
  const oy = t.origin ? evalNumOr(t.origin[1], rc) : 0;

  ctx.translate(tx + ox, ty + oy);
  if (rot !== 0) ctx.rotate(rot);
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
  if (ox !== 0 || oy !== 0) ctx.translate(-ox, -oy);
}

function resolveGradientStops(
  stops: ReadonlyArray<[string | number, string]>,
  rc: RenderContext,
): GradientStop[] {
  return stops.map(([offset, color]) => ({
    offset: typeof offset === 'number' ? offset : evalNum(offset, rc),
    color: evalStr(color, rc),
  }));
}

export function resolveFill(
  ctx: CanvasRenderingContext2D,
  fill: FillSpec,
  rc: RenderContext,
): string | CanvasGradient {
  if (typeof fill === 'string') return evalStr(fill, rc);
  if (fill.kind === 'linear') {
    const g = fill as LinearGradient;
    return createLinearGradientFill(
      ctx,
      evalNum(g.x0, rc),
      evalNum(g.y0, rc),
      evalNum(g.x1, rc),
      evalNum(g.y1, rc),
      resolveGradientStops(g.stops, rc),
    );
  }
  const g = fill as RadialGradient;
  // 시작 반경 r0는 버리고 r1만 사용 (createRadialGradientFill 시그니처에 맞춤).
  // 호스트 프리미티브가 r0를 받지 않도록 좁혀 둔 설계상 결정.
  return createRadialGradientFill(
    ctx,
    evalNum(g.cx1, rc),
    evalNum(g.cy1, rc),
    evalNumOr(g.r1, rc),
    resolveGradientStops(g.stops, rc),
  );
}

export function applyStyle(
  ctx: CanvasRenderingContext2D,
  style: StyleSpec | undefined,
  rc: RenderContext,
): void {
  if (!style) return;
  if (style.fill !== undefined) ctx.fillStyle = resolveFill(ctx, style.fill, rc);
  if (style.stroke !== undefined) ctx.strokeStyle = evalStr(style.stroke, rc);
  if (style.lineWidth !== undefined) ctx.lineWidth = evalNumOr(style.lineWidth, rc);
  if (style.lineDash) {
    ctx.setLineDash(style.lineDash.map((d) => evalNumOr(d, rc)));
  }
  if (style.lineCap) ctx.lineCap = style.lineCap;
  if (style.lineJoin) ctx.lineJoin = style.lineJoin;
  if (style.opacity !== undefined) ctx.globalAlpha = evalNumOr(style.opacity, rc);
  if (style.font !== undefined) ctx.font = evalStr(style.font, rc);
  if (style.textAlign) ctx.textAlign = style.textAlign;
  if (style.textBaseline) ctx.textBaseline = style.textBaseline;
  if (style.shadowColor !== undefined) ctx.shadowColor = evalStr(style.shadowColor, rc);
  if (style.shadowBlur !== undefined) ctx.shadowBlur = evalNumOr(style.shadowBlur, rc);
  if (style.shadowOffsetX !== undefined) ctx.shadowOffsetX = evalNumOr(style.shadowOffsetX, rc);
  if (style.shadowOffsetY !== undefined) ctx.shadowOffsetY = evalNumOr(style.shadowOffsetY, rc);
}
