/**
 * 상단 공통 추상 — 회전 원 + 펼쳐진 파형.
 *
 * 왼쪽 원 위에서 ωt+φ만큼 회전한 점의 y 좌표를, 오른쪽 시간축으로 펼쳐
 * 사인 함수가 회전의 그림자임을 드러낸다.
 */

import { hexAlpha } from '../../../../graphics/draw';
import { createTimeValueViewport } from '../../../../graphics/viewport';
import type { AbstractArgs } from './types';

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

  ctx.strokeStyle = isDark ? 'rgba(200,210,230,0.4)' : 'rgba(60,70,90,0.5)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(circleCx, circleCy, circleR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = isDark ? 'rgba(200,210,230,0.2)' : 'rgba(60,70,90,0.2)';
  ctx.beginPath();
  ctx.moveTo(circleCx - circleR, circleCy);
  ctx.lineTo(circleCx + circleR, circleCy);
  ctx.moveTo(circleCx, circleCy - circleR);
  ctx.lineTo(circleCx, circleCy + circleR);
  ctx.stroke();

  const absA = Math.max(1e-6, Math.abs(A));
  const phase = omega * t + phi;
  const pointX = circleCx + circleR * Math.cos(phase);
  const pointY = circleCy - circleR * (Math.sin(phase) * (A / absA));

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(circleCx, circleCy);
  ctx.lineTo(pointX, pointY);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pointX, pointY, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.strokeStyle = hexAlpha(color, 0.45);
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(pointX, pointY);
  ctx.lineTo(waveX0 - 2, pointY);
  ctx.stroke();
  ctx.setLineDash([]);

  const periodPix = Math.abs(omega) > 1e-6 ? waveW / 2 : waveW;
  const tStart = t - (waveW / periodPix) * (2 * Math.PI / Math.max(1e-6, Math.abs(omega)));
  const waveView = createTimeValueViewport({
    rect: { x: waveX0, y: midY - circleR, w: waveW, h: 2 * circleR },
    xMin: tStart, xMax: t,
    yMin: -absA, yMax: absA,
  });
  const toWaveX = waveView.tToX;
  const toWaveY = waveView.valueToY;

  ctx.strokeStyle = isDark ? 'rgba(200,210,230,0.35)' : 'rgba(60,70,90,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(waveX0, midY);
  ctx.lineTo(waveX1, midY);
  ctx.stroke();

  if (!isStandard) {
    ctx.strokeStyle = hexAlpha(color, 0.28);
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const N = 128;
    for (let i = 0; i <= N; i++) {
      const tv = tStart + (i / N) * (t - tStart);
      const px = toWaveX(tv);
      const py = toWaveY(A * Math.sin(omega * tv + phi));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

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

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(waveX1, toWaveY(y_cur), 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (!isStandard && Number.isFinite(y_std)) {
    ctx.fillStyle = hexAlpha(color, 0.55);
    ctx.beginPath();
    ctx.arc(waveX1, toWaveY(y_std), 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(200,210,230,0.7)' : 'rgba(60,70,90,0.7)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('+A', circleCx - circleR - 6, circleCy - circleR);
  ctx.textBaseline = 'top';
  ctx.fillText('−A', circleCx - circleR - 6, circleCy + circleR);

  const badge = `y₀ = ${y_cur.toFixed(2)}`;
  ctx.font = '600 10px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = color;
  ctx.fillText(badge, waveX1 - ctx.measureText(badge).width, midY - circleR - 4);

  ctx.restore();
}
