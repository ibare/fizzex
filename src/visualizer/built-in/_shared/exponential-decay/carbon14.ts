/**
 * ⚛️ 탄소-14 장면 — 10×10 원자 그리드 + 유물 실루엣.
 *
 * 활성 개수 = round(100 * ratio). 비활성 순서는 결정론적(LCG 셔플).
 */

import { hexAlpha } from '../../../../graphics/draw';
import type { SceneDrawArgs } from './types';

const ORDER: number[] = (() => {
  const arr = Array.from({ length: 100 }, (_, i) => i);
  let seed = 12345;
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
})();

export function drawCarbon14(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, ratio, ratio_std, isStandard, color, isDark } = args;
  ctx.save();

  const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
  bgGrad.addColorStop(0, isDark ? '#1c1917' : '#f5f5f4');
  bgGrad.addColorStop(1, isDark ? '#0c0a09' : '#d6d3d1');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(x, y, w, h);

  const boneCx = x + w * 0.24;
  const boneCy = y + h / 2;
  drawBoneSilhouette(ctx, boneCx, boneCy, Math.min(h - 40, 140), isDark);

  const gridX = x + w * 0.45;
  const gridY = y + 20;
  const gridW = Math.min(w - (gridX - x) - 20, 200);
  const gridH = Math.min(h - 60, gridW);
  const cell = Math.min(gridW / 10, gridH / 10);
  const activeCount = Math.max(0, Math.min(100, Math.round(100 * ratio)));
  const activeStdCount = Math.max(0, Math.min(100, Math.round(100 * ratio_std)));

  for (let i = 0; i < 100; i++) {
    const row = Math.floor(i / 10);
    const col = i % 10;
    const px = gridX + col * cell + cell / 2;
    const py = gridY + row * cell + cell / 2;
    const rank = ORDER.indexOf(i);
    const isActive = rank < activeCount;
    const isStdActive = rank < activeStdCount;

    if (!isStandard && isStdActive && !isActive) {
      ctx.fillStyle = hexAlpha(color, 0.22);
      ctx.beginPath();
      ctx.arc(px, py, cell * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isActive) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, cell * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(px - cell * 0.1, py - cell * 0.1, cell * 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = isDark ? 'rgba(87,83,78,0.4)' : 'rgba(168,162,158,0.5)';
      ctx.beginPath();
      ctx.arc(px, py, cell * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.font = '700 12px ui-monospace, Menlo, monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`${activeCount} / 100`, gridX + gridW / 2, gridY + gridH + 4);

  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(214,211,209,0.85)' : 'rgba(68,64,60,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('¹⁴C 원자가 하나씩 사라진다 (반감기 5,730년)', x + w / 2, y + h - 8);

  ctx.restore();
}

function drawBoneSilhouette(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  isDark: boolean,
): void {
  ctx.save();
  ctx.fillStyle = isDark ? '#e7e5e4' : '#fafaf9';
  ctx.strokeStyle = isDark ? '#78716c' : '#a8a29e';
  ctx.lineWidth = 2;

  const bw = size * 0.18;
  const bh = size * 0.7;
  ctx.beginPath();
  ctx.arc(cx, cy - bh / 2, bw * 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx - bw * 0.5, cy + bh / 2, bw * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + bw * 0.5, cy + bh / 2, bw * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(cx - bw / 2, cy - bh / 2, bw, bh);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = isDark ? 'rgba(120,113,108,0.5)' : 'rgba(120,113,108,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - bw * 0.3, cy - bh * 0.2);
  ctx.lineTo(cx - bw * 0.1, cy + bh * 0.1);
  ctx.stroke();

  ctx.restore();
}
