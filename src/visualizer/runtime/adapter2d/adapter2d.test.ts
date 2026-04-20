import { describe, it, expect, vi } from 'vitest';
import { rootContext } from '../expr/context';
import {
  createRenderContext,
  extendRenderContext,
  evalExpr,
  evalNum,
  evalBool,
  evalStr,
  evalNumOr,
  evalBoolOr,
  currentViewport,
  type RenderContext,
} from './render-context';
import { buildViewport } from './viewport-build';
import { applyStyle, applyTransform, resolveFill } from './style-apply';
import { renderRoot } from './render';
import type { ElementNode } from '../types/element';
import type { FrameInfo } from '../../../graphics/types';

function makeFrame(over?: Partial<FrameInfo>): FrameInfo {
  return {
    dt: 0.016,
    now: 0,
    elapsed: 0,
    width: 400,
    height: 300,
    isDark: false,
    ...over,
  };
}

function makeRc(locals: Record<string, unknown> = {}): RenderContext {
  return createRenderContext({
    exprCtx: rootContext(locals),
    frame: makeFrame(),
  });
}

/** 경로 이벤트를 기록하는 Canvas2D mock (Proxy 기반). */
interface MockCtxBundle {
  ctx: CanvasRenderingContext2D;
  calls: Array<[string, unknown[]]>;
  state: { globalAlpha: number };
}

function makeCtx(): MockCtxBundle {
  const calls: Array<[string, unknown[]]> = [];
  const state: { globalAlpha: number } = { globalAlpha: 1 };
  const gradient: CanvasGradient = { addColorStop: () => {} };
  const target = new Proxy(
    {},
    {
      get: (_t, prop: string) => {
        if (prop === 'globalAlpha') return state.globalAlpha;
        if (prop === 'createLinearGradient')
          return (...a: unknown[]) => {
            calls.push(['createLinearGradient', a]);
            return gradient;
          };
        if (prop === 'createRadialGradient')
          return (...a: unknown[]) => {
            calls.push(['createRadialGradient', a]);
            return gradient;
          };
        return vi.fn((...a: unknown[]) => {
          calls.push([prop, a]);
        });
      },
      set: (_t, prop: string, value: unknown) => {
        if (prop === 'globalAlpha' && typeof value === 'number') state.globalAlpha = value;
        calls.push([`set:${prop}`, [value]]);
        return true;
      },
    },
  );
  return { ctx: target as CanvasRenderingContext2D, calls, state };
}

describe('render-context 평가 헬퍼', () => {
  it('createRenderContext 기본 필드', () => {
    const rc = makeRc();
    expect(rc.viewports.size).toBe(0);
    expect(rc.imageCache.size).toBe(0);
    expect(rc.astCache.size).toBe(0);
  });
  it('evalNum', () => expect(evalNum('2 + 3', makeRc())).toBe(5));
  it('evalBool', () => expect(evalBool('1 > 0', makeRc())).toBe(true));
  it('evalStr', () => expect(evalStr('"hi"', makeRc())).toBe('hi'));
  it('evalExpr unknown 반환', () => expect(evalExpr('[1,2,3]', makeRc())).toEqual([1, 2, 3]));
  it('evalNumOr 리터럴', () => expect(evalNumOr(7, makeRc())).toBe(7));
  it('evalNumOr 문자열', () => expect(evalNumOr('1+1', makeRc())).toBe(2));
  it('evalBoolOr', () => {
    expect(evalBoolOr(true, makeRc())).toBe(true);
    expect(evalBoolOr('false', makeRc())).toBe(false);
  });
  it('evalNum 타입 불일치 throw', () => {
    expect(() => evalNum('"x"', makeRc())).toThrow(TypeError);
  });
  it('extendRenderContext 스코프', () => {
    const rc = makeRc({ a: 1 });
    const ex = extendRenderContext(rc, { a: 10, b: 20 });
    expect(evalNum('a + b', ex)).toBe(30);
    expect(evalNum('a', rc)).toBe(1);
  });
  it('astCache 재사용', () => {
    const rc = makeRc();
    evalNum('1+1', rc);
    evalNum('1+1', rc);
    expect(rc.astCache.size).toBe(1);
  });
  it('currentViewport 미설정', () => {
    expect(currentViewport(makeRc())).toBeUndefined();
  });
});

