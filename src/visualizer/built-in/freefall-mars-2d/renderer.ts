/**
 * 화성 자유낙하 렌더러.
 *
 * 붉은 하늘·지형 + 탐사 로버 실루엣 + 떨어지는 공.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { Graphics2D } from '../../../graphics/Graphics2D';
import { hexAlpha, roundRect } from '../../../graphics/draw';

const BRAND_COLOR = '#C2410C';
const AUTO_PLAY_SECONDS = 6;

export class FreefallMarsRenderer {
  private graphics: Graphics2D;
  private v0 = 0;
  private a = 3.721;
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
    grad.addColorStop(0, isDark ? '#3c1412' : '#fecaca');
    grad.addColorStop(1, isDark ? '#7c2d12' : '#fed7aa');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const hView = Math.max(20, hCur * 1.15, 30);
    const padT = 44;
    const padB = 56;
    const plotH = Math.max(1, h - padT - padB);
    const toY = (hv: number) => padT + (hv / hView) * plotH;
    const groundY = toY(0);

    ctx.fillStyle = isDark ? '#991b1b' : '#b45309';
    ctx.beginPath();
    ctx.moveTo(0, groundY + 2);
    const segs = 10;
    for (let i = 0; i <= segs; i++) {
      const px = (i / segs) * w;
      const hill = Math.sin(i * 2.7) * 8 + ((i % 3) * 3);
      ctx.lineTo(px, groundY + 2 - hill);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = isDark ? '#7f1d1d' : '#92400e';
    for (let i = 0; i < 18; i++) {
      const px = (i * 71) % (w || 1);
      const py = groundY + 6 + ((i * 41) % Math.max(10, h - groundY - 10));
      const r = (i % 3) + 1;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const rx = w * 0.18;
    const ry = groundY - 2;
    ctx.fillStyle = isDark ? '#e2e8f0' : '#f5f5f4';
    ctx.fillRect(rx - 12, ry - 10, 24, 8);
    ctx.fillRect(rx + 4, ry - 18, 2, 8);
    ctx.beginPath();
    ctx.arc(rx + 5, ry - 19, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isDark ? '#1e40af' : '#1e3a8a';
    ctx.fillRect(rx - 14, ry - 14, 10, 4);
    ctx.fillRect(rx + 4, ry - 14, 10, 4);
    ctx.fillStyle = isDark ? '#0f172a' : '#1f2937';
    ctx.beginPath();
    ctx.arc(rx - 8, ry - 1, 3, 0, Math.PI * 2);
    ctx.arc(rx, ry - 1, 3, 0, Math.PI * 2);
    ctx.arc(rx + 8, ry - 1, 3, 0, Math.PI * 2);
    ctx.fill();

    const dropX = w * 0.6;
    const ballR = 7;
    const ballY = toY(Math.min(hCur, hView));

    ctx.strokeStyle = hexAlpha(BRAND_COLOR, 0.35);
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(dropX, toY(0));
    ctx.lineTo(dropX, ballY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = BRAND_COLOR;
    ctx.beginPath();
    ctx.arc(dropX, ballY, ballR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = isDark ? 'rgba(254,240,215,0.95)' : 'rgba(50,20,10,0.92)';
    ctx.font = '500 10px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatMeter(hCur), dropX + ballR + 6, ballY);

    const badge = `화성 · g = ${this.a.toFixed(2)} m/s² · t = ${this.t.toFixed(2)}s`;
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
  ctx.fillStyle = hexAlpha(BRAND_COLOR, 0.3);
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
  void isDark;
}
