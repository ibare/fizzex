/**
 * 🌊 조수 장면 — 해안 측면도 + 수면 + 등대 + 배.
 *
 * yNorm을 수면 높이에 매핑. 등대는 고정, 배는 수면 위에서 같이 상하로 움직인다.
 */

import { hexAlpha } from '../../../../graphics/draw';
import type { SceneDrawArgs } from './types';

export function drawTide(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, yNorm, animT, color, isDark } = args;
  ctx.save();

  const skyGrad = ctx.createLinearGradient(x, y, x, y + h * 0.6);
  skyGrad.addColorStop(0, isDark ? '#0f172a' : '#bfdbfe');
  skyGrad.addColorStop(1, isDark ? '#1e3a8a' : '#e0f2fe');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(x, y, w, h);

  const baseY = y + h * 0.55;
  const tideRange = h * 0.22;
  const waterY = baseY - yNorm * tideRange;

  const seaGrad = ctx.createLinearGradient(x, waterY, x, y + h);
  seaGrad.addColorStop(0, isDark ? '#1e40af' : '#3b82f6');
  seaGrad.addColorStop(1, isDark ? '#0c4a6e' : '#1e40af');
  ctx.fillStyle = seaGrad;
  ctx.fillRect(x, waterY, w, y + h - waterY);

  ctx.strokeStyle = isDark ? 'rgba(191,219,254,0.45)' : 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  const segs = 60;
  for (let i = 0; i <= segs; i++) {
    const px = x + (i / segs) * w;
    const ripple = Math.sin(i * 0.6 + animT * 3) * 1.6 + Math.sin(i * 1.7 + animT * 1.8) * 0.9;
    const py = waterY + ripple;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  const lhX = x + w * 0.12;
  const lhBaseY = baseY + tideRange + 6;
  const lhW = 16;
  const lhH = Math.min(110, h * 0.7);
  const stripeH = lhH / 4;
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#dc2626' : isDark ? '#f8fafc' : '#ffffff';
    ctx.fillRect(lhX - lhW / 2, lhBaseY - lhH + i * stripeH, lhW, stripeH + 0.5);
  }
  ctx.fillStyle = isDark ? '#0f172a' : '#1e293b';
  ctx.beginPath();
  ctx.moveTo(lhX - lhW / 2 - 4, lhBaseY - lhH);
  ctx.lineTo(lhX + lhW / 2 + 4, lhBaseY - lhH);
  ctx.lineTo(lhX, lhBaseY - lhH - 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hexAlpha('#FCD34D', 0.55);
  ctx.beginPath();
  ctx.arc(lhX, lhBaseY - lhH - 2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = isDark ? '#475569' : '#78716c';
  ctx.beginPath();
  ctx.ellipse(lhX, lhBaseY + 4, 36, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  const boatX = x + w * 0.62;
  const boatY = waterY - 6;
  const boatW = 48;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(boatX - boatW / 2, boatY);
  ctx.lineTo(boatX + boatW / 2, boatY);
  ctx.lineTo(boatX + boatW / 2 - 6, boatY + 8);
  ctx.lineTo(boatX - boatW / 2 + 6, boatY + 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = isDark ? '#0b1220' : '#1e293b';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = isDark ? '#cbd5e1' : '#334155';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(boatX, boatY);
  ctx.lineTo(boatX, boatY - 24);
  ctx.stroke();
  ctx.fillStyle = isDark ? '#f8fafc' : '#f1f5f9';
  ctx.beginPath();
  ctx.moveTo(boatX + 1, boatY - 24);
  ctx.lineTo(boatX + 16, boatY - 6);
  ctx.lineTo(boatX + 1, boatY - 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
  ctx.lineWidth = 1;
  ctx.stroke();

  const scaleX = x + w - 28;
  const highY = baseY - tideRange;
  const lowY = baseY + tideRange;
  ctx.strokeStyle = isDark ? 'rgba(203,213,225,0.6)' : 'rgba(30,41,59,0.75)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(scaleX, highY);
  ctx.lineTo(scaleX, lowY);
  ctx.stroke();
  const markers = [
    { yv: highY, label: '만조' },
    { yv: baseY, label: '기준' },
    { yv: lowY, label: '간조' },
  ];
  ctx.font = '500 9px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isDark ? 'rgba(203,213,225,0.85)' : 'rgba(30,41,59,0.9)';
  for (const m of markers) {
    ctx.beginPath();
    ctx.moveTo(scaleX - 4, m.yv);
    ctx.lineTo(scaleX + 4, m.yv);
    ctx.stroke();
    ctx.fillText(m.label, scaleX - 6, m.yv);
  }

  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(200,210,230,0.8)' : 'rgba(30,41,59,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('바다 수위 → 배가 오르내림', x + w / 2, y + h - 8);

  ctx.restore();
}
