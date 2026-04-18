/**
 * 다리 아치 — 이차함수 렌더러.
 *
 * 하늘·수면·교각·아치·반사를 전체 캔버스에 배치.
 * 두 실수근이 있으면 그 x좌표에 교각을 세우고, 꼭짓점 y를 아치 정점 높이로 라벨링.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { Graphics2D } from '../../../graphics/Graphics2D';
import { hexAlpha, roundRect } from '../../../graphics/draw';
import {
  quadRoots,
  quadVertex,
  worldToCanvas,
  type ParabolaView,
} from '../_shared/quadratic';

const BRAND_COLOR = '#0EA5E9';

export class QuadraticBridgeRenderer {
  private graphics: Graphics2D;
  private a = -0.05;
  private b = 0;
  private c = 5;

  constructor(container: HTMLElement, options: VisualizerMountOptions) {
    this.graphics = new Graphics2D(container, {
      width: options.width,
      height: options.height,
      theme: options.theme,
      onFrame: (ctx, frame) => this.render(ctx, frame.width, frame.height),
    });
  }

  update(context: VisualizerUpdate): void {
    const { params } = context;
    if (typeof params.a === 'number') this.a = params.a;
    if (typeof params.b === 'number') this.b = params.b;
    if (typeof params.c === 'number') this.c = params.c;
  }

  resize(width: number, height: number): void {
    this.graphics.resize(width, height);
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const isDark = this.graphics.theme === 'dark';
    const { a, b, c } = this;
    const { vx, vy } = quadVertex(a, b, c);
    const roots = quadRoots(a, b, c);

    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    skyGrad.addColorStop(0, isDark ? '#0f172a' : '#bfdbfe');
    skyGrad.addColorStop(1, isDark ? '#1e3a8a' : '#e0f2fe');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    let xMin: number;
    let xMax: number;
    if (roots.length === 2) {
      const spread = Math.abs(roots[1] - roots[0]);
      const pad = spread * 0.25;
      xMin = Math.min(...roots) - pad;
      xMax = Math.max(...roots) + pad;
    } else {
      xMin = vx - 50;
      xMax = vx + 50;
    }
    const waterLevel = 0;
    const yMin = Math.min(waterLevel - 4, vy - Math.abs(vy) * 0.1);
    const yMax = Math.max(waterLevel + 2, vy + Math.abs(vy) * 0.25);

    const padL = 20;
    const padR = 20;
    const padT = 44;
    const padB = 28;
    const left = padL;
    const top = padT;
    const width = Math.max(1, w - padL - padR);
    const height = Math.max(1, h - padT - padB);
    const view: ParabolaView = { xMin, xMax, yMin, yMax, left, top, width, height };

    const { cy: waterCy } = worldToCanvas(view, 0, waterLevel);
    const waterY = Math.min(h, Math.max(top, waterCy));
    const seaGrad = ctx.createLinearGradient(0, waterY, 0, h);
    seaGrad.addColorStop(0, isDark ? '#1e3a8a' : '#3b82f6');
    seaGrad.addColorStop(1, isDark ? '#0c4a6e' : '#1e40af');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, waterY, w, h - waterY);
    ctx.strokeStyle = isDark ? 'rgba(191,219,254,0.45)' : 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, waterY);
    ctx.lineTo(w, waterY);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, waterY, w, h - waterY);
    ctx.clip();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = BRAND_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const N = 80;
    let started = false;
    for (let i = 0; i <= N; i++) {
      const wx = xMin + (i / N) * (xMax - xMin);
      const wy = a * wx * wx + b * wx + c;
      if (wy < 0) continue;
      const { cx, cy } = worldToCanvas(view, wx, -wy);
      if (!started) {
        ctx.moveTo(cx, cy);
        started = true;
      } else {
        ctx.lineTo(cx, cy);
      }
    }
    ctx.stroke();
    ctx.restore();

    if (roots.length === 2) {
      for (const r of roots) {
        const { cx } = worldToCanvas(view, r, 0);
        const colW = 14;
        ctx.fillStyle = isDark ? '#475569' : '#64748b';
        ctx.fillRect(cx - colW / 2, waterY, colW, h - waterY);
        ctx.fillStyle = isDark ? '#1e293b' : '#334155';
        ctx.fillRect(cx - colW / 2 - 4, h - 10, colW + 8, 10);
      }
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top - 2, w, waterY - top + 2);
    ctx.clip();
    ctx.fillStyle = hexAlpha(BRAND_COLOR, 0.2);
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const wx = xMin + (i / N) * (xMax - xMin);
      const wy = a * wx * wx + b * wx + c;
      const { cx, cy } = worldToCanvas(view, wx, Math.max(waterLevel, wy));
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    const { cx: endCx } = worldToCanvas(view, xMax, waterLevel);
    const { cx: startCx } = worldToCanvas(view, xMin, waterLevel);
    ctx.lineTo(endCx, waterY);
    ctx.lineTo(startCx, waterY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = BRAND_COLOR;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let archStarted = false;
    for (let i = 0; i <= N; i++) {
      const wx = xMin + (i / N) * (xMax - xMin);
      const wy = a * wx * wx + b * wx + c;
      if (wy < waterLevel) continue;
      const { cx, cy } = worldToCanvas(view, wx, wy);
      if (!archStarted) {
        ctx.moveTo(cx, cy);
        archStarted = true;
      } else {
        ctx.lineTo(cx, cy);
      }
    }
    ctx.stroke();
    ctx.restore();

    if (vy > waterLevel) {
      const { cx, cy } = worldToCanvas(view, vx, vy);
      ctx.fillStyle = BRAND_COLOR;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.font = '600 10px -apple-system, sans-serif';
      ctx.fillStyle = isDark ? '#ffffff' : '#1e293b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${vy.toFixed(1)}m`, cx, cy - 8);
    }

    const span = roots.length === 2 ? Math.abs(roots[1] - roots[0]) : 0;
    const badge = span > 0 ? `높이 ${vy.toFixed(1)}m · 경간 ${span.toFixed(1)}m` : `높이 ${vy.toFixed(1)}m`;
    drawBadge(ctx, 12, 12, badge, isDark);

    ctx.font = '500 10px -apple-system, sans-serif';
    ctx.fillStyle = isDark ? 'rgba(200,210,230,0.85)' : 'rgba(30,41,59,0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('교각 위치 = 근 · 아치 정점 = 꼭짓점', w / 2, h - 8);
  }
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
  ctx.fillStyle = isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.92)';
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = hexAlpha(BRAND_COLOR, 0.7);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = BRAND_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.restore();
}
