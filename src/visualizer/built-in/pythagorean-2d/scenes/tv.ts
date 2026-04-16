/**
 * 📺 TV 장면 — TV 본체 + 대각선 + 인치 표기
 *
 * a: 화면 가로 (m)
 * b: 화면 세로 (m)
 * c: 화면 대각선 (m) — 인치는 c * 39.37
 *
 * 설명 전달: TV 본체 + 스탠드 = 가전 맥락. 화면 중앙에 큰 인치 숫자로
 * "TV는 인치로 표기" 관습을 전달. 측정은 cm 단위.
 */

import { formatN, roundRect, type SceneDrawArgs } from '../utils';

export function drawTV(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, a, b, c, color, isDark, alpha = 1 } = args;
  if (!(a > 0) || !(b > 0) || !(c > 0)) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  // ── 배경 ──
  ctx.fillStyle = isDark ? '#0b1220' : '#f1f5f9';
  ctx.fillRect(x, y, w, h);

  // ── TV 본체 영역 산정 ──
  // 베젤 + 스탠드 포함 bbox. 화면 비율 a:b 유지.
  const bezel = 0.04; // 화면 기준 베젤 비율
  const standH = 0.14; // 화면 기준 스탠드 높이
  const measureMargin = 36; // cm 측정선 영역
  const padT = 14;
  const padX = 20;
  const innerW = Math.max(1, w - padX * 2);
  const innerH = Math.max(1, h - padT - measureMargin);
  // 화면 크기: 실제 a:b 비율로 innerW/innerH에 내접
  const ratio = a / b;
  let screenW = innerW * (1 - bezel * 2);
  let screenH = screenW / ratio;
  const maxScreenH = innerH * (1 - bezel * 2 - standH);
  if (screenH > maxScreenH) {
    screenH = maxScreenH;
    screenW = screenH * ratio;
  }
  const bezelPx = screenW * bezel;
  const standHPx = screenH * standH;

  const tvW = screenW + bezelPx * 2;
  const tvH = screenH + bezelPx * 2;
  const tvX = x + (w - tvW) / 2;
  const tvY = y + padT;
  const screenX = tvX + bezelPx;
  const screenY = tvY + bezelPx;

  // ── TV 베젤 ──
  ctx.fillStyle = isDark ? '#1f2937' : '#1e293b';
  roundRect(ctx, tvX, tvY, tvW, tvH, 6);
  ctx.fill();

  // ── 화면 ──
  const screenGrad = ctx.createLinearGradient(screenX, screenY, screenX, screenY + screenH);
  screenGrad.addColorStop(0, isDark ? '#1e293b' : '#334155');
  screenGrad.addColorStop(1, isDark ? '#0f172a' : '#1e293b');
  ctx.fillStyle = screenGrad;
  ctx.fillRect(screenX, screenY, screenW, screenH);

  // ── 화면 대각선 (점선) ──
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(screenX, screenY + screenH);
  ctx.lineTo(screenX + screenW, screenY);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── 화면 중앙 인치 표기 ──
  const inch = c * 39.3701;
  ctx.font = `600 ${Math.min(42, screenH * 0.35).toFixed(0)}px -apple-system, sans-serif`;
  ctx.fillStyle = 'rgba(245,248,255,0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${inch.toFixed(1)}"`, screenX + screenW / 2, screenY + screenH / 2);

  // ── 스탠드 ──
  const standW = tvW * 0.35;
  const standNeckW = tvW * 0.08;
  const standX = tvX + (tvW - standW) / 2;
  const standY = tvY + tvH;
  ctx.fillStyle = isDark ? '#1f2937' : '#334155';
  // 목
  ctx.fillRect(tvX + (tvW - standNeckW) / 2, standY, standNeckW, standHPx * 0.5);
  // 받침
  roundRect(ctx, standX, standY + standHPx * 0.5, standW, standHPx * 0.5, 3);
  ctx.fill();

  // ── 측정선 ──
  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(235,240,250,0.85)' : 'rgba(30,40,55,0.85)';
  ctx.strokeStyle = isDark ? 'rgba(235,240,250,0.6)' : 'rgba(30,40,55,0.55)';
  ctx.lineWidth = 1;

  // 가로 (a, cm)
  const aMy = y + h - 14;
  ctx.beginPath();
  ctx.moveTo(screenX, aMy - 4);
  ctx.lineTo(screenX, aMy + 4);
  ctx.moveTo(screenX + screenW, aMy - 4);
  ctx.lineTo(screenX + screenW, aMy + 4);
  ctx.moveTo(screenX, aMy);
  ctx.lineTo(screenX + screenW, aMy);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${(a * 100).toFixed(0)}cm`, screenX + screenW / 2, aMy - 6);

  // 세로 (b, cm) — 화면 오른쪽
  const bMx = screenX + screenW + 18;
  if (bMx < x + w - 8) {
    ctx.beginPath();
    ctx.moveTo(bMx - 4, screenY);
    ctx.lineTo(bMx + 4, screenY);
    ctx.moveTo(bMx - 4, screenY + screenH);
    ctx.lineTo(bMx + 4, screenY + screenH);
    ctx.moveTo(bMx, screenY);
    ctx.lineTo(bMx, screenY + screenH);
    ctx.stroke();
    ctx.save();
    ctx.translate(bMx + 4, screenY + screenH / 2);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${(b * 100).toFixed(0)}cm`, 0, 0);
    ctx.restore();
  }

  // ── c 값 배지 (좌상단) ──
  const badge = `c = ${formatN(c)}m`;
  ctx.font = '600 11px -apple-system, sans-serif';
  const bw = ctx.measureText(badge).width + 16;
  const bh = 20;
  const bx = x + 10;
  const by = y + 10;
  ctx.fillStyle = isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.14)';
  roundRect(ctx, bx, by, bw, bh, 10);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, bx + 8, by + bh / 2 + 0.5);

  ctx.restore();
}
