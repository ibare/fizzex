/**
 * 🔢 자유 탐구 장면 — 큰 격자 + 더 넓은 시야의 포물선
 *
 * 상단 추상 패널과 다른 점은 시야가 더 넓고 격자가 촘촘하다는 것.
 * a를 바꾸면 포물선 폭/방향, b는 좌우, c는 상하로 이동.
 */

import { drawParabola, hexAlpha, quadVertex, worldToCanvas, type ParabolaView, type SceneDrawArgs } from '../utils';

export function drawSandbox(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, a, b, c, vx, vy, roots, color, isDark, alpha = 1 } = args;
  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.fillStyle = isDark ? '#0f172a' : '#f1f5f9';
  ctx.fillRect(x, y, w, h);

  const padL = 30;
  const padR = 20;
  const padT = 18;
  const padB = 26;
  const left = x + padL;
  const top = y + padT;
  const width = w - padL - padR;
  const height = h - padT - padB;

  // 시야: 꼭짓점 중심, 최소 ±6 범위
  const centerX = Number.isFinite(vx) ? vx : 0;
  const spanX = Math.max(12, Math.abs(vy) * 0.5, ...roots.map((r) => Math.abs(r - centerX) * 2));
  const xMin = centerX - spanX / 2;
  const xMax = centerX + spanX / 2;

  const samples = 64;
  const ys: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const wx = xMin + (i / samples) * (xMax - xMin);
    ys.push(a * wx * wx + b * wx + c);
  }
  let yMin = Math.min(0, ...ys);
  let yMax = Math.max(0, ...ys);
  const pad = (yMax - yMin) * 0.15 || 1;
  yMin -= pad;
  yMax += pad;

  const view: ParabolaView = { xMin, xMax, yMin, yMax, left, top, width, height };

  // 촘촘한 격자
  ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.18)';
  ctx.lineWidth = 1;
  const fineStepX = (xMax - xMin) / 20;
  const fineStepY = (yMax - yMin) / 16;
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const cx = left + (i / 20) * width;
    ctx.moveTo(cx, top);
    ctx.lineTo(cx, top + height);
  }
  for (let j = 0; j <= 16; j++) {
    const cy = top + (j / 16) * height;
    ctx.moveTo(left, cy);
    ctx.lineTo(left + width, cy);
  }
  ctx.stroke();
  void fineStepX;
  void fineStepY;

  // 원점 축
  ctx.strokeStyle = isDark ? 'rgba(203,213,225,0.55)' : 'rgba(30,41,59,0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (yMin <= 0 && yMax >= 0) {
    const { cy } = worldToCanvas(view, 0, 0);
    ctx.moveTo(left, cy);
    ctx.lineTo(left + width, cy);
  }
  if (xMin <= 0 && xMax >= 0) {
    const { cx } = worldToCanvas(view, 0, 0);
    ctx.moveTo(cx, top);
    ctx.lineTo(cx, top + height);
  }
  ctx.stroke();

  // 포물선 채우기 (반투명)
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  ctx.fillStyle = hexAlpha(color, 0.1);
  ctx.beginPath();
  for (let i = 0; i <= samples; i++) {
    const wx = xMin + (i / samples) * (xMax - xMin);
    const wy = a * wx * wx + b * wx + c;
    const { cx, cy } = worldToCanvas(view, wx, wy);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  // 축까지 닫기
  const { cx: endCx } = worldToCanvas(view, xMax, 0);
  const { cx: startCx } = worldToCanvas(view, xMin, 0);
  const baseCy = yMin <= 0 && yMax >= 0 ? worldToCanvas(view, 0, 0).cy : top + height;
  ctx.lineTo(endCx, baseCy);
  ctx.lineTo(startCx, baseCy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  drawParabola(ctx, view, a, b, c, {
    strokeStyle: color,
    lineWidth: 2.5,
  });

  // 꼭짓점 마커
  const { vx: _vx, vy: _vy } = quadVertex(a, b, c);
  if (_vx >= xMin && _vx <= xMax && _vy >= yMin && _vy <= yMax) {
    const { cx, cy } = worldToCanvas(view, _vx, _vy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 계수 패널
  const badge = `y = ${fmtCoef(a, true)}x² ${fmtCoef(b, false, 'bx')} ${fmtCoef(c, false, 'c')}`;
  ctx.fillStyle = isDark ? 'rgba(15,23,42,0.82)' : 'rgba(255,255,255,0.92)';
  ctx.strokeStyle = hexAlpha(color, 0.6);
  ctx.lineWidth = 1.5;
  ctx.font = '600 11px ui-monospace, Menlo, monospace';
  const textW = ctx.measureText(badge).width + 16;
  ctx.beginPath();
  ctx.roundRect?.(x + 12, y + 10, textW, 24, 6);
  if (!ctx.roundRect) {
    ctx.rect(x + 12, y + 10, textW, 24);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, x + 12 + textW / 2, y + 22);

  // 캡션
  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(200,210,230,0.75)' : 'rgba(60,70,90,0.78)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('a·b·c를 바꾸며 포물선의 변화 관찰', x + w / 2, y + h - 8);

  ctx.restore();
}

function fmtCoef(v: number, first = false, slot: 'a' | 'bx' | 'c' = 'a'): string {
  if (slot === 'a') {
    if (Math.abs(v) < 1e-9) return '0';
    return v < 0 ? `−${Math.abs(v).toFixed(2)}` : v.toFixed(2);
  }
  if (slot === 'bx') {
    if (Math.abs(v) < 1e-9) return '';
    const sign = v < 0 ? '−' : '+';
    return `${sign} ${Math.abs(v).toFixed(2)}x`;
  }
  // c
  if (Math.abs(v) < 1e-9) return '';
  const sign = v < 0 ? '−' : '+';
  return `${sign} ${Math.abs(v).toFixed(2)}`;
}
