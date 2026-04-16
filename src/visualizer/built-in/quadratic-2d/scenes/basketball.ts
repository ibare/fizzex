/**
 * 🏀 농구 자유투 장면 — 코트 측면 + 선수 + 골대 + 공 궤적
 *
 * 포물선 궤적 = 농구공이 날아가는 경로.
 * c = 발사 높이, 꼭짓점 = 최고점, 두 번째 근 = 착지 지점.
 * xCur → 공의 현재 위치.
 */

import { drawParabola, hexAlpha, worldToCanvas, type ParabolaView, type SceneDrawArgs } from '../utils';

export function drawBasketball(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, a, b, c, xCur, yCur, vx, vy, roots, color, isDark, alpha = 1 } = args;
  ctx.save();
  ctx.globalAlpha = alpha;

  // 배경 (체육관 느낌)
  const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
  bgGrad.addColorStop(0, isDark ? '#111827' : '#fef3c7');
  bgGrad.addColorStop(1, isDark ? '#1f2937' : '#fde68a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(x, y, w, h);

  // 궤적 범위: 0 ~ 두번째 근 또는 vx*2
  const launchX = 0;
  const landX = roots.length === 2 ? Math.max(...roots) : vx * 2;
  const maxX = Math.max(8, landX * 1.25);
  const xMin = -1;
  const xMax = maxX;
  const yMin = -0.5;
  const yMax = Math.max(4, vy * 1.3);

  const padL = 16;
  const padR = 16;
  const padT = 18;
  const padB = 40;
  const left = x + padL;
  const top = y + padT;
  const width = w - padL - padR;
  const height = h - padT - padB;
  const view: ParabolaView = { xMin, xMax, yMin, yMax, left, top, width, height };

  // 바닥 라인
  const { cy: floorCy } = worldToCanvas(view, 0, 0);
  ctx.fillStyle = isDark ? '#78350f' : '#a16207';
  ctx.fillRect(x, floorCy, w, y + h - floorCy);
  ctx.strokeStyle = isDark ? '#fbbf24' : '#7c2d12';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, floorCy);
  ctx.lineTo(x + w, floorCy);
  ctx.stroke();
  // 바닥 라인 패턴 (나무 판자)
  ctx.strokeStyle = isDark ? 'rgba(251,191,36,0.25)' : 'rgba(120,53,15,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const px = x + (i / 8) * w;
    ctx.beginPath();
    ctx.moveTo(px, floorCy);
    ctx.lineTo(px, y + h);
    ctx.stroke();
  }

  // 궤적 (포물선, 바닥 위쪽만)
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, floorCy - top);
  ctx.clip();
  // 궤적 가이드 (반투명)
  drawParabola(ctx, view, a, b, c, {
    strokeStyle: hexAlpha(color, 0.35),
    lineWidth: 2,
    dash: [4, 3],
  });
  ctx.restore();

  // 선수 실루엣 (좌측, 발사 지점 x=0)
  const { cx: playerCx } = worldToCanvas(view, launchX, 0);
  const { cy: releaseCy } = worldToCanvas(view, launchX, c);
  drawPlayer(ctx, playerCx, floorCy, Math.max(36, floorCy - releaseCy + 12), isDark);

  // 골대 (오른쪽, 착지 지점)
  if (roots.length === 2 || landX > 0) {
    const { cx: hoopCx } = worldToCanvas(view, landX, 0);
    drawHoop(ctx, hoopCx, floorCy, color, isDark);
  }

  // 꼭짓점 마커 (최고점)
  if (vy > 0 && vx > 0 && vx < xMax) {
    const { cx, cy } = worldToCanvas(view, vx, vy);
    ctx.fillStyle = hexAlpha(color, 0.25);
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, floorCy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.font = '600 10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`최고점 ${vy.toFixed(1)}m`, cx, cy - 12);
  }

  // 공
  if (xCur >= xMin && xCur <= xMax) {
    const ballY = Math.max(0, yCur);
    const { cx, cy } = worldToCanvas(view, xCur, ballY);
    drawBall(ctx, cx, cy, 10);
  }

  // 배지
  const peak = vy;
  const range = landX > 0 ? landX : 0;
  const badge = range > 0 ? `최고점 ${peak.toFixed(1)}m · 비거리 ${range.toFixed(1)}m` : `최고점 ${peak.toFixed(1)}m`;
  drawBadge(ctx, x + 12, y + 10, badge, color, isDark);

  // 캡션
  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(254,243,199,0.85)' : 'rgba(120,53,15,0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('슛의 궤적은 언제나 포물선', x + w / 2, y + h - 8);

  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  cx: number,
  floorY: number,
  bodyH: number,
  isDark: boolean,
): void {
  const bodyW = 14;
  const headR = 8;
  const color = isDark ? '#cbd5e1' : '#1e293b';
  // 몸통
  ctx.fillStyle = color;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(cx - bodyW / 2, floorY - bodyH + headR * 2, bodyW, bodyH - headR * 2, 4);
  else ctx.rect(cx - bodyW / 2, floorY - bodyH + headR * 2, bodyW, bodyH - headR * 2);
  ctx.fill();
  // 머리
  ctx.beginPath();
  ctx.arc(cx, floorY - bodyH + headR, headR, 0, Math.PI * 2);
  ctx.fill();
  // 팔 (던지는 자세)
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, floorY - bodyH + headR * 2 + 4);
  ctx.lineTo(cx + 10, floorY - bodyH + 2);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function drawHoop(
  ctx: CanvasRenderingContext2D,
  cx: number,
  floorY: number,
  color: string,
  isDark: boolean,
): void {
  const poleH = 70;
  const boardW = 26;
  const boardH = 18;
  const ringTopY = floorY - poleH + 8;
  // 기둥
  ctx.fillStyle = isDark ? '#64748b' : '#334155';
  ctx.fillRect(cx - 2, floorY - poleH, 4, poleH);
  // 백보드
  ctx.fillStyle = isDark ? '#cbd5e1' : '#f8fafc';
  ctx.fillRect(cx - 2 - boardW, ringTopY - boardH / 2, boardW, boardH);
  ctx.strokeStyle = isDark ? '#475569' : '#64748b';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 2 - boardW, ringTopY - boardH / 2, boardW, boardH);
  // 링
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx - 2 - boardW + 2, ringTopY);
  ctx.lineTo(cx - 10, ringTopY);
  ctx.stroke();
  // 그물 (간략)
  ctx.strokeStyle = hexAlpha(color, 0.5);
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const sx = cx - 10 + i * 2;
    ctx.beginPath();
    ctx.moveTo(sx, ringTopY);
    ctx.lineTo(sx - 1 + i * 0.3, ringTopY + 8);
    ctx.stroke();
  }
}

function drawBall(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.arc(cx + 1, cy + 2, r, 0, Math.PI * 2);
  ctx.fill();
  // 공
  const grad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, r);
  grad.addColorStop(0, '#fdba74');
  grad.addColorStop(1, '#c2410c');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // 솔기
  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();
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
