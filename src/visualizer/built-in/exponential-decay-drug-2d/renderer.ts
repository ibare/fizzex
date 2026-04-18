/**
 * 약물 혈중 농도 지수 감소 렌더러.
 *
 * 상단 42% N/N₀ 감소 곡선, 하단 58% 인체 실루엣 + 농도 타임라인.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { Graphics2D } from '../../../graphics/Graphics2D';
import { drawAbstract } from '../_shared/exponential-decay/abstract';
import { drawDrug } from '../_shared/exponential-decay/drug';
import { LN2, decayRatio, halfLifeFromR } from '../_shared/exponential-decay/math';

const BRAND_COLOR = '#DC2626';
const TOP_RATIO = 0.42;
const DEFAULT_R = -LN2 / 2;

export class ExponentialDecayDrugRenderer {
  private graphics: Graphics2D;
  private N0 = 400;
  private r = DEFAULT_R;
  private rStd = DEFAULT_R;
  private t = 0;
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
    const { params, baseline, isStandard } = context;
    if (typeof params.N_0 === 'number') this.N0 = params.N_0;
    if (typeof params.r === 'number') this.r = params.r;
    if (typeof params.t === 'number') this.t = params.t;
    this.isStandard = isStandard;
    const stdHalf = baseline?.derived?.halfLife;
    this.rStd = typeof stdHalf === 'number' && Number.isFinite(stdHalf) && stdHalf > 0
      ? -LN2 / stdHalf
      : this.r;
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

    const halfLife = halfLifeFromR(this.r);
    const halfLifeStd = halfLifeFromR(this.rStd);
    const effectiveHalf = Number.isFinite(halfLife) ? halfLife : halfLifeStd;
    const tMax = Number.isFinite(effectiveHalf) ? effectiveHalf * 3.5 : 10;

    const ratio = Math.max(0, Math.min(1, decayRatio(this.r, this.t)));
    const ratioStd = Math.max(0, Math.min(1, decayRatio(this.rStd, this.t)));

    drawAbstract({
      ctx, x: 0, y: 0, w, h: topH,
      N0: this.N0, r: this.r, r_std: this.rStd, t: this.t,
      halfLife, isStandard: this.isStandard,
      color: BRAND_COLOR, isDark, tMax,
    });

    ctx.strokeStyle = isDark ? 'rgba(120,140,170,0.25)' : 'rgba(100,115,140,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(10, topH);
    ctx.lineTo(w - 10, topH);
    ctx.stroke();
    ctx.setLineDash([]);

    drawDrug({
      ctx, x: 0, y: botY, w, h: botH,
      N0: this.N0, r: this.r, t: this.t,
      ratio, ratio_std: ratioStd,
      isStandard: this.isStandard,
      halfLife: effectiveHalf,
      animT: this.animT, color: BRAND_COLOR, isDark,
    });
  }
}
