/**
 * 피타고라스 자유탐구 렌더러.
 *
 * 캔버스 전체에 직각삼각형 + 세 변 위의 정사각형 + 넓이·길이 라벨을 그린다.
 * 피타고라스 정리의 고전적 기하학적 증명 다이어그램.
 *
 * 삼각형 좌표(수식 좌표):
 *   직각: (0, 0), A: (a, 0) — x축, B: (0, b) — y축, 빗변: A→B
 * 세 정사각형(직각 바깥 방향):
 *   a² — 아래쪽: (0,0)(a,0)(a,-a)(0,-a)
 *   b² — 왼쪽:   (0,0)(0,b)(-b,b)(-b,0)
 *   c² — 빗변 바깥: (a,0)(0,b)(b,a+b)(a+b,a)
 * Bounding box: x∈[-b, a+b], y∈[-a, b+a]. margin 포함 fit-scale.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { Graphics2D } from '../../../graphics/Graphics2D';
import { hexAlpha, formatN } from '../../../graphics/draw';

const BRAND_COLOR = '#0F172A';

export class PythagoreanExploreRenderer {
  private graphics: Graphics2D;
  private a = 3;
  private b = 4;
  private c = 5;

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
    const isDark = this.graphics.theme === 'dark';
    const { a, b, c } = this;

    ctx.fillStyle = isDark ? '#0b1220' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    if (!(a > 0) || !(b > 0) || !(c > 0)) return;

    const margin = 22;
    const bboxW = a + 2 * b;
    const bboxH = a + b + a;
    const innerW = Math.max(1, w - margin * 2);
    const innerH = Math.max(1, h - margin * 2);
    const scale = Math.min(innerW / bboxW, innerH / bboxH);

    const bboxMidX = (-b + (a + b)) / 2;
    const bboxMidY = (-a + (b + a)) / 2;
    const viewCx = w / 2;
    const viewCy = h / 2;
    const toX = (mx: number) => viewCx + (mx - bboxMidX) * scale;
    const toY = (my: number) => viewCy - (my - bboxMidY) * scale;

    drawSquare(ctx, [[0, 0], [a, 0], [a, -a], [0, -a]], toX, toY, BRAND_COLOR, isDark);
    drawSquare(ctx, [[0, 0], [0, b], [-b, b], [-b, 0]], toX, toY, BRAND_COLOR, isDark);
    drawSquare(ctx, [[a, 0], [0, b], [b, a + b], [a + b, a]], toX, toY, BRAND_COLOR, isDark);

    ctx.font = '600 11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDark ? 'rgba(235,240,250,0.9)' : 'rgba(30,40,55,0.92)';

    ctx.fillText(`a² = ${formatN(a * a)}`, toX(a / 2), toY(-a / 2));
    ctx.fillText(`b² = ${formatN(b * b)}`, toX(-b / 2), toY(b / 2));
    ctx.fillText(`c² = ${formatN(c * c)}`, toX((a + b) / 2), toY((a + b) / 2));

    ctx.strokeStyle = BRAND_COLOR;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(0));
    ctx.lineTo(toX(a), toY(0));
    ctx.lineTo(toX(0), toY(b));
    ctx.closePath();
    ctx.stroke();

    const tickSize = Math.min(a, b) * 0.08;
    if (tickSize > 0) {
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = isDark ? 'rgba(235,240,250,0.7)' : 'rgba(30,40,55,0.7)';
      ctx.beginPath();
      ctx.moveTo(toX(tickSize), toY(0));
      ctx.lineTo(toX(tickSize), toY(tickSize));
      ctx.lineTo(toX(0), toY(tickSize));
      ctx.stroke();
    }

    ctx.font = '500 11px -apple-system, sans-serif';
    ctx.fillStyle = BRAND_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(`a = ${formatN(a)}`, toX(a / 2), toY(0) - 10);
    ctx.textAlign = 'left';
    ctx.fillText(`b = ${formatN(b)}`, toX(0) + 6, toY(b / 2));
    ctx.textAlign = 'center';
    ctx.fillText(`c = ${formatN(c)}`, toX(a / 2) - 8, toY(b / 2) - 6);
  }
}

function drawSquare(
  ctx: CanvasRenderingContext2D,
  verts: Array<[number, number]>,
  toX: (mx: number) => number,
  toY: (my: number) => number,
  color: string,
  isDark: boolean,
): void {
  ctx.beginPath();
  ctx.moveTo(toX(verts[0][0]), toY(verts[0][1]));
  for (let i = 1; i < verts.length; i++) {
    ctx.lineTo(toX(verts[i][0]), toY(verts[i][1]));
  }
  ctx.closePath();
  ctx.fillStyle = hexAlpha(color, isDark ? 0.18 : 0.12);
  ctx.fill();
  ctx.strokeStyle = hexAlpha(color, 0.75);
  ctx.lineWidth = 1.2;
  ctx.stroke();
}
