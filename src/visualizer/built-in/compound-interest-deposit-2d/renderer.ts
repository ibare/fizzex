/**
 * 고금리 적금 렌더러.
 *
 * 상단 42% A vs t 성장 곡선, 하단 58% 저금통 + 동전 떨어짐 애니메이션.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { Graphics2D } from '../../../graphics/Graphics2D';
import { drawAbstract } from '../_shared/compound-interest/abstract';
import { drawDeposit } from '../_shared/compound-interest/deposit';
import { compoundA } from '../_shared/compound-interest/math';

const BRAND_COLOR = '#D97706';
const TOP_RATIO = 0.42;
const T_MAX = 20;

export class CompoundInterestDepositRenderer {
  private graphics: Graphics2D;
  private P = 100;
  private r = 0.05;
  private n = 1;
  private t = 5;
  private rStd = 0.05;
  private A = 0;
  private AStd = 0;
  private isStandard = true;
  private animT = 0;

  constructor(container: HTMLElement, options: VisualizerMountOptions) {
    this.graphics = new Graphics2D(container, {
      width: options.width,
      height: options.height,
      theme: options.theme,
      onFrame: (ctx, frame) => {
        this.animT += frame.dt;
        this.render(ctx, frame.width, frame.height);
      },
    });
  }

  update(context: VisualizerUpdate): void {
    const { params, derived, baseline, isStandard } = context;
    if (typeof params.P === 'number') this.P = params.P;
    if (typeof params.r === 'number') this.r = params.r;
    if (typeof params.n === 'number') this.n = params.n;
    if (typeof params.t === 'number') this.t = params.t;
    if (typeof derived.A === 'number' && Number.isFinite(derived.A)) {
      this.A = derived.A;
    } else {
      this.A = compoundA(this.P, this.r, this.n, this.t);
    }
    this.isStandard = isStandard;
    const stdTDouble = baseline?.derived?.tDouble;
    this.rStd = typeof stdTDouble === 'number' && Number.isFinite(stdTDouble) && stdTDouble > 0
      ? Math.pow(2, 1 / stdTDouble) - 1
      : this.r;
    const stdA = baseline?.derived?.A;
    this.AStd = typeof stdA === 'number' && Number.isFinite(stdA)
      ? stdA
      : compoundA(this.P, this.rStd, this.n, this.t);
  }

  resize(width: number, height: number): void {
    this.graphics.resize(width, height);
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const isDark = this.graphics.theme === 'dark';

    ctx.fillStyle = isDark ? '#0b1220' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    const topH = Math.floor(h * TOP_RATIO);
    const botY = topH;
    const botH = h - topH;

    drawAbstract({
      ctx, x: 0, y: 0, w, h: topH,
      P: this.P, r: this.r, n: this.n, t: this.t,
      r_std: this.rStd, A: this.A,
      isStandard: this.isStandard, tMax: T_MAX, inverse: false,
      color: BRAND_COLOR, isDark,
    });

    ctx.strokeStyle = isDark ? 'rgba(120,140,170,0.25)' : 'rgba(100,115,140,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(10, topH);
    ctx.lineTo(w - 10, topH);
    ctx.stroke();
    ctx.setLineDash([]);

    drawDeposit({
      ctx, x: 0, y: botY, w, h: botH,
      P: this.P, r: this.r, n: this.n, t: this.t,
      A: this.A, A_std: this.AStd,
      isStandard: this.isStandard, tMax: T_MAX, animT: this.animT,
      color: BRAND_COLOR, isDark,
    });
  }
}
