/**
 * bbox 자동 스케일 뷰포트.
 *
 * 사용처: pythagorean 류(삼각형과 세 정사각형을 감싸는 bbox에 맞춰 자동 축소/확대).
 * 가로·세로 중 더 제약이 큰 쪽에 맞춰 스케일을 잡는다. yUp=true가 기본(수학 좌표계).
 * 기본 정렬은 중앙. hAlign/vAlign으로 start/end(plot 가장자리 고정) 또는
 * 화면 앵커(특정 스크린 좌표를 목표 지점으로, plot 범위 안에서 clamp) 정렬을 지정할 수 있다.
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

export interface BBoxPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * 스크린 좌표 앵커.
 *
 *   - target: bbox의 시작 모서리(가로는 좌측, 세로는 yUp=true일 때 하단/yUp=false일 때 상단)가
 *             향할 스크린 좌표 목표 지점.
 *   - min, max: target을 plot 영역 안에서 clamp하는 구간. 각각 모서리 기준(월드 중심이 아닌
 *               bbox 시작 모서리의 스크린 좌표) 옵션. 미지정 시 plot 가장자리 기준으로 기본값 사용.
 *
 * 용도: 사다리처럼 "화면의 특정 지점(예: w/3)에 기준점을 두되,
 *       스케일에 따라 삐져나가는 경우 가장자리로 clamp"하려는 경우.
 */
export interface BBoxAnchor {
  kind: 'anchor';
  target: number;
  min?: number;
  max?: number;
}

export type BBoxAlign = 'start' | 'center' | 'end' | BBoxAnchor;

export interface BBoxViewportOptions {
  rect: BBoxRect;
  bbox: BBox;
  /**
   * rect 내부 여백.
   * number면 4방향 동일. 객체면 지정 방향만 개별, 미지정 방향은 0. 기본 0.
   */
  padding?: number | Partial<BBoxPadding>;
  /** 기본 true: bbox의 y값이 커질수록 화면 위쪽. */
  yUp?: boolean;
  /** 가로 정렬. 기본 'center'. */
  hAlign?: BBoxAlign;
  /**
   * 세로 정렬. 기본 'center'.
   * 'start'는 plot 상단, 'end'는 plot 하단에 bbox를 붙인다 (yUp 무관, CSS 관례).
   */
  vAlign?: BBoxAlign;
}

export interface BBoxViewport extends Viewport2D {
  /** 사용 가능 영역(padding + 정렬 반영)의 중심 스크린 좌표 x. */
  readonly cx: number;
  /** 사용 가능 영역(padding + 정렬 반영)의 중심 스크린 좌표 y. */
  readonly cy: number;
  /** 월드 1단위 → 스크린 픽셀 배율. */
  readonly scale: number;
}

const ZERO_PAD: BBoxPadding = { top: 0, right: 0, bottom: 0, left: 0 };

function normalizePad(p: BBoxViewportOptions['padding']): BBoxPadding {
  if (p === undefined) return ZERO_PAD;
  if (typeof p === 'number') return { top: p, right: p, bottom: p, left: p };
  return {
    top: p.top ?? 0,
    right: p.right ?? 0,
    bottom: p.bottom ?? 0,
    left: p.left ?? 0,
  };
}

/**
 * 한 축의 중심 스크린 좌표를 결정한다.
 *
 *   lo/hi     : plot 영역의 시작/끝 스크린 좌표 (가로=plotLeft/plotRight, 세로=plotTop/plotBottom)
 *   worldSpan : 해당 축에서 bbox가 차지하는 스크린 픽셀 폭 = bbox 길이 × scale
 *   align     : 'start' | 'center' | 'end' | BBoxAnchor
 *   invert    : 해당 축에서 세계→스크린이 반전되는지 여부
 *                - 가로축: false (wx 커질수록 화면 오른쪽 = lo→hi)
 *                - 세로축 yUp=false: false (wy 커질수록 화면 아래쪽 = lo→hi)
 *                - 세로축 yUp=true: true (wy 커질수록 화면 위쪽 = hi→lo)
 *               앵커 target은 항상 bbox "시작 모서리(minX/minY)"의 스크린 좌표를 의미한다.
 *               invert=true면 그 모서리가 중심보다 +worldSpan/2 방향(화면 아래=hi쪽)에 위치.
 */
function resolveCenter(
  lo: number,
  hi: number,
  worldSpan: number,
  align: BBoxAlign,
  invert: boolean,
): number {
  const half = worldSpan / 2;
  if (align === 'center') return (lo + hi) / 2;
  if (align === 'start') return lo + half;
  if (align === 'end') return hi - half;

  // anchor 분기.
  // bbox 시작 모서리의 스크린 좌표 = center에서 -half(invert=false) 또는 +half(invert=true).
  // → center = target + (invert ? -half : +half) ... 아니, target = edge, edge = center ± half.
  //   invert=false: edge = center - half  → center = edge + half
  //   invert=true : edge = center + half  → center = edge - half
  const edgeToCenter = (edge: number): number =>
    invert ? edge - half : edge + half;

  const defaultMinEdge = invert ? lo + worldSpan : lo;
  const defaultMaxEdge = invert ? hi : hi - worldSpan;
  const minEdge = align.min ?? defaultMinEdge;
  const maxEdge = align.max ?? defaultMaxEdge;
  const clampLo = Math.min(minEdge, maxEdge);
  const clampHi = Math.max(minEdge, maxEdge);
  const clampedEdge = Math.max(clampLo, Math.min(clampHi, align.target));
  return edgeToCenter(clampedEdge);
}

export function createBBoxViewport(opts: BBoxViewportOptions): BBoxViewport {
  const yUp = opts.yUp ?? true;
  const pad = normalizePad(opts.padding);
  const hAlign = opts.hAlign ?? 'center';
  const vAlign = opts.vAlign ?? 'center';
  const { rect, bbox } = opts;

  const plotLeft = rect.x + pad.left;
  const plotRight = rect.x + rect.w - pad.right;
  const plotTop = rect.y + pad.top;
  const plotBottom = rect.y + rect.h - pad.bottom;
  const availW = Math.max(1, plotRight - plotLeft);
  const availH = Math.max(1, plotBottom - plotTop);

  const bboxW = bbox.maxX - bbox.minX;
  const bboxH = bbox.maxY - bbox.minY;
  const scaleX = bboxW > 0 ? availW / bboxW : 1;
  const scaleY = bboxH > 0 ? availH / bboxH : 1;
  const scale = Math.min(scaleX, scaleY);

  const bboxMidX = (bbox.minX + bbox.maxX) / 2;
  const bboxMidY = (bbox.minY + bbox.maxY) / 2;

  const cx = resolveCenter(plotLeft, plotRight, bboxW * scale, hAlign, false);
  const cy = resolveCenter(plotTop, plotBottom, bboxH * scale, vAlign, yUp);

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
