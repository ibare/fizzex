/**
 * 피타고라스 — 사다리 렌더러.
 *
 * a: 벽과 사다리 발 사이 바닥 거리(m)
 * b: 사다리가 닿은 높이(m)
 * c: 사다리 길이(m)
 *
 * 설명 전달: 벽+창문 실루엣으로 "건물" 맥락. 창문 Y ≈ 5m(2층) 앵커.
 * 바닥각(각 A = atan(b/a))을 안전 배지로 표시. 가로대 수 ∝ c.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { Graphics2D } from '../../../graphics/Graphics2D';
import { hexAlpha, roundRect, formatN } from '../../../graphics/draw';
import { createBBoxViewport } from '../../../graphics/viewport';

const BRAND_COLOR = '#DC4C2C';

interface SafetyInfo { label: string; color: string; }

function getSafety(angleDeg: number): SafetyInfo {
  if (angleDeg >= 70 && angleDeg <= 80) return { label: '안전', color: '#16a34a' };
  if ((angleDeg >= 60 && angleDeg < 70) || (angleDeg > 80 && angleDeg <= 85)) {
    return { label: '주의', color: '#eab308' };
  }
  return { label: '위험', color: '#dc2626' };
}

export class PythagoreanLadderRenderer {
  private graphics: Graphics2D;
  private a = 1.2;
  private b = 4.8;
  private c = Math.sqrt(1.2 * 1.2 + 4.8 * 4.8);

  constructor(container: HTMLElement, options: VisualizerMountOptions) {
    this.graphics = new Graphics2D(container, {
      width: options.width,
      height: options.height,
      theme: options.theme,
      onFrame: (ctx, frame) => this.render(ctx, frame.width, frame.height),
    });
  }

  update(context: VisualizerUpdate): void {
    const { params, derived } = context;
    if (typeof params.a === 'number') this.a = params.a;
    if (typeof params.b === 'number') this.b = params.b;
    if (typeof derived.c === 'number' && Number.isFinite(derived.c)) {
      this.c = derived.c;
    }
  }

  resize(width: number, height: number): void {
    this.graphics.resize(width, height);
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const isDark = this.graphics.isDark;
    const { a, b, c } = this;
    if (!(a > 0) || !(b > 0) || !(c > 0)) return;

    const skyTop = isDark ? '#0b1220' : '#eff6ff';
    const skyBot = isDark ? '#111a2e' : '#dbeafe';
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, skyTop);
    grad.addColorStop(1, skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const wallRight = 0.4;
    const bboxW = Math.max(a + 1, 5);
    const bboxH = Math.max(b + 1, 6);
    const padL = 28;
    const padR = 18;
    const padT = 22;
    const padB = 34;
    const s = Math.min((w - padL - padR) / bboxW, (h - padT - padB) / bboxH);

    const view = createBBoxViewport({
      rect: { x: 0, y: 0, w, h },
      bbox: { minX: 0, maxX: bboxW, minY: 0, maxY: bboxH },
      padding: { top: padT, right: padR, bottom: padB, left: padL },
      hAlign: { kind: 'anchor', target: w / 3, max: w - padR - a * s },
      vAlign: 'end',
    });
    const toX = (mx: number) => view.toScreen(mx, 0).x;
    const toY = (my: number) => view.toScreen(0, my).y;

    const groundY = toY(0);
    ctx.strokeStyle = isDark ? 'rgba(200,210,230,0.35)' : 'rgba(60,70,90,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, groundY);
    ctx.lineTo(w - 8, groundY);
    ctx.stroke();
    ctx.strokeStyle = isDark ? 'rgba(200,210,230,0.2)' : 'rgba(60,70,90,0.22)';
    ctx.lineWidth = 1;
    const hatchStep = 14;
    const hatchCount = Math.min(14, Math.floor(w / hatchStep));
    for (let i = 0; i < hatchCount; i++) {
      const hx = 12 + i * hatchStep;
      ctx.beginPath();
      ctx.moveTo(hx, groundY);
      ctx.lineTo(hx - 6, groundY + 8);
      ctx.stroke();
    }

    const wallLeftPx = toX(0) - wallRight * s;
    const wallRightPx = toX(0);
    const wallTopPx = toY(bboxH);
    const wallBotPx = groundY;

    ctx.fillStyle = isDark ? '#4a3829' : '#d4a574';
    ctx.fillRect(wallLeftPx, wallTopPx, wallRightPx - wallLeftPx, wallBotPx - wallTopPx);

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
      ctx.beginPath();
      ctx.moveTo(wx + wwPx / 2, wyPx);
      ctx.lineTo(wx + wwPx / 2, wyPx + whPx);
      ctx.moveTo(wx, wyPx + whPx / 2);
      ctx.lineTo(wx + wwPx, wyPx + whPx / 2);
      ctx.stroke();
    }

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

    ctx.strokeStyle = BRAND_COLOR;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rail1.x0, rail1.y0);
    ctx.lineTo(rail1.x1, rail1.y1);
    ctx.moveTo(rail2.x0, rail2.y0);
    ctx.lineTo(rail2.x1, rail2.y1);
    ctx.stroke();

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

    ctx.font = '500 10px -apple-system, sans-serif';
    ctx.fillStyle = isDark ? 'rgba(235,240,250,0.85)' : 'rgba(30,40,55,0.85)';
    ctx.strokeStyle = isDark ? 'rgba(235,240,250,0.6)' : 'rgba(30,40,55,0.55)';
    ctx.lineWidth = 1;

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

    const midX = (footX + topX) / 2 + nx * 18;
    const midY = (footY + topY) / 2 + ny * 18;
    const cText = `c = ${formatN(c)}m`;
    ctx.font = '600 10px -apple-system, sans-serif';
    const tw = ctx.measureText(cText).width + 10;
    const th = 16;
    ctx.fillStyle = isDark ? 'rgba(20,28,40,0.9)' : 'rgba(255,255,255,0.92)';
    roundRect(ctx, midX - tw / 2, midY - th / 2, tw, th, 4);
    ctx.fill();
    ctx.strokeStyle = hexAlpha(BRAND_COLOR, 0.7);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = BRAND_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cText, midX, midY);

    const angleDeg = (Math.atan2(b, a) * 180) / Math.PI;
    const safety = getSafety(angleDeg);
    const badgeText = `${safety.label} · ${angleDeg.toFixed(0)}°`;
    ctx.font = '600 11px -apple-system, sans-serif';
    const bw = ctx.measureText(badgeText).width + 18;
    const bh = 20;
    const bx = 10;
    const by = 10;
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
  }
}
