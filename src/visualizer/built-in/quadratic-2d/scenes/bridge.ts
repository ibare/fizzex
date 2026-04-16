/**
 * 🌉 다리 아치 장면 — 수면 + 포물선 아치 + 교각 + 반사
 *
 * a < 0 포물선을 다리 아치로 매핑.
 * 근이 실수이면 두 교각 위치 = x절편, 꼭짓점 = 아치 정점 높이.
 */

import { hexAlpha, worldToCanvas, type ParabolaView, type SceneDrawArgs } from '../utils';

export function drawBridge(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, a, b, c, vx, vy, roots, color, isDark, alpha = 1 } = args;
  ctx.save();
  ctx.globalAlpha = alpha;

  // 하늘
  const skyGrad = ctx.createLinearGradient(x, y, x, y + h * 0.7);
  skyGrad.addColorStop(0, isDark ? '#0f172a' : '#bfdbfe');
  skyGrad.addColorStop(1, isDark ? '#1e3a8a' : '#e0f2fe');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(x, y, w, h);

  // 수면 높이 결정: 꼭짓점 y의 일부 아래
  const waterLevel = 0; // 월드 y=0 → 수면

  // 월드 범위: 근이 있으면 근 기준, 없으면 ±50
  let xMin: number;
  let xMax: number;
  if (roots.length === 2) {
    const spread = Math.abs(roots[1] - roots[0]);
    const pad = spread * 0.25;
    xMin = Math.min(...roots) - pad;
    xMax = Math.max(...roots) + pad;
  } else {
    xMin = vx - 50;
    xMax = vx + 50;
  }
  const yMin = Math.min(waterLevel - 4, vy - Math.abs(vy) * 0.1);
  const yMax = Math.max(waterLevel + 2, vy + Math.abs(vy) * 0.25);

  const padL = 20;
  const padR = 20;
  const padT = 30;
  const padB = 20;
  const left = x + padL;
  const top = y + padT;
  const width = w - padL - padR;
  const height = h - padT - padB;
  const view: ParabolaView = { xMin, xMax, yMin, yMax, left, top, width, height };

  // 수면
  const { cy: waterCy } = worldToCanvas(view, 0, waterLevel);
  const waterY = Math.min(y + h, Math.max(top, waterCy));
  const seaGrad = ctx.createLinearGradient(x, waterY, x, y + h);
  seaGrad.addColorStop(0, isDark ? '#1e3a8a' : '#3b82f6');
  seaGrad.addColorStop(1, isDark ? '#0c4a6e' : '#1e40af');
  ctx.fillStyle = seaGrad;
  ctx.fillRect(x, waterY, w, y + h - waterY);
  // 수면 라인
  ctx.strokeStyle = isDark ? 'rgba(191,219,254,0.45)' : 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, waterY);
  ctx.lineTo(x + w, waterY);
  ctx.stroke();

  // 아치 반사 (수면 아래, 투명, y=-포물선)
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, waterY, w, y + h - waterY);
  ctx.clip();
  ctx.globalAlpha = 0.25 * alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const N = 80;
  for (let i = 0; i <= N; i++) {
    const wx = xMin + (i / N) * (xMax - xMin);
    const wy = a * wx * wx + b * wx + c;
    if (wy < 0) continue;
    const refWy = -wy; // 수면 반사
    const { cx, cy } = worldToCanvas(view, wx, refWy);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.restore();

  // 교각 (수면 아래까지)
  if (roots.length === 2) {
    for (const r of roots) {
      const { cx } = worldToCanvas(view, r, 0);
      const colW = 14;
      ctx.fillStyle = isDark ? '#475569' : '#64748b';
      ctx.fillRect(cx - colW / 2, waterY, colW, y + h - waterY);
      // 베이스
      ctx.fillStyle = isDark ? '#1e293b' : '#334155';
      ctx.fillRect(cx - colW / 2 - 4, y + h - 10, colW + 8, 10);
    }
  }

  // 아치 (수면 위만 렌더)
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, top - 2, w, waterY - top + 2);
  ctx.clip();
  // 아치 채우기 (상판 느낌)
  ctx.fillStyle = hexAlpha(color, 0.2);
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const wx = xMin + (i / N) * (xMax - xMin);
    const wy = a * wx * wx + b * wx + c;
    const { cx, cy } = worldToCanvas(view, wx, Math.max(waterLevel, wy));
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  const { cx: endCx } = worldToCanvas(view, xMax, waterLevel);
  const { cx: startCx } = worldToCanvas(view, xMin, waterLevel);
  ctx.lineTo(endCx, waterY);
  ctx.lineTo(startCx, waterY);
  ctx.closePath();
  ctx.fill();
  // 아치 라인
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const wx = xMin + (i / N) * (xMax - xMin);
    const wy = a * wx * wx + b * wx + c;
    if (wy < waterLevel) continue;
    const { cx, cy } = worldToCanvas(view, wx, wy);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.restore();

  // 꼭짓점 마커 (아치 정점)
  if (vy > waterLevel) {
    const { cx, cy } = worldToCanvas(view, vx, vy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 라벨
    ctx.font = '600 10px -apple-system, sans-serif';
    ctx.fillStyle = isDark ? '#ffffff' : '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${vy.toFixed(1)}m`, cx, cy - 8);
  }

  // 배지
  const span = roots.length === 2 ? Math.abs(roots[1] - roots[0]) : 0;
  const height_m = vy;
  const badge = span > 0 ? `높이 ${height_m.toFixed(1)}m · 경간 ${span.toFixed(1)}m` : `높이 ${height_m.toFixed(1)}m`;
  drawBadge(ctx, x + 12, y + 10, badge, color, isDark);

  // 캡션
  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(200,210,230,0.85)' : 'rgba(30,41,59,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('교각 위치 = 근 · 아치 정점 = 꼭짓점', x + w / 2, y + h - 8);

  ctx.restore();
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
  isDark: boolean,
): void {
  ctx.save();
  ctx.font = '600 11px -apple-system, sans-serif';
  const w = ctx.measureText(text).width + 16;
  const h = 22;
  ctx.fillStyle = isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.92)';
  ctx.strokeStyle = hexAlpha(color, 0.7);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, 6);
  else ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.restore();
}
