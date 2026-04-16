/**
 * 🪜 사다리 장면 — 집 벽 + 창문 + 사다리 + 안전 배지
 *
 * a: 벽과 사다리 발 사이 바닥 거리
 * b: 사다리가 닿은 높이
 * c: 사다리 길이
 *
 * 설명 전달: 벽+창문 실루엣으로 "건물" 맥락. 창문 Y ≈ 5m(2층) 앵커.
 * 안전 배지 좌상단. 가로대 수 ∝ c.
 */

import { formatN, hexAlpha, roundRect, type SceneDrawArgs } from '../utils';

interface SafetyInfo { label: string; color: string; }

/** 바닥각(각 A) 기준 사다리 안전도 판정 */
function getSafety(angleDeg: number): SafetyInfo {
  if (angleDeg >= 70 && angleDeg <= 80) return { label: '안전', color: '#16a34a' };
  if ((angleDeg >= 60 && angleDeg < 70) || (angleDeg > 80 && angleDeg <= 85)) {
    return { label: '주의', color: '#eab308' };
  }
  return { label: '위험', color: '#dc2626' };
}

export function drawLadder(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, a, b, c, color, isDark, alpha = 1 } = args;
  if (!(a > 0) || !(b > 0) || !(c > 0)) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  // ── 배경 ──
  const skyTop = isDark ? '#0b1220' : '#eff6ff';
  const skyBot = isDark ? '#111a2e' : '#dbeafe';
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, skyTop);
  grad.addColorStop(1, skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // ── 좌표 맵핑 ──
  // 화면의 왼쪽에 벽(세로), 바닥이 아래에. 사다리 발은 바닥 위 a만큼 오른쪽.
  // bbox: x ∈ [0, a + walls], y ∈ [0, max(b, roof)]
  const wallX = 0;
  const wallRight = 0.4; // 벽 두께
  const floorY = 0;
  const bboxW = Math.max(a + 1, 5);
  const bboxH = Math.max(b + 1, 6);
  const padL = 28;
  const padR = 18;
  const padT = 22;
  const padB = 34;
  const scaleX = (w - padL - padR) / bboxW;
  const scaleY = (h - padT - padB) / bboxH;
  const s = Math.min(scaleX, scaleY);

  // 벽(originX)을 화면 좌측 1/3 지점에 두되, 사다리 오른쪽이 잘리지 않도록 clamp.
  // 수직 병목(b 큼, 수평 여유 있음) 시 1/3 지점에 자연스럽게 배치되고,
  // 수평 병목(a 큼) 시 minOriginX가 우세해 기존 좌측 정렬로 복귀한다.
  const sceneW = a * s;
  const targetOriginX = x + w / 3;
  const minOriginX = x + padL;
  const maxOriginX = x + w - padR - sceneW;
  const originX = Math.max(minOriginX, Math.min(maxOriginX, targetOriginX));
  const originY = y + h - padB;
  const toX = (mx: number) => originX + (mx - wallX) * s;
  const toY = (my: number) => originY - (my - floorY) * s;

  // ── 바닥 ──
  const groundY = toY(0);
  ctx.strokeStyle = isDark ? 'rgba(200,210,230,0.35)' : 'rgba(60,70,90,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 8, groundY);
  ctx.lineTo(x + w - 8, groundY);
  ctx.stroke();
  // 해칭선
  ctx.strokeStyle = isDark ? 'rgba(200,210,230,0.2)' : 'rgba(60,70,90,0.22)';
  ctx.lineWidth = 1;
  const hatchStep = 14;
  const hatchCount = Math.min(14, Math.floor(w / hatchStep));
  for (let i = 0; i < hatchCount; i++) {
    const hx = x + 12 + i * hatchStep;
    ctx.beginPath();
    ctx.moveTo(hx, groundY);
    ctx.lineTo(hx - 6, groundY + 8);
    ctx.stroke();
  }

  // ── 벽 ──
  const wallLeftPx = toX(wallX) - wallRight * s;
  const wallRightPx = toX(wallX);
  const wallTopPx = toY(bboxH);
  const wallBotPx = groundY;

  ctx.fillStyle = isDark ? '#4a3829' : '#d4a574';
  ctx.fillRect(wallLeftPx, wallTopPx, wallRightPx - wallLeftPx, wallBotPx - wallTopPx);

  // 벽돌 텍스처 (가로 줄 몇 개만)
  ctx.strokeStyle = isDark ? 'rgba(20,15,10,0.35)' : 'rgba(90,60,30,0.3)';
  ctx.lineWidth = 0.8;
  const brickRows = Math.min(8, Math.floor((wallBotPx - wallTopPx) / 16));
  for (let i = 1; i < brickRows; i++) {
    const by = wallBotPx - i * ((wallBotPx - wallTopPx) / brickRows);
    ctx.beginPath();
    ctx.moveTo(wallLeftPx, by);
    ctx.lineTo(wallRightPx, by);
    ctx.stroke();
  }

  // ── 창문 (2층 앵커 — Y ≈ 5m) ──
  const winY = 5;
  if (winY < bboxH - 0.5) {
    const wx = wallRightPx + 2;
    const wwPx = Math.min(28, s * 1.2);
    const whPx = Math.min(22, s * 1.1);
    const wyPx = toY(winY) - whPx / 2;
    ctx.fillStyle = isDark ? 'rgba(180,210,255,0.85)' : 'rgba(200,225,255,0.95)';
    ctx.fillRect(wx, wyPx, wwPx, whPx);
    ctx.strokeStyle = isDark ? '#1e2a45' : '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(wx, wyPx, wwPx, whPx);
    // 창틀 십자
    ctx.beginPath();
    ctx.moveTo(wx + wwPx / 2, wyPx);
    ctx.lineTo(wx + wwPx / 2, wyPx + whPx);
    ctx.moveTo(wx, wyPx + whPx / 2);
    ctx.lineTo(wx + wwPx, wyPx + whPx / 2);
    ctx.stroke();
  }

  // ── 사다리 ──
  // 발: (a, 0), 끝: (0, b)
  const footX = toX(a);
  const footY = toY(0);
  const topX = toX(0);
  const topY = toY(b);

  const dxPx = topX - footX;
  const dyPx = topY - footY;
  const lenPx = Math.hypot(dxPx, dyPx);
  const nx = -dyPx / lenPx;
  const ny = dxPx / lenPx;
  const railOffset = 6;
  const rail1 = {
    x0: footX + nx * railOffset, y0: footY + ny * railOffset,
    x1: topX + nx * railOffset, y1: topY + ny * railOffset,
  };
  const rail2 = {
    x0: footX - nx * railOffset, y0: footY - ny * railOffset,
    x1: topX - nx * railOffset, y1: topY - ny * railOffset,
  };

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(rail1.x0, rail1.y0);
  ctx.lineTo(rail1.x1, rail1.y1);
  ctx.moveTo(rail2.x0, rail2.y0);
  ctx.lineTo(rail2.x1, rail2.y1);
  ctx.stroke();

  // 가로대
  const rungCount = Math.max(3, Math.min(16, Math.floor(c * 2.5)));
  ctx.lineWidth = 2;
  for (let i = 1; i < rungCount; i++) {
    const t = i / rungCount;
    const rx0 = rail1.x0 + (rail1.x1 - rail1.x0) * t;
    const ry0 = rail1.y0 + (rail1.y1 - rail1.y0) * t;
    const rx1 = rail2.x0 + (rail2.x1 - rail2.x0) * t;
    const ry1 = rail2.y0 + (rail2.y1 - rail2.y0) * t;
    ctx.beginPath();
    ctx.moveTo(rx0, ry0);
    ctx.lineTo(rx1, ry1);
    ctx.stroke();
  }

  // ── 측정선 (a, b) ──
  ctx.font = '500 10px -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(235,240,250,0.85)' : 'rgba(30,40,55,0.85)';
  ctx.strokeStyle = isDark ? 'rgba(235,240,250,0.6)' : 'rgba(30,40,55,0.55)';
  ctx.lineWidth = 1;

  // a 측정선 (바닥 아래)
  const aMy = groundY + 20;
  ctx.beginPath();
  ctx.moveTo(toX(0), aMy - 4);
  ctx.lineTo(toX(0), aMy + 4);
  ctx.moveTo(footX, aMy - 4);
  ctx.lineTo(footX, aMy + 4);
  ctx.moveTo(toX(0), aMy);
  ctx.lineTo(footX, aMy);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`a = ${formatN(a)}m`, (toX(0) + footX) / 2, aMy + 6);

  // b 측정선 (벽 왼쪽)
  const bMx = wallLeftPx - 12;
  ctx.beginPath();
  ctx.moveTo(bMx - 4, groundY);
  ctx.lineTo(bMx + 4, groundY);
  ctx.moveTo(bMx - 4, toY(b));
  ctx.lineTo(bMx + 4, toY(b));
  ctx.moveTo(bMx, groundY);
  ctx.lineTo(bMx, toY(b));
  ctx.stroke();
  ctx.save();
  ctx.translate(bMx - 6, (groundY + toY(b)) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`b = ${formatN(b)}m`, 0, 0);
  ctx.restore();

  // c 라벨 (사다리 중앙, 흰 배경 박스)
  const midX = (footX + topX) / 2 + nx * 18;
  const midY = (footY + topY) / 2 + ny * 18;
  const cText = `c = ${formatN(c)}m`;
  ctx.font = '600 10px -apple-system, sans-serif';
  const tw = ctx.measureText(cText).width + 10;
  const th = 16;
  ctx.fillStyle = isDark ? 'rgba(20,28,40,0.9)' : 'rgba(255,255,255,0.92)';
  roundRect(ctx, midX - tw / 2, midY - th / 2, tw, th, 4);
  ctx.fill();
  ctx.strokeStyle = hexAlpha(color, 0.7);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(cText, midX, midY);

  // ── 안전 배지 (좌상단) ──
  // 바닥각 = atan(b/a) (라디안) → degree
  const angleDeg = (Math.atan2(b, a) * 180) / Math.PI;
  const safety = getSafety(angleDeg);
  const badgeText = `${safety.label} · ${angleDeg.toFixed(0)}°`;
  ctx.font = '600 11px -apple-system, sans-serif';
  const bw = ctx.measureText(badgeText).width + 18;
  const bh = 20;
  const bx = x + 10;
  const by = y + 10;
  ctx.fillStyle = hexAlpha(safety.color, isDark ? 0.28 : 0.18);
  roundRect(ctx, bx, by, bw, bh, 10);
  ctx.fill();
  ctx.strokeStyle = safety.color;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = safety.color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, bx + 9, by + bh / 2 + 0.5);

  ctx.restore();
}
