/**
 * Phase 3 회귀 테스트: 2D 셰이프 프리미티브가 활성 viewport의 toScreen 투영을 실제로 적용하는지 검증.
 *
 * `currentViewportId`가 설정되어 있으면 (cx, cy)·(x, y)·line 끝점·polygon 각 점·text 앵커·image 모서리가
 * viewport를 거쳐 스크린 좌표로 변환되어 ctx에 전달되어야 한다. 설정되지 않으면 원 좌표 그대로.
 */
import { describe, it, expect } from 'vitest';
import { rootContext } from '../expr/context';
import {
  createRenderContext,
  type RenderContext,
} from './render-context';
import {
  drawRect,
  drawCircleEl,
  drawLineEl,
  drawPolygonEl,
  drawTextEl,
  drawImageEl,
} from './render-shapes';
import type { FrameInfo, Viewport2D } from '../../../graphics/types';

function makeFrame(): FrameInfo {
  return { dt: 0.016, now: 0, elapsed: 0, width: 400, height: 300, isDark: false };
}

/** (wx, wy) → (wx*10 + 100, wy*10 + 200)로 투영하는 결정적 viewport. 검증 용도. */
const offsetViewport: Viewport2D = {
  toScreen: (wx, wy) => ({ x: wx * 10 + 100, y: wy * 10 + 200 }),
  toWorld: (sx, sy) => ({ x: (sx - 100) / 10, y: (sy - 200) / 10 }),
};

function makeRc(withViewport: boolean): RenderContext {
  const viewports = new Map<string, Viewport2D>();
  if (withViewport) viewports.set('vp', offsetViewport);
  return createRenderContext({
    exprCtx: rootContext(),
    frame: makeFrame(),
    viewports,
    currentViewportId: withViewport ? 'vp' : undefined,
  });
}

interface MockBundle {
  ctx: CanvasRenderingContext2D;
  calls: Array<[string, unknown[]]>;
}

function makeCtx(): MockBundle {
  const calls: Array<[string, unknown[]]> = [];
  const bound = new Proxy(
    {},
    {
      get: (_t, prop: string) =>
        (...a: unknown[]) => {
          calls.push([prop, a]);
        },
      set: () => true,
    },
  );
  return { ctx: bound as CanvasRenderingContext2D, calls };
}

describe('render-shapes viewport projection', () => {
  it('drawRect: viewport 활성 시 (x,y)와 (x+w,y+h)가 toScreen으로 투영된다', () => {
    const { ctx, calls } = makeCtx();
    drawRect(
      ctx,
      { kind: 'rect', x: 1, y: 2, w: 3, h: 4, style: { fill: '"red"' } },
      makeRc(true),
    );
    const rectCall = calls.find(([m]) => m === 'rect');
    expect(rectCall).toBeDefined();
    // (1,2) → (110,220), (4,6) → (140,260) → {x:110, y:220, w:30, h:40}
    expect(rectCall![1]).toEqual([110, 220, 30, 40]);
  });

  it('drawRect: viewport 미설정 시 원본 좌표 그대로', () => {
    const { ctx, calls } = makeCtx();
    drawRect(
      ctx,
      { kind: 'rect', x: 1, y: 2, w: 3, h: 4, style: { fill: '"red"' } },
      makeRc(false),
    );
    const rectCall = calls.find(([m]) => m === 'rect');
    expect(rectCall![1]).toEqual([1, 2, 3, 4]);
  });

  it('drawCircleEl: cx/cy는 투영되고 r은 스크린 픽셀 그대로', () => {
    const { ctx, calls } = makeCtx();
    drawCircleEl(
      ctx,
      { kind: 'circle', cx: 5, cy: 7, r: 3, style: { stroke: '"black"' } },
      makeRc(true),
    );
    const arcCall = calls.find(([m]) => m === 'arc');
    // (5,7) → (150, 270), r=3 그대로
    expect(arcCall![1][0]).toBe(150);
    expect(arcCall![1][1]).toBe(270);
    expect(arcCall![1][2]).toBe(3);
  });

  it('drawLineEl: 두 끝점 모두 투영', () => {
    const { ctx, calls } = makeCtx();
    drawLineEl(
      ctx,
      { kind: 'line', x1: 0, y1: 0, x2: 1, y2: 1, style: { stroke: '"black"' } },
      makeRc(true),
    );
    const moveTo = calls.find(([m]) => m === 'moveTo');
    const lineTo = calls.find(([m]) => m === 'lineTo');
    expect(moveTo![1]).toEqual([100, 200]);
    expect(lineTo![1]).toEqual([110, 210]);
  });

  it('drawPolygonEl: points 배열의 각 점이 투영된다', () => {
    const { ctx, calls } = makeCtx();
    drawPolygonEl(
      ctx,
      { kind: 'polygon', points: '[[0,0],[1,0],[0,1]]', style: { fill: '"blue"' } },
      makeRc(true),
    );
    const moveTo = calls.find(([m]) => m === 'moveTo');
    const lineTos = calls.filter(([m]) => m === 'lineTo');
    expect(moveTo![1]).toEqual([100, 200]);
    expect(lineTos[0][1]).toEqual([110, 200]);
    expect(lineTos[1][1]).toEqual([100, 210]);
  });

  it('drawTextEl: 앵커 (x,y)가 투영된 좌표로 fillText에 전달', () => {
    const { ctx, calls } = makeCtx();
    drawTextEl(
      ctx,
      { kind: 'text', x: 2, y: 3, text: '"hi"', style: { fill: '"black"' } },
      makeRc(true),
    );
    const fillText = calls.find(([m]) => m === 'fillText');
    expect(fillText![1]).toEqual(['hi', 120, 230]);
  });

  it('drawImageEl: 로드된 이미지 사각형 네 파라미터가 투영된다', () => {
    const { ctx, calls } = makeCtx();
    const rc = makeRc(true);
    // 캐시에 "로드 완료" 상태의 가짜 이미지를 주입 (jsdom 없이 Image 전역 회피).
    const fakeImg = { complete: true, naturalWidth: 16 } as unknown as HTMLImageElement;
    rc.imageCache.set('x://img', fakeImg);
    drawImageEl(
      ctx,
      { kind: 'image', src: 'x://img', x: 1, y: 2, w: 3, h: 4 },
      rc,
    );
    const drawImage = calls.find(([m]) => m === 'drawImage');
    // (1,2) → (110,220), (4,6) → (140,260), w=30, h=40
    expect(drawImage![1]).toEqual([fakeImg, 110, 220, 30, 40]);
  });
});
