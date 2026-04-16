/**
 * 🚶 지름길 장면 — 잔디 영역 + L자/대각선 경로 + 절약률
 *
 * a: 블록 가로
 * b: 블록 세로
 * c: 대각선 거리
 *
 * 설명 전달: 잔디 텍스처 + 테두리 = 공원/블록 맥락.
 * L자 점선(돌아가기) vs 대각선 실선(가로지르기) 대비.
 * 좌상단 절약률 배지: (a+b-c)/(a+b)*100 %.
 */

import { hexAlpha, roundRect, type SceneDrawArgs } from '../utils';

export function drawShortcut(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, a, b, c, color, isDark, alpha = 1 } = args;
  if (!(a > 0) || !(b > 0) || !(c > 0)) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  // ── 배경 ──
  ctx.fillStyle = isDark ? '#0b1220' : '#f8fafc';
  ctx.fillRect(x, y, w, h);

  // ── 블록 bbox ──
  const padX = 20;
  const padT = 40; // 배지 공간
  const padB = 20;
  const innerW = Math.max(1, w - padX * 2);
  const innerH = Math.max(1, h - padT - padB);
  const ratio = a / b;
  let blkW = innerW;
  let blkH = blkW / ratio;
  if (blkH > innerH) {
    blkH = innerH;
    blkW = blkH * ratio;
  }
  const blkX = x + (w - blkW) / 2;
  const blkY = y + padT + (innerH - blkH) / 2;

  // ── 잔디 텍스처 ──
  ctx.fillStyle = isDark ? '#1a3d2a' : '#86efac';
  ctx.fillRect(blkX, blkY, blkW, blkH);

  ctx.strokeStyle = isDark ? 'rgba(80,140,100,0.35)' : 'rgba(34,107,60,0.32)';
  ctx.lineWidth = 1;
  const grassCount = 24;
  // 잔디는 결정론적 유사 랜덤 (단순 해시)
  for (let i = 0; i < grassCount; i++) {
    const h1 = ((i * 9301 + 49297) % 233280) / 233280;
    const h2 = ((i * 4721 + 10007) % 233280) / 233280;
    const gx = blkX + 6 + h1 * (blkW - 12);
    const gy = blkY + 6 + h2 * (blkH - 12);
    const gh = 4 + ((i * 13) % 5);
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx - 2, gy - gh);
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + 2, gy - gh);
    ctx.stroke();
  }

  // 블록 테두리
  ctx.strokeStyle = isDark ? 'rgba(220,230,255,0.4)' : 'rgba(60,70,90,0.5)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(blkX, blkY, blkW, blkH);

  // ── 경로 좌표 ──
  // 출발: 좌하단, 도착: 우상단
  const p0 = { x: blkX, y: blkY + blkH };
  const pC = { x: blkX + blkW, y: blkY + blkH }; // L 꺾임점 1 (우하단)
  const p1 = { x: blkX + blkW, y: blkY }; // 도착

  // ── L자 경로 (점선, 돌아가기) ──
  ctx.strokeStyle = isDark ? 'rgba(200,210,230,0.75)' : 'rgba(60,70,90,0.75)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(pC.x, pC.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── 대각선 경로 (실선, 가로지르기) ──
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.stroke();

  // ── 발자국 마커 ──
  const stepCount = 5;
  ctx.fillStyle = hexAlpha(color, 0.7);
  for (let i = 1; i < stepCount; i++) {
    const t = i / stepCount;
    const fx = p0.x + (p1.x - p0.x) * t;
    const fy = p0.y + (p1.y - p0.y) * t;
    ctx.beginPath();
    ctx.ellipse(fx, fy, 4, 2.5, Math.atan2(p1.y - p0.y, p1.x - p0.x), 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 출발/도착 마커 ──
  ctx.fillStyle = isDark ? '#f1f5f9' : '#0f172a';
  ctx.beginPath();
  ctx.arc(p0.x, p0.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, 5, 0, Math.PI * 2);
  ctx.fill();

  // ── 절약률 배지 ──
  const sum = a + b;
  const saved = sum - c;
  const pct = sum > 0 ? (saved / sum) * 100 : 0;
  const unit = a >= 10 || b >= 10 ? 'm' : 'm';
  const fmt = (v: number) => (v >= 10 ? v.toFixed(0) : v.toFixed(1));
  const badge = `돌아가면 ${fmt(sum)}${unit} · 가로지르면 ${fmt(c)}${unit} · ${pct.toFixed(0)}% 절약`;

  ctx.font = '600 11px -apple-system, sans-serif';
  const bw = Math.min(w - 20, ctx.measureText(badge).width + 16);
  const bh = 22;
  const bx = x + 10;
  const by = y + 10;
  ctx.fillStyle = hexAlpha(color, isDark ? 0.26 : 0.16);
  roundRect(ctx, bx, by, bw, bh, 11);
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
