/**
 * 🎵 스피커 장면 — 본체 + 진동판 + 음파 리플.
 *
 * y₀가 진동판 전후 이동량, |y₀/A|가 클수록 리플 강도 증가.
 */

import { hexAlpha } from '../../../../graphics/draw';
import type { SceneDrawArgs } from './types';

export function drawSpeaker(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, yNorm, animT, color, isDark } = args;
  ctx.save();

  ctx.fillStyle = isDark ? '#0f172a' : '#f1f5f9';
  ctx.fillRect(x, y, w, h);

  const cy = y + h / 2;
  const bodyX = x + w * 0.28;
  const bodyW = 82;
  const bodyH = Math.min(h - 40, 120);
  const bodyY = cy - bodyH / 2;

  ctx.fillStyle = isDark ? '#1e293b' : '#475569';
  ctx.fillRect(bodyX - bodyW, bodyY, bodyW, bodyH);
  ctx.strokeStyle = isDark ? '#0f172a' : '#1e293b';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const sy = bodyY + 10 + i * ((bodyH - 20) / 6);
    ctx.beginPath();
    ctx.moveTo(bodyX - bodyW + 8, sy);
    ctx.lineTo(bodyX - 8, sy);
    ctx.stroke();
  }

  const dispX = bodyX + yNorm * 14;
  const diaphR = Math.min(bodyH * 0.35, 32);
  const grad = ctx.createRadialGradient(dispX, cy, 2, dispX, cy, diaphR);
  grad.addColorStop(0, isDark ? '#cbd5e1' : '#e2e8f0');
  grad.addColorStop(1, isDark ? '#475569' : '#64748b');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(dispX, cy, diaphR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(dispX, cy, diaphR * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = isDark ? 'rgba(203,213,225,0.5)' : 'rgba(71,85,105,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bodyX, cy - diaphR + 2);
  ctx.lineTo(dispX - 4, cy - diaphR + 2);
  ctx.moveTo(bodyX, cy + diaphR - 2);
  ctx.lineTo(dispX - 4, cy + diaphR - 2);
  ctx.stroke();

  const ripplesBase = dispX + diaphR + 4;
  const maxReach = x + w - ripplesBase - 10;
  const rippleCount = 5;
  const intensity = Math.min(1, Math.abs(yNorm));
  for (let i = 0; i < rippleCount; i++) {
    const travel = (animT * 120 + i * (maxReach / rippleCount)) % maxReach;
    const alphaR = (1 - travel / maxReach) * 0.55 * intensity;
    if (alphaR < 0.04) continue;
    ctx.strokeStyle = hexAlpha(color, alphaR);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const radius = travel + 10;
    ctx.arc(ripplesBase, cy, radius, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
  }

  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(200,210,230,0.75)' : 'rgba(60,70,90,0.75)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('스피커 진동판 → 공기 → 소리', x + w / 2, y + h - 8);

  ctx.restore();
}
