/**
 * bbox 자동 스케일 뷰포트.
 *
 * 사용처: pythagorean 류(삼각형과 세 정사각형을 감싸는 bbox에 맞춰 자동 축소/확대).
 * bbox의 중심을 rect의 중심에 정렬하고, 가로·세로 중 더 제약이 큰 쪽에 맞춰 스케일을 잡는다.
 * yUp=true가 기본(수학 좌표계).
 */

import type { Viewport2D } from '../types';

export interface BBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface BBoxRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BBoxViewportOptions {
  rect: BBoxRect;
  bbox: BBox;
  /** rect 내부 여백(px). 기본 0. */
  padding?: number;
  /** 기본 true: bbox의 y값이 커질수록 화면 위쪽. */
  yUp?: boolean;
}

export interface BBoxViewport extends Viewport2D {
  /** bbox 중심의 스크린 좌표 x. */
  readonly cx: number;
  /** bbox 중심의 스크린 좌표 y. */
  readonly cy: number;
  /** 월드 1단위 → 스크린 픽셀 배율. */
  readonly scale: number;
}

export function createBBoxViewport(opts: BBoxViewportOptions): BBoxViewport {
  const yUp = opts.yUp ?? true;
  const pad = opts.padding ?? 0;
  const { rect, bbox } = opts;

  const bboxW = bbox.maxX - bbox.minX;
  const bboxH = bbox.maxY - bbox.minY;
  const availW = Math.max(1, rect.w - pad * 2);
  const availH = Math.max(1, rect.h - pad * 2);
  const scaleX = bboxW > 0 ? availW / bboxW : 1;
  const scaleY = bboxH > 0 ? availH / bboxH : 1;
  const scale = Math.min(scaleX, scaleY);

  const bboxMidX = (bbox.minX + bbox.maxX) / 2;
  const bboxMidY = (bbox.minY + bbox.maxY) / 2;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;

  const toX = (wx: number): number => cx + (wx - bboxMidX) * scale;
  const toY = (wy: number): number =>
    yUp ? cy - (wy - bboxMidY) * scale : cy + (wy - bboxMidY) * scale;

  return {
    cx,
    cy,
    scale,
    toScreen(wx, wy) {
      return { x: toX(wx), y: toY(wy) };
    },
    toWorld(sx, sy) {
      const wx = bboxMidX + (sx - cx) / scale;
      const wy = yUp
        ? bboxMidY - (sy - cy) / scale
        : bboxMidY + (sy - cy) / scale;
      return { x: wx, y: wy };
    },
  };
}
