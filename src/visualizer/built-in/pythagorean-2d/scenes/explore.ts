/**
 * 🔺 자유탐구 장면 — 격자 + 삼각형
 *
 * 현실 장식 없이 순수 기하학 맥락. 정수 a, b에서 격자 눈금과 정렬되어
 * 이산적 피타고라스 수 감각을 준다.
 */

import { formatN, hexAlpha, type SceneDrawArgs } from '../utils';

export function drawExplore(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, a, b, c, color, isDark, alpha = 1 } = args;
  if (!(a > 0) || !(b > 0)) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  // ── 배경 ──
  ctx.fillStyle = isDark ? '#0b1220' : '#f8fafc';
  ctx.fillRect(x, y, w, h);

  // ── 단위 스케일 ──
  // 삼각형을 화면 중앙에 놓되, 좌표 여백은 a, b에 비례하여 bbox 포함
  const margin = 20;
  const innerW = Math.max(1, w - margin * 2);
  const innerH = Math.max(1, h - margin * 2);
  const unit = Math.min(innerW / (a * 1.4), innerH / (b * 1.4));
  const triW = a * unit;
  const triH = b * unit;
  const originX = x + (w - triW) / 2;
  const originY = y + (h + triH) / 2;

  // ── 격자 ──
  ctx.strokeStyle = isDark ? 'rgba(120,140,180,0.18)' : 'rgba(60,90,140,0.12)';
  ctx.lineWidth = 1;
  const maxCells = 40;
  if (unit > 4 && Math.max(a, b) <= maxCells) {
    const stepX = unit;
    // x 방향: 0 ~ a 조금 넘게
    for (let gx = 0; gx <= a + 0.5; gx += 1) {
      const sx = originX + gx * stepX;
      ctx.beginPath();
      ctx.moveTo(sx, y + 6);
      ctx.lineTo(sx, y + h - 6);
      ctx.stroke();
    }
    for (let gy = 0; gy <= b + 0.5; gy += 1) {
      const sy = originY - gy * unit;
      ctx.beginPath();
      ctx.moveTo(x + 6, sy);
      ctx.lineTo(x + w - 6, sy);
      ctx.stroke();
    }
  } else {
    // a, b가 너무 커서 격자가 과밀해지면 5 단위 또는 10 단위로
    const step = Math.max(a, b) > 50 ? 10 : 5;
    for (let gx = 0; gx <= a + 0.5; gx += step) {
      const sx = originX + gx * unit;
      ctx.beginPath();
      ctx.moveTo(sx, y + 6);
      ctx.lineTo(sx, y + h - 6);
      ctx.stroke();
    }
    for (let gy = 0; gy <= b + 0.5; gy += step) {
      const sy = originY - gy * unit;
      ctx.beginPath();
      ctx.moveTo(x + 6, sy);
      ctx.lineTo(x + w - 6, sy);
      ctx.stroke();
    }
  }

  // ── 삼각형 ──
  const p0 = { x: originX, y: originY };
  const pA = { x: originX + triW, y: originY };
  const pB = { x: originX, y: originY - triH };

  ctx.fillStyle = hexAlpha(color, isDark ? 0.2 : 0.14);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(pA.x, pA.y);
  ctx.lineTo(pB.x, pB.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 직각 표시
  const tick = Math.min(triW, triH) * 0.08;
  ctx.strokeStyle = isDark ? 'rgba(235,240,250,0.7)' : 'rgba(30,40,55,0.7)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(p0.x + tick, p0.y);
  ctx.lineTo(p0.x + tick, p0.y - tick);
  ctx.lineTo(p0.x, p0.y - tick);
  ctx.stroke();

  // ── 길이 라벨 ──
  ctx.font = '500 11px -apple-system, sans-serif';
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(`a = ${formatN(a)}`, (p0.x + pA.x) / 2, p0.y + 14);
  ctx.textAlign = 'right';
  ctx.fillText(`b = ${formatN(b)}`, p0.x - 6, (p0.y + pB.y) / 2);
  ctx.textAlign = 'center';
  ctx.fillText(`c = ${formatN(c)}`, (pA.x + pB.x) / 2 + 10, (pA.y + pB.y) / 2 - 10);

  ctx.restore();
}
