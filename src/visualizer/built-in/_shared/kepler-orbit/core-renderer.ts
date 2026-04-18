/**
 * 케플러 궤도 공용 Canvas 렌더러.
 *
 * 변형별 Visualizer는 이 클래스를 그대로 재사용한다.
 * AST 파생값(period/velocity)을 받아 TIME_ACCELERATION 배 가속한 회전 애니메이션,
 * 궤도 드래그로 반지름 편집, baseline ghost 비교를 담당.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../../types';
import { R_EARTH, TIME_ACCELERATION } from './constants';
import { sanitizePositive } from './math';
import type { Star } from './types';
import {
  generateStars,
  drawBackground,
  drawOrbit,
  drawEarth,
  drawAltitudeLine,
  drawSatelliteTrail,
  drawBaselineGhost,
  drawSatellite,
  drawInfoPanel,
} from './draw';

export class KeplerOrbitCoreRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private theme: 'light' | 'dark';

  private width = 0;
  private height = 0;
  private dpr = 1;

  private currentA: number;
  private currentPeriod = 0;
  private currentVelocity = 0;
  private angle = 0;
  private lastTimestamp = 0;
  private animationId = 0;
  private destroyed = false;

  private isStandard = true;
  private baselinePeriod = 0;
  private baselineAngle = 0;

  private stars: Star[];
  private paramChangeCallback: ((paramId: string, value: number) => void) | null = null;

  private isDragging = false;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: () => void;

  constructor(container: HTMLElement, options: VisualizerMountOptions, initialA: number) {
    this.container = container;
    this.theme = options.theme;
    this.currentA = initialA;

    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvas.style.cursor = 'grab';
    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('KeplerOrbitCoreRenderer: 2d context 획득 실패');
    this.ctx = ctx;

    this.stars = generateStars(120);

    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);

    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('mouseup', this.boundMouseUp);

    this.resize(options.width, options.height);

    this.lastTimestamp = performance.now();
    this.animate(this.lastTimestamp);
  }

  update(context: VisualizerUpdate): void {
    if (this.destroyed) return;
    const { params, derived, baseline } = context;
    if (params.a !== undefined && params.a !== this.currentA) {
      this.currentA = params.a;
    }
    this.currentPeriod = sanitizePositive(derived.period);
    this.currentVelocity = sanitizePositive(derived.velocity);

    this.isStandard = context.isStandard;
    if (baseline) {
      this.baselinePeriod = sanitizePositive(baseline.derived.period);
    } else {
      this.baselinePeriod = 0;
      this.baselineAngle = 0;
    }
  }

  resize(width: number, height: number): void {
    if (this.destroyed) return;
    this.dpr = window.devicePixelRatio || 1;
    this.width = width;
    this.height = height;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setParameterChangeCallback(cb: (paramId: string, value: number) => void): void {
    this.paramChangeCallback = cb;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.animationId);
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('mouseup', this.boundMouseUp);
    this.container.removeChild(this.canvas);
  }

  private getScale(): number {
    const padding = 40;
    const maxOrbit = Math.max(this.currentA, R_EARTH * 2);
    const minSide = Math.min(this.width, this.height);
    return (minSide / (2 * maxOrbit)) * (1 - padding / minSide);
  }

  private get cx(): number { return this.width / 2; }
  private get cy(): number { return this.height / 2; }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dist = Math.sqrt((mx - this.cx) ** 2 + (my - this.cy) ** 2);
    const orbitPx = this.currentA * this.getScale();
    if (Math.abs(dist - orbitPx) < 20) {
      this.isDragging = true;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dist = Math.sqrt((mx - this.cx) ** 2 + (my - this.cy) ** 2);
    const scale = this.getScale();
    if (scale > 0) {
      const newA = Math.max(6500, Math.min(400000, dist / scale));
      this.currentA = newA;
      this.paramChangeCallback?.('a', newA);
    }
  }

  private handleMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    }
  }

  private animate(timestamp: number): void {
    if (this.destroyed) return;

    const dt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    if (this.currentPeriod > 0) {
      const acc = this.currentPeriod / TIME_ACCELERATION;
      const w = (2 * Math.PI) / Math.max(acc, 0.001);
      this.angle += w * dt;
      if (this.angle > 2 * Math.PI) this.angle -= 2 * Math.PI;
    }

    if (!this.isStandard && this.baselinePeriod > 0) {
      const acc = this.baselinePeriod / TIME_ACCELERATION;
      const w = (2 * Math.PI) / Math.max(acc, 0.001);
      this.baselineAngle += w * dt;
      if (this.baselineAngle > 2 * Math.PI) this.baselineAngle -= 2 * Math.PI;
    }

    this.render();
    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  private render(): void {
    const { ctx, width, height } = this;
    const isDark = this.theme === 'dark';
    const scale = this.getScale();

    drawBackground(ctx, width, height, isDark, this.stars);

    const cx = this.cx;
    const cy = this.cy;
    const earthPx = R_EARTH * scale;
    const orbitPx = this.currentA * scale;

    drawOrbit(ctx, cx, cy, orbitPx, isDark);
    drawEarth(ctx, cx, cy, earthPx, isDark);
    drawAltitudeLine(ctx, cx, cy, earthPx, orbitPx, this.currentA, isDark);
    drawSatelliteTrail(ctx, cx, cy, orbitPx, this.angle, isDark);

    if (!this.isStandard && this.baselinePeriod > 0) {
      drawBaselineGhost(ctx, cx, cy, orbitPx, this.baselineAngle, isDark);
    }

    drawSatellite(ctx, cx, cy, orbitPx, this.angle, this.isStandard, isDark);

    drawInfoPanel({
      ctx, width,
      currentPeriod: this.currentPeriod,
      currentVelocity: this.currentVelocity,
      currentA: this.currentA,
      baselinePeriod: this.baselinePeriod,
      isStandard: this.isStandard,
      isDark,
    });
  }
}
