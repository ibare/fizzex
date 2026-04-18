/**
 * 🔔 진자 장면 — 천장 앵커 + 줄 + 추(bob).
 *
 * yNorm → 각도 yNorm·π/4 (최대 45°). 줄 길이 고정, 스윙 궤적은 호 점선.
 */

import { hexAlpha } from '../../../../graphics/draw';
import type { SceneDrawArgs } from './types';

export function drawPendulum(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, yNorm, color, isDark } = args;
  ctx.save();

  ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
  ctx.fillRect(x, y, w, h);

  const ceilingY = y + 18;
  ctx.fillStyle = isDark ? '#334155' : '#e2e8f0';
  ctx.fillRect(x, y, w, ceilingY - y);
  ctx.strokeStyle = isDark ? '#0f172a' : '#94a3b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, ceilingY);
  ctx.lineTo(x + w, ceilingY);
  ctx.stroke();
  ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(71,85,105,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 20; i++) {
    const hx = x + i * (w / 20);
    ctx.beginPath();
    ctx.moveTo(hx, y + 2);
    ctx.lineTo(hx + 8, ceilingY - 2);
    ctx.stroke();
  }

  const ax = x + w / 2;
  const ay = ceilingY;
  ctx.fillStyle = isDark ? '#475569' : '#1e293b';
  ctx.beginPath();
  ctx.arc(ax, ay, 4, 0, Math.PI * 2);
  ctx.fill();

  const L = Math.min(h - ceilingY - 40, 170);
  const theta = yNorm * (Math.PI / 4);

  ctx.strokeStyle = hexAlpha(color, 0.3);
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.arc(ax, ay, L, Math.PI / 2 - Math.PI / 4, Math.PI / 2 + Math.PI / 4);
  ctx.stroke();
  ctx.setLineDash([]);

  const bobX = ax + L * Math.sin(theta);
  const bobY = ay + L * Math.cos(theta);
  ctx.strokeStyle = isDark ? '#cbd5e1' : '#334155';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bobX, bobY);
  ctx.stroke();

  const bobR = 18;
  ctx.fillStyle = hexAlpha(color, 0.25);
  ctx.beginPath();
  ctx.arc(bobX + 1, bobY + 2, bobR, 0, Math.PI * 2);
  ctx.fill();
  const bobGrad = ctx.createRadialGradient(bobX - 4, bobY - 5, 2, bobX, bobY, bobR);
  bobGrad.addColorStop(0, isDark ? '#94a3b8' : '#ffffff');
  bobGrad.addColorStop(1, color);
  ctx.fillStyle = bobGrad;
  ctx.beginPath();
  ctx.arc(bobX, bobY, bobR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDark ? '#0b1220' : '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(bobX - 5, bobY - 5, bobR * 0.35, 0, Math.PI * 2);
  ctx.fill();

  const degText = `θ = ${(theta * 180 / Math.PI).toFixed(1)}°`;
  ctx.strokeStyle = hexAlpha(color, 0.55);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(ax, ay, 24, Math.PI / 2, Math.PI / 2 + theta, theta < 0);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = '600 10px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(degText, ax + 30, ay + 4);

  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(200,210,230,0.75)' : 'rgba(60,70,90,0.78)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('추의 각도 → 흔들림', x + w / 2, y + h - 8);

  ctx.restore();
}
