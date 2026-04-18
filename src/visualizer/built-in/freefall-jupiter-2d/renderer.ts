/**
 * 목성 자유낙하 렌더러.
 *
 * 가스 행성 대기 그라데이션 + 띠무늬 + 대적점 + 빠르게 떨어지는 공.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { Graphics2D } from '../../../graphics/Graphics2D';
import { hexAlpha, roundRect } from '../../../graphics/draw';

const BRAND_COLOR = '#B45309';
const AUTO_PLAY_SECONDS = 6;

export class FreefallJupiterRenderer {
  private graphics: Graphics2D;
  private v0 = 0;
  private a = 24.79;
  private t = 0;
  private hCur = 0;
  private userDrivenT = false;

  constructor(container: HTMLElement, options: VisualizerMountOptions) {
    this.graphics = new Graphics2D(container, {
      width: options.width,
      height: options.height,
      theme: options.theme,
      onFrame: (ctx, frame) => {
        this.tickAutoPlay(frame.dt);
        this.hCur = Math.max(0, this.v0 * this.t + 0.5 * this.a * this.t * this.t);
        this.render(ctx, frame.width, frame.height);
      },
    });
  }

  update(context: VisualizerUpdate): void {
    const { params, derived } = context;
    if (typeof params.v_0 === 'number') this.v0 = params.v_0;
    if (typeof params.a === 'number') this.a = params.a;
    if (typeof params.t === 'number' && params.t !== this.t) {
      this.t = params.t;
      this.userDrivenT = true;
    }
    if (typeof derived.s === 'number' && Number.isFinite(derived.s)) {
      this.hCur = Math.max(0, derived.s);
    }
  }

  resize(width: number, height: number): void {
    this.graphics.resize(width, height);
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private tickAutoPlay(dt: number): void {
    if (this.userDrivenT) {
      this.userDrivenT = false;
      return;
    }
    this.t += dt;
    if (this.t > AUTO_PLAY_SECONDS) this.t = 0;
  }

  private render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const isDark = this.graphics.theme === 'dark';
    const hCur = this.hCur;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0.0, isDark ? '#422006' : '#fef3c7');
    grad.addColorStop(0.2, isDark ? '#78350f' : '#fde68a');
    grad.addColorStop(0.4, isDark ? '#92400e' : '#fbbf24');
    grad.addColorStop(0.6, isDark ? '#a16207' : '#f59e0b');
    grad.addColorStop(0.8, isDark ? '#7c2d12' : '#d97706');
    grad.addColorStop(1.0, isDark ? '#451a03' : '#b45309');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = isDark ? 'rgba(0,0,0,0.18)' : 'rgba(120,60,20,0.2)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      const yp = (i / 7) * h + 6 + Math.sin(i * 1.7) * 4;
      ctx.beginPath();
      ctx.moveTo(0, yp);
      ctx.bezierCurveTo(w * 0.3, yp - 3, w * 0.6, yp + 3, w, yp);
      ctx.stroke();
    }

    const spotX = w * 0.72;
    const spotY = h * 0.62;
    ctx.fillStyle = isDark ? 'rgba(180,40,20,0.6)' : 'rgba(185,80,50,0.55)';
    ctx.beginPath();
    ctx.ellipse(spotX, spotY, 28, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(140,20,10,0.7)' : 'rgba(120,40,20,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const hView = Math.max(20, hCur * 1.15, 30);
    const padT = 44;
    const padB = 28;
    const plotH = Math.max(1, h - padT - padB);
    const toY = (hv: number) => padT + (hv / hView) * plotH;
    const groundY = toY(0);

    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();
    ctx.setLineDash([]);

    const dropX = w * 0.35;
    const ballR = 7;
    const ballY = toY(Math.min(hCur, hView));

    ctx.strokeStyle = hexAlpha(BRAND_COLOR, 0.55);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(dropX, toY(0));
    ctx.lineTo(dropX, ballY);
    ctx.stroke();

    ctx.fillStyle = BRAND_COLOR;
    ctx.beginPath();
    ctx.arc(dropX, ballY, ballR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = isDark ? 'rgba(254,240,215,0.95)' : 'rgba(60,30,0,0.92)';
    ctx.font = '500 10px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatMeter(hCur), dropX + ballR + 6, ballY);

    const badge = `목성 · g = ${this.a.toFixed(2)} m/s² · t = ${this.t.toFixed(2)}s`;
    drawBadge(ctx, 12, 12, badge, isDark);
  }
}

function formatMeter(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${(n / 1000).toFixed(2)}km`;
  if (abs >= 100) return `${n.toFixed(0)}m`;
  if (abs >= 10) return `${n.toFixed(1)}m`;
  return `${n.toFixed(2)}m`;
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  isDark: boolean,
): void {
  ctx.save();
  ctx.font = '600 11px -apple-system, sans-serif';
  const w = ctx.measureText(text).width + 16;
  const h = 22;
  ctx.fillStyle = isDark ? 'rgba(20,20,0,0.6)' : 'rgba(255,240,200,0.8)';
  roundRect(ctx, x, y, w, h, 11);
  ctx.fill();
  ctx.strokeStyle = BRAND_COLOR;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = BRAND_COLOR;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 10, y + h / 2 + 0.5);
  ctx.restore();
}
