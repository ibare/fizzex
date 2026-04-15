/**
 * Stage — Canvas 수명주기 + 렌더 루프 관리
 *
 * 하나의 Canvas 요소를 소유하며 HiDPI 설정, rAF 루프,
 * 씬 그래프 렌더링, Tween/Timeline 업데이트를 담당한다.
 */

import { CanvasSceneSurface } from './scene-surface';
import type { SceneSurface } from './scene-surface';
import { Container } from './container';
import { Tween } from './tween';
import type { TweenConfig } from './tween';
import { Timeline } from './timeline';

export interface StageConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  backgroundColor?: string;
}

export class Stage {
  readonly surface: SceneSurface;
  readonly root: Container;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private backgroundColor: string | null;
  private dpr: number;

  private rafId: number | null = null;
  private running = false;
  private lastTimestamp = 0;
  private tickCallbacks: Array<(dt: number) => void> = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private activeTweens: Tween<any>[] = [];
  private activeTimelines: Timeline[] = [];

  constructor(config: StageConfig) {
    this.canvas = config.canvas;
    this.width = config.width;
    this.height = config.height;
    this.backgroundColor = config.backgroundColor ?? null;

    // HiDPI 설정 (C4 패턴)
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.scale(this.dpr, this.dpr);

    this.surface = new CanvasSceneSurface(this.ctx);
    this.root = new Container();

    this.tick = this.tick.bind(this);
  }

  /** HiDPI 재설정 (리사이즈 시) */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    // Canvas 크기 변경 시 context state가 리셋되므로 재설정 (C4)
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.scale(this.dpr, this.dpr);
    (this as { surface: SceneSurface }).surface = new CanvasSceneSurface(this.ctx);
  }

  /** rAF 루프 시작 */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  /** rAF 루프 정지 */
  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /** 단일 프레임 렌더 (정적 콘텐츠용) */
  renderOnce(): void {
    this.renderFrame();
  }

  /** 매 프레임 호출되는 콜백 등록 */
  onTick(callback: (dt: number) => void): void {
    this.tickCallbacks.push(callback);
  }

  /** Tween 추가 — 필요 시 자동으로 루프 시작 */
  addTween<T>(config: TweenConfig<T>): Tween<T> {
    const tween = new Tween(config);
    this.activeTweens.push(tween);
    this.ensureRunning();
    return tween;
  }

  /** Timeline 생성 및 추가 */
  addTimeline(): Timeline {
    const timeline = new Timeline();
    this.activeTimelines.push(timeline);
    this.ensureRunning();
    return timeline;
  }

  /** 정리 */
  destroy(): void {
    this.stop();
    this.root.removeAllChildren();
    this.activeTweens.length = 0;
    this.activeTimelines.length = 0;
    this.tickCallbacks.length = 0;
  }

  // ── 내부 ──

  private tick(timestamp: number): void {
    const dt = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    // Tween/Timeline 업데이트
    this.activeTweens = this.activeTweens.filter(t => {
      t.update(dt);
      return !t.completed;
    });
    this.activeTimelines = this.activeTimelines.filter(tl => {
      tl.update(dt);
      return !tl.completed;
    });

    // 사용자 콜백
    for (const cb of this.tickCallbacks) {
      cb(dt);
    }

    // 렌더링
    this.renderFrame();

    // 애니메이션이 남아있거나 running이면 계속
    if (this.running || this.activeTweens.length > 0 || this.activeTimelines.length > 0) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.rafId = null;
    }
  }

  private renderFrame(): void {
    this.surface.clearRect(0, 0, this.width, this.height);

    if (this.backgroundColor) {
      this.surface.setFillStyle(this.backgroundColor);
      this.surface.fillRect(0, 0, this.width, this.height);
    }

    this.root.renderWith(this.surface, 1);
  }

  private ensureRunning(): void {
    if (this.rafId === null) {
      this.lastTimestamp = performance.now();
      this.rafId = requestAnimationFrame(this.tick);
    }
  }
}
