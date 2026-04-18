/**
 * 자유탐구 — 이차함수 렌더러.
 *
 * 캔버스 전체에 좌표평면(격자 + 축) + 포물선 + 꼭짓점·근·현재점 마커.
 * 상단 계수 배지로 y = a x² + b x + c 현재 형태를 표시한다.
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

const BRAND_COLOR = '#6366F1';

export class QuadraticSandboxRenderer {
  private graphics: Graphics2D;
  private a = 1;
  private b = 0;
  private c = 0;
  private xCur = 0;
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

    ctx.fillStyle = isDark ? '#0f172a' : '#f1f5f9';
    ctx.fillRect(0, 0, w, h);

    const padL = 36;
    const padR = 20;
    const padT = 52;
    const padB = 28;
    const left = padL;
    const top = padT;
    const width = Math.max(1, w - padL - padR);
    const height = Math.max(1, h - padT - padB);

    const vtx = quadVertex(a, b, c);
    const roots = quadRoots(a, b, c);
    const centerX = Number.isFinite(vtx.vx) ? vtx.vx : 0;
    const spanX = Math.max(12, Math.abs(vtx.vy) * 0.5, ...roots.map((r) => Math.abs(r - centerX) * 2));
    const xMin = centerX - spanX / 2;
    const xMax = centerX + spanX / 2;

    const samples = 64;
    const ys: number[] = [];
    for (let i = 0; i <= samples; i++) {
      const wx = xMin + (i / samples) * (xMax - xMin);
      ys.push(a * wx * wx + b * wx + c);
    }
    let yMin = Math.min(0, ...ys);
    let yMax = Math.max(0, ...ys);
    const pad = (yMax - yMin) * 0.15 || 1;
    yMin -= pad;
    yMax += pad;

    const view: ParabolaView = { xMin, xMax, yMin, yMax, left, top, width, height };

    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const cx = left + (i / 20) * width;
      ctx.moveTo(cx, top);
      ctx.lineTo(cx, top + height);
    }
    for (let j = 0; j <= 16; j++) {
      const cy = top + (j / 16) * height;
      ctx.moveTo(left, cy);
      ctx.lineTo(left + width, cy);
    }
    ctx.stroke();

    ctx.strokeStyle = isDark ? 'rgba(203,213,225,0.55)' : 'rgba(30,41,59,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (yMin <= 0 && yMax >= 0) {
      const { cy } = worldToCanvas(view, 0, 0);
      ctx.moveTo(left, cy);
      ctx.lineTo(left + width, cy);
    }
    if (xMin <= 0 && xMax >= 0) {
      const { cx } = worldToCanvas(view, 0, 0);
      ctx.moveTo(cx, top);
      ctx.lineTo(cx, top + height);
    }
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, width, height);
    ctx.clip();
    ctx.fillStyle = hexAlpha(BRAND_COLOR, 0.1);
    ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const wx = xMin + (i / samples) * (xMax - xMin);
      const wy = a * wx * wx + b * wx + c;
      const { cx, cy } = worldToCanvas(view, wx, wy);
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    const baseCy = yMin <= 0 && yMax >= 0 ? worldToCanvas(view, 0, 0).cy : top + height;
    const { cx: endCx } = worldToCanvas(view, xMax, 0);
    const { cx: startCx } = worldToCanvas(view, xMin, 0);
    ctx.lineTo(endCx, baseCy);
    ctx.lineTo(startCx, baseCy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    drawParabola(ctx, view, a, b, c, { strokeStyle: BRAND_COLOR, lineWidth: 2.5 });

    ctx.font = '500 9px -apple-system, sans-serif';
    ctx.fillStyle = isDark ? 'rgba(148,163,184,0.85)' : 'rgba(71,85,105,0.85)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const gridStepY = niceStep((yMax - yMin) / 5);
    for (let gy = Math.ceil(yMin / gridStepY) * gridStepY; gy <= yMax; gy += gridStepY) {
      if (Math.abs(gy) < 1e-9) continue;
      const { cy } = worldToCanvas(view, 0, gy);
      ctx.fillText(formatLabel(gy), left - 4, cy);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const gridStepX = niceStep((xMax - xMin) / 6);
    for (let gx = Math.ceil(xMin / gridStepX) * gridStepX; gx <= xMax; gx += gridStepX) {
      if (Math.abs(gx) < 1e-9) continue;
      const { cx } = worldToCanvas(view, gx, 0);
      ctx.fillText(formatLabel(gx), cx, top + height + 4);
    }

    for (const r of roots) {
      if (r < xMin || r > xMax) continue;
      const { cx, cy } = worldToCanvas(view, r, 0);
      ctx.fillStyle = isDark ? '#fbbf24' : '#ea580c';
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    if (vtx.vx >= xMin && vtx.vx <= xMax && vtx.vy >= yMin && vtx.vy <= yMax) {
      const { cx, cy } = worldToCanvas(view, vtx.vx, vtx.vy);
      ctx.strokeStyle = hexAlpha(BRAND_COLOR, 0.35);
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, top);
      ctx.lineTo(cx, top + height);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = BRAND_COLOR;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = BRAND_COLOR;
      ctx.font = '600 10px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`(${formatLabel(vtx.vx)}, ${formatLabel(vtx.vy)})`, cx + 8, cy - 6);
    }

    if (xCur >= xMin && xCur <= xMax && yCur >= yMin && yCur <= yMax) {
      const { cx, cy } = worldToCanvas(view, xCur, yCur);
      ctx.fillStyle = isDark ? '#f1f5f9' : '#0b1220';
      ctx.beginPath();
      ctx.arc(cx, cy, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }

    const badge = `y = ${fmtCoef(a, 'a')}x² ${fmtCoef(b, 'bx')} ${fmtCoef(c, 'c')}`;
    ctx.font = '600 11px ui-monospace, Menlo, monospace';
    const textW = ctx.measureText(badge).width + 16;
    const bx = 12;
    const by = 12;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.82)' : 'rgba(255,255,255,0.92)';
    roundRect(ctx, bx, by, textW, 24, 6);
    ctx.fill();
    ctx.strokeStyle = hexAlpha(BRAND_COLOR, 0.6);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = BRAND_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, bx + textW / 2, by + 12);

    ctx.font = '500 10px -apple-system, sans-serif';
    ctx.fillStyle = isDark ? 'rgba(200,210,230,0.75)' : 'rgba(60,70,90,0.78)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('a·b·c를 바꾸며 포물선의 변화 관찰', w / 2, h - 8);
  }
}

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const n = raw / base;
  let factor = 1;
  if (n < 1.5) factor = 1;
  else if (n < 3) factor = 2;
  else if (n < 7.5) factor = 5;
  else factor = 10;
  return factor * base;
}

function formatLabel(n: number): string {
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Math.abs(n) >= 10) return n.toFixed(1);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  if (Math.abs(n) < 0.01) return n.toExponential(1);
  return n.toFixed(2);
}

function fmtCoef(v: number, slot: 'a' | 'bx' | 'c'): string {
  if (slot === 'a') {
    if (Math.abs(v) < 1e-9) return '0';
    return v < 0 ? `−${Math.abs(v).toFixed(2)}` : v.toFixed(2);
  }
  if (slot === 'bx') {
    if (Math.abs(v) < 1e-9) return '';
    const sign = v < 0 ? '−' : '+';
    return `${sign} ${Math.abs(v).toFixed(2)}x`;
  }
  if (Math.abs(v) < 1e-9) return '';
  const sign = v < 0 ? '−' : '+';
  return `${sign} ${Math.abs(v).toFixed(2)}`;
}
