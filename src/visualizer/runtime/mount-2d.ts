/**
 * 2D Visualizer 통합 마운트 (설계 §14.8 public-api의 MVP 선행 구현).
 *
 * spec + container → 완전히 가동되는 Visualizer 인스턴스. 카탈로그 참조는
 * 아직 해결하지 않고(`Phase 5에서 compile로 승격`), spec의 `scenes[].params`
 * 프리셋을 단독 baseline으로 사용한다.
 *
 * 프레임 파이프라인 (rAF 1 tick):
 *   1. runAnimationFrame(spec.animation) — state.<id> 갱신
 *   2. viewports 재구축 — xMin/xMax 등이 state.autoT에 의존하므로 매 프레임 필요
 *   3. renderRoot(root, rc) — 캔버스 렌더
 *   4. overlay.renderFrame(rc) — HTML overlay 텍스트 갱신
 *   5. store.consumePulses() — onParamChange 플래그 정리
 */

import type { VisualizerSpec } from './types/spec';
import type { RendererKind } from './types/spec';
import type { SceneSpec } from './types/scene';
import type { FrameInfo, Theme, Viewport2D } from '../../graphics/types';
import { Graphics2D } from '../../graphics/Graphics2D';
import { createStateStore, type StateStore } from './state';
import { createSceneController, type SceneController } from './scene';
import { createBaselineSnapshot } from './baseline';
import { runAnimationFrame } from './animation';
import { attachInteraction, type InteractionController } from './interaction';
import { attachOverlay, type OverlayController } from './overlay';
import { renderRoot } from './adapter2d/render';
import { buildViewport } from './adapter2d/viewport-build';
import { createRenderContext, type RenderContext } from './adapter2d/render-context';
import { rootContext } from './expr/context';
import { validateSpec } from './validator';

export interface Mount2DOptions {
  width: number;
  height: number;
  theme?: Theme;
  locale?: string;
  initialSceneId?: string;
  /** 카탈로그에서 추출된 parameter 기본값. scene preset과 머지된다 (scene 우선). */
  catalogDefaults?: Readonly<Record<string, number>>;
  /**
   * 재생 배속 승수. displayOptions에 `timeScale`이 포함된 경우에만 효과.
   * frame.dt에 곱해져 animation·viewport 등 시간 기반 계산에 적용.
   * 기본 1. 편집기 UI 슬라이더로 외부에서 갱신 가능 (setTimeScale).
   */
  timeScale?: number;
}

export interface Visualizer2DInstance {
  readonly canvas: HTMLCanvasElement;
  readonly store: StateStore;
  readonly scene: SceneController;
  setActiveScene(id: string): void;
  setParam(id: string, value: number): void;
  setTheme(theme: Theme): void;
  setTimeScale(scale: number): void;
  resize(width: number, height: number): void;
  destroy(): void;
}

export function mount2d(
  container: HTMLElement,
  rawSpec: unknown,
  opts: Mount2DOptions,
): Visualizer2DInstance {
  const spec = validateSpec(rawSpec);
  if (spec.renderer !== ('2d' satisfies RendererKind)) {
    throw new Error(`mount2d: renderer must be "2d", got "${spec.renderer}"`);
  }

  const locale = opts.locale ?? 'en';
  const theme: { current: Theme } = { current: opts.theme ?? 'light' };

  const initialSceneId = opts.initialSceneId ?? spec.scenes[0].id;
  const initialScene = findScene(spec.scenes, initialSceneId);
  const catalogDefaults = { ...(opts.catalogDefaults ?? {}) };
  const baseline = createBaselineSnapshot(initialScene.params ?? {}, catalogDefaults, {});
  const timeScaleEnabled = (spec.displayOptions ?? []).includes('timeScale');
  const timeScale = { current: opts.timeScale ?? 1 };

  const store = createStateStore({
    stateDecls: spec.state,
    initialParams: baseline.params,
  });

  const sceneCtrl = createSceneController(spec.scenes, store, initialSceneId);

  const overlayCtrl: OverlayController = attachOverlay(container, spec.overlay, locale);

  let currentRc: RenderContext | null = null;

  const graphics = new Graphics2D(container, {
    width: opts.width,
    height: opts.height,
    theme: theme.current,
    onFrame: (ctx, frame) => {
      const scaledDt = timeScaleEnabled ? frame.dt * timeScale.current : frame.dt;
      const frameInfo: FrameInfo = {
        ...frame,
        dt: scaledDt,
        isDark: theme.current === 'dark',
      };
      const rc = buildFrameContext(spec, store, sceneCtrl, frameInfo);
      currentRc = rc;

      try {
        runAnimationFrame(spec.animation, store, rc);
      } catch (err) {
        warnOnce('animation', err);
        return;
      }

      const rcAfter = buildFrameContext(spec, store, sceneCtrl, frameInfo);
      currentRc = rcAfter;

      try {
        renderRoot(ctx, spec.root, rcAfter);
      } catch (err) {
        warnOnce('render', err);
      }

      try {
        overlayCtrl.renderFrame(rcAfter);
      } catch (err) {
        warnOnce('overlay', err);
      }

      store.consumePulses();
    },
  });

  const interactionCtrl: InteractionController = attachInteraction(
    graphics.canvas,
    spec.interaction,
    store,
    () => {
      if (!currentRc) {
        throw new Error('mount2d: interaction fired before first frame');
      }
      return currentRc;
    },
  );

  return {
    canvas: graphics.canvas,
    store,
    scene: sceneCtrl,
    setActiveScene(id) {
      sceneCtrl.setActive(id);
    },
    setParam(id, value) {
      store.setParam(id, value);
    },
    setTheme(next) {
      theme.current = next;
      graphics.theme = next;
    },
    setTimeScale(scale) {
      if (!Number.isFinite(scale) || scale < 0) {
        throw new RangeError(`setTimeScale: scale must be a non-negative finite number, got ${scale}`);
      }
      timeScale.current = scale;
    },
    resize(w, h) {
      graphics.resize(w, h);
    },
    destroy() {
      interactionCtrl.detach();
      overlayCtrl.detach();
      graphics.destroy();
    },
  };
}

function findScene(scenes: readonly SceneSpec[], id: string): SceneSpec {
  const found = scenes.find((s) => s.id === id);
  if (!found) throw new Error(`mount2d: unknown scene id "${id}"`);
  return found;
}

function buildFrameContext(
  spec: VisualizerSpec,
  store: StateStore,
  sceneCtrl: SceneController,
  frame: FrameInfo,
): RenderContext {
  const snap = store.snapshot();
  const activeScene = sceneCtrl.getActiveScene();
  const locals: Record<string, unknown> = {
    ...snap.params,
    params: snap.params,
    state: snap.state,
    scene: activeScene,
    frame,
  };
  const exprCtx = rootContext(locals);
  const rc = createRenderContext({ exprCtx, frame });

  for (const [id, vp] of Object.entries(spec.viewports)) {
    rc.viewports.set(id, buildViewport(vp, rc));
  }
  return rc;
}

let lastWarnKey = '';
function warnOnce(tag: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  const key = `${tag}:${msg}`;
  if (key === lastWarnKey) return;
  lastWarnKey = key;
  // eslint-disable-next-line no-console
  console.warn(`[mount2d/${tag}] ${msg}`);
}
