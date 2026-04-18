/**
 * ☕ 카페인 장면 — 커피 컵 + 액체 수위 ∝ N/N₀.
 *
 * 5시간(½), 10시간(¼), 수면(~⅛) 이정표.
 */

import { hexAlpha } from '../../../../graphics/draw';
import type { SceneDrawArgs } from './types';

export function drawCaffeine(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, N0, ratio, ratio_std, isStandard, halfLife, t, color, isDark } = args;
  ctx.save();

  const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
  bgGrad.addColorStop(0, isDark ? '#1c1917' : '#fef3c7');
  bgGrad.addColorStop(1, isDark ? '#0c0a09' : '#fde68a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = isDark ? '#44403c' : '#a16207';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h - 24);
  ctx.lineTo(x + w, y + h - 24);
  ctx.stroke();

  const cupCx = x + w * 0.32;
  const cupW = 110;
  const cupH = Math.min(h - 60, 140);
  const cupTop = y + h - 30 - cupH;
  const cupBottom = y + h - 30;

  ctx.fillStyle = isDark ? '#fafaf9' : '#ffffff';
  ctx.strokeStyle = isDark ? '#78716c' : '#44403c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cupCx - cupW / 2, cupTop);
  ctx.lineTo(cupCx + cupW / 2, cupTop);
  ctx.lineTo(cupCx + cupW / 2 - 10, cupBottom);
  ctx.lineTo(cupCx - cupW / 2 + 10, cupBottom);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cupCx + cupW / 2 + 8, cupTop + cupH / 2, 20, Math.PI * 1.5, Math.PI * 0.5);
  ctx.stroke();

  if (!isStandard) {
    const stdH = Math.max(0, cupH * ratio_std);
    const stdY = cupBottom - stdH;
    ctx.strokeStyle = hexAlpha(color, 0.5);
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cupCx - cupW / 2 + 4, stdY);
    ctx.lineTo(cupCx + cupW / 2 - 4, stdY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const fillH = Math.max(0, cupH * ratio);
  const fillY = cupBottom - fillH;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cupCx - cupW / 2 + 2, cupTop + 2);
  ctx.lineTo(cupCx + cupW / 2 - 2, cupTop + 2);
  ctx.lineTo(cupCx + cupW / 2 - 10, cupBottom - 2);
  ctx.lineTo(cupCx - cupW / 2 + 10, cupBottom - 2);
  ctx.closePath();
  ctx.clip();
  const liqGrad = ctx.createLinearGradient(0, fillY, 0, cupBottom);
  liqGrad.addColorStop(0, '#92400e');
  liqGrad.addColorStop(1, '#451a03');
  ctx.fillStyle = liqGrad;
  ctx.fillRect(cupCx - cupW / 2, fillY, cupW, fillH);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(cupCx - cupW / 2, fillY, cupW, 3);
  ctx.restore();

  if (ratio > 0.1) {
    ctx.strokeStyle = hexAlpha(isDark ? '#e7e5e4' : '#78716c', 0.35 * ratio);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const sx = cupCx - 20 + i * 20;
      const sy = fillY - 10 - i * 4;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(sx + 6, sy - 8, sx - 4, sy - 14, sx + 2, sy - 22);
      ctx.stroke();
    }
  }

  const mg = N0 * ratio;
  ctx.font = '600 12px ui-monospace, Menlo, monospace';
  ctx.fillStyle = isDark ? '#fbbf24' : '#78350f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${mg.toFixed(0)} mg`, cupCx, cupTop + cupH / 2);

  const tlX = x + w * 0.55;
  const tlW = Math.min(140, w - (tlX - x) - 20);
  const tlTop = y + 40;
  const tlBottom = y + h - 50;
  const tlH = tlBottom - tlTop;

  ctx.strokeStyle = isDark ? 'rgba(251,191,36,0.4)' : 'rgba(146,64,14,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tlX, tlTop);
  ctx.lineTo(tlX, tlBottom);
  ctx.stroke();

  const milestones = [
    { t: 0, label: '복용' },
    { t: halfLife, label: '½' },
    { t: halfLife * 2, label: '¼' },
    { t: halfLife * 3.2, label: '수면' },
  ];
  const tMax = halfLife * 3.5;
  for (const m of milestones) {
    if (m.t > tMax) continue;
    const cy = tlTop + (m.t / tMax) * tlH;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(tlX, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '600 10px -apple-system, sans-serif';
    ctx.fillStyle = isDark ? '#fbbf24' : '#78350f';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${m.t.toFixed(0)}시간 · ${m.label}`, tlX + 10, cy);
  }

  if (t >= 0 && t <= tMax) {
    const cy = tlTop + (t / tMax) * tlH;
    ctx.fillStyle = isDark ? '#ffffff' : '#0b1220';
    ctx.beginPath();
    ctx.arc(tlX, cy, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tlX - 10, cy);
    ctx.lineTo(tlX + tlW, cy);
    ctx.stroke();
  }

  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(254,243,199,0.85)' : 'rgba(120,53,15,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('아침 커피는 밤까지 남는다', x + w / 2, y + h - 8);

  ctx.restore();
}
