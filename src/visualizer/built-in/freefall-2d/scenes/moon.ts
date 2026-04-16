/**
 * 🌙 달 장면 — 크레이터 지평선 + 우주복 실루엣 + 떨어지는 물체
 *
 * g = 1.625 m/s². 같은 t에서 지구보다 훨씬 느리게 떨어짐.
 */

import { formatMeter, hexAlpha, roundRect, type SceneDrawArgs } from '../utils';

export function drawMoon(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, h_cur, h_std, color, isDark, alpha = 1, isStandard } = args;
  ctx.save();
  ctx.globalAlpha = alpha;

  // ── 우주 배경 (별 포함) ──
  ctx.fillStyle = isDark ? '#020617' : '#0f172a';
  ctx.fillRect(x, y, w, h);
  // 별
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  const seed = 7;
  for (let i = 0; i < 40; i++) {
    const px = x + ((seed * (i + 1) * 13) % Math.floor(w));
    const py = y + ((seed * (i + 1) * 7) % Math.floor(h * 0.65));
    const r = ((i * 3) % 2) ? 0.6 : 1;
    ctx.fillRect(px, py, r, r);
  }

  // 시각화 범위
  const hView = Math.max(20, h_cur * 1.15, h_std * 1.15, 30);
  const padT = 18;
  const padB = 50;
  const plotH = h - padT - padB;
  const toY = (hv: number) => y + padT + (hv / hView) * plotH;
  const groundY = toY(0);

  // ── 달 표면 (크레이터 실루엣) ──
  ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(x, groundY);
  const surfaceN = 14;
  for (let i = 0; i <= surfaceN; i++) {
    const px = x + (i / surfaceN) * w;
    const bump = ((i * 37) % 11) - 5;
    ctx.lineTo(px, groundY + bump * 0.5);
  }
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();

  // 크레이터
  ctx.fillStyle = isDark ? '#334155' : '#64748b';
  const craters = [
    { cx: 0.15, cy: 0.4, r: 10 },
    { cx: 0.3, cy: 0.7, r: 6 },
    { cx: 0.7, cy: 0.35, r: 8 },
    { cx: 0.85, cy: 0.6, r: 5 },
  ];
  for (const c of craters) {
    const cx = x + c.cx * w;
    const cy = groundY + c.cy * (y + h - groundY);
    ctx.beginPath();
    ctx.ellipse(cx, cy, c.r, c.r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 우주복 실루엣 (왼쪽) ──
  const astroX = x + w * 0.2;
  const astroY = groundY;
  ctx.fillStyle = isDark ? '#e2e8f0' : '#f8fafc';
  // 몸통
  ctx.fillRect(astroX - 6, astroY - 22, 12, 18);
  // 머리 (헬멧)
  ctx.beginPath();
  ctx.arc(astroX, astroY - 28, 7, 0, Math.PI * 2);
  ctx.fill();
  // 헬멧 바이저
  ctx.fillStyle = isDark ? '#0369a1' : '#1e3a8a';
  ctx.beginPath();
  ctx.arc(astroX, astroY - 28, 5, 0, Math.PI * 2);
  ctx.fill();

  // ── 떨어지는 물체 (오른쪽 궤적) ──
  const dropX = x + w * 0.6;
  const ballR = 7;
  const ballY = toY(Math.min(h_cur, hView));

  // 낙하 궤적 (고스트)
  ctx.strokeStyle = hexAlpha(color, 0.3);
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.moveTo(dropX, toY(0));
  ctx.lineTo(dropX, ballY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 공
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(dropX, ballY, ballR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // standard 공
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

  // ── 높이 라벨 (떨어지는 공 옆) ──
  ctx.fillStyle = isDark ? 'rgba(230,240,255,0.9)' : 'rgba(240,245,255,0.92)';
  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatMeter(h_cur), dropX + ballR + 6, ballY);

  // ── 배지 ──
  const badge = `달 · g = 1.6 m/s²`;
  ctx.font = '600 11px -apple-system, sans-serif';
  const bw = ctx.measureText(badge).width + 16;
  const bh = 22;
  const bx = x + 10;
  const by = y + 10;
  ctx.fillStyle = hexAlpha(color, 0.35);
  roundRect(ctx, bx, by, bw, bh, 11);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = isDark ? 'rgba(240,245,255,0.95)' : 'rgba(240,245,255,0.95)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, bx + 10, by + bh / 2 + 0.5);

  ctx.restore();
}
