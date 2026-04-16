/**
 * compound-interest-2d Canvas 렌더러
 *
 * 상단 42% 추상 (A vs t 성장 곡선 + 원금 기준선 + 72법칙)
 * 하단 58% 프리셋 장면 (예금/주식/적금/인플레이션)
 */

import type { Preset, VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { compoundA } from './utils';
import { drawAbstract } from './abstract';
import { drawSavings } from './scenes/savings';
import { drawStock } from './scenes/stock';
import { drawDeposit } from './scenes/deposit';
import { drawInflation } from './scenes/inflation';

const TOP_RATIO = 0.42;
const FADE_DURATION = 300;

const SCENE_DRAWERS = {
  savings: drawSavings,
  stock: drawStock,
  deposit: drawDeposit,
  inflation: drawInflation,
} as const;

type SceneId = keyof typeof SCENE_DRAWERS;

const PRESET_COLORS: Record<SceneId, string> = {
  savings: '#059669',
  stock: '#2563EB',
  deposit: '#D97706',
  inflation: '#DC2626',
};

/** 프리셋별 표시 기간 (년) */
const PRESET_TMAX: Record<SceneId, number> = {
  savings: 30,
  stock: 40,
  deposit: 20,
  inflation: 30,
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

export class CompoundInterestRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private theme: 'light' | 'dark';
  private presets: Preset[];

  private width = 0;
  private height = 0;
  private dpr = 1;

  private P = 1000;
  private r = 0.03;
  private n = 1;
  private t = 0;
  /** 수식 평가로 받은 현재 A (만원) */
  private A = 1000;

  /** 편집 기준: 활성 프리셋의 r / P (없으면 현재 값) */
  private r_std = 0.03;
  private P_std = 1000;
  private isStandard = true;

  private currentScene: SceneId = 'savings';
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
    if (!c2d) throw new Error('CompoundInterestRenderer: 2d context 획득 실패');
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
    const { params, activePresetId, derived, equationValue } = ctx;

    if (typeof params.P === 'number') this.P = params.P;
    if (typeof params.r === 'number') this.r = params.r;
    if (typeof params.n === 'number') this.n = params.n;
    if (typeof params.t === 'number') this.t = params.t;

    // A: derived에서 먼저, 없으면 equationValue, 없으면 수식 계산
    const derivedA = typeof derived?.A === 'number' ? derived.A : undefined;
    const eqA = typeof equationValue === 'number' && Number.isFinite(equationValue)
      ? equationValue
      : undefined;
    this.A = derivedA ?? eqA ?? compoundA(this.P, this.r, this.n, this.t);

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

    if (activePreset) {
      this.r_std = typeof activePreset.values.r === 'number' ? activePreset.values.r : this.r;
      this.P_std = typeof activePreset.values.P === 'number' ? activePreset.values.P : this.P;
      const stdKeys = Object.keys(activePreset.values);
      this.isStandard = stdKeys.every((k) => {
        const pv = params[k];
        const av = activePreset!.values[k];
        return typeof pv === 'number' && typeof av === 'number' && approxEq(pv, av, 1e-4);
      });
    } else {
      this.r_std = this.r;
      this.P_std = this.P;
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
    const tMax = PRESET_TMAX[this.currentScene];
    const inverse = this.currentScene === 'inflation';

    // 편집 전 표준 A (프리셋 값 기준)
    const A_std = compoundA(this.P_std, this.r_std, this.n, this.t);

    drawAbstract({
      ctx, x: 0, y: 0, w: width, h: topH,
      P: this.P, r: this.r, n: this.n, t: this.t,
      r_std: this.r_std, A: this.A,
      isStandard: this.isStandard,
      tMax, inverse,
      color, isDark,
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

    const sceneCommon = {
      ctx,
      x: 0, y: botY, w: width, h: botH,
      P: this.P, r: this.r, n: this.n, t: this.t,
      A: this.A,
      A_std,
      isStandard: this.isStandard,
      tMax,
      animT: this.animT,
      color, isDark,
    };

    if (this.prevScene && tFade < 1) {
      const prevColor = PRESET_COLORS[this.prevScene];
      const prevTMax = PRESET_TMAX[this.prevScene];
      SCENE_DRAWERS[this.prevScene]({
        ...sceneCommon,
        color: prevColor,
        tMax: prevTMax,
        alpha: 1 - tFade,
      });
      SCENE_DRAWERS[this.currentScene]({ ...sceneCommon, alpha: tFade });
    } else {
      if (tFade >= 1) this.prevScene = null;
      SCENE_DRAWERS[this.currentScene](sceneCommon);
    }
  }
}
