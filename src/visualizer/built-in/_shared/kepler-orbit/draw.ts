/**
 * 케플러 궤도 Canvas 렌더링 primitives.
 *
 * 변형별 brand color·정보 라벨만 다르게 주입하는 순수 그리기 함수 모음.
 */

import type { Star } from './types';
import { R_EARTH } from './constants';
import { formatTime } from './math';

/** 별 배경 난수 생성 */
export function generateStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.5 + 0.5,
      brightness: Math.random() * 0.5 + 0.5,
    });
  }
  return stars;
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  isDark: boolean,
  stars: Star[],
): void {
  ctx.fillStyle = isDark ? '#0a0a1a' : '#f0f4f8';
  ctx.fillRect(0, 0, w, h);
  if (!isDark) return;
  for (const star of stars) {
    ctx.beginPath();
    ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${star.brightness * 0.6})`;
    ctx.fill();
  }
}

export function drawOrbit(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  orbitPx: number,
  isDark: boolean,
): void {
  ctx.beginPath();
  ctx.arc(cx, cy, orbitPx, 0, Math.PI * 2);
  ctx.strokeStyle = isDark ? 'rgba(130,180,255,0.5)' : 'rgba(60,120,220,0.4)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawEarth(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  earthPx: number,
  isDark: boolean,
): void {
  const grad = ctx.createRadialGradient(
    cx - earthPx * 0.3, cy - earthPx * 0.3, 0,
    cx, cy, earthPx,
  );
  if (isDark) {
    grad.addColorStop(0, '#4a90d9');
    grad.addColorStop(0.7, '#2a5f9e');
    grad.addColorStop(1, '#1a3a6e');
  } else {
    grad.addColorStop(0, '#6bb5ff');
    grad.addColorStop(0.7, '#4a90d9');
    grad.addColorStop(1, '#2a6fc0');
  }
  ctx.beginPath();
  ctx.arc(cx, cy, earthPx, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, earthPx + 3, 0, Math.PI * 2);
  ctx.strokeStyle = isDark ? 'rgba(100,160,255,0.25)' : 'rgba(70,130,220,0.2)';
  ctx.lineWidth = 4;
  ctx.stroke();
}

export function drawAltitudeLine(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  earthPx: number,
  orbitPx: number,
  a_km: number,
  isDark: boolean,
): void {
  if (orbitPx - earthPx <= 15) return;
  const angle = Math.PI / 2;
  const surfX = cx + earthPx * Math.cos(angle);
  const surfY = cy + earthPx * Math.sin(angle);
  const orbitX = cx + orbitPx * Math.cos(angle);
  const orbitY = cy + orbitPx * Math.sin(angle);

  ctx.beginPath();
  ctx.moveTo(surfX, surfY);
  ctx.lineTo(orbitX, orbitY);
  ctx.strokeStyle = isDark ? 'rgba(255,200,100,0.4)' : 'rgba(200,150,50,0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  const midY = (surfY + orbitY) / 2;
  const altitude = a_km - R_EARTH;
  ctx.font = '11px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(255,220,140,0.7)' : 'rgba(180,130,50,0.7)';
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.round(altitude).toLocaleString()} km`, surfX + 8, midY);
}

export function drawSatelliteTrail(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  orbitPx: number,
  angle: number,
  isDark: boolean,
): void {
  const trailCount = 12;
  for (let i = trailCount; i > 0; i--) {
    const a = angle - (i * 0.08);
    const tx = cx + orbitPx * Math.cos(a);
    const ty = cy + orbitPx * Math.sin(a);
    const alpha = (1 - i / trailCount) * 0.3;
    const size = 2 * (1 - i / trailCount);
    ctx.beginPath();
    ctx.arc(tx, ty, size, 0, Math.PI * 2);
    ctx.fillStyle = isDark
      ? `rgba(255,200,100,${alpha})`
      : `rgba(220,150,50,${alpha})`;
    ctx.fill();
  }
}

export function drawBaselineGhost(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  orbitPx: number,
  angle: number,
  isDark: boolean,
): void {
  const bx = cx + orbitPx * Math.cos(angle);
  const by = cy + orbitPx * Math.sin(angle);
  ctx.beginPath();
  ctx.arc(bx, by, 5, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? 'rgba(255,220,100,0.55)' : 'rgba(200,160,40,0.5)';
  ctx.fill();
}

export function drawSatellite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  orbitPx: number,
  angle: number,
  isStandard: boolean,
  isDark: boolean,
): void {
  const x = cx + orbitPx * Math.cos(angle);
  const y = cy + orbitPx * Math.sin(angle);
  const fill = isStandard
    ? (isDark ? '#ffd466' : '#e8a030')
    : (isDark ? '#f87171' : '#dc2626');
  const glow = isStandard
    ? (isDark ? 'rgba(255,220,100,0.2)' : 'rgba(220,170,50,0.15)')
    : (isDark ? 'rgba(248,113,113,0.25)' : 'rgba(220,38,38,0.18)');

  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

export interface InfoPanelArgs {
  ctx: CanvasRenderingContext2D;
  width: number;
  currentPeriod: number;
  currentVelocity: number;
  currentA: number;
  baselinePeriod: number;
  isStandard: boolean;
  isDark: boolean;
}

/** 우상단 정보 패널 — 주기/속도/반지름 + baseline 비교 */
export function drawInfoPanel(args: InfoPanelArgs): void {
  const { ctx, width, currentPeriod, currentVelocity, currentA, baselinePeriod, isStandard, isDark } = args;

  ctx.font = '12px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  const defaultColor = isDark ? 'rgba(200,210,230,0.7)' : 'rgba(60,70,90,0.7)';
  ctx.fillStyle = defaultColor;

  const infoX = width - 16;
  let infoY = 24;
  if (currentPeriod > 0) {
    ctx.fillText(`주기: ${formatTime(currentPeriod)}`, infoX, infoY);
    infoY += 18;
  }
  if (currentVelocity > 0) {
    ctx.fillText(`속도: ${currentVelocity.toFixed(2)} km/s`, infoX, infoY);
    infoY += 18;
  }
  ctx.fillText(`반지름: ${Math.round(currentA).toLocaleString()} km`, infoX, infoY);
  infoY += 18;

  if (isStandard) return;

  if (currentPeriod === 0) {
    ctx.fillStyle = isDark ? 'rgba(180,180,190,0.85)' : 'rgba(100,100,110,0.85)';
    ctx.fillText('이 우주에서 존재할 수 없음', infoX, infoY);
    return;
  }
  if (baselinePeriod > 0) {
    const ratio = (currentPeriod / baselinePeriod) * 100;
    const label = ratio > 100 ? '느림' : ratio < 100 ? '빠름' : '동일';
    ctx.fillStyle = isDark ? 'rgba(248,113,113,0.85)' : 'rgba(220,38,38,0.8)';
    ctx.fillText(`표준 대비 주기 ${ratio.toFixed(1)}% (${label})`, infoX, infoY);
  }
}
