/**
 * 🔴 화성 장면 — 붉은 지형 + 탐사 로버 실루엣 + 떨어지는 물체
 *
 * g = 3.721 m/s². 지구의 ~38%.
 */

import { formatMeter, hexAlpha, roundRect, type SceneDrawArgs } from '../utils';

export function drawMars(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, h_cur, h_std, color, isDark, alpha = 1, isStandard } = args;
  ctx.save();
  ctx.globalAlpha = alpha;

  // ── 화성 하늘 (붉은 그라데이션) ──
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, isDark ? '#3c1412' : '#fecaca');
  grad.addColorStop(1, isDark ? '#7c2d12' : '#fed7aa');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  const hView = Math.max(20, h_cur * 1.15, h_std * 1.15, 30);
  const padT = 18;
  const padB = 50;
  const plotH = h - padT - padB;
  const toY = (hv: number) => y + padT + (hv / hView) * plotH;
  const groundY = toY(0);

  // ── 지형 (언덕 실루엣) ──
  ctx.fillStyle = isDark ? '#991b1b' : '#b45309';
  ctx.beginPath();
  ctx.moveTo(x, groundY + 2);
  const segs = 10;
  for (let i = 0; i <= segs; i++) {
    const px = x + (i / segs) * w;
    const hill = Math.sin((i * 2.7)) * 8 + ((i % 3) * 3);
    ctx.lineTo(px, groundY + 2 - hill);
  }
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();

  // 지면 텍스처 (작은 돌)
  ctx.fillStyle = isDark ? '#7f1d1d' : '#92400e';
  for (let i = 0; i < 18; i++) {
    const px = x + ((i * 71) % w);
    const py = groundY + 6 + ((i * 41) % Math.max(10, y + h - groundY - 10));
    const r = (i % 3) + 1;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 로버 실루엣 (왼쪽) ──
  const rx = x + w * 0.18;
  const ry = groundY - 2;
  ctx.fillStyle = isDark ? '#e2e8f0' : '#f5f5f4';
  // 본체
  ctx.fillRect(rx - 12, ry - 10, 24, 8);
  // 안테나
  ctx.fillRect(rx + 4, ry - 18, 2, 8);
  ctx.beginPath();
  ctx.arc(rx + 5, ry - 19, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // 태양전지판
  ctx.fillStyle = isDark ? '#1e40af' : '#1e3a8a';
  ctx.fillRect(rx - 14, ry - 14, 10, 4);
  ctx.fillRect(rx + 4, ry - 14, 10, 4);
  // 바퀴
  ctx.fillStyle = isDark ? '#0f172a' : '#1f2937';
  ctx.beginPath();
  ctx.arc(rx - 8, ry - 1, 3, 0, Math.PI * 2);
  ctx.arc(rx, ry - 1, 3, 0, Math.PI * 2);
  ctx.arc(rx + 8, ry - 1, 3, 0, Math.PI * 2);
  ctx.fill();

  // ── 떨어지는 물체 ──
  const dropX = x + w * 0.6;
  const ballR = 7;
  const ballY = toY(Math.min(h_cur, hView));

  ctx.strokeStyle = hexAlpha(color, 0.3);
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.moveTo(dropX, toY(0));
  ctx.lineTo(dropX, ballY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(dropX, ballY, ballR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (!isStandard) {
    const stdY = toY(Math.min(h_std, hView));
    ctx.strokeStyle = color;
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(dropX + 20, stdY, ballR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = isDark ? 'rgba(254,240,215,0.95)' : 'rgba(50,20,10,0.92)';
  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatMeter(h_cur), dropX + ballR + 6, ballY);

  // ── 배지 ──
  const badge = `화성 · g = 3.7 m/s²`;
  ctx.font = '600 11px -apple-system, sans-serif';
  const bw = ctx.measureText(badge).width + 16;
  const bh = 22;
  const bx = x + 10;
  const by = y + 10;
  ctx.fillStyle = hexAlpha(color, 0.3);
  roundRect(ctx, bx, by, bw, bh, 11);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, bx + 10, by + bh / 2 + 0.5);

  ctx.restore();
}
