/**
 * ViewportSpec → Viewport2D 즉시 평가 (설계 §8).
 *
 * 스펙의 `rect`는 RectSpec (프레임 직접 좌표 또는 `{ ref: <layout area id> }`).
 * Phase 3에선 기본 지원 3종: `time-value`, `fit-box`, `frame-rect`.
 * `polar`는 Viewport2D 공통 계약과 시그니처가 달라 Phase 7(kepler)에서 별도 도입 예정.
 */

import type { Viewport2D } from '../../../graphics/types.js';
import { createTimeValueViewport } from '../../../graphics/viewport/time-value.js';
import { createBBoxViewport } from '../../../graphics/viewport/bbox.js';
import type { ViewportSpec, RectSpec, EdgePadding } from '../types/viewport.js';
import { evalNum, evalNumOr, type RenderContext } from './render-context.js';

export interface FrameBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 호스트 전체 영역(width/height)을 기본 프레임으로 환산. */
export function frameBox(rc: RenderContext): FrameBox {
  return { x: 0, y: 0, w: rc.frame.width, h: rc.frame.height };
}

function resolveRect(
  spec: RectSpec | undefined,
  rc: RenderContext,
  areaResolver?: (id: string) => FrameBox | undefined,
): FrameBox {
  if (!spec) return frameBox(rc);
  if ('ref' in spec) {
    const box = areaResolver?.(spec.ref);
    if (!box) throw new Error(`viewport: unresolved rect ref "${spec.ref}"`);
    return box;
  }
  return {
    x: evalNum(spec.x, rc),
    y: evalNum(spec.y, rc),
    w: evalNum(spec.w, rc),
    h: evalNum(spec.h, rc),
  };
}

function resolvePadding(p: EdgePadding | undefined, rc: RenderContext) {
  if (!p) return undefined;
  return {
    top: p.top !== undefined ? evalNumOr(p.top, rc) : undefined,
    right: p.right !== undefined ? evalNumOr(p.right, rc) : undefined,
    bottom: p.bottom !== undefined ? evalNumOr(p.bottom, rc) : undefined,
    left: p.left !== undefined ? evalNumOr(p.left, rc) : undefined,
  };
}

/** frame-rect: 스크린 그대로 매핑 (월드=스크린). */
function createIdentityViewport(rect: FrameBox): Viewport2D {
  return {
    toScreen(wx, wy) {
      return { x: rect.x + wx, y: rect.y + wy };
    },
    toWorld(sx, sy) {
      return { x: sx - rect.x, y: sy - rect.y };
    },
  };
}

export function buildViewport(
  spec: ViewportSpec,
  rc: RenderContext,
  areaResolver?: (id: string) => FrameBox | undefined,
): Viewport2D {
  const rect = resolveRect(spec.rect, rc, areaResolver);

  if (spec.kind === 'time-value') {
    return createTimeValueViewport({
      rect,
      xMin: evalNum(spec.xMin, rc),
      xMax: evalNum(spec.xMax, rc),
      yMin: evalNum(spec.yMin, rc),
      yMax: evalNum(spec.yMax, rc),
      yUp: spec.yUp,
      padding: resolvePadding(spec.padding, rc),
    });
  }

  if (spec.kind === 'fit-box') {
    return createBBoxViewport({
      rect,
      bbox: {
        minX: evalNum(spec.bbox.minX, rc),
        maxX: evalNum(spec.bbox.maxX, rc),
        minY: evalNum(spec.bbox.minY, rc),
        maxY: evalNum(spec.bbox.maxY, rc),
      },
      yUp: spec.yUp,
      hAlign: spec.hAlign,
      vAlign: spec.vAlign,
      padding: resolvePadding(spec.padding, rc),
    });
  }

  if (spec.kind === 'frame-rect') {
    return createIdentityViewport(rect);
  }

  if (spec.kind === 'polar') {
    throw new Error('viewport-build: polar viewport is not supported in Phase 3. (Phase 7)');
  }

  const exhaustive: never = spec;
  throw new Error(`viewport-build: unknown kind ${(exhaustive as { kind?: string }).kind ?? '?'}`);
}
