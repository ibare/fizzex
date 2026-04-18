/**
 * 상단 추상 — N/N₀ vs t 감소 곡선 + 반감기 마커.
 *
 * 수평 점선 0.5/0.25/0.125 + 교점 수직선으로 반감기 일정성 강조.
 */

import { hexAlpha } from '../../../../graphics/draw';
import { decayRatio, formatT } from './math';
import type { AbstractArgs } from './types';

export function drawAbstract(args: AbstractArgs): void {
  const { ctx, x, y, w, h, r, r_std, t, halfLife, isStandard, color, isDark, tMax } = args;

  ctx.save();
  ctx.fillStyle = isDark ? '#0b1220' : '#f8fafc';
  ctx.fillRect(x, y, w, h);

  const padL = 38;
  const padR = 56;
  const padT = 14;
  const padB = 22;
  const left = x + padL;
  const top = y + padT;
  const width = w - padL - padR;
  const height = h - padT - padB;

  const tToX = (tv: number) => left + (tv / tMax) * width;
  const ratioToY = (rt: number) => top + height - rt * height;

  ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.16)';
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

  ctx.strokeStyle = isDark ? 'rgba(203,213,225,0.55)' : 'rgba(30,41,59,0.55)';
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
    ctx.fillText(rt.toFixed(2), left - 4, ratioToY(rt));
  }
  ctx.textAlign = 'left';
  ctx.fillText('N/N₀', left - 34, top - 2);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= 5; i++) {
    const tv = (i / 5) * tMax;
    ctx.fillText(formatT(tv), tToX(tv), top + height + 3);
  }

  if (halfLife > 0 && Number.isFinite(halfLife)) {
    const halfs = [0.5, 0.25, 0.125];
    ctx.strokeStyle = hexAlpha(color, 0.35);
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    let k = 1;
    for (const rt of halfs) {
      const thalf = halfLife * k;
      if (thalf > tMax) break;
      const cy = ratioToY(rt);
      const cx = tToX(thalf);
      ctx.beginPath();
      ctx.moveTo(left, cy);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, top + height);
      ctx.stroke();
      k++;
    }
    ctx.setLineDash([]);
    ctx.fillStyle = hexAlpha(color, 0.9);
    ctx.font = '600 10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    let k2 = 1;
    for (const rt of halfs) {
      const thalf = halfLife * k2;
      if (thalf > tMax) break;
      const cx = tToX(thalf);
      const suffix = k2 === 1 ? '½' : k2 === 2 ? '¼' : '⅛';
      ctx.fillText(suffix, cx, top + 3);
      k2++;
      void rt;
    }
  }

  if (!isStandard) {
    ctx.strokeStyle = hexAlpha(color, 0.32);
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    const N = 96;
    for (let i = 0; i <= N; i++) {
      const tv = (i / N) * tMax;
      const rt = decayRatio(r_std, tv);
      const px = tToX(tv);
      const py = ratioToY(Math.max(0, Math.min(1, rt)));
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
    const rt = decayRatio(r, tv);
    const px = tToX(tv);
    const py = ratioToY(Math.max(0, Math.min(1, rt)));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  if (t >= 0 && t <= tMax) {
    const ratio = Math.max(0, Math.min(1, decayRatio(r, t)));
    const cx = tToX(t);
    const cy = ratioToY(ratio);
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

    const badge = `${(ratio * 100).toFixed(1)}%`;
    ctx.font = '600 11px ui-monospace, Menlo, monospace';
    const bx = Math.min(left + width - 52, cx + 8);
    const by = Math.max(top + 4, cy - 22);
    const bw = 48;
    const bh = 18;
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

  if (halfLife > 0 && Number.isFinite(halfLife)) {
    const text = `반감기 ${formatT(halfLife)}`;
    ctx.font = '600 10px -apple-system, sans-serif';
    const tw = ctx.measureText(text).width + 14;
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
    ctx.fillText(text, tx + tw / 2, ty + 10);
  }

  ctx.restore();
}
