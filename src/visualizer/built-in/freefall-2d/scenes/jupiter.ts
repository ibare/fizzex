/**
 * 🟠 목성 장면 — 가스 행성 대기 + 떨어지는 물체
 *
 * g = 24.79 m/s². 지구의 ~2.5배. 같은 t에서 훨씬 빠르게 떨어진다.
 */

import { formatMeter, hexAlpha, roundRect, type SceneDrawArgs } from '../utils';

export function drawJupiter(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, h_cur, h_std, color, isDark, alpha = 1, isStandard } = args;
  ctx.save();
  ctx.globalAlpha = alpha;

  // ── 대기 그라데이션 (가스 행성 띠 느낌) ──
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0.0, isDark ? '#422006' : '#fef3c7');
  grad.addColorStop(0.2, isDark ? '#78350f' : '#fde68a');
  grad.addColorStop(0.4, isDark ? '#92400e' : '#fbbf24');
  grad.addColorStop(0.6, isDark ? '#a16207' : '#f59e0b');
  grad.addColorStop(0.8, isDark ? '#7c2d12' : '#d97706');
  grad.addColorStop(1.0, isDark ? '#451a03' : '#b45309');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // 가스 띠 선 (수평 줄무늬)
  ctx.strokeStyle = isDark ? 'rgba(0,0,0,0.18)' : 'rgba(120,60,20,0.2)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) {
    const yp = y + (i / 7) * h + 6 + Math.sin(i * 1.7) * 4;
    ctx.beginPath();
    ctx.moveTo(x, yp);
    // 살짝 굽은 라인
    ctx.bezierCurveTo(x + w * 0.3, yp - 3, x + w * 0.6, yp + 3, x + w, yp);
    ctx.stroke();
  }

  // 대적점 (오른쪽 아래 타원)
  const spotX = x + w * 0.72;
  const spotY = y + h * 0.62;
  ctx.fillStyle = isDark ? 'rgba(180,40,20,0.6)' : 'rgba(185,80,50,0.55)';
  ctx.beginPath();
  ctx.ellipse(spotX, spotY, 28, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDark ? 'rgba(140,20,10,0.7)' : 'rgba(120,40,20,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 시각화 범위
  const hView = Math.max(20, h_cur * 1.15, h_std * 1.15, 30);
  const padT = 18;
  const padB = 24;
  const plotH = h - padT - padB;
  const toY = (hv: number) => y + padT + (hv / hView) * plotH;

  // 가상 기준 라인 (바닥)
  const groundY = toY(0);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x, groundY);
  ctx.lineTo(x + w, groundY);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── 떨어지는 물체 (가운데) ──
  const dropX = x + w * 0.35;
  const ballR = 7;
  const ballY = toY(Math.min(h_cur, hView));

  // 속도 효과 (잔상 라인)
  ctx.strokeStyle = hexAlpha(color, 0.35);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(dropX, toY(0));
  ctx.lineTo(dropX, ballY);
  ctx.stroke();

  // 공
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

  // 높이 라벨
  ctx.fillStyle = isDark ? 'rgba(254,240,215,0.95)' : 'rgba(60,30,0,0.92)';
  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatMeter(h_cur), dropX + ballR + 6, ballY);

  // ── 배지 ──
  const badge = `목성 · g = 24.8 m/s²`;
  ctx.font = '600 11px -apple-system, sans-serif';
  const bw = ctx.measureText(badge).width + 16;
  const bh = 22;
  const bx = x + 10;
  const by = y + 10;
  ctx.fillStyle = isDark ? 'rgba(20,20,0,0.6)' : 'rgba(255,240,200,0.8)';
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
