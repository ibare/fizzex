/**
 * 🔋 스마트폰 배터리 장면 — 배터리 아이콘 + 색상 변화
 *
 * 100%~50% 초록, 50%~20% 노랑, 20%~ 빨강.
 * 이정표: 3시간(50%), 6시간(25%), 충전 필요(10%).
 */

import { hexAlpha, type SceneDrawArgs } from '../utils';

function batteryColor(ratio: number): string {
  if (ratio >= 0.5) return '#22c55e';
  if (ratio >= 0.2) return '#eab308';
  return '#ef4444';
}

export function drawBattery(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, ratio, ratio_std, isStandard, halfLife, t, color, isDark, alpha = 1 } = args;
  ctx.save();
  ctx.globalAlpha = alpha;

  // 배경 (그라데이션)
  const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
  bgGrad.addColorStop(0, isDark ? '#020617' : '#e0f2fe');
  bgGrad.addColorStop(1, isDark ? '#0f172a' : '#bae6fd');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(x, y, w, h);

  // 배터리 (중앙 왼쪽)
  const battCx = x + w * 0.28;
  const battCy = y + h * 0.5;
  const battW = Math.min(80, w * 0.2);
  const battH = Math.min(h - 60, 160);

  const battLeft = battCx - battW / 2;
  const battTop = battCy - battH / 2;

  // 단자 (상단)
  ctx.fillStyle = isDark ? '#475569' : '#1e293b';
  ctx.fillRect(battCx - battW * 0.25, battTop - 6, battW * 0.5, 6);

  // 외곽
  ctx.strokeStyle = isDark ? '#94a3b8' : '#1e293b';
  ctx.lineWidth = 3;
  ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(battLeft, battTop, battW, battH, 10);
  else ctx.rect(battLeft, battTop, battW, battH);
  ctx.fill();
  ctx.stroke();

  // 표준 fill (편집 시 반투명 윤곽)
  if (!isStandard) {
    const stdFill = Math.max(0, Math.min(battH - 6, battH * ratio_std));
    const stdY = battTop + battH - 3 - stdFill;
    ctx.strokeStyle = hexAlpha(color, 0.6);
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(battLeft + 3, stdY);
    ctx.lineTo(battLeft + battW - 3, stdY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 내부 fill (현재 ratio)
  const fillH = Math.max(0, Math.min(battH - 6, battH * ratio));
  const fillY = battTop + battH - 3 - fillH;
  const bColor = batteryColor(ratio);
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(battLeft + 3, battTop + 3, battW - 6, battH - 6, 7);
  else ctx.rect(battLeft + 3, battTop + 3, battW - 6, battH - 6);
  ctx.clip();
  // 그라데이션 fill
  const fillGrad = ctx.createLinearGradient(0, fillY, 0, battTop + battH);
  fillGrad.addColorStop(0, bColor);
  fillGrad.addColorStop(1, shade(bColor, -20));
  ctx.fillStyle = fillGrad;
  ctx.fillRect(battLeft + 3, fillY, battW - 6, fillH);
  // 상단 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(battLeft + 3, fillY, battW - 6, 3);
  ctx.restore();

  // % 텍스트
  const pct = Math.round(ratio * 100);
  ctx.font = '700 22px ui-monospace, Menlo, monospace';
  ctx.fillStyle = isDark ? '#ffffff' : '#0b1220';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${pct}%`, battCx, battCy);

  // 번개 아이콘 (50% 이상이면)
  if (ratio >= 0.5) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(battCx - 4, battCy - 22);
    ctx.lineTo(battCx + 2, battCy - 14);
    ctx.lineTo(battCx - 1, battCy - 14);
    ctx.lineTo(battCx + 4, battCy - 6);
    ctx.lineTo(battCx + 1, battCy - 14);
    ctx.lineTo(battCx + 3, battCy - 14);
    ctx.closePath();
    ctx.fill();
  }

  // 타임라인 (우측)
  const tlX = x + w * 0.55;
  const tlY = y + 40;
  const tlW = Math.min(150, w - (tlX - x) - 20);
  const tlH = Math.min(h - 90, 140);

  // 곡선
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const N = 64;
  const tMax = halfLife * 3.5;
  for (let i = 0; i <= N; i++) {
    const tv = (i / N) * tMax;
    const rt = Math.exp(-((Math.log(2) / halfLife) * tv));
    const px = tlX + (tv / tMax) * tlW;
    const py = tlY + tlH - rt * tlH;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // 마커 (색 구간 변화점과 정확히 일치하도록 배터리 룰 사용)
  const marks = [
    { t: halfLife, label: '50%', ratio: 0.5, warn: false },
    { t: halfLife * 2, label: '25%', ratio: 0.25, warn: false },
    { t: halfLife * 3.32, label: '충전필요', ratio: 0.1, warn: true },
  ];
  for (const m of marks) {
    if (m.t > tMax) continue;
    const px = tlX + (m.t / tMax) * tlW;
    const py = tlY + tlH - m.ratio * tlH;
    ctx.fillStyle = m.warn ? '#ef4444' : batteryColor(m.ratio);
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.font = '600 9px -apple-system, sans-serif';
    ctx.fillStyle = m.warn ? '#ef4444' : isDark ? 'rgba(226,232,240,0.9)' : 'rgba(30,41,59,0.9)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(m.label, px + 6, py);
  }

  // 현재 시각 점
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

  // 캡션
  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(226,232,240,0.85)' : 'rgba(30,41,59,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('배터리 방전: 초록 → 노랑 → 빨강 (교육적 근사)', x + w / 2, y + h - 8);

  ctx.restore();
  void color;
}

function shade(hex: string, amount: number): string {
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount));
  return `rgb(${r},${g},${b})`;
}
