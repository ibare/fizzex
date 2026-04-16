/**
 * 피타고라스 2D Canvas 렌더러
 *
 * 상단 42% 공통 추상 + 하단 58% 프리셋별 현실 장면.
 * 프리셋은 params(a,b) 튜플이 preset.values와 정확히 일치하는 항목으로 추론.
 * 프리셋 변경 시 하단 장면은 페이드 전환, 상단 추상은 색상/값만 연속 반응.
 */

import type { Preset, VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { drawAbstract } from './abstract';
import { drawExplore } from './scenes/explore';
import { drawLadder } from './scenes/ladder';
import { drawTV } from './scenes/tv';
import { drawShortcut } from './scenes/shortcut';

const TOP_RATIO = 0.42;
const FADE_DURATION = 300; // ms

/** 프리셋 ID → 장면 그리기 함수 */
const SCENE_DRAWERS = {
  explore: drawExplore,
  ladder: drawLadder,
  tv: drawTV,
  shortcut: drawShortcut,
} as const;

type SceneId = keyof typeof SCENE_DRAWERS;

/** 프리셋 ID → 색상 (카탈로그 프리셋 id와 일치) */
const PRESET_COLORS: Record<SceneId, string> = {
  explore: '#0F172A',
  ladder: '#DC4C2C',
  tv: '#7C3AED',
  shortcut: '#0E7490',
};

function isSceneId(id: string): id is SceneId {
  return id in SCENE_DRAWERS;
}

/** 두 숫자가 사실상 같은가 (float 비교) */
function approxEq(x: number, y: number): boolean {
  return Math.abs(x - y) < 1e-6;
}

/** params 튜플이 preset.values와 정확히 일치하는 프리셋 찾기 */
function findActivePreset(
  presets: Preset[],
  params: Record<string, number>,
): Preset | null {
  for (const p of presets) {
    const keys = Object.keys(p.values);
    if (keys.every((k) => approxEq(params[k] ?? NaN, p.values[k]))) {
      return p;
    }
  }
  return null;
}

export class PythagoreanRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private theme: 'light' | 'dark';
  private presets: Preset[];

  private width = 0;
  private height = 0;
  private dpr = 1;

  private a = 3;
  private b = 4;
  private c = 5;

  /** 현재 표시 중인 장면 ID */
  private currentScene: SceneId = 'explore';
  /** 전환 중이면 이전 장면 ID (페이드 아웃 대상) */
  private prevScene: SceneId | null = null;
  /** 전환 시작 시각 (ms) */
  private transitionStart = 0;

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
    if (!ctx) throw new Error('PythagoreanRenderer: 2d context 획득 실패');
    this.ctx = ctx;

    this.resize(options.width, options.height);

    // 지속 렌더 루프 — 페이드 전환 처리
    const loop = () => {
      if (this.destroyed) return;
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  update(ctx: VisualizerUpdate): void {
    if (this.destroyed) return;
    const { params, derived, activePresetId } = ctx;

    if (typeof params.a === 'number') this.a = params.a;
    if (typeof params.b === 'number') this.b = params.b;

    // c는 프레임워크 파생값에서 수신 — 자체 계산 금지
    if (typeof derived.c === 'number' && Number.isFinite(derived.c)) {
      this.c = derived.c;
    }

    // 장면 결정 우선순위:
    //   1) 프레임워크가 전달한 activePresetId (사용자가 명시 선택한 프리셋 — 슬라이더 조작과 독립)
    //   2) fallback: params 튜플이 preset.values 와 정확히 일치하는 프리셋 (초기 상태용)
    //   3) 'explore' (자유탐구)
    let nextScene: SceneId = 'explore';
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

  private render(): void {
    const { ctx, width, height } = this;
    const isDark = this.theme === 'dark';

    // 배경
    ctx.fillStyle = isDark ? '#0b1220' : '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    const topH = Math.floor(height * TOP_RATIO);
    const botY = topH;
    const botH = height - topH;

    const color = PRESET_COLORS[this.currentScene];

    // ── 상단: 공통 추상 ──
    drawAbstract({
      ctx, x: 0, y: 0, w: width, h: topH,
      a: this.a, b: this.b, c: this.c,
      color, isDark,
    });

    // ── 분할선 ──
    ctx.strokeStyle = isDark ? 'rgba(120,140,170,0.25)' : 'rgba(100,115,140,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(10, topH);
    ctx.lineTo(width - 10, topH);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── 하단: 프리셋 장면 (페이드 전환 가능) ──
    const now = performance.now();
    const elapsed = now - this.transitionStart;
    const t = this.prevScene != null ? Math.min(1, elapsed / FADE_DURATION) : 1;

    if (this.prevScene && t < 1) {
      const prevColor = PRESET_COLORS[this.prevScene];
      SCENE_DRAWERS[this.prevScene]({
        ctx, x: 0, y: botY, w: width, h: botH,
        a: this.a, b: this.b, c: this.c,
        color: prevColor, isDark, alpha: 1 - t,
      });
      SCENE_DRAWERS[this.currentScene]({
        ctx, x: 0, y: botY, w: width, h: botH,
        a: this.a, b: this.b, c: this.c,
        color, isDark, alpha: t,
      });
    } else {
      if (t >= 1) this.prevScene = null;
      SCENE_DRAWERS[this.currentScene]({
        ctx, x: 0, y: botY, w: width, h: botH,
        a: this.a, b: this.b, c: this.c,
        color, isDark,
      });
    }
  }
}
