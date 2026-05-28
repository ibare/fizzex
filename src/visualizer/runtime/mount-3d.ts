/**
 * 3D Visualizer 통합 마운트 (설계 §14.6·§14.8).
 *
 * mount-2d의 3D 대응. Graphics3D 호스트에 setup/onFrame/onDispose를 꽂아
 * Element AST를 매 프레임 재구축한다 (D2 보수적 diff, full rebuild MVP).
 *
 * 카메라 pose는 setup에서 1회 평가(evaluateInitialCameraPose)해 camera.position +
 * controls.target으로 세팅. 이후 줌·회전·팬은 Graphics3D의 OrbitControls가 관장하며
 * 매 프레임 덮어쓰지 않는다.
 *
 * 프레임 파이프라인 (rAF 1 tick):
 *   1. runAnimationFrame(spec.animation)
 *   2. buildFrameContext (state/scene/frame 네임스페이스)
 *   3. disposeChildren(scene) → renderRoot3d(scene, root)
 *   4. overlay.renderFrame
 *   5. store.consumePulses()
 */

import * as THREE from 'three';
import type { SceneSpec } from './types/scene.js';
import type { FrameInfo, Theme } from '../../graphics/types.js';
import { Graphics3D } from '../../graphics/Graphics3D.js';
import { createStateStore, type StateStore } from './state.js';
import { createSceneController, type SceneController } from './scene.js';
import { createBaselineSnapshot } from './baseline.js';
import { runAnimationFrame } from './animation.js';
import { attachInteraction, type InteractionController } from './interaction.js';
import { attachOverlay, type OverlayController } from './overlay.js';
import {
  createRenderContext3D,
  disposeChildren,
  evaluateInitialCameraPose,
  renderRoot3d,
  type RenderContext3D,
} from './adapter3d/index.js';
import { rootContext } from './expr/context.js';
import { validateSpec } from './validator/index.js';
import {
  applyUserBindings,
  type ApplyUserBindingsResult,
  type UserBindingInputs,
} from './user-binding-bridge.js';

export interface Mount3DOptions {
  width: number;
  height: number;
  theme?: Theme;
  locale?: string;
  initialSceneId?: string;
  catalogDefaults?: Readonly<Record<string, number>>;
  /** 사용자 LaTeX 식 입력 — AST 또는 즉시 number. mount 직후 자동 주입 (V3). */
  userBindings?: UserBindingInputs;
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
  /** 사용자 LaTeX 식(AST 또는 number)을 spec.userBindings 슬롯으로 흘려보낸다 (V3). */
  applyUserBindings(inputs: UserBindingInputs): ApplyUserBindingsResult;
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

  if (opts.userBindings) {
    applyUserBindings(spec, opts.userBindings, store);
  }

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
    controls: spec.camera.controls,
    setup: (g) => {
      if (!spec.camera) throw new Error('spec.camera missing after validation');
      const seedFrame: FrameInfo = {
        dt: 0,
        now: performance.now(),
        elapsed: 0,
        width: opts.width,
        height: opts.height,
        isDark: theme.current === 'dark',
      };
      const seedRc = buildFrameContext(store, sceneCtrl, seedFrame);
      const pose = evaluateInitialCameraPose(spec.camera, seedRc);
      g.camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
      g.controls.target.set(pose.target[0], pose.target[1], pose.target[2]);
      g.controls.update();
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
    applyUserBindings(inputs) {
      return applyUserBindings(spec, inputs, store);
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
    // bindings 가 params 위에 덮어쓴다 (V3): user 명시 LaTeX 바인딩 우선.
    ...snap.bindings,
    params: snap.params,
    state: snap.state,
    bindings: snap.bindings,
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
