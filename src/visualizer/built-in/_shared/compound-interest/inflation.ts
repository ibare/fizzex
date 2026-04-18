/**
 * 📉 인플레이션 장면 — 장바구니가 점점 작아짐 (구매력 감소).
 *
 * 수식은 같은 복리지만 시각화는 "구매력 = P²/A" 역방향.
 */

import { hexAlpha } from '../../../../graphics/draw';
import { doubleTime, formatKrw } from './math';
import type { SceneDrawArgs } from './types';

export function drawInflation(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, P, r, A, A_std, isStandard, animT, color, isDark } = args;
  ctx.save();

  const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
  bgGrad.addColorStop(0, isDark ? '#1c1917' : '#fef2f2');
  bgGrad.addColorStop(1, isDark ? '#0c0a09' : '#fee2e2');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(x, y, w, h);

  const floorY = y + h - 28;
  ctx.strokeStyle = isDark ? '#78716c' : '#991b1b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 8, floorY);
  ctx.lineTo(x + w - 8, floorY);
  ctx.stroke();

  const power = A > 0 ? (P * P) / A : 0;
  const power_std = A_std > 0 ? (P * P) / A_std : 0;

  const leftCx = x + w * 0.3;
  const rightCx = x + w * 0.62;
  const baseSize = Math.min(90, Math.min(w * 0.22, h * 0.55));

  drawBasket(ctx, leftCx, floorY, baseSize, 1, '#a8a29e', isDark, animT, true);
  labelBelow(ctx, leftCx, floorY + 4, `오늘 ${formatKrw(P)}`, isDark);

  const shrink = Math.max(0.15, Math.min(1, power / P));
  const shrink_std = Math.max(0.15, Math.min(1, power_std / P));

  if (!isStandard) {
    ctx.save();
    ctx.strokeStyle = hexAlpha(color, 0.5);
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.2;
    const sz = baseSize * shrink_std;
    ctx.strokeRect(rightCx - sz / 2 - 2, floorY - sz - 2, sz + 4, sz + 4);
    ctx.restore();
  }

  drawBasket(ctx, rightCx, floorY, baseSize, shrink, color, isDark, animT, false);
  labelBelow(ctx, rightCx, floorY + 4, `미래 ${formatKrw(power)}`, isDark, color);

  if (power < P * 0.99) {
    ctx.strokeStyle = hexAlpha(color, 0.7);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    const midY = floorY - baseSize - 16;
    ctx.beginPath();
    ctx.moveTo(leftCx + baseSize / 2 + 4, midY);
    ctx.lineTo(rightCx - baseSize * shrink / 2 - 8, midY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(rightCx - baseSize * shrink / 2 - 8, midY);
    ctx.lineTo(rightCx - baseSize * shrink / 2 - 14, midY - 4);
    ctx.lineTo(rightCx - baseSize * shrink / 2 - 14, midY + 4);
    ctx.closePath();
    ctx.fillStyle = hexAlpha(color, 0.8);
    ctx.fill();
    const loss = P - power;
    ctx.font = '600 10px ui-monospace, Menlo, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`−${formatKrw(loss)}`, (leftCx + rightCx) / 2, midY - 6);
  }

  const tDouble = doubleTime(r);
  const ratePct = (r * 100).toFixed(1);
  const badgeText = Number.isFinite(tDouble)
    ? `${ratePct}% 인플레 · ${tDouble.toFixed(0)}년 후 절반`
    : `${ratePct}% 인플레`;
  drawBadge(ctx, x + w - 10, y + h - 10, badgeText, color, isDark);

  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(254,202,202,0.85)' : 'rgba(127,29,29,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('같은 돈으로 살 수 있는 게 줄어든다', x + w / 2, y + 8);

  ctx.restore();
}

function drawBasket(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  baseSize: number,
  fill: number,
  color: string,
  isDark: boolean,
  animT: number,
  full: boolean,
): void {
  const size = baseSize * Math.max(0.1, fill);
  if (size <= 0) return;

  const basketTop = bottomY - size;
  const basketW = size * 1.1;

  ctx.strokeStyle = isDark ? '#78716c' : '#57534e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, basketTop - size * 0.05, size * 0.45, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  ctx.save();
  const bodyGrad = ctx.createLinearGradient(cx, basketTop, cx, bottomY);
  bodyGrad.addColorStop(0, isDark ? '#57534e' : '#e7e5e4');
  bodyGrad.addColorStop(1, isDark ? '#292524' : '#a8a29e');
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = isDark ? '#44403c' : '#57534e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - basketW / 2, basketTop);
  ctx.lineTo(cx + basketW / 2, basketTop);
  ctx.lineTo(cx + basketW / 2 - size * 0.12, bottomY);
  ctx.lineTo(cx - basketW / 2 + size * 0.12, bottomY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const ratio = i / 4;
    ctx.beginPath();
    ctx.moveTo(cx - basketW / 2 + size * 0.12 * ratio, basketTop + size * ratio);
    ctx.lineTo(cx + basketW / 2 - size * 0.12 * ratio, basketTop + size * ratio);
    ctx.stroke();
  }
  ctx.restore();

  const items = full ? 6 : Math.max(1, Math.round(6 * fill));
  for (let i = 0; i < items; i++) {
    const phase = (i / items) * Math.PI * 2 + animT * 0.3;
    const rx = cx + Math.cos(phase) * size * 0.28;
    const ry = basketTop - size * 0.12 + Math.sin(phase * 1.3) * size * 0.08;
    const radius = size * 0.12;
    const fruitColors = ['#ef4444', '#f59e0b', '#84cc16', '#8b5cf6'];
    const fc = fruitColors[i % fruitColors.length];
    ctx.fillStyle = fc;
    ctx.strokeStyle = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(rx, ry, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(rx - radius * 0.3, ry - radius * 0.3, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  if (fill < 0.3) {
    ctx.font = '600 10px -apple-system, sans-serif';
    ctx.fillStyle = hexAlpha(color, 0.8);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('…', cx, basketTop + size * 0.5);
  }
}

function labelBelow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  text: string,
  isDark: boolean,
  color?: string,
): void {
  ctx.font = '600 10px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color ?? (isDark ? '#e2e8f0' : '#1e293b');
  ctx.fillText(text, cx, topY);
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