describe('viewport-build', () => {
  it('time-value — xMin/xMax 범위 매핑', () => {
    const rc = makeRc();
    const vp = buildViewport(
      {
        kind: 'time-value',
        xMin: '0',
        xMax: '10',
        yMin: '0',
        yMax: '1',
        rect: { x: '0', y: '0', w: '400', h: '300' },
      },
      rc,
    );
    expect(vp.toScreen(0, 0).x).toBeCloseTo(0);
    expect(vp.toScreen(10, 0).x).toBeCloseTo(400);
  });
  it('fit-box — bbox + center align', () => {
    const rc = makeRc();
    const vp = buildViewport(
      {
        kind: 'fit-box',
        bbox: { minX: '0', maxX: '10', minY: '0', maxY: '10' },
        rect: { x: '0', y: '0', w: '400', h: '400' },
      },
      rc,
    );
    const mid = vp.toScreen(5, 5);
    expect(mid.x).toBeCloseTo(200);
    expect(mid.y).toBeCloseTo(200);
  });
  it('frame-rect — identity', () => {
    const rc = makeRc();
    const vp = buildViewport({ kind: 'frame-rect', rect: { x: '10', y: '20', w: '100', h: '100' } }, rc);
    expect(vp.toScreen(5, 5)).toEqual({ x: 15, y: 25 });
  });
  it('polar — Phase 3 미지원', () => {
    const rc = makeRc();
    expect(() =>
      buildViewport({ kind: 'polar', rMax: '10' }, rc),
    ).toThrow(/polar/);
  });
  it('rect ref — resolver 사용', () => {
    const rc = makeRc();
    const vp = buildViewport(
      { kind: 'frame-rect', rect: { ref: 'main' } },
      rc,
      () => ({ x: 50, y: 50, w: 100, h: 100 }),
    );
    expect(vp.toScreen(0, 0)).toEqual({ x: 50, y: 50 });
  });
  it('rect ref — 미해소 throw', () => {
    const rc = makeRc();
    expect(() => buildViewport({ kind: 'frame-rect', rect: { ref: 'nope' } }, rc)).toThrow();
  });
});

describe('style-apply', () => {
  it('applyTransform translate', () => {
    const { ctx, calls } = makeCtx();
    applyTransform(ctx, { translate: [10, 20] }, makeRc());
    expect(calls.find((c) => c[0] === 'translate')?.[1]).toEqual([10, 20]);
  });
  it('applyTransform rotate', () => {
    const { ctx, calls } = makeCtx();
    applyTransform(ctx, { rotate: 'pi/4' }, makeRc());
    expect(calls.find((c) => c[0] === 'rotate')).toBeTruthy();
  });
  it('applyTransform scale number', () => {
    const { ctx, calls } = makeCtx();
    applyTransform(ctx, { scale: 2 }, makeRc());
    expect(calls.find((c) => c[0] === 'scale')?.[1]).toEqual([2, 2]);
  });
  it('applyTransform scale tuple', () => {
    const { ctx, calls } = makeCtx();
    applyTransform(ctx, { scale: [2, 3] }, makeRc());
    expect(calls.find((c) => c[0] === 'scale')?.[1]).toEqual([2, 3]);
  });
  it('applyStyle fillStyle', () => {
    const { ctx, calls } = makeCtx();
    applyStyle(ctx, { fill: '"#f00"' }, makeRc());
    expect(calls.find((c) => c[0] === 'set:fillStyle')?.[1]).toEqual(['#f00']);
  });
  it('applyStyle strokeStyle + lineWidth', () => {
    const { ctx, calls } = makeCtx();
    applyStyle(ctx, { stroke: '"#0f0"', lineWidth: 3 }, makeRc());
    expect(calls.find((c) => c[0] === 'set:strokeStyle')?.[1]).toEqual(['#0f0']);
    expect(calls.find((c) => c[0] === 'set:lineWidth')?.[1]).toEqual([3]);
  });
  it('applyStyle opacity', () => {
    const { ctx, calls } = makeCtx();
    applyStyle(ctx, { opacity: 0.5 }, makeRc());
    expect(calls.find((c) => c[0] === 'set:globalAlpha')?.[1]).toEqual([0.5]);
  });
  it('resolveFill 단색', () => {
    const { ctx } = makeCtx();
    expect(resolveFill(ctx, '"#abc"', makeRc())).toBe('#abc');
  });
  it('resolveFill linear gradient', () => {
    const { ctx, calls } = makeCtx();
    const g = resolveFill(
      ctx,
      { kind: 'linear', x0: '0', y0: '0', x1: '10', y1: '0', stops: [[0, '"#000"'], [1, '"#fff"']] },
      makeRc(),
    );
    expect(g).toBeDefined();
    expect(calls.find((c) => c[0] === 'createLinearGradient')?.[1]).toEqual([0, 0, 10, 0]);
  });
});

