/**
 * 3D Visualizer 통합 마운트 (설계 §14.6·§14.8).
 *
 * mount-2d의 3D 대응. Graphics3D 호스트에 setup/onFrame/onDispose를 꽂아
 * Element AST를 매 프레임 재구축한다 (D2 보수적 diff, full rebuild MVP).
 *
 * 프레임 파이프라인 (rAF 1 tick):
 *   1. runAnimationFrame(spec.animation)
 *   2. buildFrameContext (state/scene/frame 네임스페이스)
 *   3. syncCamera — 구면좌표 → position + lookAt
 *   4. disposeChildren(scene) → renderRoot3d(scene, root)
 *   5. overlay.renderFrame
 *   6. store.consumePulses()
 */

import * as THREE from 'three';
import type { SceneSpec } from './types/scene';
import type { FrameInfo, Theme } from '../../graphics/types';
import { Graphics3D } from '../../graphics/Graphics3D';
import { createStateStore, type StateStore } from './state';
import { createSceneController, type SceneController } from './scene';
import { createBaselineSnapshot } from './baseline';
import { runAnimationFrame } from './animation';
import { attachInteraction, type InteractionController } from './interaction';
import { attachOverlay, type OverlayController } from './overlay';
import {
  createRenderContext3D,
  disposeChildren,
  renderRoot3d,
  syncCamera,
  type RenderContext3D,
} from './adapter3d';
import { rootContext } from './expr/context';
import { validateSpec } from './validator';

export interface Mount3DOptions {
  width: number;
  height: number;
  theme?: Theme;
  locale?: string;
  initialSceneId?: string;
  catalogDefaults?: Readonly<Record<string, number>>;
  timeScale?: number;
}

export interface Visualizer3DInstance {
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

export function mount3d(
  container: HTMLElement,
  rawSpec: unknown,
  opts: Mount3DOptions,
): Visualizer3DInstance {
  const spec = validateSpec(rawSpec);
  if (spec.renderer !== '3d') {
    throw new Error(`mount3d: renderer must be "3d", got "${spec.renderer}"`);
  }
  if (!spec.camera) {
    throw new Error('mount3d: spec.camera is required for 3D');
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

  let currentRc: RenderContext3D | null = null;

  const graphics = new Graphics3D(container, {
    width: opts.width,
    height: opts.height,
    theme: theme.current,
    camera: {
      fov: spec.camera.fov,
      near: spec.camera.near,
      far: spec.camera.far,
    },
    setup: () => {
      // 비워둠 — 모든 객체는 onFrame의 renderRoot3d에서 재생성.
    },
    onFrame: (g, frame) => {
      const scaledDt = timeScaleEnabled ? frame.dt * timeScale.current : frame.dt;
      const frameInfo: FrameInfo = {
        ...frame,
        dt: scaledDt,
        isDark: theme.current === 'dark',
      };

      const rc = buildFrameContext(store, sceneCtrl, frameInfo);

      try {
        runAnimationFrame(spec.animation, store, rc);
      } catch (err) {
        warnOnce('animation', err);
        return;
      }

      const rcAfter = buildFrameContext(store, sceneCtrl, frameInfo);
      currentRc = rcAfter;

      try {
        if (!spec.camera) throw new Error('spec.camera missing after validation');
        syncCamera(g.camera, spec.camera, store, rcAfter);
      } catch (err) {
        warnOnce('camera', err);
      }

      try {
        disposeChildren(g.scene);
        renderRoot3d(g.scene, spec.root, rcAfter);
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
    onDispose: (g) => {
      disposeChildren(g.scene);
    },
  });

  const interactionCtrl: InteractionController = attachInteraction(
    graphics.canvas,
    spec.interaction,
    store,
    () => {
      if (!currentRc) {
        throw new Error('mount3d: interaction fired before first frame');
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
  if (!found) throw new Error(`mount3d: unknown scene id "${id}"`);
  return found;
}

function buildFrameContext(
  store: StateStore,
  sceneCtrl: SceneController,
  frame: FrameInfo,
): RenderContext3D {
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
  return createRenderContext3D({ THREE, exprCtx, frame });
}

let lastWarnKey = '';
function warnOnce(tag: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  const key = `${tag}:${msg}`;
  if (key === lastWarnKey) return;
  lastWarnKey = key;
  // eslint-disable-next-line no-console
  console.warn(`[mount3d/${tag}] ${msg}`);
}
