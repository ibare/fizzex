/**
 * exponential-decay-2d Canvas 렌더러
 *
 * 상단 42% 추상 (N/N₀ vs t + 반감기 마커)
 * 하단 58% 프리셋 장면 (카페인/탄소14/약물/배터리)
 *
 * r<0 구간의 exponential-growth 수식(= decay)을 시각화.
 */

import type { Preset, VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { drawAbstract } from './abstract';
import { drawCaffeine } from './scenes/caffeine';
import { drawCarbon14 } from './scenes/carbon14';
import { drawDrug } from './scenes/drug';
import { drawBattery } from './scenes/battery';

const TOP_RATIO = 0.42;
const FADE_DURATION = 300;

const SCENE_DRAWERS = {
  caffeine: drawCaffeine,
  carbon14: drawCarbon14,
  drug: drawDrug,
  battery: drawBattery,
} as const;

type SceneId = keyof typeof SCENE_DRAWERS;

const PRESET_COLORS: Record<SceneId, string> = {
  caffeine: '#92400E',
  carbon14: '#7C3AED',
  drug: '#DC2626',
  battery: '#0EA5E9',
};

function isSceneId(id: string): id is SceneId {
  return id in SCENE_DRAWERS;
}

function approxEq(a: number, b: number, eps = 0.01): boolean {
  return Math.abs(a - b) < eps;
}

function findActivePreset(presets: Preset[], params: Record<string, number>): Preset | null {
  for (const p of presets) {
    const keys = Object.keys(p.values);
    if (keys.every((k) => approxEq(params[k] ?? NaN, p.values[k]))) return p;
  }
  return null;
}

export class ExponentialDecayRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private theme: 'light' | 'dark';
  private presets: Preset[];

  private width = 0;
  private height = 0;
  private dpr = 1;

  private N0 = 100;
  private r = -0.1386; // ln(2)/5
  private t = 0;

  /** 편집 기준: 활성 프리셋의 r (없으면 r과 동일) */
  private r_std = -0.1386;
  private isStandard = true;

  private currentScene: SceneId = 'caffeine';
  private prevScene: SceneId | null = null;
  private transitionStart = 0;

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
    if (!c2d) throw new Error('ExponentialDecayRenderer: 2d context 획득 실패');
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

    if (typeof params.N_0 === 'number') this.N0 = params.N_0;
    if (typeof params.r === 'number') this.r = params.r;
    if (typeof params.t === 'number') this.t = params.t;

    // 장면 판정
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

    if (activePreset && typeof activePreset.values.r === 'number') {
      this.r_std = activePreset.values.r;
      this.isStandard = approxEq(this.r, this.r_std, 1e-4);
    } else {
      this.r_std = this.r;
      this.isStandard = true;
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
    const color = PRESET_COLORS[this.currentScene];

    // 반감기 (r<0일 때만 의미 있음)
    const halfLife = this.r < 0 ? Math.log(2) / -this.r : Infinity;
    const halfLife_std = this.r_std < 0 ? Math.log(2) / -this.r_std : Infinity;
    const tMax = Number.isFinite(halfLife) ? halfLife * 3.5 : 10;

    drawAbstract({
      ctx, x: 0, y: 0, w: width, h: topH,
      N0: this.N0, r: this.r, r_std: this.r_std, t: this.t,
      halfLife,
      isStandard: this.isStandard,
      color, isDark,
      tMax,
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
    const tFade = this.prevScene != null ? Math.min(1, elapsed / FADE_DURATION) : 1;

    const ratio = Math.max(0, Math.min(1, Math.exp(this.r * this.t)));
    const ratio_std = Math.max(0, Math.min(1, Math.exp(this.r_std * this.t)));

    const sceneCommon = {
      ctx,
      x: 0, y: botY, w: width, h: botH,
      N0: this.N0, r: this.r, t: this.t,
      ratio,
      ratio_std,
      isStandard: this.isStandard,
      halfLife: Number.isFinite(halfLife) ? halfLife : halfLife_std,
      animT: this.animT,
      color, isDark,
    };

    if (this.prevScene && tFade < 1) {
      const prevColor = PRESET_COLORS[this.prevScene];
      SCENE_DRAWERS[this.prevScene]({ ...sceneCommon, color: prevColor, alpha: 1 - tFade });
      SCENE_DRAWERS[this.currentScene]({ ...sceneCommon, alpha: tFade });
    } else {
      if (tFade >= 1) this.prevScene = null;
      SCENE_DRAWERS[this.currentScene](sceneCommon);
    }
  }
}
