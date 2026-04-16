/**
 * 💰 고금리 적금 — 저금통 크기 ∝ A/P
 *
 * 소액(P=100만) + 중금리 시나리오. 저금통이 점점 부풀어오른다.
 * 좌: 원금 저금통(고정), 우: 현재 저금통(성장).
 */

import { hexAlpha, formatKrw, doubleTime, type SceneDrawArgs } from '../utils';

export function drawDeposit(args: SceneDrawArgs): void {
  const {
    ctx, x, y, w, h,
    P, r, A, A_std, isStandard,
    animT,
    color, isDark, alpha = 1,
  } = args;

  ctx.save();
  ctx.globalAlpha = alpha;

  // 방 배경 (따뜻한 톤)
  const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
  bgGrad.addColorStop(0, isDark ? '#27272a' : '#fff7ed');
  bgGrad.addColorStop(1, isDark ? '#18181b' : '#fed7aa');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(x, y, w, h);

  // 테이블
  const floorY = y + h - 28;
  ctx.strokeStyle = isDark ? '#57534e' : '#b45309';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 8, floorY);
  ctx.lineTo(x + w - 8, floorY);
  ctx.stroke();

  // 저금통 크기 스케일
  const ratio = A / P;
  const baseR = Math.min(34, Math.min(h * 0.18, w * 0.1));
  const scaleCur = Math.sqrt(ratio); // 넓이가 ratio에 비례 → 반경은 sqrt
  const maxScale = Math.max(scaleCur, Math.sqrt(A_std / P), Math.sqrt(2));
  const sizeFit = Math.min(1, Math.min((h * 0.55) / (baseR * 2 * maxScale), (w * 0.25) / (baseR * 2 * maxScale)));

  const leftCx = x + w * 0.30;
  const rightCx = x + w * 0.60;

  // 좌: 원금 저금통 (1배)
  drawPiggy(ctx, leftCx, floorY, baseR * sizeFit, '#a1a1aa', isDark, 0);
  labelBelow(ctx, leftCx, floorY + 4, `원금 ${formatKrw(P)}`, isDark);

  // 표준(A_std) 윤곽 — 편집 중일 때만
  if (!isStandard) {
    const stdR = baseR * Math.sqrt(A_std / P) * sizeFit;
    ctx.save();
    ctx.strokeStyle = hexAlpha(color, 0.5);
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(rightCx, floorY - stdR, stdR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 우: 현재 저금통 (크기 ∝ sqrt(A/P))
  const curR = baseR * scaleCur * sizeFit;
  drawPiggy(ctx, rightCx, floorY, curR, color, isDark, animT);
  labelBelow(ctx, rightCx, floorY + 4, formatKrw(A), isDark, color);

  // 동전이 저금통 위에서 떨어지는 애니메이션
  const coinPhase = (animT * 0.7) % 1;
  const coinX = rightCx + Math.sin(animT * 1.3) * 8;
  const coinY = y + 30 + coinPhase * (floorY - curR * 2 - (y + 30));
  if (coinPhase < 0.95) {
    ctx.fillStyle = hexAlpha(color, 0.9);
    ctx.strokeStyle = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(coinX, coinY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 반짝임
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(coinX - 1.5, coinY - 1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 72법칙 배지
  const tDouble = doubleTime(r);
  const ratePct = (r * 100).toFixed(1);
  const badgeText = Number.isFinite(tDouble)
    ? `${ratePct}% · ${tDouble.toFixed(0)}년 후 2배`
    : `${ratePct}%`;
  drawBadge(ctx, x + w - 10, y + h - 10, badgeText, color, isDark);

  // 캡션
  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(253,230,138,0.85)' : 'rgba(120,53,15,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('작은 돈도 꾸준히 쌓이면', x + w / 2, y + 8);

  ctx.restore();
}

function drawPiggy(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  r: number,
  color: string,
  isDark: boolean,
  animT: number,
): void {
  if (r <= 0) return;
  const bodyCy = bottomY - r;
  // 몸통 (타원)
  ctx.save();
  // 살짝 통통 튀는 애니메이션
  const breathe = 1 + Math.sin(animT * 2.5) * 0.02;
  ctx.translate(cx, bodyCy);
  ctx.scale(1, breathe);
  ctx.translate(-cx, -bodyCy);
  const grad = ctx.createRadialGradient(cx - r * 0.3, bodyCy - r * 0.3, r * 0.1, cx, bodyCy, r * 1.2);
  grad.addColorStop(0, lighten(color, 0.35));
  grad.addColorStop(1, color);
  ctx.fillStyle = grad;
  ctx.strokeStyle = isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, bodyCy, r * 1.2, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 귀
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.5, bodyCy - r * 0.85);
  ctx.lineTo(cx - r * 0.2, bodyCy - r * 1.15);
  ctx.lineTo(cx - r * 0.1, bodyCy - r * 0.75);
  ctx.closePath();
  ctx.fillStyle = darken(color, 0.15);
  ctx.fill();
  ctx.stroke();

  // 코 (주둥이 타원 + 콧구멍)
  const noseX = cx + r * 1.1;
  const noseY = bodyCy + r * 0.05;
  ctx.fillStyle = darken(color, 0.2);
  ctx.beginPath();
  ctx.ellipse(noseX, noseY, r * 0.3, r * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = isDark ? '#0b1220' : '#1e293b';
  ctx.beginPath();
  ctx.arc(noseX + r * 0.05, noseY - r * 0.06, r * 0.05, 0, Math.PI * 2);
  ctx.arc(noseX + r * 0.05, noseY + r * 0.06, r * 0.05, 0, Math.PI * 2);
  ctx.fill();

  // 눈
  ctx.fillStyle = isDark ? '#0b1220' : '#1e293b';
  ctx.beginPath();
  ctx.arc(cx + r * 0.4, bodyCy - r * 0.35, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx + r * 0.42, bodyCy - r * 0.38, r * 0.03, 0, Math.PI * 2);
  ctx.fill();

  // 동전 투입구 (상단 슬릿)
  ctx.fillStyle = isDark ? '#111827' : '#1f2937';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(cx - r * 0.3, bodyCy - r * 1.02, r * 0.6, r * 0.12, r * 0.06);
  else ctx.rect(cx - r * 0.3, bodyCy - r * 1.02, r * 0.6, r * 0.12);
  ctx.fill();

  // 다리 4개
  const legW = r * 0.22;
  const legH = r * 0.22;
  for (const lx of [cx - r * 0.7, cx - r * 0.25, cx + r * 0.25, cx + r * 0.7]) {
    ctx.fillStyle = darken(color, 0.1);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(lx - legW / 2, bottomY - legH, legW, legH, 2);
    else ctx.rect(lx - legW / 2, bottomY - legH, legW, legH);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function labelBelow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  text: string,
  isDark: boolean,
  color?: string,
): void {
  ctx.font = '600 10px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color ?? (isDark ? '#e2e8f0' : '#1e293b');
  ctx.fillText(text, cx, topY);
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  rightX: number,
  bottomY: number,
  text: string,
  color: string,
  isDark: boolean,
): void {
  ctx.font = '600 10px -apple-system, sans-serif';
  const tw = ctx.measureText(text).width + 14;
  const bw = tw;
  const bh = 20;
  const bx = rightX - bw;
  const by = bottomY - bh;
  ctx.fillStyle = hexAlpha(color, isDark ? 0.25 : 0.2);
  ctx.strokeStyle = hexAlpha(color, 0.65);
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 5);
  else ctx.rect(bx, by, bw, bh);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + bw / 2, by + bh / 2);
}

function lighten(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, Math.round(r + (255 - r) * amt));
  const ng = Math.min(255, Math.round(g + (255 - g) * amt));
  const nb = Math.min(255, Math.round(b + (255 - b) * amt));
  return `rgb(${nr},${ng},${nb})`;
}

function darken(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.max(0, Math.round(r * (1 - amt)));
  const ng = Math.max(0, Math.round(g * (1 - amt)));
  const nb = Math.max(0, Math.round(b * (1 - amt)));
  return `rgb(${nr},${ng},${nb})`;
}
