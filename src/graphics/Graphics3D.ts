/**
 * 3D Three.js 호스트.
 *
 * Scene·PerspectiveCamera·WebGLRenderer 기본 라이프사이클을 흡수한다.
 * Visualizer는 setup(g)에서 Mesh/Light를 한 번 구성하고,
 * onFrame(g, { dt, now })에서 매 프레임 업데이트(카메라 위치, 애니메이션 등)만 한다.
 * Host는 onFrame 반환 후 renderer.render(scene, camera)를 호출한다.
 *
 * Mesh/Geometry/Material 생성은 Visualizer의 책임이며,
 * dispose는 onDispose(g) 훅에서 직접 수행한다. 이후 Host가 renderer.dispose()와 DOM 제거를 맡는다.
 *
 * 카메라 제어(OrbitControls 류)는 Host에 포함하지 않는다 — Visualizer가 자체 구현.
 */

import * as THREE from 'three';
import type { FrameInfo, Theme } from './types';
import { background as themeBackground } from './theme';

export interface Graphics3DContext {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly THREE: typeof THREE;
}

export interface Graphics3DCameraOptions {
  fov?: number;
  near?: number;
  far?: number;
}

export interface Graphics3DRendererOptions {
  antialias?: boolean;
  alpha?: boolean;
  /** 기본 true — 스크린샷(canvas.toBlob) 등 외부 캡처 지원을 위해. */
  preserveDrawingBuffer?: boolean;
}

export interface Graphics3DOptions {
  width: number;
  height: number;
  theme: Theme;
  camera?: Graphics3DCameraOptions;
  renderer?: Graphics3DRendererOptions;
  /** 최초 1회 씬 구성. Mesh/Light 추가 지점. */
  setup: (g: Graphics3DContext) => void;
  /** 매 프레임 업데이트. Host가 이후 scene/camera를 렌더한다. */
  onFrame: (g: Graphics3DContext, frame: FrameInfo) => void;
  /** Visualizer가 생성한 Geometry/Material/Texture를 dispose할 기회. */
  onDispose?: (g: Graphics3DContext) => void;
}

export class Graphics3D {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly canvas: HTMLCanvasElement;
  theme: Theme;

  private readonly container: HTMLElement;
  private readonly onFrame: Graphics3DOptions['onFrame'];
  private readonly onDispose?: Graphics3DOptions['onDispose'];
  private width: number;
  private height: number;
  private animationId = 0;
  private lastTimestamp = 0;
  private startTimestamp = 0;
  private destroyed = false;

  get isDark(): boolean {
    return this.theme === 'dark';
  }

  constructor(container: HTMLElement, opts: Graphics3DOptions) {
    this.container = container;
    this.theme = opts.theme;
    this.width = opts.width;
    this.height = opts.height;
    this.onFrame = opts.onFrame;
    this.onDispose = opts.onDispose;

    const camOpts = opts.camera ?? {};
    const rendOpts = opts.renderer ?? {};

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      camOpts.fov ?? 50,
      this.computeAspect(),
      camOpts.near ?? 0.05,
      camOpts.far ?? 2000,
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: rendOpts.antialias ?? true,
      alpha: rendOpts.alpha ?? false,
      preserveDrawingBuffer: rendOpts.preserveDrawingBuffer ?? true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setClearColor(themeBackground(this.theme === 'dark'), 1);

    this.canvas = this.renderer.domElement;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvas.style.touchAction = 'none';
    container.appendChild(this.canvas);

    opts.setup(this.buildContext());

    this.startTimestamp = performance.now();
    this.lastTimestamp = this.startTimestamp;
    this.animationId = requestAnimationFrame(this.loop);
  }

  private computeAspect(): number {
    return this.width / Math.max(1, this.height);
  }

  private buildContext(): Graphics3DContext {
    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      THREE,
    };
  }

  private readonly loop = (now: number): void => {
    if (this.destroyed) return;
    const dt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    const g = this.buildContext();
    this.onFrame(g, {
      dt,
      now,
      elapsed: (now - this.startTimestamp) / 1000,
      width: this.width,
      height: this.height,
      isDark: this.theme === 'dark',
    });
    this.renderer.render(this.scene, this.camera);
    this.animationId = requestAnimationFrame(this.loop);
  };

  resize(width: number, height: number): void {
    if (this.destroyed) return;
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = this.computeAspect();
    this.camera.updateProjectionMatrix();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.animationId);
    if (this.onDispose) this.onDispose(this.buildContext());
    this.renderer.dispose();
    if (this.canvas.parentNode === this.container) {
      this.container.removeChild(this.canvas);
    }
  }
}