describe('renderRoot — shapes', () => {
  it('rect — ctx.rect + fill', () => {
    const { ctx, calls } = makeCtx();
    renderRoot(
      ctx,
      { kind: 'rect', x: '0', y: '0', w: '10', h: '10', style: { fill: '"#abc"' } },
      makeRc(),
    );
    expect(calls.find((c) => c[0] === 'rect')?.[1]).toEqual([0, 0, 10, 10]);
    expect(calls.find((c) => c[0] === 'fill')).toBeTruthy();
  });
  it('circle — arc 호출', () => {
    const { ctx, calls } = makeCtx();
    renderRoot(ctx, { kind: 'circle', cx: '5', cy: '5', r: 3, style: { stroke: '"#f00"' } }, makeRc());
    const arc = calls.find((c) => c[0] === 'arc');
    expect(arc?.[1]).toEqual([5, 5, 3, 0, Math.PI * 2]);
  });
  it('line — moveTo + lineTo', () => {
    const { ctx, calls } = makeCtx();
    renderRoot(ctx, { kind: 'line', x1: '0', y1: '0', x2: '10', y2: '10', style: { stroke: '"#000"' } }, makeRc());
    expect(calls.some((c) => c[0] === 'moveTo')).toBe(true);
    expect(calls.some((c) => c[0] === 'lineTo')).toBe(true);
  });
  it('text — fillText', () => {
    const { ctx, calls } = makeCtx();
    renderRoot(ctx, { kind: 'text', x: '5', y: '5', text: '"hi"' }, makeRc());
    expect(calls.find((c) => c[0] === 'fillText')?.[1]).toEqual(['hi', 5, 5]);
  });
  it('polyline — 3점', () => {
    const { ctx, calls } = makeCtx();
    renderRoot(
      ctx,
      { kind: 'polyline', points: '[[0,0],[1,1],[2,0]]', style: { stroke: '"#000"' } },
      makeRc(),
    );
    expect(calls.filter((c) => c[0] === 'lineTo').length).toBe(2);
  });
  it('polygon close', () => {
    const { ctx, calls } = makeCtx();
    renderRoot(
      ctx,
      { kind: 'polygon', points: '[[0,0],[10,0],[5,8]]', style: { fill: '"#f00"' } },
      makeRc(),
    );
    expect(calls.filter((c) => c[0] === 'closePath').length).toBeGreaterThanOrEqual(1);
  });
});

