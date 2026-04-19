/**
 * 🏙️ 지구 자유낙하 장면.
 *
 * 건물 측면에 창문 격자, 좌측 높이 눈금, 우측 이정표(3층·아파트·63빌딩·롯데월드타워).
 */

import { hexAlpha, roundRect } from '../../../../graphics/draw';
import type { SceneDrawArgs } from './types';
import { formatMeter } from './types';

const BRAND_COLOR = '#0E7490';
const MILESTONES = [
  { h: 10, label: '3층' },
  { h: 50, label: '아파트' },
  { h: 274, label: '63빌딩' },
  { h: 555, label: '롯데월드타워' },
];

export function drawEarth(args: SceneDrawArgs): void {
  const { ctx, w, h, a, t, hCur, isDark } = args;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, isDark ? '#0b1220' : '#dbeafe');
  grad.addColorStop(1, isDark ? '#1e293b' : '#f0f9ff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const hView = Math.max(20, hCur * 1.15, 50);
  const padT = 44;
  const padB = 28;
  const plotH = Math.max(1, h - padT - padB);
  const buildingX = w * 0.45;
  const buildingW = Math.min(80, w * 0.25);
  const toY = (hv: number) => padT + (hv / hView) * plotH;
  const topY = toY(hView);
  const botY = toY(0);

  ctx.fillStyle = isDark ? '#1e293b' : '#a8a29e';
  ctx.fillRect(0, botY, w, h - botY);

  ctx.fillStyle = isDark ? '#334155' : '#94a3b8';
  ctx.fillRect(buildingX, topY, buildingW, botY - topY);
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
  ctx.strokeStyle = isDark ? '#0f172a' : '#475569';
  ctx.lineWidth = 1;
  ctx.strokeRect(buildingX, topY, buildingW, botY - topY);

  const scaleX = buildingX - 44;
  ctx.strokeStyle = isDark ? 'rgba(200,210,230,0.5)' : 'rgba(60,70,90,0.55)';
  ctx.lineWidth = 1;
  ctx.fillStyle = isDark ? 'rgba(220,230,245,0.85)' : 'rgba(40,50,70,0.85)';
  ctx.font = '500 9px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
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

  ctx.font = '500 9px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const markerX = buildingX + buildingW + 8;
  for (const m of MILESTONES) {
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

  const ballX = buildingX + buildingW + 4;
  const ballR = 7;
  const ballY = toY(Math.min(hCur, hView));
  ctx.fillStyle = hexAlpha(BRAND_COLOR, 0.28);
  ctx.beginPath();
  ctx.arc(ballX + 1, ballY + 2, ballR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BRAND_COLOR;
  ctx.beginPath();
  ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(ballX - 2, ballY - 2, ballR * 0.4, 0, Math.PI * 2);
  ctx.fill();

  drawBadge(ctx, 12, 12, `지구 · g = ${a.toFixed(1)} m/s² · t = ${t.toFixed(2)}s`, isDark);
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  isDark: boolean,
): void {
  ctx.save();
  ctx.font = '600 11px -apple-system, sans-serif';
  const w = ctx.measureText(text).width + 16;
  const h = 22;
  ctx.fillStyle = hexAlpha(BRAND_COLOR, isDark ? 0.3 : 0.16);
  roundRect(ctx, x, y, w, h, 11);
  ctx.fill();
  ctx.strokeStyle = BRAND_COLOR;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = BRAND_COLOR;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 10, y + h / 2 + 0.5);
  ctx.restore();
}
