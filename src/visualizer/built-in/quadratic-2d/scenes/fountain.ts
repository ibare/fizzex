/**
 * ⛲ 분수 장면 — 분수대 + 주 물줄기(포물선) + 장식 물줄기
 *
 * a < 0 포물선 = 한 개 물줄기. 꼭짓점 = 최고점.
 * 장식: 서로 다른 a로 여러 곡선을 겹쳐 실제 분수 느낌.
 */

import { drawParabola, hexAlpha, worldToCanvas, type ParabolaView, type SceneDrawArgs } from '../utils';

export function drawFountain(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, a, b, c, vx, vy, roots, animT, color, isDark, alpha = 1 } = args;
  ctx.save();
  ctx.globalAlpha = alpha;

  // 배경 (밤 정원)
  const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
  bgGrad.addColorStop(0, isDark ? '#0f172a' : '#dbeafe');
  bgGrad.addColorStop(1, isDark ? '#020617' : '#93c5fd');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(x, y, w, h);

  // 별 (dark mode)
  if (isDark) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 30; i++) {
      const sx = x + ((i * 73) % w);
      const sy = y + ((i * 137) % (h * 0.5));
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 월드: 분수대 중심 vx 기준
  const landX = roots.length === 2 ? Math.max(...roots) : Math.max(vx * 2, 4);
  const launchX = roots.length === 2 ? Math.min(...roots) : 0;
  const span = landX - launchX;
  const centerX = (launchX + landX) / 2;
  const xMin = centerX - span * 1.2;
  const xMax = centerX + span * 1.2;
  const yMin = -0.5;
  const yMax = Math.max(2, vy * 1.3);

  const padL = 10;
  const padR = 10;
  const padT = 20;
  const padB = 40;
  const left = x + padL;
  const top = y + padT;
  const width = w - padL - padR;
  const height = h - padT - padB;
  const view: ParabolaView = { xMin, xMax, yMin, yMax, left, top, width, height };

  const { cy: poolY } = worldToCanvas(view, 0, 0);

  // 분수대 (석조 원형 수반)
  const { cx: centerCx } = worldToCanvas(view, centerX, 0);
  const poolW = Math.min(width * 0.7, Math.max(80, span * (width / (xMax - xMin)) * 1.1));
  const poolH = 18;
  ctx.fillStyle = isDark ? '#334155' : '#94a3b8';
  ctx.beginPath();
  ctx.ellipse(centerCx, poolY + poolH / 2, poolW / 2, poolH / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // 수면
  ctx.fillStyle = hexAlpha(color, 0.35);
  ctx.beginPath();
  ctx.ellipse(centerCx, poolY + 3, poolW / 2 - 6, (poolH - 6) / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDark ? '#1e293b' : '#475569';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(centerCx, poolY + poolH / 2, poolW / 2, poolH / 2, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 분수대 하단 받침
  ctx.fillStyle = isDark ? '#1e293b' : '#64748b';
  ctx.fillRect(centerCx - poolW / 2 - 8, poolY + poolH, poolW + 16, y + h - (poolY + poolH));

  // 장식 물줄기 (좌우 대칭, a 변형)
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, poolY - top);
  ctx.clip();
  const deco = [0.6, 0.8, 1.2, 1.4];
  for (const f of deco) {
    const a2 = a * f;
    // 새 포물선은 같은 근을 유지하려면 c도 맞춰야 함. 간단히 꼭짓점 유지.
    // y = a2 * (x - vx)^2 + vy*(a2/a) 형태 대신 vy 유지가 일관적
    const vyNew = vy / f; // 폭이 늘어나면 높이 감소
    const b2 = -2 * a2 * vx;
    const c2 = vyNew - a2 * vx * vx - b2 * vx;
    drawParabola(ctx, view, a2, b2, c2, {
      strokeStyle: hexAlpha(color, 0.25),
      lineWidth: 1.5,
    });
  }
  ctx.restore();

  // 주 물줄기 (메인 포물선, 그라데이션)
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, poolY - top + 2);
  ctx.clip();
  const grad = ctx.createLinearGradient(0, top, 0, poolY);
  grad.addColorStop(0, isDark ? '#bae6fd' : '#38bdf8');
  grad.addColorStop(1, color);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  const N = 80;
  for (let i = 0; i <= N; i++) {
    const wx = xMin + (i / N) * (xMax - xMin);
    const wy = a * wx * wx + b * wx + c;
    if (wy < 0) continue;
    const { cx, cy } = worldToCanvas(view, wx, wy);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.restore();

  // 물방울 입자 (애니메이션)
  ctx.fillStyle = hexAlpha(isDark ? '#bae6fd' : '#38bdf8', 0.7);
  const dropCount = 12;
  for (let i = 0; i < dropCount; i++) {
    // 물줄기 위에서 시간에 따라 하강
    const progress = (i / dropCount + animT * 0.3) % 1;
    const wx = launchX + progress * (landX - launchX);
    const baseY = a * wx * wx + b * wx + c;
    const wy = Math.max(0, baseY - progress * 0.3);
    if (wy < 0) continue;
    const { cx, cy } = worldToCanvas(view, wx, wy);
    ctx.beginPath();
    ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 꼭짓점 마커
  if (vy > 0) {
    const { cx, cy } = worldToCanvas(view, vx, vy);
    ctx.fillStyle = isDark ? '#e0f2fe' : '#0369a1';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '600 10px -apple-system, sans-serif';
    ctx.fillStyle = isDark ? '#f0f9ff' : '#0c4a6e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${vy.toFixed(1)}m`, cx, cy - 8);
  }

  // 배지
  const badge = `최대 높이 ${vy.toFixed(1)}m`;
  drawBadge(ctx, x + 12, y + 10, badge, color, isDark);

  // 캡션
  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(200,210,230,0.85)' : 'rgba(30,41,59,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('|a|가 작을수록 더 높이 솟는다', x + w / 2, y + h - 8);

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
