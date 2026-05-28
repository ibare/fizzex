/**
 * 3D Three.js 호스트.
 *
 * Scene·PerspectiveCamera·WebGLRenderer·OrbitControls 라이프사이클을 흡수한다.
 * Visualizer는 setup(g)에서 Mesh/Light를 한 번 구성하고 초기 카메라 pose를
 * g.camera.position + g.controls.target으로 지정한다. 이후 줌·회전·팬은 호스트가
 * OrbitControls로 관장한다. onFrame은 매 프레임 씬 갱신만 수행하며, Host는
 * onFrame 반환 후 controls.update() → renderer.render(scene, camera)를 호출한다.
 *
 * Mesh/Geometry/Material 생성은 Visualizer의 책임이며, dispose는 onDispose(g)
 * 훅에서 직접 수행한다. 이후 Host가 controls.dispose()·renderer.dispose()·DOM
 * 제거를 맡는다.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { FrameInfo, Theme } from './types.js';
import { background as themeBackground } from './theme.js';

export interface Graphics3DContext {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly renderer: THREE.WebGLRenderer;
  readonly THREE: typeof THREE;
}

export interface Graphics3DCameraOptions {
  fov?: number;
  near?: number;
  far?: number;
}

export interface Graphics3DControlsOptions {
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  minDistance?: number;
  maxDistance?: number;
  enableZoom?: boolean;
  enableRotate?: boolean;
  enablePan?: boolean;
  dampingFactor?: number;
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
  controls?: Graphics3DControlsOptions;
  renderer?: Graphics3DRendererOptions;
  /** 최초 1회 씬 구성. Mesh/Light 추가 + 초기 camera pose 지정 지점. */
  setup: (g: Graphics3DContext) => void;
  /** 매 프레임 업데이트. Host가 이후 controls.update + scene 렌더를 수행한다. */
  onFrame: (g: Graphics3DContext, frame: FrameInfo) => void;
  /** Visualizer가 생성한 Geometry/Material/Texture를 dispose할 기회. */
  onDispose?: (g: Graphics3DContext) => void;
}

export class Graphics3D {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
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

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    applyControlsOptions(this.controls, opts.controls);

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
      controls: this.controls,
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
    this.controls.update();
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
    this.controls.dispose();
    this.renderer.dispose();
    if (this.canvas.parentNode === this.container) {
      this.container.removeChild(this.canvas);
    }
  }
}

function applyControlsOptions(
  controls: OrbitControls,
  opts: Graphics3DControlsOptions | undefined,
): void {
  if (!opts) return;
  if (opts.autoRotate !== undefined) controls.autoRotate = opts.autoRotate;
  if (opts.autoRotateSpeed !== undefined) controls.autoRotateSpeed = opts.autoRotateSpeed;
  if (opts.minDistance !== undefined) controls.minDistance = opts.minDistance;
  if (opts.maxDistance !== undefined) controls.maxDistance = opts.maxDistance;
  if (opts.enableZoom !== undefined) controls.enableZoom = opts.enableZoom;
  if (opts.enableRotate !== undefined) controls.enableRotate = opts.enableRotate;
  if (opts.enablePan !== undefined) controls.enablePan = opts.enablePan;
  if (opts.dampingFactor !== undefined) controls.dampingFactor = opts.dampingFactor;
}
