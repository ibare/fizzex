/**
 * 📈 주식 장기투자 — 5년 단위 성장 막대 차트
 *
 * - 매 5년 구간 막대가 커짐 → 기하급수 느낌
 * - 10년(×2), 20년(×4), 30년(×8) 이정표 세로 점선
 */

import { hexAlpha, formatKrw, compoundA, type SceneDrawArgs } from '../utils';

export function drawStock(args: SceneDrawArgs): void {
  const {
    ctx, x, y, w, h,
    P, r, n, t, A,
    tMax, animT,
    color, isDark, alpha = 1,
  } = args;

  ctx.save();
  ctx.globalAlpha = alpha;

  // 배경 (그리드 라인 있는 거래판)
  const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
  bgGrad.addColorStop(0, isDark ? '#0b1e3a' : '#eff6ff');
  bgGrad.addColorStop(1, isDark ? '#0a0f2c' : '#dbeafe');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(x, y, w, h);

  // 플롯 영역
  const padL = 34;
  const padR = 18;
  const padT = 24;
  const padB = 32;
  const left = x + padL;
  const top = y + padT;
  const width = w - padL - padR;
  const height = h - padT - padB;

  // 5년 단위 구간
  const step = 5;
  const nBars = Math.max(1, Math.floor(tMax / step));
  const tEnd = nBars * step;
  // 최대 A (tEnd 지점)
  const maxA = compoundA(P, r, n, tEnd);
  const scaleMax = Math.max(maxA, P * 2);

  // 격자
  ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let j = 0; j <= 5; j++) {
    const cy = top + (j / 5) * height;
    ctx.moveTo(left, cy);
    ctx.lineTo(left + width, cy);
  }
  ctx.stroke();

  // 원금 기준선
  const baseY = top + height - (P / scaleMax) * height;
  ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.7)' : 'rgba(71,85,105,0.6)';
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(left, baseY);
  ctx.lineTo(left + width, baseY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = '600 9px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(203,213,225,0.9)' : 'rgba(51,65,85,0.85)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`원금 ${formatKrw(P)}`, left + 4, baseY - 2);

  // 막대
  const gap = 4;
  const barW = (width - gap * (nBars - 1)) / nBars;
  for (let i = 0; i < nBars; i++) {
    const tEndBar = (i + 1) * step;
    const a = compoundA(P, r, n, tEndBar);
    // 애니메이션: t가 아직 이 막대에 도달하지 않았으면 축소 표시
    const reached = Math.min(1, Math.max(0, (t - i * step) / step));
    const displayA = P + (a - P) * reached;
    const barH = Math.max(0, (displayA / scaleMax) * height);
    const bx = left + i * (barW + gap);
    const by = top + height - barH;

    // 막대 그라디언트
    const barGrad = ctx.createLinearGradient(0, by, 0, top + height);
    barGrad.addColorStop(0, hexAlpha(color, 0.95));
    barGrad.addColorStop(1, hexAlpha(color, 0.5));
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, barW, barH, 3);
    else ctx.rect(bx, by, barW, barH);
    ctx.fill();

    // 막대 외곽
    ctx.strokeStyle = hexAlpha(color, 0.9);
    ctx.lineWidth = 1;
    ctx.stroke();

    // 증가분 (원금 위 영역 강조)
    if (barH > 0 && displayA > P) {
      const gainH = ((displayA - P) / scaleMax) * height;
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = color;
      ctx.fillRect(bx, by, barW, gainH);
      ctx.restore();
    }

    // 라벨 (막대 위, 충분히 크면)
    if (barH > 26 && reached > 0) {
      ctx.font = '600 9px ui-monospace, Menlo, monospace';
      ctx.fillStyle = isDark ? '#e2e8f0' : '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(formatKrw(displayA), bx + barW / 2, by - 2);
    }
  }

  // x축 + 년 라벨
  ctx.strokeStyle = isDark ? 'rgba(203,213,225,0.55)' : 'rgba(30,41,59,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top + height);
  ctx.lineTo(left + width, top + height);
  ctx.stroke();
  ctx.font = '500 9px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(148,163,184,0.85)' : 'rgba(71,85,105,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= nBars; i++) {
    const yr = i * step;
    const cx = left + (yr / tEnd) * width;
    ctx.fillText(`${yr}`, cx, top + height + 3);
  }

  // 이정표 마커: 10/20/30년에서 ×2, ×4, ×8 (7%일 때 거의 맞음)
  const milestones = [
    { yr: 10, label: '×2' },
    { yr: 20, label: '×4' },
    { yr: 30, label: '×8' },
  ];
  for (const m of milestones) {
    if (m.yr > tEnd) continue;
    const cx = left + (m.yr / tEnd) * width;
    ctx.strokeStyle = hexAlpha(color, 0.5);
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(cx, top + height);
    ctx.stroke();
    ctx.setLineDash([]);
    // 라벨 배지 (상단)
    ctx.font = '700 9px -apple-system, sans-serif';
    const tw = ctx.measureText(m.label).width + 8;
    const bx = cx - tw / 2;
    const by = top - 2;
    ctx.fillStyle = hexAlpha(color, 0.85);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, tw, 14, 3);
    else ctx.rect(bx, by, tw, 14);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(m.label, cx, by + 7);
  }

  // 현재 t 마커 (애니메이션)
  if (t >= 0 && t <= tEnd) {
    const cx = left + (t / tEnd) * width;
    const cy = top + height - (A / scaleMax) * height;
    // 깜빡이는 점
    const pulse = 4 + Math.sin(animT * 6) * 1.5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // 캡션 (상단 좌측)
  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(191,219,254,0.85)' : 'rgba(30,58,138,0.85)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('기하급수로 커지는 복리', left, y + 6);

  ctx.restore();
}
