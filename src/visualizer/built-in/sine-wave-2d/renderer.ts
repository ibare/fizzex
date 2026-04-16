/**
 * sine-wave-2d Canvas 렌더러
 *
 * 상단 42% 추상 (회전 원 + 파형) + 하단 58% 현실 장면.
 * 자체 애니메이션 시각으로 t를 증가시키며 y₀ = A sin(ωt + φ) 값 갱신.
 * 수식의 ω는 사용자 편집 가능 (스타일화 모드 기본).
 * 프레임워크에서 t가 외부 파라미터로 공급되면 그 값을 사용한다.
 */

import type { Preset, VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { drawAbstract } from './abstract';
import { drawSpeaker } from './scenes/speaker';
import { drawVoltmeter } from './scenes/voltmeter';
import { drawTide } from './scenes/tide';
import { drawPendulum } from './scenes/pendulum';

const TOP_RATIO = 0.42;
const FADE_DURATION = 300;

const SCENE_DRAWERS = {
  speaker: drawSpeaker,
  voltmeter: drawVoltmeter,
  tide: drawTide,
  pendulum: drawPendulum,
} as const;

type SceneId = keyof typeof SCENE_DRAWERS;

const PRESET_COLORS: Record<SceneId, string> = {
  speaker: '#7C3AED',
  voltmeter: '#0891B2',
  tide: '#0284C7',
  pendulum: '#C2410C',
};

function isSceneId(id: string): id is SceneId {
  return id in SCENE_DRAWERS;
}

function approxEq(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.05;
}

function findActivePreset(presets: Preset[], params: Record<string, number>): Preset | null {
  for (const p of presets) {
    const keys = Object.keys(p.values);
    if (keys.every((k) => approxEq(params[k] ?? NaN, p.values[k]))) return p;
  }
  return null;
}

export class SineWaveRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private theme: 'light' | 'dark';
  private presets: Preset[];

  private width = 0;
  private height = 0;
  private dpr = 1;

  private A = 1;
  private omega = 2;
  private phi = 0;
  private t = 0;

  /** 수식 평가로 받은 y₀ (현재 수식) */
  private y_cur = 0;
  /** 표준 수식 y₀ */
  private y_std = 0;
  private isStandard = true;

  private currentScene: SceneId = 'speaker';
  private prevScene: SceneId | null = null;
  private transitionStart = 0;

  /** 자체 애니메이션 시각 (초) — 외부 t가 없으면 이걸 사용 */
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

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('SineWaveRenderer: 2d context 획득 실패');
    this.ctx = ctx;

    this.resize(options.width, options.height);
    this.lastFrameTime = performance.now();

    const loop = (now: number) => {
      if (this.destroyed) return;
      const dt = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;
      this.animT += dt;
      // 외부 t 주기가 안 들어오면 내부 t로 구동
      this.t += dt;
      // y_cur 실시간 갱신 (프레임워크가 t 슬라이더를 안 움직이는 경우)
      this.y_cur = this.A * Math.sin(this.omega * this.t + this.phi);
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  update(ctx: VisualizerUpdate): void {
    if (this.destroyed) return;
    const { params, derived, baseline, isStandard, activePresetId } = ctx;

    if (typeof params.A === 'number') this.A = params.A;
    if (typeof params['\\omega'] === 'number') this.omega = params['\\omega'];
    else if (typeof params.omega === 'number') this.omega = params.omega;
    if (typeof params['\\varphi'] === 'number') this.phi = params['\\varphi'];
    else if (typeof params.phi === 'number') this.phi = params.phi;
    if (typeof params.t === 'number') this.t = params.t;

    // 수식 결과 (x) — 프레임워크가 내려준 값 우선
    if (typeof derived.x === 'number' && Number.isFinite(derived.x)) {
      this.y_cur = derived.x;
    }
    this.isStandard = isStandard;
    this.y_std = Number.isFinite(baseline?.derived?.x)
      ? baseline!.derived!.x
      : this.y_cur;

    let nextScene: SceneId = 'speaker';
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

    ctx.fillStyle = isDark ? '#0b1220' : '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    const topH = Math.floor(height * TOP_RATIO);
    const botY = topH;
    const botH = height - topH;
    const color = PRESET_COLORS[this.currentScene];

    drawAbstract({
      ctx, x: 0, y: 0, w: width, h: topH,
      A: this.A, omega: this.omega, phi: this.phi, t: this.t,
      y_cur: this.y_cur, y_std: this.y_std,
      color, isDark, isStandard: this.isStandard,
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

    const absA = Math.max(1e-6, Math.abs(this.A));
    const yNorm = Math.max(-1, Math.min(1, this.y_cur / absA));

    const sceneCommon = {
      ctx,
      x: 0, y: botY, w: width, h: botH,
      A: this.A,
      y0: this.y_cur,
      yNorm,
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
