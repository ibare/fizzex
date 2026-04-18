/**
 * 농구 자유투 — 이차함수 렌더러.
 *
 * 체육관 배경 + 바닥 + 선수 실루엣 + 궤적(점선) + 골대 + 공.
 * 꼭짓점에 최고점 라벨, 두 번째 근에 착지(골대) 위치.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { Graphics2D } from '../../../graphics/Graphics2D';
import { hexAlpha, roundRect } from '../../../graphics/draw';
import {
  drawParabola,
  quadRoots,
  quadVertex,
  worldToCanvas,
  type ParabolaView,
} from '../_shared/quadratic';

const BRAND_COLOR = '#EA580C';

export class QuadraticBasketballRenderer {
  private graphics: Graphics2D;
  private a = -0.5;
  private b = 2.5;
  private c = 2;
  private xCur = 2.5;
  private yCur = 0;

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
    if (typeof params.c === 'number') this.c = params.c;
    if (typeof params.x === 'number') this.xCur = params.x;
    if (typeof derived.y === 'number' && Number.isFinite(derived.y)) {
      this.yCur = derived.y;
    } else {
      this.yCur = this.a * this.xCur * this.xCur + this.b * this.xCur + this.c;
    }
  }

  resize(width: number, height: number): void {
    this.graphics.resize(width, height);
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const isDark = this.graphics.theme === 'dark';
    const { a, b, c, xCur, yCur } = this;
    const { vx, vy } = quadVertex(a, b, c);
    const roots = quadRoots(a, b, c);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, isDark ? '#111827' : '#fef3c7');
    bgGrad.addColorStop(1, isDark ? '#1f2937' : '#fde68a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const launchX = 0;
    const landX = roots.length === 2 ? Math.max(...roots) : vx * 2;
    const maxX = Math.max(8, landX * 1.25);
    const xMin = -1;
    const xMax = maxX;
    const yMin = -0.5;
    const yMax = Math.max(4, vy * 1.3);

    const padL = 16;
    const padR = 16;
    const padT = 44;
    const padB = 44;
    const left = padL;
    const top = padT;
    const width = Math.max(1, w - padL - padR);
    const height = Math.max(1, h - padT - padB);
    const view: ParabolaView = { xMin, xMax, yMin, yMax, left, top, width, height };

    const { cy: floorCy } = worldToCanvas(view, 0, 0);
    ctx.fillStyle = isDark ? '#78350f' : '#a16207';
    ctx.fillRect(0, floorCy, w, h - floorCy);
    ctx.strokeStyle = isDark ? '#fbbf24' : '#7c2d12';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, floorCy);
    ctx.lineTo(w, floorCy);
    ctx.stroke();
    ctx.strokeStyle = isDark ? 'rgba(251,191,36,0.25)' : 'rgba(120,53,15,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const px = (i / 8) * w;
      ctx.beginPath();
      ctx.moveTo(px, floorCy);
      ctx.lineTo(px, h);
      ctx.stroke();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, width, floorCy - top);
    ctx.clip();
    drawParabola(ctx, view, a, b, c, {
      strokeStyle: hexAlpha(BRAND_COLOR, 0.35),
      lineWidth: 2,
      dash: [4, 3],
    });
    ctx.restore();

    const { cx: playerCx } = worldToCanvas(view, launchX, 0);
    const { cy: releaseCy } = worldToCanvas(view, launchX, c);
    drawPlayer(ctx, playerCx, floorCy, Math.max(36, floorCy - releaseCy + 12), isDark);

    if (roots.length === 2 || landX > 0) {
      const { cx: hoopCx } = worldToCanvas(view, landX, 0);
      drawHoop(ctx, hoopCx, floorCy, isDark);
    }

    if (vy > 0 && vx > 0 && vx < xMax) {
      const { cx, cy } = worldToCanvas(view, vx, vy);
      ctx.fillStyle = hexAlpha(BRAND_COLOR, 0.25);
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = BRAND_COLOR;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, floorCy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = BRAND_COLOR;
      ctx.font = '600 10px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`최고점 ${vy.toFixed(1)}m`, cx, cy - 12);
    }

    if (xCur >= xMin && xCur <= xMax) {
      const ballY = Math.max(0, yCur);
      const { cx, cy } = worldToCanvas(view, xCur, ballY);
      drawBall(ctx, cx, cy, 10);
    }

    const peak = vy;
    const range = landX > 0 ? landX : 0;
    const badge = range > 0 ? `최고점 ${peak.toFixed(1)}m · 비거리 ${range.toFixed(1)}m` : `최고점 ${peak.toFixed(1)}m`;
    drawBadge(ctx, 12, 12, badge, isDark);

    ctx.font = '500 10px -apple-system, sans-serif';
    ctx.fillStyle = isDark ? 'rgba(254,243,199,0.85)' : 'rgba(120,53,15,0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('슛의 궤적은 언제나 포물선', w / 2, h - 8);
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  cx: number,
  floorY: number,
  bodyH: number,
  isDark: boolean,
): void {
  const bodyW = 14;
  const headR = 8;
  const color = isDark ? '#cbd5e1' : '#1e293b';
  ctx.fillStyle = color;
  roundRect(ctx, cx - bodyW / 2, floorY - bodyH + headR * 2, bodyW, bodyH - headR * 2, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, floorY - bodyH + headR, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, floorY - bodyH + headR * 2 + 4);
  ctx.lineTo(cx + 10, floorY - bodyH + 2);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function drawHoop(
  ctx: CanvasRenderingContext2D,
  cx: number,
  floorY: number,
  isDark: boolean,
): void {
  const poleH = 70;
  const boardW = 26;
  const boardH = 18;
  const ringTopY = floorY - poleH + 8;
  ctx.fillStyle = isDark ? '#64748b' : '#334155';
  ctx.fillRect(cx - 2, floorY - poleH, 4, poleH);
  ctx.fillStyle = isDark ? '#cbd5e1' : '#f8fafc';
  ctx.fillRect(cx - 2 - boardW, ringTopY - boardH / 2, boardW, boardH);
  ctx.strokeStyle = isDark ? '#475569' : '#64748b';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 2 - boardW, ringTopY - boardH / 2, boardW, boardH);
  ctx.strokeStyle = BRAND_COLOR;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx - 2 - boardW + 2, ringTopY);
  ctx.lineTo(cx - 10, ringTopY);
  ctx.stroke();
  ctx.strokeStyle = hexAlpha(BRAND_COLOR, 0.5);
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const sx = cx - 10 + i * 2;
    ctx.beginPath();
    ctx.moveTo(sx, ringTopY);
    ctx.lineTo(sx - 1 + i * 0.3, ringTopY + 8);
    ctx.stroke();
  }
}

function drawBall(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.arc(cx + 1, cy + 2, r, 0, Math.PI * 2);
  ctx.fill();
  const grad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, r);
  grad.addColorStop(0, '#fdba74');
  grad.addColorStop(1, '#c2410c');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();
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
