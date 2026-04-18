/**
 * 지구 자유낙하 렌더러.
 *
 * 건물 벽면에 창문 격자, 좌측 높이 눈금, 우측 이정표 라벨.
 * 공은 현재 h=derived.s에 따라 건물 옆을 따라 떨어진다.
 * 자동 재생 루프: 6초 주기로 t가 0→max 자동 증가, 사용자가 t 슬라이더를 잡으면 일시 양보.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { Graphics2D } from '../../../graphics/Graphics2D';
import { hexAlpha, roundRect } from '../../../graphics/draw';

const BRAND_COLOR = '#0E7490';
const AUTO_PLAY_SECONDS = 6;

const MILESTONES = [
  { h: 10, label: '3층' },
  { h: 50, label: '아파트' },
  { h: 274, label: '63빌딩' },
  { h: 555, label: '롯데월드타워' },
];

export class FreefallEarthRenderer {
  private graphics: Graphics2D;
  private v0 = 0;
  private a = 9.807;
  private t = 0;
  private hCur = 0;
  private userDrivenT = false;

  constructor(container: HTMLElement, options: VisualizerMountOptions) {
    this.graphics = new Graphics2D(container, {
      width: options.width,
      height: options.height,
      theme: options.theme,
      onFrame: (ctx, frame) => {
        this.tickAutoPlay(frame.dt);
        this.hCur = Math.max(0, this.v0 * this.t + 0.5 * this.a * this.t * this.t);
        this.render(ctx, frame.width, frame.height);
      },
    });
  }

  update(context: VisualizerUpdate): void {
    const { params, derived } = context;
    if (typeof params.v_0 === 'number') this.v0 = params.v_0;
    if (typeof params.a === 'number') this.a = params.a;
    if (typeof params.t === 'number' && params.t !== this.t) {
      this.t = params.t;
      this.userDrivenT = true;
    }
    if (typeof derived.s === 'number' && Number.isFinite(derived.s)) {
      this.hCur = Math.max(0, derived.s);
    }
  }

  resize(width: number, height: number): void {
    this.graphics.resize(width, height);
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private tickAutoPlay(dt: number): void {
    if (this.userDrivenT) {
      this.userDrivenT = false;
      return;
    }
    this.t += dt;
    if (this.t > AUTO_PLAY_SECONDS) this.t = 0;
  }

  private render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const isDark = this.graphics.theme === 'dark';
    const hCur = this.hCur;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, isDark ? '#0b1220' : '#dbeafe');
    grad.addColorStop(1, isDark ? '#1e293b' : '#f0f9ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const hView = Math.max(20, hCur * 1.15, 50);
    const padT = 44;
    const padB = 28;
    const plotH = Math.max(1, h - padT - padB);
    const buildingX = w * 0.45;
    const buildingW = Math.min(80, w * 0.25);
    const toY = (hv: number) => padT + (hv / hView) * plotH;
    const topY = toY(hView);
    const botY = toY(0);

    ctx.fillStyle = isDark ? '#1e293b' : '#a8a29e';
    ctx.fillRect(0, botY, w, h - botY);

    ctx.fillStyle = isDark ? '#334155' : '#94a3b8';
    ctx.fillRect(buildingX, topY, buildingW, botY - topY);
    ctx.fillStyle = isDark ? 'rgba(250,230,150,0.55)' : 'rgba(250,220,120,0.85)';
    const rows = Math.max(3, Math.floor((botY - topY) / 14));
    const cols = 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = buildingX + 6 + c * ((buildingW - 12) / cols);
        const wy = topY + 6 + r * ((botY - topY - 12) / rows);
        ctx.fillRect(wx, wy, (buildingW - 12) / cols - 2, (botY - topY - 12) / rows - 3);
      }
    }
    ctx.strokeStyle = isDark ? '#0f172a' : '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(buildingX, topY, buildingW, botY - topY);

    const scaleX = buildingX - 44;
    ctx.strokeStyle = isDark ? 'rgba(200,210,230,0.5)' : 'rgba(60,70,90,0.55)';
    ctx.lineWidth = 1;
    ctx.fillStyle = isDark ? 'rgba(220,230,245,0.85)' : 'rgba(40,50,70,0.85)';
    ctx.font = '500 9px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const step = hView > 400 ? 100 : hView > 100 ? 25 : hView > 30 ? 10 : 5;
    ctx.beginPath();
    ctx.moveTo(scaleX + 10, topY);
    ctx.lineTo(scaleX + 10, botY);
    ctx.stroke();
    for (let hv = 0; hv <= hView; hv += step) {
      const yp = toY(hv);
      ctx.beginPath();
      ctx.moveTo(scaleX + 6, yp);
      ctx.lineTo(scaleX + 10, yp);
      ctx.stroke();
      ctx.fillText(formatMeter(hv), scaleX + 3, yp);
    }

    ctx.font = '500 9px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const markerX = buildingX + buildingW + 8;
    for (const m of MILESTONES) {
      if (m.h > hView) continue;
      const yp = toY(m.h);
      ctx.strokeStyle = isDark ? 'rgba(220,200,130,0.5)' : 'rgba(180,140,40,0.55)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(buildingX + buildingW, yp);
      ctx.lineTo(markerX + 4, yp);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = isDark ? 'rgba(230,200,120,0.95)' : 'rgba(120,90,20,0.9)';
      ctx.fillText(m.label, markerX + 6, yp);
    }

    const ballX = buildingX + buildingW + 4;
    const ballR = 7;
    const ballY = toY(Math.min(hCur, hView));
    ctx.fillStyle = hexAlpha(BRAND_COLOR, 0.28);
    ctx.beginPath();
    ctx.arc(ballX + 1, ballY + 2, ballR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = BRAND_COLOR;
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(ballX - 2, ballY - 2, ballR * 0.4, 0, Math.PI * 2);
    ctx.fill();

    const badge = `지구 · g = ${this.a.toFixed(1)} m/s² · t = ${this.t.toFixed(2)}s`;
    drawBadge(ctx, 12, 12, badge, isDark);
  }
}

function formatMeter(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${(n / 1000).toFixed(2)}km`;
  if (abs >= 100) return `${n.toFixed(0)}m`;
  if (abs >= 10) return `${n.toFixed(1)}m`;
  return `${n.toFixed(2)}m`;
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  isDark: boolean,
): void {
  ctx.save();
  ctx.font = '600 11px -apple-system, sans-serif';
  const w = ctx.measureText(text).width + 16;
  const h = 22;
  ctx.fillStyle = hexAlpha(BRAND_COLOR, isDark ? 0.3 : 0.16);
  roundRect(ctx, x, y, w, h, 11);
  ctx.fill();
  ctx.strokeStyle = BRAND_COLOR;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = BRAND_COLOR;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 10, y + h / 2 + 0.5);
  ctx.restore();
}
