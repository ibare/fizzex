/**
 * 상단 공통 추상 — 회전 원 + 펼쳐진 파형
 *
 * 왼쪽: 반지름 A의 원 위에서 ωt + φ 만큼 회전한 점의 y 좌표
 * 오른쪽: 그 y를 시간축으로 펼친 사인파
 * 점선 연결: "사인은 회전의 그림자" 직관 전달
 */

import { hexAlpha, type AbstractArgs } from './utils';

export function drawAbstract(args: AbstractArgs): void {
  const { ctx, x, y, w, h, A, omega, phi, t, y_cur, y_std, color, isDark, isStandard } = args;

  ctx.save();

  const padT = 20;
  const padB = 22;
  const midY = y + h / 2;

  const circleAreaW = Math.min(h - padT - padB + 8, w * 0.32);
  const circleR = (circleAreaW - 16) / 2;
  const circleCx = x + 16 + circleR;
  const circleCy = midY;

  const waveX0 = x + circleAreaW + 24;
  const waveX1 = x + w - 12;
  const waveW = waveX1 - waveX0;

  // ── 회전 원 ──
  ctx.strokeStyle = isDark ? 'rgba(200,210,230,0.4)' : 'rgba(60,70,90,0.5)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(circleCx, circleCy, circleR, 0, Math.PI * 2);
  ctx.stroke();
  // 축
  ctx.strokeStyle = isDark ? 'rgba(200,210,230,0.2)' : 'rgba(60,70,90,0.2)';
  ctx.beginPath();
  ctx.moveTo(circleCx - circleR, circleCy);
  ctx.lineTo(circleCx + circleR, circleCy);
  ctx.moveTo(circleCx, circleCy - circleR);
  ctx.lineTo(circleCx, circleCy + circleR);
  ctx.stroke();

  // 회전하는 점 위치
  const absA = Math.max(1e-6, Math.abs(A));
  const phase = omega * t + phi;
  const pointX = circleCx + circleR * Math.cos(phase);
  const pointY = circleCy - circleR * (Math.sin(phase) * (A / absA));

  // 반지름 라인
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(circleCx, circleCy);
  ctx.lineTo(pointX, pointY);
  ctx.stroke();

  // 점
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pointX, pointY, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // y 투영 (점선)
  ctx.strokeStyle = hexAlpha(color, 0.45);
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(pointX, pointY);
  ctx.lineTo(waveX0 - 2, pointY);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── 파형 ──
  // 시간축: 현재 t 기준 과거 구간 표시. t_show = 한 주기 기준
  const periodPix = Math.abs(omega) > 1e-6 ? waveW / 2 : waveW;
  const tStart = t - (waveW / periodPix) * (2 * Math.PI / Math.max(1e-6, Math.abs(omega)));
  const toWaveX = (tv: number) => waveX0 + ((tv - tStart) / (t - tStart)) * waveW;
  const toWaveY = (yv: number) => midY - (yv / absA) * circleR;

  // 축
  ctx.strokeStyle = isDark ? 'rgba(200,210,230,0.35)' : 'rgba(60,70,90,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(waveX0, midY);
  ctx.lineTo(waveX1, midY);
  ctx.stroke();

  // standard 파 (이중)
  if (!isStandard) {
    ctx.strokeStyle = hexAlpha(color, 0.28);
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const N = 128;
    for (let i = 0; i <= N; i++) {
      const tv = tStart + (i / N) * (t - tStart);
      const yv = y_std; // standard 현재 값만 기준선처럼 그릴 수 없으니 같은 파형을 시각적으로 보여주지 않음
      void yv;
      const px = toWaveX(tv);
      const py = toWaveY(A * Math.sin(omega * tv + phi));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // current 파형
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  const N = 192;
  for (let i = 0; i <= N; i++) {
    const tv = tStart + (i / N) * (t - tStart);
    const yv = A * Math.sin(omega * tv + phi);
    const px = toWaveX(tv);
    const py = toWaveY(yv);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // 현재 점
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(waveX1, toWaveY(y_cur), 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // standard 값 점 (구조 변경 시)
  if (!isStandard && Number.isFinite(y_std)) {
    ctx.fillStyle = hexAlpha(color, 0.55);
    ctx.beginPath();
    ctx.arc(waveX1, toWaveY(y_std), 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // A 라벨
  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(200,210,230,0.7)' : 'rgba(60,70,90,0.7)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('+A', circleCx - circleR - 6, circleCy - circleR);
  ctx.textBaseline = 'top';
  ctx.fillText('−A', circleCx - circleR - 6, circleCy + circleR);

  // y 값 배지
  const badge = `y₀ = ${y_cur.toFixed(2)}`;
  ctx.font = '600 10px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = color;
  ctx.fillText(badge, waveX1 - ctx.measureText(badge).width, midY - circleR - 4);

  ctx.restore();
}
