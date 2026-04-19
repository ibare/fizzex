/**
 * 상단 추상 — A vs t 성장 곡선 + 원금 기준선(점선) + 72법칙 2배 마커.
 *
 * inverse=true면 구매력(P²/A) 역방향 표시 — 인플레이션 해석용.
 */

import { hexAlpha } from '../../../../graphics/draw';
import { axis, background, gridLine } from '../../../../graphics/theme';
import { createTimeValueViewport } from '../../../../graphics/viewport';
import { compoundA, doubleTime, formatKrw, formatShortKrw } from './math';
import type { AbstractArgs } from './types';

export function drawAbstract(args: AbstractArgs): void {
  const { ctx, x, y, w, h, P, r, n, t, r_std, A, isStandard, tMax, inverse, color, isDark } = args;

  ctx.save();
  ctx.fillStyle = background(isDark);
  ctx.fillRect(x, y, w, h);

  const padL = 46;
  const padR = 60;
  const padT = 14;
  const padB = 22;
  const left = x + padL;
  const top = y + padT;
  const width = w - padL - padR;
  const height = h - padT - padB;

  const maxA = inverse
    ? P
    : Math.max(
        compoundA(P, Math.max(r, 0), n, tMax),
        compoundA(P, Math.max(r_std, 0), n, tMax),
        P * 1.1,
      );
  const valueAt = (tv: number, rate: number): number => {
    if (inverse) {
      const a = compoundA(P, rate, n, tv);
      return a > 0 ? (P * P) / a : 0;
    }
    return compoundA(P, rate, n, tv);
  };

  const view = createTimeValueViewport({
    rect: { x: left, y: top, w: width, h: height },
    xMin: 0, xMax: tMax,
    yMin: 0, yMax: maxA,
  });
  const { tToX, valueToY } = view;

  ctx.strokeStyle = gridLine(isDark);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) {
    const cx = left + (i / 10) * width;
    ctx.moveTo(cx, top);
    ctx.lineTo(cx, top + height);
  }
  for (let j = 0; j <= 5; j++) {
    const cy = top + (j / 5) * height;
    ctx.moveTo(left, cy);
    ctx.lineTo(left + width, cy);
  }
  ctx.stroke();

  ctx.strokeStyle = axis(isDark);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, top + height);
  ctx.moveTo(left, top + height);
  ctx.lineTo(left + width, top + height);
  ctx.stroke();

  ctx.font = '500 9px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(148,163,184,0.85)' : 'rgba(71,85,105,0.85)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const yLabels = [0, 0.25, 0.5, 0.75, 1];
  for (const rt of yLabels) {
    const v = rt * maxA;
    ctx.fillText(formatShortKrw(v), left - 4, valueToY(v));
  }
  ctx.textAlign = 'left';
  ctx.fillText(inverse ? '구매력' : 'A(만원)', left - 44, top - 2);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= 5; i++) {
    const tv = (i / 5) * tMax;
    ctx.fillText(`${tv.toFixed(0)}년`, tToX(tv), top + height + 3);
  }

  if (!inverse && P >= 0 && P <= maxA) {
    const py = valueToY(P);
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.8)' : 'rgba(71,85,105,0.7)';
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(left, py);
    ctx.lineTo(left + width, py);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '600 9px -apple-system, sans-serif';
    ctx.fillStyle = isDark ? 'rgba(203,213,225,0.9)' : 'rgba(51,65,85,0.9)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`원금 ${formatShortKrw(P)}`, left + 4, py - 2);
  }

  const tDouble = doubleTime(r);
  if (!inverse && Number.isFinite(tDouble) && tDouble > 0 && tDouble <= tMax && 2 * P <= maxA) {
    const cx = tToX(tDouble);
    const cy = valueToY(2 * P);
    ctx.strokeStyle = hexAlpha(color, 0.6);
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, top + height);
    ctx.lineTo(cx, cy);
    ctx.lineTo(left, cy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '700 10px -apple-system, sans-serif';
    ctx.fillStyle = hexAlpha(color, 0.9);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('×2', cx, cy - 4);
  }

  if (!isStandard) {
    ctx.strokeStyle = hexAlpha(color, 0.32);
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    const N = 96;
    for (let i = 0; i <= N; i++) {
      const tv = (i / N) * tMax;
      const v = valueAt(tv, r_std);
      const px = tToX(tv);
      const py = valueToY(Math.max(0, Math.min(maxA, v)));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  const N = 128;
  for (let i = 0; i <= N; i++) {
    const tv = (i / N) * tMax;
    const v = valueAt(tv, r);
    const px = tToX(tv);
    const py = valueToY(Math.max(0, Math.min(maxA, v)));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  if (!inverse) {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(left, valueToY(P));
    for (let i = 0; i <= N; i++) {
      const tv = (i / N) * tMax;
      const v = compoundA(P, r, n, tv);
      const px = tToX(tv);
      const py = valueToY(Math.max(P, Math.min(maxA, v)));
      ctx.lineTo(px, py);
    }
    ctx.lineTo(left + width, valueToY(P));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (t >= 0 && t <= tMax) {
    const vNow = inverse && A > 0 ? (P * P) / A : A;
    const vClamped = Math.max(0, Math.min(maxA, vNow));
    const cx = tToX(t);
    const cy = valueToY(vClamped);
    ctx.strokeStyle = hexAlpha(color, 0.4);
    ctx.setLineDash([2, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(cx, top + height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const badge = formatKrw(vNow);
    ctx.font = '600 11px ui-monospace, Menlo, monospace';
    const textW = ctx.measureText(badge).width;
    const bw = textW + 12;
    const bh = 18;
    const bx = Math.min(left + width - bw, cx + 8);
    const by = Math.max(top + 4, cy - 22);
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.92)';
    ctx.strokeStyle = hexAlpha(color, 0.7);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 4);
    else ctx.rect(bx, by, bw, bh);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, bx + bw / 2, by + bh / 2);
  }

  {
    const ratePct = (r * 100).toFixed(1);
    const txt = Number.isFinite(tDouble) && tDouble > 0
      ? `${ratePct}% · ${tDouble.toFixed(1)}년 후 2배`
      : `${ratePct}%`;
    ctx.font = '600 10px -apple-system, sans-serif';
    const tw = ctx.measureText(txt).width + 14;
    const tx = x + w - tw - 10;
    const ty = y + 6;
    ctx.fillStyle = hexAlpha(color, 0.18);
    ctx.strokeStyle = hexAlpha(color, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(tx, ty, tw, 20, 5);
    else ctx.rect(tx, ty, tw, 20);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, tx + tw / 2, ty + 10);
  }

  ctx.restore();
}
