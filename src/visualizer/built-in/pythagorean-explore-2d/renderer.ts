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
 * Bounding box: x∈[-b, a+b], y∈[-a, b+a]. host의 createBBoxViewport로 fit-scale.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { Graphics2D } from '../../../graphics/Graphics2D';
import { hexAlpha, formatN } from '../../../graphics/draw';
import { background } from '../../../graphics/theme';
import { createBBoxViewport } from '../../../graphics/viewport';
import type { Viewport2D } from '../../../graphics/types';

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
    const isDark = this.graphics.isDark;
    const { a, b, c } = this;

    ctx.fillStyle = background(isDark);
    ctx.fillRect(0, 0, w, h);

    if (!(a > 0) || !(b > 0) || !(c > 0)) return;

    const view = createBBoxViewport({
      rect: { x: 0, y: 0, w, h },
      bbox: { minX: -b, maxX: a + b, minY: -a, maxY: b + a },
      padding: 22,
    });

    drawSquare(ctx, [[0, 0], [a, 0], [a, -a], [0, -a]], view, BRAND_COLOR, isDark);
    drawSquare(ctx, [[0, 0], [0, b], [-b, b], [-b, 0]], view, BRAND_COLOR, isDark);
    drawSquare(ctx, [[a, 0], [0, b], [b, a + b], [a + b, a]], view, BRAND_COLOR, isDark);

    ctx.font = '600 11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDark ? 'rgba(235,240,250,0.9)' : 'rgba(30,40,55,0.92)';

    const aSq = view.toScreen(a / 2, -a / 2);
    ctx.fillText(`a² = ${formatN(a * a)}`, aSq.x, aSq.y);
    const bSq = view.toScreen(-b / 2, b / 2);
    ctx.fillText(`b² = ${formatN(b * b)}`, bSq.x, bSq.y);
    const cSq = view.toScreen((a + b) / 2, (a + b) / 2);
    ctx.fillText(`c² = ${formatN(c * c)}`, cSq.x, cSq.y);

    ctx.strokeStyle = BRAND_COLOR;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const p0 = view.toScreen(0, 0);
    const pA = view.toScreen(a, 0);
    const pB = view.toScreen(0, b);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(pA.x, pA.y);
    ctx.lineTo(pB.x, pB.y);
    ctx.closePath();
    ctx.stroke();

    const tickSize = Math.min(a, b) * 0.08;
    if (tickSize > 0) {
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = isDark ? 'rgba(235,240,250,0.7)' : 'rgba(30,40,55,0.7)';
      const t1 = view.toScreen(tickSize, 0);
      const t2 = view.toScreen(tickSize, tickSize);
      const t3 = view.toScreen(0, tickSize);
      ctx.beginPath();
      ctx.moveTo(t1.x, t1.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t3.x, t3.y);
      ctx.stroke();
    }

    ctx.font = '500 11px -apple-system, sans-serif';
    ctx.fillStyle = BRAND_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const aMid = view.toScreen(a / 2, 0);
    ctx.fillText(`a = ${formatN(a)}`, aMid.x, aMid.y - 10);
    ctx.textAlign = 'left';
    const bMid = view.toScreen(0, b / 2);
    ctx.fillText(`b = ${formatN(b)}`, bMid.x + 6, bMid.y);
    ctx.textAlign = 'center';
    const cMid = view.toScreen(a / 2, b / 2);
    ctx.fillText(`c = ${formatN(c)}`, cMid.x - 8, cMid.y - 6);
  }
}

function drawSquare(
  ctx: CanvasRenderingContext2D,
  verts: Array<[number, number]>,
  view: Viewport2D,
  color: string,
  isDark: boolean,
): void {
  ctx.beginPath();
  const first = view.toScreen(verts[0][0], verts[0][1]);
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < verts.length; i++) {
    const p = view.toScreen(verts[i][0], verts[i][1]);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fillStyle = hexAlpha(color, isDark ? 0.18 : 0.12);
  ctx.fill();
  ctx.strokeStyle = hexAlpha(color, 0.75);
  ctx.lineWidth = 1.2;
  ctx.stroke();
}
