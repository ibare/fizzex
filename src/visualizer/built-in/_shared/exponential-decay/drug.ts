/**
 * 💊 약물 혈중 농도 장면 — 인체 실루엣 + 농도 fill.
 *
 * 타임라인에 ½, ¼, ⅛(복용 간격) 마커.
 */

import { hexAlpha } from '../../../../graphics/draw';
import type { SceneDrawArgs } from './types';

export function drawDrug(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, N0, ratio, ratio_std, isStandard, halfLife, t, color, isDark } = args;
  ctx.save();

  ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
  ctx.fillRect(x, y, w, h);

  const bodyCx = x + w * 0.28;
  const bodyTopY = y + 20;
  const bodyH = Math.min(h - 50, 160);
  drawBodySilhouette(ctx, bodyCx, bodyTopY, bodyH, ratio, ratio_std, isStandard, color, isDark);

  const tlX = x + w * 0.55;
  const tlY = y + 30;
  const tlW = Math.min(w - (tlX - x) - 20, 180);
  const tlH = Math.min(h - 80, 140);

  ctx.strokeStyle = isDark ? 'rgba(203,213,225,0.4)' : 'rgba(71,85,105,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tlX, tlY + tlH);
  ctx.lineTo(tlX + tlW, tlY + tlH);
  ctx.moveTo(tlX, tlY);
  ctx.lineTo(tlX, tlY + tlH);
  ctx.stroke();

  const marks = [
    { t: 0, label: '복용', ratio: 1, warn: false },
    { t: halfLife, label: '½', ratio: 0.5, warn: false },
    { t: halfLife * 2, label: '¼', ratio: 0.25, warn: false },
    { t: halfLife * 3, label: '⅛', ratio: 0.125, warn: true },
  ];
  const tMax = halfLife * 3.5;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const tv = (i / N) * tMax;
    const rt = Math.exp(-((Math.log(2) / halfLife) * tv));
    const px = tlX + (tv / tMax) * tlW;
    const py = tlY + tlH - rt * tlH;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  for (const m of marks) {
    const px = tlX + (m.t / tMax) * tlW;
    const py = tlY + tlH - m.ratio * tlH;
    ctx.fillStyle = m.warn ? '#ef4444' : color;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.font = '600 9px -apple-system, sans-serif';
    ctx.fillStyle = m.warn ? '#ef4444' : isDark ? 'rgba(226,232,240,0.9)' : 'rgba(30,41,59,0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(m.label, px, py - 6);
    ctx.fillStyle = isDark ? 'rgba(148,163,184,0.7)' : 'rgba(71,85,105,0.8)';
    ctx.textBaseline = 'top';
    ctx.fillText(`${m.t.toFixed(0)}h`, px, tlY + tlH + 3);
  }

  if (t >= 0 && t <= tMax) {
    const px = tlX + (t / tMax) * tlW;
    const py = tlY + tlH - Math.max(0, Math.min(1, ratio)) * tlH;
    ctx.fillStyle = isDark ? '#ffffff' : '#0b1220';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  const badge = `${(N0 * ratio).toFixed(0)} mg`;
  ctx.font = '700 12px ui-monospace, Menlo, monospace';
  ctx.fillStyle = isDark ? '#fca5a5' : '#dc2626';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(badge, bodyCx, y + h - 22);

  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(200,210,230,0.85)' : 'rgba(30,41,59,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('혈중 농도 = 색 진하기', x + w / 2, y + h - 8);

  ctx.restore();
}

function drawBodySilhouette(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  h: number,
  ratio: number,
  ratio_std: number,
  isStandard: boolean,
  color: string,
  isDark: boolean,
): void {
  const headR = h * 0.08;
  const bodyW = h * 0.25;
  const bodyH = h * 0.52;
  const legH = h * 0.3;

  ctx.save();
  const path = () => {
    ctx.beginPath();
    ctx.arc(cx, topY + headR, headR, 0, Math.PI * 2);
    ctx.moveTo(cx - bodyW / 2, topY + headR * 2);
    ctx.lineTo(cx + bodyW / 2, topY + headR * 2);
    ctx.lineTo(cx + bodyW / 2 - 4, topY + headR * 2 + bodyH);
    ctx.lineTo(cx - bodyW / 2 + 4, topY + headR * 2 + bodyH);
    ctx.closePath();
    const legTop = topY + headR * 2 + bodyH;
    ctx.moveTo(cx - bodyW / 2 + 4, legTop);
    ctx.lineTo(cx - 2, legTop);
    ctx.lineTo(cx - 2, legTop + legH);
    ctx.lineTo(cx - bodyW / 2 + 2, legTop + legH);
    ctx.closePath();
    ctx.moveTo(cx + 2, legTop);
    ctx.lineTo(cx + bodyW / 2 - 4, legTop);
    ctx.lineTo(cx + bodyW / 2 - 2, legTop + legH);
    ctx.lineTo(cx + 2, legTop + legH);
    ctx.closePath();
  };

  ctx.fillStyle = isDark ? 'rgba(71,85,105,0.4)' : 'rgba(203,213,225,0.8)';
  path();
  ctx.fill();

  if (!isStandard) {
    ctx.strokeStyle = hexAlpha(color, 0.5);
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;
    path();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0.08, ratio)})`;
  path();
  ctx.fill();

  ctx.strokeStyle = isDark ? 'rgba(203,213,225,0.6)' : 'rgba(30,41,59,0.7)';
  ctx.lineWidth = 1.2;
  path();
  ctx.stroke();

  ctx.restore();
  void ratio_std;
}
