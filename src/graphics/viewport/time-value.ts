/**
 * 시간-값 2축 뷰포트.
 *
 * 사용처: compound-interest, exponential-decay, freefall, quadratic, sine-wave 류.
 * x축이 독립변수(시간 등), y축이 종속변수인 평면 그래프에 적합하다.
 * yUp=true면 수학 좌표계(위로 증가), false면 Canvas 자연(아래로 증가).
 */

import type { Viewport2D } from '../types.js';

export interface TimeValueRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TimeValuePadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface TimeValueViewportOptions {
  rect: TimeValueRect;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** 기본 true: y값이 커질수록 화면 위쪽. */
  yUp?: boolean;
  padding?: Partial<TimeValuePadding>;
}

export interface TimeValueViewport extends Viewport2D {
  readonly rect: TimeValueRect;
  tToX(t: number): number;
  valueToY(v: number): number;
}

const ZERO_PAD: TimeValuePadding = { top: 0, right: 0, bottom: 0, left: 0 };

export function createTimeValueViewport(
  opts: TimeValueViewportOptions,
): TimeValueViewport {
  const yUp = opts.yUp ?? true;
  const pad: TimeValuePadding = { ...ZERO_PAD, ...(opts.padding ?? {}) };
  const { rect, xMin, xMax, yMin, yMax } = opts;

  const plotLeft = rect.x + pad.left;
  const plotRight = rect.x + rect.w - pad.right;
  const plotTop = rect.y + pad.top;
  const plotBottom = rect.y + rect.h - pad.bottom;
  const plotW = Math.max(0, plotRight - plotLeft);
  const plotH = Math.max(0, plotBottom - plotTop);
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;

  const tToX = (t: number): number => {
    if (xRange === 0) return plotLeft;
    return plotLeft + ((t - xMin) / xRange) * plotW;
  };
  const valueToY = (v: number): number => {
    if (yRange === 0) return plotBottom;
    const norm = (v - yMin) / yRange;
    return yUp ? plotBottom - norm * plotH : plotTop + norm * plotH;
  };

  return {
    rect,
    tToX,
    valueToY,
    toScreen(wx, wy) {
      return { x: tToX(wx), y: valueToY(wy) };
    },
    toWorld(sx, sy) {
      const wx =
        xRange === 0 || plotW === 0
          ? xMin
          : xMin + ((sx - plotLeft) / plotW) * xRange;
      const norm =
        plotH === 0
          ? 0
          : yUp
            ? (plotBottom - sy) / plotH
            : (sy - plotTop) / plotH;
      return { x: wx, y: yMin + norm * yRange };
    },
  };
}
