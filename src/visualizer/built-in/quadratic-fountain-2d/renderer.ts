/**
 * 분수 — 이차함수 렌더러.
 *
 * 밤 정원 배경 + 분수대 + 메인 물줄기(포물선) + 장식 물줄기 + 낙하 물방울(애니메이션).
 * 꼭짓점 높이 라벨이 최고점에 위치.
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

const BRAND_COLOR = '#0891B2';

export class QuadraticFountainRenderer {
  private graphics: Graphics2D;
  private a = -2;
  private b = 4;
  private c = 0;
  private animT = 0;

  constructor(container: HTMLElement, options: VisualizerMountOptions) {
    this.graphics = new Graphics2D(container, {
      width: options.width,
      height: options.height,
      theme: options.theme,
      onFrame: (ctx, frame) => {
        this.animT += frame.dt;
        this.render(ctx, frame.width, frame.height);
      },
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
    const { a, b, c, animT } = this;
    const { vx, vy } = quadVertex(a, b, c);
    const roots = quadRoots(a, b, c);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, isDark ? '#0f172a' : '#dbeafe');
    bgGrad.addColorStop(1, isDark ? '#020617' : '#93c5fd');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    if (isDark) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      for (let i = 0; i < 30; i++) {
        const sx = (i * 73) % w;
        const sy = (i * 137) % (h * 0.5);
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const landX = roots.length === 2 ? Math.max(...roots) : Math.max(vx * 2, 4);
    const launchX = roots.length === 2 ? Math.min(...roots) : 0;
    const span = landX - launchX;
    const centerX = (launchX + landX) / 2;
    const xMin = centerX - span * 1.2;
    const xMax = centerX + span * 1.2;
    const yMin = -0.5;
    const yMax = Math.max(2, vy * 1.3);

    const padL = 10;
    const padR = 10;
    const padT = 44;
    const padB = 44;
    const left = padL;
    const top = padT;
    const width = Math.max(1, w - padL - padR);
    const height = Math.max(1, h - padT - padB);
    const view: ParabolaView = { xMin, xMax, yMin, yMax, left, top, width, height };

    const { cy: poolY } = worldToCanvas(view, 0, 0);
    const { cx: centerCx } = worldToCanvas(view, centerX, 0);
    const poolW = Math.min(width * 0.7, Math.max(80, span * (width / (xMax - xMin)) * 1.1));
    const poolH = 18;
    ctx.fillStyle = isDark ? '#334155' : '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(centerCx, poolY + poolH / 2, poolW / 2, poolH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hexAlpha(BRAND_COLOR, 0.35);
    ctx.beginPath();
    ctx.ellipse(centerCx, poolY + 3, poolW / 2 - 6, (poolH - 6) / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#1e293b' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(centerCx, poolY + poolH / 2, poolW / 2, poolH / 2, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = isDark ? '#1e293b' : '#64748b';
    ctx.fillRect(centerCx - poolW / 2 - 8, poolY + poolH, poolW + 16, h - (poolY + poolH));

    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, width, poolY - top);
    ctx.clip();
    const deco = [0.6, 0.8, 1.2, 1.4];
    for (const f of deco) {
      const a2 = a * f;
      const vyNew = vy / f;
      const b2 = -2 * a2 * vx;
      const c2 = vyNew - a2 * vx * vx - b2 * vx;
      drawParabola(ctx, view, a2, b2, c2, {
        strokeStyle: hexAlpha(BRAND_COLOR, 0.25),
        lineWidth: 1.5,
      });
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, width, poolY - top + 2);
    ctx.clip();
    const grad = ctx.createLinearGradient(0, top, 0, poolY);
    grad.addColorStop(0, isDark ? '#bae6fd' : '#38bdf8');
    grad.addColorStop(1, BRAND_COLOR);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    const N = 80;
    let mainStarted = false;
    for (let i = 0; i <= N; i++) {
      const wx = xMin + (i / N) * (xMax - xMin);
      const wy = a * wx * wx + b * wx + c;
      if (wy < 0) continue;
      const { cx, cy } = worldToCanvas(view, wx, wy);
      if (!mainStarted) {
        ctx.moveTo(cx, cy);
        mainStarted = true;
      } else {
        ctx.lineTo(cx, cy);
      }
    }
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = hexAlpha(isDark ? '#bae6fd' : '#38bdf8', 0.7);
    const dropCount = 12;
    for (let i = 0; i < dropCount; i++) {
      const progress = (i / dropCount + animT * 0.3) % 1;
      const wx = launchX + progress * (landX - launchX);
      const baseY = a * wx * wx + b * wx + c;
      const wy = Math.max(0, baseY - progress * 0.3);
      if (wy < 0) continue;
      const { cx, cy } = worldToCanvas(view, wx, wy);
      ctx.beginPath();
      ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (vy > 0) {
      const { cx, cy } = worldToCanvas(view, vx, vy);
      ctx.fillStyle = isDark ? '#e0f2fe' : '#0369a1';
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '600 10px -apple-system, sans-serif';
      ctx.fillStyle = isDark ? '#f0f9ff' : '#0c4a6e';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${vy.toFixed(1)}m`, cx, cy - 8);
    }

    drawBadge(ctx, 12, 12, `최대 높이 ${vy.toFixed(1)}m`, isDark);

    ctx.font = '500 10px -apple-system, sans-serif';
    ctx.fillStyle = isDark ? 'rgba(200,210,230,0.85)' : 'rgba(30,41,59,0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('|a|가 작을수록 더 높이 솟는다', w / 2, h - 8);
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
