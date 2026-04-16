/**
 * 상단 추상 시각화 — h vs t 포물선
 *
 * 세로축 h(높이, 아래로 증가), 가로축 t(시간).
 * current(실선) + standard(반투명, 구조 변경 시) 이중 포물선.
 * 현재 시간 t에서의 점 + 수직 점선.
 */

import { formatMeter, formatSecond, hexAlpha, type SceneDrawArgs } from './utils';

export function drawAbstract(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, g, t, h_cur, h_std, g_std, color, isDark, alpha = 1, isStandard } = args;
  if (!(g > 0) || !(t >= 0)) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  // ── 그래프 범위 ──
  // t 최대값: 현재 t보다 조금 여유있게. 최소 3초.
  const tMax = Math.max(3, t * 1.25 + 0.5);
  // h 최대값: current/standard/현재 g 중 최대 h. 최소 20m.
  const hPeak = Math.max(
    20,
    0.5 * Math.max(g, g_std) * tMax * tMax,
    h_cur * 1.1,
    h_std * 1.1,
  );

  const padL = 46;
  const padR = 22;
  const padT = 18;
  const padB = 26;
  const plotW = Math.max(1, w - padL - padR);
  const plotH = Math.max(1, h - padT - padB);

  const toX = (tv: number) => x + padL + (tv / tMax) * plotW;
  // 세로축 하향: h가 커질수록 y 좌표 증가 (아래로 내려감)
  const toY = (hv: number) => y + padT + (hv / hPeak) * plotH;

  // ── 축 ──
  ctx.strokeStyle = isDark ? 'rgba(200,210,230,0.45)' : 'rgba(60,70,90,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  // y축 (왼쪽 세로선)
  ctx.moveTo(toX(0), toY(0));
  ctx.lineTo(toX(0), toY(hPeak));
  // x축 (위쪽 가로선 — 시간축을 위에 두어 "아래로 낙하" 느낌)
  ctx.moveTo(toX(0), toY(0));
  ctx.lineTo(toX(tMax), toY(0));
  ctx.stroke();

  // 축 라벨
  ctx.fillStyle = isDark ? 'rgba(200,210,230,0.75)' : 'rgba(60,70,90,0.75)';
  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('t →', toX(tMax) - 2, toY(0) - 14);
  ctx.save();
  ctx.translate(toX(0) - 10, toY(hPeak / 2));
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('h (낙하거리) ↓', 0, 0);
  ctx.restore();

  // 시간 눈금 (1초 단위, 최대 5개)
  const tStep = tMax > 6 ? 2 : tMax > 3 ? 1 : 0.5;
  ctx.font = '500 9px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = isDark ? 'rgba(200,210,230,0.6)' : 'rgba(60,70,90,0.6)';
  for (let tv = tStep; tv <= tMax; tv += tStep) {
    const xp = toX(tv);
    ctx.strokeStyle = isDark ? 'rgba(200,210,230,0.15)' : 'rgba(60,70,90,0.15)';
    ctx.beginPath();
    ctx.moveTo(xp, toY(0));
    ctx.lineTo(xp, toY(hPeak));
    ctx.stroke();
    ctx.fillText(`${tv}s`, xp, toY(0) - 13);
  }

  // ── standard(참조) 포물선 (구조 변경 시에만 반투명) ──
  if (!isStandard) {
    ctx.strokeStyle = hexAlpha(color, 0.3);
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const N = 48;
    for (let i = 0; i <= N; i++) {
      const tv = (i / N) * tMax;
      const hv = 0.5 * g_std * tv * tv;
      if (hv > hPeak) break;
      const px = toX(tv);
      const py = toY(hv);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── current 포물선 (실선) ──
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const tv = (i / N) * tMax;
    const hv = 0.5 * g * tv * tv;
    if (hv > hPeak) break;
    const px = toX(tv);
    const py = toY(hv);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // ── 현재 t 점 + 수직 점선 ──
  const curPx = toX(t);
  const curPy = toY(Math.min(h_cur, hPeak));
  ctx.strokeStyle = hexAlpha(color, 0.55);
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(curPx, toY(0));
  ctx.lineTo(curPx, curPy);
  ctx.moveTo(toX(0), curPy);
  ctx.lineTo(curPx, curPy);
  ctx.stroke();
  ctx.setLineDash([]);

  // 점
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(curPx, curPy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── 값 배지 (우하단) ──
  const badge = `h = ${formatMeter(h_cur)} · t = ${formatSecond(t)}`;
  ctx.font = '600 11px -apple-system, sans-serif';
  const bw = ctx.measureText(badge).width + 16;
  const bh = 20;
  const bx = x + w - padR - bw;
  const by = y + padT + plotH - bh - 4;
  ctx.fillStyle = isDark ? 'rgba(20,28,40,0.82)' : 'rgba(255,255,255,0.92)';
  ctx.strokeStyle = hexAlpha(color, 0.6);
  ctx.lineWidth = 1;
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, bx + bw / 2, by + bh / 2 + 0.5);

  ctx.restore();
}
