/**
 * 상단 추상 — A vs t 성장 곡선 + 원금 기준선(점선) + 72법칙 2배 마커
 *
 * - 원금 P를 수평 점선으로 표시 → 기준 대비 성장 체감
 * - correct(반투명 점선) vs current(실선) 이중 곡선
 * - 현재 t 지점에 점 + 금액 배지
 * - 2배 지점 (A = 2P) 세로 점선 마커
 */

import { hexAlpha, compoundA, formatKrw, doubleTime } from './utils';

export interface AbstractArgs {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  w: number;
  h: number;
  P: number;
  r: number;
  n: number;
  t: number;
  /** 편집 전 표준 r */
  r_std: number;
  /** 현재 A (만원) — 프레임워크에서 전달 */
  A: number;
  /** 편집되지 않음 */
  isStandard: boolean;
  /** 표시할 최대 년 */
  tMax: number;
  /** 역방향(인플레이션) 모드 — 구매력 감소 시각화 */
  inverse: boolean;
  color: string;
  isDark: boolean;
}

export function drawAbstract(args: AbstractArgs): void {
  const {
    ctx, x, y, w, h,
    P, r, n, t, r_std, A,
    isStandard, tMax, inverse,
    color, isDark,
  } = args;

  ctx.save();
  ctx.fillStyle = isDark ? '#0b1220' : '#f8fafc';
  ctx.fillRect(x, y, w, h);

  const padL = 46;
  const padR = 60;
  const padT = 14;
  const padB = 22;
  const left = x + padL;
  const top = y + padT;
  const width = w - padL - padR;
  const height = h - padT - padB;

  // y축 스케일: 인버스면 [0, P] (구매력은 원금을 넘지 않음), 정방향이면 [0, A(tMax)]
  // 정방향에선 현재 r 또는 r_std 중 큰 쪽 기준으로 maxA 결정
  const maxA = inverse
    ? P
    : Math.max(
        compoundA(P, Math.max(r, 0), n, tMax),
        compoundA(P, Math.max(r_std, 0), n, tMax),
        P * 1.1,
      );
  // 구매력(인버스) 값: P² / A
  const valueAt = (tv: number, rate: number): number => {
    if (inverse) {
      const a = compoundA(P, rate, n, tv);
      return a > 0 ? (P * P) / a : 0;
    }
    return compoundA(P, rate, n, tv);
  };

  const tToX = (tv: number) => left + (tv / tMax) * width;
  const valueToY = (v: number) => top + height - (v / maxA) * height;

  // 배경 격자
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

  // 축
  ctx.strokeStyle = isDark ? 'rgba(203,213,225,0.55)' : 'rgba(30,41,59,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, top + height);
  ctx.moveTo(left, top + height);
  ctx.lineTo(left + width, top + height);
  ctx.stroke();

  // y축 라벨
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

  // x축 라벨
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= 5; i++) {
    const tv = (i / 5) * tMax;
    ctx.fillText(`${tv.toFixed(0)}년`, tToX(tv), top + height + 3);
  }

  // 원금 P 기준선 (수평 점선) — 정방향만 의미 있음
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
    // 라벨
    ctx.font = '600 9px -apple-system, sans-serif';
    ctx.fillStyle = isDark ? 'rgba(203,213,225,0.9)' : 'rgba(51,65,85,0.9)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`원금 ${formatShortKrw(P)}`, left + 4, py - 2);
  }

  // 72의 법칙: 2배 되는 시간
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
    // ×2 라벨
    ctx.font = '700 10px -apple-system, sans-serif';
    ctx.fillStyle = hexAlpha(color, 0.9);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('×2', cx, cy - 4);
  }

  // 표준 곡선 (편집 중일 때 반투명 점선)
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

  // 현재 곡선
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

  // 성장 영역 채우기 (옅게)
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

  // 현재 t 지점
  if (t >= 0 && t <= tMax) {
    const vNow = inverse && A > 0 ? (P * P) / A : A;
    const vClamped = Math.max(0, Math.min(maxA, vNow));
    const cx = tToX(t);
    const cy = valueToY(vClamped);
    // 수직 가이드
    ctx.strokeStyle = hexAlpha(color, 0.4);
    ctx.setLineDash([2, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(cx, top + height);
    ctx.stroke();
    ctx.setLineDash([]);
    // 점
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 금액 배지
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

  // 우상단 배지: 이율 + 2배 시점
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

/** 만원 단위 요약 (축 라벨용) */
function formatShortKrw(manWon: number): string {
  if (!Number.isFinite(manWon)) return '';
  const abs = Math.abs(manWon);
  if (abs >= 10000) return `${(manWon / 10000).toFixed(1)}억`;
  if (abs >= 1000) return `${Math.round(manWon / 100) / 10}천만`;
  return `${Math.round(manWon)}만`;
}
