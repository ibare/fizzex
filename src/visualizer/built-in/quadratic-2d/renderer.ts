/**
 * quadratic-2d Canvas 렌더러
 *
 * 상단 42% 추상 (좌표평면 + 포물선 + 꼭짓점/근/축)
 * 하단 58% 프리셋별 현실 장면 (자유탐구/다리/농구/분수)
 *
 * 공 이동 등 장면용 애니메이션을 위한 내부 animT를 구동한다.
 */

import type { Preset, VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { drawAbstract } from './abstract';
import { drawSandbox } from './scenes/sandbox';
import { drawBridge } from './scenes/bridge';
import { drawBasketball } from './scenes/basketball';
import { drawFountain } from './scenes/fountain';
import { quadRoots, quadVertex } from './utils';

const TOP_RATIO = 0.42;
const FADE_DURATION = 300;

const SCENE_DRAWERS = {
  sandbox: drawSandbox,
  bridge: drawBridge,
  basketball: drawBasketball,
  fountain: drawFountain,
} as const;

type SceneId = keyof typeof SCENE_DRAWERS;

const PRESET_COLORS: Record<SceneId, string> = {
  sandbox: '#6366F1',
  bridge: '#0EA5E9',
  basketball: '#EA580C',
  fountain: '#0891B2',
};

function isSceneId(id: string): id is SceneId {
  return id in SCENE_DRAWERS;
}

function approxEq(a: number, b: number, eps = 0.02): boolean {
  return Math.abs(a - b) < eps;
}

function findActivePreset(presets: Preset[], params: Record<string, number>): Preset | null {
  for (const p of presets) {
    const keys = Object.keys(p.values);
    if (keys.every((k) => approxEq(params[k] ?? NaN, p.values[k]))) return p;
  }
  return null;
}

export class QuadraticRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private theme: 'light' | 'dark';
  private presets: Preset[];

  private width = 0;
  private height = 0;
  private dpr = 1;

  private a = 1;
  private b = 0;
  private c = 0;
  private xCur = 0;

  /** 현재 활성 프리셋 기준 계수 (프리셋 vs 편집값 비교용) */
  private a_std = 1;
  private b_std = 0;
  private c_std = 0;
  /** 편집된 상태(프리셋과 값이 다름) */
  private isEdited = false;

  private currentScene: SceneId = 'sandbox';
  private prevScene: SceneId | null = null;
  private transitionStart = 0;

  /** 장식 애니메이션용 */
  private animT = 0;
  private lastFrameTime = 0;

  private destroyed = false;
  private animationId = 0;

  constructor(container: HTMLElement, options: VisualizerMountOptions, presets: Preset[]) {
    this.container = container;
    this.theme = options.theme;
    this.presets = presets;

    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    container.appendChild(this.canvas);

    const c2d = this.canvas.getContext('2d');
    if (!c2d) throw new Error('QuadraticRenderer: 2d context 획득 실패');
    this.ctx = c2d;

    this.resize(options.width, options.height);
    this.lastFrameTime = performance.now();

    const loop = (now: number) => {
      if (this.destroyed) return;
      const dt = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;
      this.animT += dt;
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  update(ctx: VisualizerUpdate): void {
    if (this.destroyed) return;
    const { params, activePresetId } = ctx;

    if (typeof params.a === 'number') this.a = params.a;
    if (typeof params.b === 'number') this.b = params.b;
    if (typeof params.c === 'number') this.c = params.c;
    if (typeof params.x === 'number') this.xCur = params.x;

    // 장면 판정: activePresetId 우선, 없으면 파라미터 매칭 fallback
    let nextScene: SceneId = this.currentScene;
    let activePreset: Preset | null = null;
    if (activePresetId && isSceneId(activePresetId)) {
      nextScene = activePresetId;
      activePreset = this.presets.find((p) => p.id === activePresetId) ?? null;
    } else {
      const matched = findActivePreset(this.presets, params);
      if (matched) {
        activePreset = matched;
        if (isSceneId(matched.id)) nextScene = matched.id;
      }
    }

    // 표준 계수: 활성 프리셋 값. 매칭 안 되면 현재 값 유지(편집 표시 없음).
    if (activePreset) {
      const pv = activePreset.values;
      this.a_std = typeof pv.a === 'number' ? pv.a : this.a;
      this.b_std = typeof pv.b === 'number' ? pv.b : this.b;
      this.c_std = typeof pv.c === 'number' ? pv.c : this.c;
      this.isEdited = !(
        approxEq(this.a, this.a_std, 1e-4) &&
        approxEq(this.b, this.b_std, 1e-4) &&
        approxEq(this.c, this.c_std, 1e-4)
      );
    } else {
      this.a_std = this.a;
      this.b_std = this.b;
      this.c_std = this.c;
      this.isEdited = false;
    }

    if (nextScene !== this.currentScene) {
      this.prevScene = this.currentScene;
      this.currentScene = nextScene;
      this.transitionStart = performance.now();
    }
  }

  resize(width: number, height: number): void {
    if (this.destroyed) return;
    this.dpr = window.devicePixelRatio || 1;
    this.width = width;
    this.height = height;
    this.canvas.width = Math.max(1, Math.floor(width * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(height * this.dpr));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.animationId);
    if (this.canvas.parentNode === this.container) {
      this.container.removeChild(this.canvas);
    }
  }

  private render(): void {
    const { ctx, width, height } = this;
    const isDark = this.theme === 'dark';

    ctx.fillStyle = isDark ? '#0b1220' : '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    const topH = Math.floor(height * TOP_RATIO);
    const botY = topH;
    const botH = height - topH;

    // 상단 x 범위: 프리셋에 따라 다르게
    const absC = Math.abs(this.c);
    const vtx = quadVertex(this.a, this.b, this.c);
    const absA = Math.max(1e-3, Math.abs(this.a));
    const defaultSpan = Math.max(6, Math.sqrt(Math.max(absC, 1) / absA) * 3);
    const centerX = Number.isFinite(vtx.vx) ? vtx.vx : 0;
    const xMin = centerX - defaultSpan / 2;
    const xMax = centerX + defaultSpan / 2;

    const color = PRESET_COLORS[this.currentScene];

    drawAbstract({
      ctx, x: 0, y: 0, w: width, h: topH,
      a: this.a, b: this.b, c: this.c,
      a_std: this.a_std, b_std: this.b_std, c_std: this.c_std,
      xCur: this.xCur,
      isStandard: !this.isEdited,
      color, isDark,
      xMin, xMax,
    });

    // 분할선
    ctx.strokeStyle = isDark ? 'rgba(120,140,170,0.25)' : 'rgba(100,115,140,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(10, topH);
    ctx.lineTo(width - 10, topH);
    ctx.stroke();
    ctx.setLineDash([]);

    const now = performance.now();
    const elapsed = now - this.transitionStart;
    const t = this.prevScene != null ? Math.min(1, elapsed / FADE_DURATION) : 1;

    const roots = quadRoots(this.a, this.b, this.c);
    const yCur = this.a * this.xCur * this.xCur + this.b * this.xCur + this.c;

    const sceneCommon = {
      ctx,
      x: 0, y: botY, w: width, h: botH,
      a: this.a, b: this.b, c: this.c,
      xCur: this.xCur,
      yCur,
      vx: vtx.vx,
      vy: vtx.vy,
      roots,
      animT: this.animT,
      color, isDark,
    };

    if (this.prevScene && t < 1) {
      const prevColor = PRESET_COLORS[this.prevScene];
      SCENE_DRAWERS[this.prevScene]({ ...sceneCommon, color: prevColor, alpha: 1 - t });
      SCENE_DRAWERS[this.currentScene]({ ...sceneCommon, alpha: t });
    } else {
      if (t >= 1) this.prevScene = null;
      SCENE_DRAWERS[this.currentScene](sceneCommon);
    }
  }
}
