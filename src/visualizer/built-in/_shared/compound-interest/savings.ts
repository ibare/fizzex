/**
 * 🏦 예금 장면 — 동전 스택이 시간에 따라 쌓임.
 */

import { hexAlpha } from '../../../../graphics/draw';
import { doubleTime, formatKrw } from './math';
import type { SceneDrawArgs } from './types';

export function drawSavings(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, P, r, A, A_std, isStandard, color, isDark } = args;
  ctx.save();

  const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
  bgGrad.addColorStop(0, isDark ? '#0f172a' : '#ecfdf5');
  bgGrad.addColorStop(1, isDark ? '#042f2e' : '#d1fae5');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(x, y, w, h);

  const floorY = y + h - 28;
  ctx.strokeStyle = isDark ? '#134e4a' : '#047857';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 8, floorY);
  ctx.lineTo(x + w - 8, floorY);
  ctx.stroke();

  const leftCx = x + w * 0.28;
  const rightCx = x + w * 0.58;
  const stackW = Math.min(72, w * 0.18);
  const maxStackH = Math.min(h - 80, 140);
  const maxRatio = Math.max(A / P, A_std / P, 2.2);
  const unitH = maxStackH / maxRatio;

  drawCoinStack(ctx, leftCx, floorY, stackW, 1 * unitH, '#9ca3af', isDark);
  labelStack(ctx, leftCx, floorY - 1 * unitH, formatKrw(P), isDark, '#475569');

  if (!isStandard) {
    const stdH = Math.max(0, (A_std / P) * unitH);
    ctx.save();
    ctx.strokeStyle = hexAlpha(color, 0.5);
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(rightCx - stackW / 2 - 2, floorY - stdH, stackW + 4, stdH);
    ctx.restore();
  }

  const curH = Math.max(0, (A / P) * unitH);
  drawCoinStack(ctx, rightCx, floorY, stackW, curH, color, isDark);
  labelStack(ctx, rightCx, floorY - curH, formatKrw(A), isDark, color);

  if (A > P * 1.01) {
    ctx.strokeStyle = hexAlpha(color, 0.7);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    const midY = floorY - unitH - 20;
    ctx.beginPath();
    ctx.moveTo(leftCx + stackW / 2 + 4, midY);
    ctx.lineTo(rightCx - stackW / 2 - 8, midY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(rightCx - stackW / 2 - 8, midY);
    ctx.lineTo(rightCx - stackW / 2 - 14, midY - 4);
    ctx.lineTo(rightCx - stackW / 2 - 14, midY + 4);
    ctx.closePath();
    ctx.fillStyle = hexAlpha(color, 0.8);
    ctx.fill();
    const gain = A - P;
    ctx.font = '600 10px ui-monospace, Menlo, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`+${formatKrw(gain)}`, (leftCx + rightCx) / 2, midY - 6);
  }

  const tDouble = doubleTime(r);
  const ratePct = (r * 100).toFixed(1);
  const badgeText = Number.isFinite(tDouble)
    ? `${ratePct}% · ${tDouble.toFixed(0)}년 후 2배`
    : `${ratePct}%`;
  drawBadge(ctx, x + w - 10, y + h - 10, badgeText, color, isDark);

  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(167,243,208,0.85)' : 'rgba(6,78,59,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('시간이 돈을 번다', x + w / 2, y + 8);

  ctx.restore();
}

function drawCoinStack(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  w: number,
  hTotal: number,
  color: string,
  isDark: boolean,
): void {
  if (hTotal <= 0) return;
  const coinH = 10;
  const count = Math.max(1, Math.floor(hTotal / coinH));
  for (let i = 0; i < count; i++) {
    const cy = bottomY - (i + 0.5) * coinH;
    ctx.fillStyle = hexAlpha(color, 0.9);
    ctx.strokeStyle = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, coinH * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.15, cy - coinH * 0.15, w * 0.18, coinH * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const rem = hTotal - count * coinH;
  if (rem > 1) {
    const cy = bottomY - count * coinH - rem / 2;
    ctx.fillStyle = hexAlpha(color, 0.9);
    ctx.strokeStyle = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, Math.max(2, rem * 0.55), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function labelStack(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  text: string,
  isDark: boolean,
  color: string,
): void {
  ctx.font = '600 11px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.9)';
  const tw = ctx.measureText(text).width + 10;
  const bw = tw;
  const bh = 16;
  const by = topY - bh - 4;
  const bx = cx - bw / 2;
  ctx.strokeStyle = hexAlpha(color, 0.6);
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 4);
  else ctx.rect(bx, by, bw, bh);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, by + bh / 2);
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  rightX: number,
  bottomY: number,
  text: string,
  color: string,
  isDark: boolean,
): void {
  ctx.font = '600 10px -apple-system, sans-serif';
  const tw = ctx.measureText(text).width + 14;
  const bw = tw;
  const bh = 20;
  const bx = rightX - bw;
  const by = bottomY - bh;
  ctx.fillStyle = hexAlpha(color, isDark ? 0.25 : 0.2);
  ctx.strokeStyle = hexAlpha(color, 0.65);
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 5);
  else ctx.rect(bx, by, bw, bh);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + bw / 2, by + bh / 2);
}
