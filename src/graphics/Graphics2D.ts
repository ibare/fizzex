/**
 * 2D Canvas 호스트.
 *
 * Canvas 생성·DPR 스케일링·rAF 루프·리사이즈·정리를 흡수한다.
 * Visualizer는 `new Graphics2D(container, { onFrame })` 한 번 호출하고,
 * onFrame(ctx, { dt, now }) 안에서 자유롭게 ctx에 그린다.
 *
 * ctx는 감추지 않는다. `instance.ctx`로 직접 접근할 수 있으며,
 * Visualizer가 자체 이벤트 리스너를 걸고 싶으면 `instance.canvas`를 사용한다.
 * 등록한 리스너는 Visualizer의 unmount 훅에서 본인이 정리한다.
 */

import type { FrameInfo, Theme } from './types';

export interface Graphics2DOptions {
  width: number;
  height: number;
  theme: Theme;
  /** 매 rAF 틱마다 호출. ctx는 DPR 스케일링이 이미 적용된 상태. */
  onFrame: (ctx: CanvasRenderingContext2D, frame: FrameInfo) => void;
}

export class Graphics2D {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  theme: Theme;

  private readonly container: HTMLElement;
  private readonly onFrame: Graphics2DOptions['onFrame'];
  private width: number;
  private height: number;
  private dpr = 1;
  private animationId = 0;
  private lastTimestamp = 0;
  private startTimestamp = 0;
  private destroyed = false;

  constructor(container: HTMLElement, opts: Graphics2DOptions) {
    this.container = container;
    this.onFrame = opts.onFrame;
    this.theme = opts.theme;
    this.width = opts.width;
    this.height = opts.height;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);
    this.canvas = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Graphics2D: 2d context 획득 실패');
    this.ctx = ctx;

    this.applySize();

    this.startTimestamp = performance.now();
    this.lastTimestamp = this.startTimestamp;
    this.animationId = requestAnimationFrame(this.loop);
  }

  get isDark(): boolean {
    return this.theme === 'dark';
  }

  private readonly loop = (now: number): void => {
    if (this.destroyed) return;
    const dt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    this.onFrame(this.ctx, {
      dt,
      now,
      elapsed: (now - this.startTimestamp) / 1000,
      width: this.width,
      height: this.height,
      isDark: this.theme === 'dark',
    });
    this.animationId = requestAnimationFrame(this.loop);
  };

  private applySize(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(this.width * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(this.height * this.dpr));
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  resize(width: number, height: number): void {
    if (this.destroyed) return;
    this.width = width;
    this.height = height;
    this.applySize();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.animationId);
    if (this.canvas.parentNode === this.container) {
      this.container.removeChild(this.canvas);
    }
  }
}
