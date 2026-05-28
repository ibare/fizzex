/**
 * 함수 곡선 드로잉 프리미티브.
 *
 * Viewport2D 계약(toScreen) 위에서 y = fn(x)의 폴리라인을 stroke한다.
 * skip이 true를 반환한 세그먼트와 비유한 값(NaN/Infinity)에서 경로가 끊어지므로
 * "양수 구간만 그리기", "정의역 일부 제외" 같은 분기 drawing을 호출 측에서
 * 간단한 predicate로 표현할 수 있다.
 */

import type { Viewport2D } from './types.js';

export interface FunctionCurveOptions {
  xMin: number;
  xMax: number;
  /** 샘플 세그먼트 수. 기본 96. */
  segments?: number;
  /** true 반환 시 해당 샘플을 건너뛰고 경로를 단절한다. NaN/Infinity는 자동 단절. */
  skip?: (wx: number, wy: number) => boolean;
  strokeStyle?: string | CanvasGradient | CanvasPattern;
  lineWidth?: number;
  dash?: number[];
}

export function drawFunctionCurve(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport2D,
  fn: (x: number) => number,
  opts: FunctionCurveOptions,
): void {
  const { xMin, xMax, segments = 96, skip, strokeStyle, lineWidth, dash } = opts;
  const range = xMax - xMin;
  if (range <= 0 || segments < 1) return;

  ctx.save();
  if (strokeStyle !== undefined) ctx.strokeStyle = strokeStyle;
  if (lineWidth !== undefined) ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);

  ctx.beginPath();
  let started = false;
  for (let i = 0; i <= segments; i++) {
    const wx = xMin + (i / segments) * range;
    const wy = fn(wx);
    if (!Number.isFinite(wy) || (skip && skip(wx, wy))) {
      started = false;
      continue;
    }
    const { x, y } = viewport.toScreen(wx, wy);
    if (started) {
      ctx.lineTo(x, y);
    } else {
      ctx.moveTo(x, y);
      started = true;
    }
  }
  ctx.stroke();
  ctx.restore();
}
