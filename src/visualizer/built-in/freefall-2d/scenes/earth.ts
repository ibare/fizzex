/**
 * 🌍 지구 장면 — 건물 측면 + 떨어지는 공
 *
 * 높이 눈금, 이정표(아파트/63빌딩/롯데월드타워), 공 position = h.
 * current(실선 공) vs standard(반투명 공) 병행.
 */

import { formatMeter, hexAlpha, roundRect, type SceneDrawArgs } from '../utils';

const EARTH_MILESTONES = [
  { h: 10, label: '3층' },
  { h: 50, label: '아파트' },
  { h: 274, label: '63빌딩' },
  { h: 555, label: '롯데월드타워' },
];

export function drawEarth(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, h_cur, h_std, color, isDark, alpha = 1, isStandard } = args;
  ctx.save();
  ctx.globalAlpha = alpha;

  // ── 하늘 배경 ──
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, isDark ? '#0b1220' : '#dbeafe');
  grad.addColorStop(1, isDark ? '#1e293b' : '#f0f9ff');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // 지평선 높이: 화면 기준. 공이 화면 밖으로 나가지 않도록 수직 스케일 조정.
  // 시각화 범위: 0 ~ hView (m)
  const hView = Math.max(20, h_cur * 1.15, h_std * 1.15, 50);

  const padT = 18;
  const padB = 24;
  const plotH = h - padT - padB;
  const buildingX = x + w * 0.42;
  const buildingW = 64;

  // 높이 좌표 → 화면 y
  const toY = (hv: number) => y + padT + (hv / hView) * plotH;

  // ── 건물 ──
  const topY = toY(hView);
  const botY = toY(0);
  // 바닥
  ctx.fillStyle = isDark ? '#1e293b' : '#a8a29e';
  ctx.fillRect(x, botY, w, y + h - botY);

  // 건물 벽
  ctx.fillStyle = isDark ? '#334155' : '#94a3b8';
  ctx.fillRect(buildingX, topY, buildingW, botY - topY);
  // 창문 격자
  ctx.fillStyle = isDark ? 'rgba(250,230,150,0.55)' : 'rgba(250,220,120,0.85)';
  const rows = Math.max(3, Math.floor((botY - topY) / 14));
  const cols = 3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = buildingX + 6 + c * ((buildingW - 12) / cols);
      const wy = topY + 6 + r * ((botY - topY - 12) / rows);
      ctx.fillRect(wx, wy, (buildingW - 12) / cols - 2, (botY - topY - 12) / rows - 3);
    }
  }
  // 건물 외곽선
  ctx.strokeStyle = isDark ? '#0f172a' : '#475569';
  ctx.lineWidth = 1;
  ctx.strokeRect(buildingX, topY, buildingW, botY - topY);

  // ── 높이 눈금 (건물 왼쪽) ──
  const scaleX = buildingX - 44;
  ctx.strokeStyle = isDark ? 'rgba(200,210,230,0.5)' : 'rgba(60,70,90,0.55)';
  ctx.lineWidth = 1;
  ctx.fillStyle = isDark ? 'rgba(220,230,245,0.85)' : 'rgba(40,50,70,0.85)';
  ctx.font = '500 9px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  // 눈금 간격: hView에 맞춰
  const step = hView > 400 ? 100 : hView > 100 ? 25 : hView > 30 ? 10 : 5;
  ctx.beginPath();
  ctx.moveTo(scaleX + 10, topY);
  ctx.lineTo(scaleX + 10, botY);
  ctx.stroke();
  for (let hv = 0; hv <= hView; hv += step) {
    const yp = toY(hv);
    ctx.beginPath();
    ctx.moveTo(scaleX + 6, yp);
    ctx.lineTo(scaleX + 10, yp);
    ctx.stroke();
    ctx.fillText(formatMeter(hv), scaleX + 3, yp);
  }

  // ── 이정표 마커 (건물 오른쪽) ──
  ctx.font = '500 9px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const markerX = buildingX + buildingW + 8;
  for (const m of EARTH_MILESTONES) {
    if (m.h > hView) continue;
    const yp = toY(m.h);
    ctx.strokeStyle = isDark ? 'rgba(220,200,130,0.5)' : 'rgba(180,140,40,0.55)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(buildingX + buildingW, yp);
    ctx.lineTo(markerX + 4, yp);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = isDark ? 'rgba(230,200,120,0.95)' : 'rgba(120,90,20,0.9)';
    ctx.fillText(m.label, markerX + 6, yp);
  }

  // ── 공 (current) ──
  const ballX = buildingX + buildingW + 4;
  const ballR = 7;
  const ballY = toY(Math.min(h_cur, hView));
  // 그림자
  ctx.fillStyle = hexAlpha(color, 0.28);
  ctx.beginPath();
  ctx.arc(ballX + 1, ballY + 2, ballR, 0, Math.PI * 2);
  ctx.fill();
  // 공
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(ballX - 2, ballY - 2, ballR * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // ── standard 공 (반투명, 구조 변경 시) ──
  if (!isStandard) {
    const stdY = toY(Math.min(h_std, hView));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(ballX + 18, stdY, ballR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = isDark ? 'rgba(200,210,230,0.7)' : 'rgba(60,70,90,0.75)';
    ctx.font = '500 9px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('표준', ballX + 28, stdY);
  }

  // ── 배지 (좌상단) ──
  const badge = `지구 · g = 9.8 m/s²`;
  ctx.font = '600 11px -apple-system, sans-serif';
  const bw = ctx.measureText(badge).width + 16;
  const bh = 22;
  const bx = x + 10;
  const by = y + 10;
  ctx.fillStyle = hexAlpha(color, isDark ? 0.3 : 0.16);
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
