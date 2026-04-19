/**
 * 피타고라스 — 지름길 렌더러.
 *
 * a: 블록 가로(m), b: 블록 세로(m), c: 대각선 거리(m).
 * L자 경로(돌아가기) vs 대각선 경로(가로지르기) 대비. 절약률 = (a+b-c)/(a+b).
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { Graphics2D } from '../../../graphics/Graphics2D';
import { hexAlpha, roundRect } from '../../../graphics/draw';
import { background } from '../../../graphics/theme';

const BRAND_COLOR = '#0E7490';

export class PythagoreanShortcutRenderer {
  private graphics: Graphics2D;
  private a = 80;
  private b = 60;
  private c = 100;

  constructor(container: HTMLElement, options: VisualizerMountOptions) {
    this.graphics = new Graphics2D(container, {
      width: options.width,
      height: options.height,
      theme: options.theme,
      onFrame: (ctx, frame) => this.render(ctx, frame.width, frame.height),
    });
  }

  update(context: VisualizerUpdate): void {
    const { params, derived } = context;
    if (typeof params.a === 'number') this.a = params.a;
    if (typeof params.b === 'number') this.b = params.b;
    if (typeof derived.c === 'number' && Number.isFinite(derived.c)) {
      this.c = derived.c;
    }
  }

  resize(width: number, height: number): void {
    this.graphics.resize(width, height);
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const isDark = this.graphics.isDark;
    const { a, b, c } = this;
    if (!(a > 0) || !(b > 0) || !(c > 0)) return;

    ctx.fillStyle = background(isDark);
    ctx.fillRect(0, 0, w, h);

    const padX = 20;
    const padT = 40;
    const padB = 20;
    const innerW = Math.max(1, w - padX * 2);
    const innerH = Math.max(1, h - padT - padB);
    const ratio = a / b;
    let blkW = innerW;
    let blkH = blkW / ratio;
    if (blkH > innerH) {
      blkH = innerH;
      blkW = blkH * ratio;
    }
    const blkX = (w - blkW) / 2;
    const blkY = padT + (innerH - blkH) / 2;

    ctx.fillStyle = isDark ? '#1a3d2a' : '#86efac';
    ctx.fillRect(blkX, blkY, blkW, blkH);

    ctx.strokeStyle = isDark ? 'rgba(80,140,100,0.35)' : 'rgba(34,107,60,0.32)';
    ctx.lineWidth = 1;
    const grassCount = 24;
    for (let i = 0; i < grassCount; i++) {
      const h1 = ((i * 9301 + 49297) % 233280) / 233280;
      const h2 = ((i * 4721 + 10007) % 233280) / 233280;
      const gx = blkX + 6 + h1 * (blkW - 12);
      const gy = blkY + 6 + h2 * (blkH - 12);
      const gh = 4 + ((i * 13) % 5);
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx - 2, gy - gh);
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + 2, gy - gh);
      ctx.stroke();
    }

    ctx.strokeStyle = isDark ? 'rgba(220,230,255,0.4)' : 'rgba(60,70,90,0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(blkX, blkY, blkW, blkH);

    const p0 = { x: blkX, y: blkY + blkH };
    const pC = { x: blkX + blkW, y: blkY + blkH };
    const p1 = { x: blkX + blkW, y: blkY };

    ctx.strokeStyle = isDark ? 'rgba(200,210,230,0.75)' : 'rgba(60,70,90,0.75)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(pC.x, pC.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = BRAND_COLOR;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    const stepCount = 5;
    ctx.fillStyle = hexAlpha(BRAND_COLOR, 0.7);
    for (let i = 1; i < stepCount; i++) {
      const t = i / stepCount;
      const fx = p0.x + (p1.x - p0.x) * t;
      const fy = p0.y + (p1.y - p0.y) * t;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 4, 2.5, Math.atan2(p1.y - p0.y, p1.x - p0.x), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = isDark ? '#f1f5f9' : '#0f172a';
    ctx.beginPath();
    ctx.arc(p0.x, p0.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = BRAND_COLOR;
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, 5, 0, Math.PI * 2);
    ctx.fill();

    const sum = a + b;
    const saved = sum - c;
    const pct = sum > 0 ? (saved / sum) * 100 : 0;
    const fmt = (v: number) => (v >= 10 ? v.toFixed(0) : v.toFixed(1));
    const badge = `돌아가면 ${fmt(sum)}m · 가로지르면 ${fmt(c)}m · ${pct.toFixed(0)}% 절약`;

    ctx.font = '600 11px -apple-system, sans-serif';
    const bw = Math.min(w - 20, ctx.measureText(badge).width + 16);
    const bh = 22;
    const bx = 10;
    const by = 10;
    ctx.fillStyle = hexAlpha(BRAND_COLOR, isDark ? 0.26 : 0.16);
    roundRect(ctx, bx, by, bw, bh, 11);
    ctx.fill();
    ctx.strokeStyle = BRAND_COLOR;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = BRAND_COLOR;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, bx + 8, by + bh / 2 + 0.5);
  }
}
