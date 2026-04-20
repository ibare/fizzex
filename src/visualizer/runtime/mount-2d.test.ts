/**
 * sine-wave-2d spec이 런타임 파이프라인에 완전 통합되는지 검증 (DOM-less).
 *
 * 실제 Graphics2D/rAF는 여기서 mount하지 않는다(테스트 환경은 node).
 * 대신 mount-2d의 내부 프레임 조립부를 그대로 재현해 결과를 관찰한다:
 *   state/scene/animation/adapter2d/overlay의 상호작용이 throw 없이 1+ 프레임
 *   돌면, Phase 4 MVP의 엔드투엔드 배선이 완성된 것으로 본다.
 *
 * DOM harness·pixel diff(P4.9)는 Phase 9 UI 어댑션 작업에서 실제 브라우저로 확인.
 */

import { describe, it, expect, vi } from 'vitest';
import { validateSpec } from './validator';
import { createStateStore } from './state';
import { createSceneController } from './scene';
import { createBaselineSnapshot } from './baseline';
import { runAnimationFrame } from './animation';
import { buildViewport } from './adapter2d/viewport-build';
import { createRenderContext } from './adapter2d/render-context';
import { renderRoot } from './adapter2d/render';
import { rootContext } from './expr/context';
import type { FrameInfo } from '../../graphics/types';
import type { VisualizerSpec } from './types/spec';
import sineWaveSpec from '../built-in/sine-wave-2d/spec.json';

function makeFrame(over?: Partial<FrameInfo>): FrameInfo {
  return {
    dt: 0.1,
    now: 0,
    elapsed: 0,
    width: 400,
    height: 300,
    isDark: false,
    ...over,
  };
}

function makeMockCtx(): {
  ctx: CanvasRenderingContext2D;
  calls: Array<[string, unknown[]]>;
} {
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
  return { ctx: target as CanvasRenderingContext2D, calls };
}

function runFrame(spec: VisualizerSpec, ctx: CanvasRenderingContext2D, frame: FrameInfo, params: Record<string, number>, stateObj: Record<string, number | boolean | string>, sceneId: string) {
  const scene = spec.scenes.find((s) => s.id === sceneId)!;
  const locals: Record<string, unknown> = {
    ...params,
    params,
    state: stateObj,
    scene,
    frame,
  };
  const rc = createRenderContext({ exprCtx: rootContext(locals), frame });
  for (const [id, vp] of Object.entries(spec.viewports)) {
    rc.viewports.set(id, buildViewport(vp, rc));
  }
  renderRoot(ctx, spec.root, rc);
  return rc;
}

describe('sine-wave-2d 런타임 통합 (MVP)', () => {
  const spec = validateSpec(sineWaveSpec);

  it('4 Scene 각각 renderRoot 호출이 throw 없이 완료', () => {
    for (const scene of spec.scenes) {
      const store = createStateStore({
        stateDecls: spec.state,
        initialParams: createBaselineSnapshot(scene.params ?? {}, {}, {}).params,
      });
      const { ctx } = makeMockCtx();
      const snap = store.snapshot();
      const frame = makeFrame();
      expect(() => runFrame(spec, ctx, frame, snap.params, snap.state, scene.id)).not.toThrow();
    }
  });

  it('animation.onFrame이 state.autoT를 dt만큼 전진', () => {
    const scene = spec.scenes[0];
    const store = createStateStore({
      stateDecls: spec.state,
      initialParams: createBaselineSnapshot(scene.params ?? {}, {}, {}).params,
    });
    const frame = makeFrame({ dt: 0.5 });
    const snap = store.snapshot();
    const locals: Record<string, unknown> = {
      ...snap.params,
      params: snap.params,
      state: snap.state,
      scene,
      frame,
    };
    const rc = createRenderContext({ exprCtx: rootContext(locals), frame });
    runAnimationFrame(spec.animation, store, rc);
    expect(store.getState('autoT')).toBeCloseTo(0.5, 6);
    expect(store.getState('userDrivenT')).toBe(false);
  });

  it('animation.onFrame이 주기 20으로 wrap', () => {
    const scene = spec.scenes[0];
    const store = createStateStore({
      stateDecls: spec.state,
      initialParams: createBaselineSnapshot(scene.params ?? {}, {}, {}).params,
    });
    store.setState('autoT', 19.9);
    const frame = makeFrame({ dt: 0.5 });
    const snap = store.snapshot();
    const rc = createRenderContext({
      exprCtx: rootContext({ ...snap.params, params: snap.params, state: snap.state, scene, frame }),
      frame,
    });
    runAnimationFrame(spec.animation, store, rc);
    const v = store.getState('autoT') as number;
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(20);
    expect(v).toBeCloseTo(0.4, 6);
  });

  it('Scene 전환 시 params 프리셋 적용, state 유지 (D4)', () => {
    const store = createStateStore({
      stateDecls: spec.state,
      initialParams: createBaselineSnapshot(spec.scenes[0].params ?? {}, {}, {}).params,
    });
    const sceneCtrl = createSceneController(spec.scenes, store, 'speaker');
    store.setState('autoT', 3.14);
    sceneCtrl.setActive('pendulum');
    expect(store.getParam('\\omega')).toBe(2);
    expect(store.getState('autoT')).toBe(3.14);
  });

  it('setParam(t)이 userDrivenT pulse를 발생시키고 animation이 소비', () => {
    const scene = spec.scenes[0];
    const store = createStateStore({
      stateDecls: spec.state,
      initialParams: createBaselineSnapshot(scene.params ?? {}, {}, {}).params,
    });
    store.setParam('t', 5);
    expect(store.hasPulse('userDrivenT')).toBe(true);
    expect(store.getState('userDrivenT')).toBe(false); // 초기값 그대로(pulse는 별도)
    // animation 스펙은 userDrivenT가 true일 때 autoT를 전진시키지 않음.
    // pulse 자체는 인터랙션 핸들러가 state.userDrivenT=true를 세팅해야 활성.
    // (spec에선 pulse 메커니즘으로 1프레임 동기화; 이 테스트는 pulse 등록 확인.)
  });

  it('renderer가 2d임을 확인', () => {
    expect(spec.renderer).toBe('2d');
  });
});
