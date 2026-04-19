/**
 * 피타고라스 — TV 화면 렌더러.
 *
 * a: 화면 가로(m), b: 화면 세로(m), c: 화면 대각선(m).
 * TV는 관례적으로 대각선 인치(inch = c * 39.37)로 크기를 표시한다.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { Graphics2D } from '../../../graphics/Graphics2D';
import { roundRect, formatN } from '../../../graphics/draw';

const BRAND_COLOR = '#7C3AED';

export class PythagoreanTvRenderer {
  private graphics: Graphics2D;
  private a = 1.218;
  private b = 0.685;
  private c = Math.sqrt(1.218 * 1.218 + 0.685 * 0.685);

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

    ctx.fillStyle = isDark ? '#0b1220' : '#f1f5f9';
    ctx.fillRect(0, 0, w, h);

    const bezel = 0.04;
    const standH = 0.14;
    const measureMargin = 36;
    const padT = 14;
    const padX = 20;
    const innerW = Math.max(1, w - padX * 2);
    const innerH = Math.max(1, h - padT - measureMargin);
    const ratio = a / b;
    let screenW = innerW * (1 - bezel * 2);
    let screenH = screenW / ratio;
    const maxScreenH = innerH * (1 - bezel * 2 - standH);
    if (screenH > maxScreenH) {
      screenH = maxScreenH;
      screenW = screenH * ratio;
    }
    const bezelPx = screenW * bezel;
    const standHPx = screenH * standH;

    const tvW = screenW + bezelPx * 2;
    const tvH = screenH + bezelPx * 2;
    const tvX = (w - tvW) / 2;
    const tvY = padT;
    const screenX = tvX + bezelPx;
    const screenY = tvY + bezelPx;

    ctx.fillStyle = isDark ? '#1f2937' : '#1e293b';
    roundRect(ctx, tvX, tvY, tvW, tvH, 6);
    ctx.fill();

    const screenGrad = ctx.createLinearGradient(screenX, screenY, screenX, screenY + screenH);
    screenGrad.addColorStop(0, isDark ? '#1e293b' : '#334155');
    screenGrad.addColorStop(1, isDark ? '#0f172a' : '#1e293b');
    ctx.fillStyle = screenGrad;
    ctx.fillRect(screenX, screenY, screenW, screenH);

    ctx.strokeStyle = BRAND_COLOR;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(screenX, screenY + screenH);
    ctx.lineTo(screenX + screenW, screenY);
    ctx.stroke();
    ctx.setLineDash([]);

    const inch = c * 39.3701;
    ctx.font = `600 ${Math.min(42, screenH * 0.35).toFixed(0)}px -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(245,248,255,0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${inch.toFixed(1)}"`, screenX + screenW / 2, screenY + screenH / 2);

    const standW = tvW * 0.35;
    const standNeckW = tvW * 0.08;
    const standX = tvX + (tvW - standW) / 2;
    const standY = tvY + tvH;
    ctx.fillStyle = isDark ? '#1f2937' : '#334155';
    ctx.fillRect(tvX + (tvW - standNeckW) / 2, standY, standNeckW, standHPx * 0.5);
    roundRect(ctx, standX, standY + standHPx * 0.5, standW, standHPx * 0.5, 3);
    ctx.fill();

    ctx.font = '500 10px -apple-system, sans-serif';
    ctx.fillStyle = isDark ? 'rgba(235,240,250,0.85)' : 'rgba(30,40,55,0.85)';
    ctx.strokeStyle = isDark ? 'rgba(235,240,250,0.6)' : 'rgba(30,40,55,0.55)';
    ctx.lineWidth = 1;

    const aMy = h - 14;
    ctx.beginPath();
    ctx.moveTo(screenX, aMy - 4);
    ctx.lineTo(screenX, aMy + 4);
    ctx.moveTo(screenX + screenW, aMy - 4);
    ctx.lineTo(screenX + screenW, aMy + 4);
    ctx.moveTo(screenX, aMy);
    ctx.lineTo(screenX + screenW, aMy);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${(a * 100).toFixed(0)}cm`, screenX + screenW / 2, aMy - 6);

    const bMx = screenX + screenW + 18;
    if (bMx < w - 8) {
      ctx.beginPath();
      ctx.moveTo(bMx - 4, screenY);
      ctx.lineTo(bMx + 4, screenY);
      ctx.moveTo(bMx - 4, screenY + screenH);
      ctx.lineTo(bMx + 4, screenY + screenH);
      ctx.moveTo(bMx, screenY);
      ctx.lineTo(bMx, screenY + screenH);
      ctx.stroke();
      ctx.save();
      ctx.translate(bMx + 4, screenY + screenH / 2);
      ctx.rotate(Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${(b * 100).toFixed(0)}cm`, 0, 0);
      ctx.restore();
    }

    const badge = `c = ${formatN(c)}m`;
    ctx.font = '600 11px -apple-system, sans-serif';
    const bw = ctx.measureText(badge).width + 16;
    const bh = 20;
    const bx = 10;
    const by = 10;
    ctx.fillStyle = isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.14)';
    roundRect(ctx, bx, by, bw, bh, 10);
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
