/**
 * 상단 공통 추상 — 좌표 평면 + 포물선 + 꼭짓점/대칭축/근
 *
 * current (실선) + standard (점선, 구조 변경 시) 이중 오버레이
 */

import { drawParabola, hexAlpha, quadRoots, quadVertex, worldToCanvas, type ParabolaView } from './utils';

export interface AbstractArgs {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  w: number;
  h: number;
  a: number;
  b: number;
  c: number;
  /** 표준(baseline) 계수 */
  a_std: number;
  b_std: number;
  c_std: number;
  xCur: number;
  isStandard: boolean;
  color: string;
  isDark: boolean;
  /** 보여줄 x 범위 (월드) */
  xMin: number;
  xMax: number;
}

export function drawAbstract(args: AbstractArgs): void {
  const { ctx, x, y, w, h, a, b, c, a_std, b_std, c_std, xCur, isStandard, color, isDark, xMin, xMax } = args;

  ctx.save();
  ctx.fillStyle = isDark ? '#0b1220' : '#f8fafc';
  ctx.fillRect(x, y, w, h);

  const padL = 34;
  const padR = 12;
  const padT = 14;
  const padB = 20;
  const left = x + padL;
  const top = y + padT;
  const width = w - padL - padR;
  const height = h - padT - padB;

  // y 범위: 포물선이 담기도록 자동 계산
  const yExtents: number[] = [];
  const samples = 32;
  for (let i = 0; i <= samples; i++) {
    const wx = xMin + (i / samples) * (xMax - xMin);
    yExtents.push(a * wx * wx + b * wx + c);
    yExtents.push(a_std * wx * wx + b_std * wx + c_std);
  }
  let yMin = Math.min(...yExtents);
  let yMax = Math.max(...yExtents);
  const yPad = (yMax - yMin) * 0.15 || 1;
  yMin -= yPad;
  yMax += yPad;

  const view: ParabolaView = { xMin, xMax, yMin, yMax, left, top, width, height };

  // 배경 격자
  ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.18)';
  ctx.lineWidth = 1;
  const gridStepX = niceStep((xMax - xMin) / 6);
  const gridStepY = niceStep((yMax - yMin) / 5);
  ctx.beginPath();
  for (let gx = Math.ceil(xMin / gridStepX) * gridStepX; gx <= xMax; gx += gridStepX) {
    const { cx } = worldToCanvas(view, gx, 0);
    ctx.moveTo(cx, top);
    ctx.lineTo(cx, top + height);
  }
  for (let gy = Math.ceil(yMin / gridStepY) * gridStepY; gy <= yMax; gy += gridStepY) {
    const { cy } = worldToCanvas(view, 0, gy);
    ctx.moveTo(left, cy);
    ctx.lineTo(left + width, cy);
  }
  ctx.stroke();

  // 축
  const axisColor = isDark ? 'rgba(203,213,225,0.6)' : 'rgba(30,41,59,0.6)';
  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  // x축 (y=0)
  if (yMin <= 0 && yMax >= 0) {
    const { cy } = worldToCanvas(view, 0, 0);
    ctx.moveTo(left, cy);
    ctx.lineTo(left + width, cy);
  }
  // y축 (x=0)
  if (xMin <= 0 && xMax >= 0) {
    const { cx } = worldToCanvas(view, 0, 0);
    ctx.moveTo(cx, top);
    ctx.lineTo(cx, top + height);
  }
  ctx.stroke();

  // 축 라벨
  ctx.font = '500 9px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(148,163,184,0.85)' : 'rgba(71,85,105,0.85)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let gy = Math.ceil(yMin / gridStepY) * gridStepY; gy <= yMax; gy += gridStepY) {
    if (Math.abs(gy) < 1e-9) continue;
    const { cy } = worldToCanvas(view, 0, gy);
    ctx.fillText(formatNum(gy), left - 4, cy);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let gx = Math.ceil(xMin / gridStepX) * gridStepX; gx <= xMax; gx += gridStepX) {
    if (Math.abs(gx) < 1e-9) continue;
    const { cx } = worldToCanvas(view, gx, 0);
    ctx.fillText(formatNum(gx), cx, top + height + 3);
  }

  // standard 포물선 (반투명, 구조 변경 시만)
  if (!isStandard) {
    drawParabola(ctx, view, a_std, b_std, c_std, {
      strokeStyle: hexAlpha(color, 0.32),
      lineWidth: 2,
      dash: [5, 4],
    });
  }

  // current 포물선
  drawParabola(ctx, view, a, b, c, {
    strokeStyle: color,
    lineWidth: 2.4,
  });

  // 꼭짓점
  const { vx, vy } = quadVertex(a, b, c);
  if (vx >= xMin && vx <= xMax && vy >= yMin && vy <= yMax) {
    const { cx, cy } = worldToCanvas(view, vx, vy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 대칭축
    ctx.strokeStyle = hexAlpha(color, 0.35);
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(cx, top + height);
    ctx.stroke();
    ctx.setLineDash([]);
    // 라벨
    ctx.fillStyle = color;
    ctx.font = '600 10px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`(${formatNum(vx)}, ${formatNum(vy)})`, cx + 7, cy - 4);
  }

  // 근
  const roots = quadRoots(a, b, c);
  for (const r of roots) {
    if (r < xMin || r > xMax) continue;
    const { cx, cy } = worldToCanvas(view, r, 0);
    ctx.fillStyle = isDark ? '#fbbf24' : '#ea580c';
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // 현재 x 지점 포인트
  const yCur = a * xCur * xCur + b * xCur + c;
  if (xCur >= xMin && xCur <= xMax && yCur >= yMin && yCur <= yMax) {
    const { cx, cy } = worldToCanvas(view, xCur, yCur);
    ctx.strokeStyle = hexAlpha(color, 0.5);
    ctx.setLineDash([2, 3]);
    ctx.lineWidth = 1;
    const { cx: cx0 } = worldToCanvas(view, xCur, 0);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx0, Math.min(top + height, Math.max(top, cx0 && cy)));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = isDark ? '#ffffff' : '#0b1220';
    ctx.beginPath();
    ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const n = raw / base;
  let factor = 1;
  if (n < 1.5) factor = 1;
  else if (n < 3) factor = 2;
  else if (n < 7.5) factor = 5;
  else factor = 10;
  return factor * base;
}

function formatNum(n: number): string {
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Math.abs(n) >= 10) return n.toFixed(1);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  if (Math.abs(n) < 0.01) return n.toExponential(1);
  return n.toFixed(2);
}
