/**
 * 🌙 달 자유낙하 장면.
 *
 * 우주 배경 + 별 + 크레이터 지평선 + 우주복 실루엣 + 느리게 떨어지는 공.
 */

import { hexAlpha, roundRect } from '../../../../graphics/draw';
import type { SceneDrawArgs } from './types';
import { formatMeter } from './types';

const BRAND_COLOR = '#64748B';

export function drawMoon(args: SceneDrawArgs): void {
  const { ctx, w, h, a, t, hCur, isDark } = args;

  ctx.fillStyle = isDark ? '#020617' : '#0f172a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  const seed = 7;
  for (let i = 0; i < 40; i++) {
    const px = (seed * (i + 1) * 13) % Math.floor(w || 1);
    const py = (seed * (i + 1) * 7) % Math.floor(h * 0.65 || 1);
    const r = ((i * 3) % 2) ? 0.6 : 1;
    ctx.fillRect(px, py, r, r);
  }

  const hView = Math.max(20, hCur * 1.15, 30);
  const padT = 44;
  const padB = 56;
  const plotH = Math.max(1, h - padT - padB);
  const toY = (hv: number) => padT + (hv / hView) * plotH;
  const groundY = toY(0);

  ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  const surfaceN = 14;
  for (let i = 0; i <= surfaceN; i++) {
    const px = (i / surfaceN) * w;
    const bump = ((i * 37) % 11) - 5;
    ctx.lineTo(px, groundY + bump * 0.5);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = isDark ? '#334155' : '#64748b';
  const craters = [
    { cx: 0.15, cy: 0.4, r: 10 },
    { cx: 0.3, cy: 0.7, r: 6 },
    { cx: 0.7, cy: 0.35, r: 8 },
    { cx: 0.85, cy: 0.6, r: 5 },
  ];
  for (const cm of craters) {
    const cx = cm.cx * w;
    const cy = groundY + cm.cy * (h - groundY);
    ctx.beginPath();
    ctx.ellipse(cx, cy, cm.r, cm.r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const astroX = w * 0.2;
  const astroY = groundY;
  ctx.fillStyle = isDark ? '#e2e8f0' : '#f8fafc';
  ctx.fillRect(astroX - 6, astroY - 22, 12, 18);
  ctx.beginPath();
  ctx.arc(astroX, astroY - 28, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = isDark ? '#0369a1' : '#1e3a8a';
  ctx.beginPath();
  ctx.arc(astroX, astroY - 28, 5, 0, Math.PI * 2);
  ctx.fill();

  const dropX = w * 0.6;
  const ballR = 7;
  const ballY = toY(Math.min(hCur, hView));
  ctx.strokeStyle = hexAlpha(BRAND_COLOR, 0.5);
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.moveTo(dropX, toY(0));
  ctx.lineTo(dropX, ballY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.arc(dropX, ballY, ballR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = 'rgba(230,240,255,0.9)';
  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatMeter(hCur), dropX + ballR + 6, ballY);

  drawBadge(ctx, 12, 12, `달 · g = ${a.toFixed(2)} m/s² · t = ${t.toFixed(2)}s`);
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
): void {
  ctx.save();
  ctx.font = '600 11px -apple-system, sans-serif';
  const w = ctx.measureText(text).width + 16;
  const h = 22;
  ctx.fillStyle = hexAlpha(BRAND_COLOR, 0.35);
  roundRect(ctx, x, y, w, h, 11);
  ctx.fill();
  ctx.strokeStyle = BRAND_COLOR;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(240,245,255,0.95)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 10, y + h / 2 + 0.5);
  ctx.restore();
}
