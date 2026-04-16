/**
 * ⚡ 교류 전압계 장면 — 아날로그 게이지 + 디지털 박스
 *
 * yNorm: 바늘 각도 매핑 (π + (0.5 + yNorm*0.5)*π 형태)
 * 220Vrms의 peak ≈ 311V. 디지털 박스에 y₀ × 311 표시.
 */

import { hexAlpha, roundRect, type SceneDrawArgs } from '../utils';

const V_PEAK = 311;

export function drawVoltmeter(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, yNorm, color, isDark, alpha = 1 } = args;
  ctx.save();
  ctx.globalAlpha = alpha;

  // 배경
  ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
  ctx.fillRect(x, y, w, h);

  // ── 아날로그 게이지 (반원) ──
  const gaugeCx = x + w * 0.36;
  const gaugeCy = y + h * 0.68;
  const gaugeR = Math.min(w * 0.28, h * 0.5);

  // 배경 반원
  ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
  ctx.beginPath();
  ctx.arc(gaugeCx, gaugeCy, gaugeR, Math.PI, Math.PI * 2);
  ctx.lineTo(gaugeCx + gaugeR, gaugeCy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = isDark ? '#0f172a' : '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 눈금
  ctx.strokeStyle = isDark ? 'rgba(203,213,225,0.8)' : 'rgba(51,65,85,0.8)';
  ctx.lineWidth = 1.2;
  const labels = ['−V', '0', '+V'];
  for (let i = 0; i <= 10; i++) {
    const angle = Math.PI + (i / 10) * Math.PI;
    const x1 = gaugeCx + (gaugeR - 6) * Math.cos(angle);
    const y1 = gaugeCy + (gaugeR - 6) * Math.sin(angle);
    const x2 = gaugeCx + gaugeR * Math.cos(angle);
    const y2 = gaugeCy + gaugeR * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  // 라벨 (좌/중/우)
  ctx.fillStyle = isDark ? 'rgba(203,213,225,0.9)' : 'rgba(30,41,59,0.9)';
  ctx.font = '600 10px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(labels[0], gaugeCx - gaugeR + 8, gaugeCy + 6);
  ctx.fillText(labels[1], gaugeCx, gaugeCy - gaugeR + 6);
  ctx.fillText(labels[2], gaugeCx + gaugeR - 8, gaugeCy + 6);

  // 바늘
  const needleAngle = Math.PI + (0.5 + yNorm * 0.5) * Math.PI;
  const tipX = gaugeCx + (gaugeR - 8) * Math.cos(needleAngle);
  const tipY = gaugeCy + (gaugeR - 8) * Math.sin(needleAngle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(gaugeCx, gaugeCy);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  // 중심점
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(gaugeCx, gaugeCy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── 디지털 박스 ──
  const boxW = Math.min(120, w * 0.3);
  const boxH = 40;
  const bx = x + w - boxW - 20;
  const by = y + 24;
  ctx.fillStyle = isDark ? '#020617' : '#0f172a';
  roundRect(ctx, bx, by, boxW, boxH, 6);
  ctx.fill();
  ctx.strokeStyle = hexAlpha(color, 0.7);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const voltVal = yNorm * V_PEAK;
  const voltText = `${voltVal >= 0 ? '+' : ''}${voltVal.toFixed(0)} V`;
  ctx.fillStyle = '#34d399';
  ctx.font = '700 16px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(voltText, bx + boxW / 2, by + boxH / 2);

  // 캡션
  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(200,210,230,0.7)' : 'rgba(60,70,90,0.75)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('전압계 바늘 → 가전제품 전원', x + w / 2, y + h - 8);

  ctx.restore();
}
