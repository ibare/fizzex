/**
 * 📈 주식 장기투자 장면 — 5년 단위 성장 막대 차트.
 *
 * 10/20/30년 지점에 ×2/×4/×8 이정표 (연 7% 기준 근사).
 */

import { hexAlpha } from '../../../../graphics/draw';
import { compoundA, formatKrw } from './math';
import type { SceneDrawArgs } from './types';

export function drawStock(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, P, r, n, t, A, tMax, animT, color, isDark } = args;
  ctx.save();

  const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
  bgGrad.addColorStop(0, isDark ? '#0b1e3a' : '#eff6ff');
  bgGrad.addColorStop(1, isDark ? '#0a0f2c' : '#dbeafe');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(x, y, w, h);

  const padL = 34;
  const padR = 18;
  const padT = 24;
  const padB = 32;
  const left = x + padL;
  const top = y + padT;
  const width = w - padL - padR;
  const height = h - padT - padB;

  const step = 5;
  const nBars = Math.max(1, Math.floor(tMax / step));
  const tEnd = nBars * step;
  const maxA = compoundA(P, r, n, tEnd);
  const scaleMax = Math.max(maxA, P * 2);

  ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let j = 0; j <= 5; j++) {
    const cy = top + (j / 5) * height;
    ctx.moveTo(left, cy);
    ctx.lineTo(left + width, cy);
  }
  ctx.stroke();

  const baseY = top + height - (P / scaleMax) * height;
  ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.7)' : 'rgba(71,85,105,0.6)';
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(left, baseY);
  ctx.lineTo(left + width, baseY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = '600 9px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(203,213,225,0.9)' : 'rgba(51,65,85,0.85)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`원금 ${formatKrw(P)}`, left + 4, baseY - 2);

  const gap = 4;
  const barW = (width - gap * (nBars - 1)) / nBars;
  for (let i = 0; i < nBars; i++) {
    const tEndBar = (i + 1) * step;
    const a = compoundA(P, r, n, tEndBar);
    const reached = Math.min(1, Math.max(0, (t - i * step) / step));
    const displayA = P + (a - P) * reached;
    const barH = Math.max(0, (displayA / scaleMax) * height);
    const bx = left + i * (barW + gap);
    const by = top + height - barH;

    const barGrad = ctx.createLinearGradient(0, by, 0, top + height);
    barGrad.addColorStop(0, hexAlpha(color, 0.95));
    barGrad.addColorStop(1, hexAlpha(color, 0.5));
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, barW, barH, 3);
    else ctx.rect(bx, by, barW, barH);
    ctx.fill();
    ctx.strokeStyle = hexAlpha(color, 0.9);
    ctx.lineWidth = 1;
    ctx.stroke();

    if (barH > 0 && displayA > P) {
      const gainH = ((displayA - P) / scaleMax) * height;
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = color;
      ctx.fillRect(bx, by, barW, gainH);
      ctx.restore();
    }

    if (barH > 26 && reached > 0) {
      ctx.font = '600 9px ui-monospace, Menlo, monospace';
      ctx.fillStyle = isDark ? '#e2e8f0' : '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(formatKrw(displayA), bx + barW / 2, by - 2);
    }
  }

  ctx.strokeStyle = isDark ? 'rgba(203,213,225,0.55)' : 'rgba(30,41,59,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top + height);
  ctx.lineTo(left + width, top + height);
  ctx.stroke();
  ctx.font = '500 9px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(148,163,184,0.85)' : 'rgba(71,85,105,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= nBars; i++) {
    const yr = i * step;
    const cx = left + (yr / tEnd) * width;
    ctx.fillText(`${yr}`, cx, top + height + 3);
  }

  const milestones = [
    { yr: 10, label: '×2' },
    { yr: 20, label: '×4' },
    { yr: 30, label: '×8' },
  ];
  for (const m of milestones) {
    if (m.yr > tEnd) continue;
    const cx = left + (m.yr / tEnd) * width;
    ctx.strokeStyle = hexAlpha(color, 0.5);
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(cx, top + height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '700 9px -apple-system, sans-serif';
    const tw = ctx.measureText(m.label).width + 8;
    const bx = cx - tw / 2;
    const by = top - 2;
    ctx.fillStyle = hexAlpha(color, 0.85);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, tw, 14, 3);
    else ctx.rect(bx, by, tw, 14);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(m.label, cx, by + 7);
  }

  if (t >= 0 && t <= tEnd) {
    const cx = left + (t / tEnd) * width;
    const cy = top + height - (A / scaleMax) * height;
    const pulse = 4 + Math.sin(animT * 6) * 1.5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(191,219,254,0.85)' : 'rgba(30,58,138,0.85)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('기하급수로 커지는 복리', left, y + 6);

  ctx.restore();
}