describe('renderRoot — containers', () => {
  it('group — 자식 N개 모두 호출', () => {
    const { ctx, calls } = makeCtx();
    const node: ElementNode = {
      kind: 'group',
      children: [
        { kind: 'rect', x: '0', y: '0', w: '1', h: '1' },
        { kind: 'rect', x: '2', y: '2', w: '1', h: '1' },
      ],
    };
    renderRoot(ctx, node, makeRc());
    expect(calls.filter((c) => c[0] === 'rect').length).toBe(2);
  });
  it('if — cond true → then', () => {
    const { ctx, calls } = makeCtx();
    renderRoot(
      ctx,
      {
        kind: 'if',
        cond: 'true',
        then: { kind: 'rect', x: '0', y: '0', w: '1', h: '1' },
        else: { kind: 'circle', cx: '0', cy: '0', r: 1 },
      },
      makeRc(),
    );
    expect(calls.find((c) => c[0] === 'rect')).toBeTruthy();
    expect(calls.find((c) => c[0] === 'arc')).toBeUndefined();
  });
  it('if — cond false → else', () => {
    const { ctx, calls } = makeCtx();
    renderRoot(
      ctx,
      {
        kind: 'if',
        cond: 'false',
        then: { kind: 'rect', x: '0', y: '0', w: '1', h: '1' },
        else: { kind: 'circle', cx: '0', cy: '0', r: 1 },
      },
      makeRc(),
    );
    expect(calls.find((c) => c[0] === 'arc')).toBeTruthy();
  });
  it('repeat range', () => {
    const { ctx, calls } = makeCtx();
    renderRoot(
      ctx,
      {
        kind: 'repeat',
        of: { range: [0, 3] },
        as: 'i',
        children: [{ kind: 'rect', x: 'i', y: '0', w: '1', h: '1' }],
      },
      makeRc(),
    );
    expect(calls.filter((c) => c[0] === 'rect').length).toBe(3);
  });
  it('repeat items', () => {
    const { ctx, calls } = makeCtx();
    renderRoot(
      ctx,
      {
        kind: 'repeat',
        of: { items: '[10, 20]' },
        as: 'v',
        children: [{ kind: 'rect', x: 'v', y: '0', w: '1', h: '1' }],
      },
      makeRc(),
    );
    expect(calls.filter((c) => c[0] === 'rect').length).toBe(2);
  });
  it('repeat step', () => {
    const { ctx, calls } = makeCtx();
    renderRoot(
      ctx,
      {
        kind: 'repeat',
        of: { range: [0, 10], step: 2 },
        as: 'i',
        children: [{ kind: 'rect', x: 'i', y: '0', w: '1', h: '1' }],
      },
      makeRc(),
    );
    expect(calls.filter((c) => c[0] === 'rect').length).toBe(5);
  });
  it('match hit', () => {
    const { ctx, calls } = makeCtx();
    renderRoot(
      ctx,
      {
        kind: 'match',
        on: '"a"',
        cases: {
          a: { kind: 'rect', x: '0', y: '0', w: '1', h: '1' },
          b: { kind: 'circle', cx: '0', cy: '0', r: 1 },
        },
      },
      makeRc(),
    );
    expect(calls.find((c) => c[0] === 'rect')).toBeTruthy();
    expect(calls.find((c) => c[0] === 'arc')).toBeUndefined();
  });
  it('match default', () => {
    const { ctx, calls } = makeCtx();
    renderRoot(
      ctx,
      {
        kind: 'match',
        on: '"z"',
        cases: { a: { kind: 'rect', x: '0', y: '0', w: '1', h: '1' } },
        default: { kind: 'circle', cx: '0', cy: '0', r: 1 },
      },
      makeRc(),
    );
    expect(calls.find((c) => c[0] === 'arc')).toBeTruthy();
  });
});

describe('renderRoot — 공통 전처리', () => {
  it('visible false → skip', () => {
    const { ctx, calls } = makeCtx();
    renderRoot(ctx, { kind: 'rect', x: '0', y: '0', w: '1', h: '1', visible: 'false' }, makeRc());
    expect(calls.find((c) => c[0] === 'rect')).toBeUndefined();
  });
  it('let 바인딩', () => {
    const { ctx, calls } = makeCtx();
    renderRoot(
      ctx,
      {
        kind: 'rect',
        let: { w: '5 + 5' },
        x: '0',
        y: '0',
        w: 'w',
        h: '10',
      },
      makeRc(),
    );
    expect(calls.find((c) => c[0] === 'rect')?.[1]).toEqual([0, 0, 10, 10]);
  });
  it('save/restore 쌍', () => {
    const { ctx, calls } = makeCtx();
    renderRoot(ctx, { kind: 'rect', x: '0', y: '0', w: '1', h: '1' }, makeRc());
    expect(calls.filter((c) => c[0] === 'save').length).toBe(1);
    expect(calls.filter((c) => c[0] === 'restore').length).toBe(1);
  });
  it('3D kind → skip (no throw)', () => {
    const { ctx, calls } = makeCtx();
    renderRoot(
      ctx,
      { kind: 'sphere', cx: '0', cy: '0', cz: '0', r: 1 } as ElementNode,
      makeRc(),
    );
    // save/restore만 호출되고 rect 등은 없음.
    expect(calls.find((c) => c[0] === 'rect')).toBeUndefined();
  });
});
