/**
 * freefall-2d Canvas 렌더러
 *
 * 상단 42% 추상 포물선 (h vs t) + 하단 58% 행성별 장면.
 * 프리셋은 activePresetId 우선, fallback은 params.a 매칭.
 * 프리셋 전환 시 장면은 페이드, 추상은 연속 반응.
 *
 * 자체 애니메이션 루프: t가 시간에 따라 자동 증가 (재생 모드).
 * 사용자가 t를 조작하면 재생이 일시적으로 멈추고, 다시 자동 재개.
 */

import type { Preset, VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { drawAbstract } from './abstract';
import { drawEarth } from './scenes/earth';
import { drawMoon } from './scenes/moon';
import { drawMars } from './scenes/mars';
import { drawJupiter } from './scenes/jupiter';

const TOP_RATIO = 0.42;
const FADE_DURATION = 300;
const AUTO_PLAY_SECONDS = 6; // 한 주기 기본

const SCENE_DRAWERS = {
  earth: drawEarth,
  moon: drawMoon,
  mars: drawMars,
  jupiter: drawJupiter,
} as const;

type SceneId = keyof typeof SCENE_DRAWERS;

/** 프리셋별 색상 */
const PRESET_COLORS: Record<SceneId, string> = {
  earth: '#0E7490',
  moon: '#64748B',
  mars: '#C2410C',
  jupiter: '#B45309',
};

/** 프리셋별 표준 g (수식 비교용 기준) */
const PRESET_G_STD: Record<SceneId, number> = {
  earth: 9.807,
  moon: 1.625,
  mars: 3.721,
  jupiter: 24.79,
};

function isSceneId(id: string): id is SceneId {
  return id in SCENE_DRAWERS;
}

function approxEq(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.05;
}

/** params.a 값으로 프리셋 추론 (fallback) */
function findActivePreset(presets: Preset[], params: Record<string, number>): Preset | null {
  for (const p of presets) {
    if (approxEq(params.a ?? NaN, p.values.a)) return p;
  }
  return null;
}

export class FreefallRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private theme: 'light' | 'dark';
  private presets: Preset[];

  private width = 0;
  private height = 0;
  private dpr = 1;

  private g = 9.807;
  private t = 0;
  private h_cur = 0;
  private h_std = 0;
  private isStandard = true;

  private currentScene: SceneId = 'earth';
  private prevScene: SceneId | null = null;
  private transitionStart = 0;

  /** 자동 재생 기준 시각 (ms) */
  private lastFrameTime = 0;
  /** 사용자가 외부에서 t를 갱신하면 true. 다음 프레임에 자동 재생이 이어간다. */
  private userDrivenT = false;

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

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('FreefallRenderer: 2d context 획득 실패');
    this.ctx = ctx;

    this.resize(options.width, options.height);
    this.lastFrameTime = performance.now();

    const loop = (now: number) => {
      if (this.destroyed) return;
      const dt = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;
      this.tickAutoPlay(dt);
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  update(ctx: VisualizerUpdate): void {
    if (this.destroyed) return;
    const { params, derived, baseline, isStandard, activePresetId } = ctx;

    if (typeof params.a === 'number') this.g = params.a;
    if (typeof params.t === 'number' && params.t !== this.t) {
      // 외부에서 t가 변경되면 자동 재생 타이머를 맞춘다
      this.t = params.t;
      this.userDrivenT = true;
    }
    if (typeof derived.s === 'number' && Number.isFinite(derived.s)) {
      this.h_cur = Math.max(0, derived.s);
    }
    this.isStandard = isStandard;
    this.h_std = Number.isFinite(baseline?.derived?.s)
      ? Math.max(0, baseline!.derived!.s)
      : this.h_cur;

    let nextScene: SceneId = 'earth';
    if (activePresetId && isSceneId(activePresetId)) {
      nextScene = activePresetId;
    } else {
      const active = findActivePreset(this.presets, params);
      if (active && isSceneId(active.id)) nextScene = active.id;
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

  /** 자동 재생: 외부에서 t를 명시 변경한 경우는 잠시 따라가다가 다시 흘러간다. */
  private tickAutoPlay(dt: number): void {
    if (this.userDrivenT) {
      // 사용자가 방금 t를 세팅했으면 한 프레임 건너뛰고 다시 자연 진행
      this.userDrivenT = false;
      return;
    }
    this.t += dt;
    if (this.t > AUTO_PLAY_SECONDS) {
      this.t = 0;
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
    const g_std = PRESET_G_STD[this.currentScene];

    drawAbstract({
      ctx, x: 0, y: 0, w: width, h: topH,
      g: this.g, t: this.t,
      h_cur: this.h_cur, h_std: this.h_std,
      g_std, color, isDark, isStandard: this.isStandard,
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

    // 하단 장면 (페이드)
    const now = performance.now();
    const elapsed = now - this.transitionStart;
    const t = this.prevScene != null ? Math.min(1, elapsed / FADE_DURATION) : 1;

    const common = {
      ctx,
      x: 0, y: botY, w: width, h: botH,
      g: this.g, t: this.t,
      h_cur: this.h_cur, h_std: this.h_std,
      g_std, color, isDark, isStandard: this.isStandard,
    };

    if (this.prevScene && t < 1) {
      const prevColor = PRESET_COLORS[this.prevScene];
      const prevGstd = PRESET_G_STD[this.prevScene];
      SCENE_DRAWERS[this.prevScene]({
        ...common, color: prevColor, g_std: prevGstd, alpha: 1 - t,
      });
      SCENE_DRAWERS[this.currentScene]({ ...common, alpha: t });
    } else {
      if (t >= 1) this.prevScene = null;
      SCENE_DRAWERS[this.currentScene](common);
    }
  }
}
