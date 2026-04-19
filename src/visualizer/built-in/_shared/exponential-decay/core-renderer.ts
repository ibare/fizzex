/**
 * 지수 감소 공용 코어 렌더러.
 *
 * 상단 42%는 N/N₀ 감소 곡선(abstract)으로 공통, 하단 58%는 앵커별 장면.
 * activeAnchorId로 드로어·색상을 분기하며 앵커가 해제돼도 마지막 선택을 유지한다.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../../types';
import { Graphics2D } from '../../../../graphics/Graphics2D';
import type { FrameInfo } from '../../../../graphics/types';
import { background, divider } from '../../../../graphics/theme';
import { drawAbstract } from './abstract';
import { drawCaffeine } from './caffeine';
import { drawBattery } from './battery';
import { drawCarbon14 } from './carbon14';
import { drawDrug } from './drug';
import { LN2, decayRatio, halfLifeFromR } from './math';
import type { SceneDrawArgs } from './types';

const TOP_RATIO = 0.42;

interface AnchorStyle {
  draw: (args: SceneDrawArgs) => void;
  color: string;
}

const ANCHOR_STYLES: Record<string, AnchorStyle> = {
  caffeine: { draw: drawCaffeine, color: '#92400E' },
  battery: { draw: drawBattery, color: '#0EA5E9' },
  carbon14: { draw: drawCarbon14, color: '#7C3AED' },
  drug: { draw: drawDrug, color: '#DC2626' },
};

const DEFAULT_ANCHOR_ID = 'caffeine';

export class ExponentialDecayCoreRenderer {
  private graphics: Graphics2D;
  private N0 = 95;
  private r = -LN2 / 5;
  private rStd = -LN2 / 5;
  private t = 0;
  private isStandard = true;
  private anchorId = DEFAULT_ANCHOR_ID;

  constructor(container: HTMLElement, options: VisualizerMountOptions) {
    this.graphics = new Graphics2D(container, {
      width: options.width,
      height: options.height,
      theme: options.theme,
      onFrame: (ctx, frame) => this.render(ctx, frame),
    });
  }

  update(context: VisualizerUpdate): void {
    const { params, baseline, isStandard, activeAnchorId } = context;
    if (typeof params.N_0 === 'number') this.N0 = params.N_0;
    if (typeof params.r === 'number') this.r = params.r;
    if (typeof params.t === 'number') this.t = params.t;
    this.isStandard = isStandard;
    const stdHalf = baseline?.derived?.halfLife;
    this.rStd = typeof stdHalf === 'number' && Number.isFinite(stdHalf) && stdHalf > 0
      ? -LN2 / stdHalf
      : this.r;
    if (activeAnchorId && ANCHOR_STYLES[activeAnchorId]) {
      this.anchorId = activeAnchorId;
    }
  }

  resize(width: number, height: number): void {
    this.graphics.resize(width, height);
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private render(ctx: CanvasRenderingContext2D, frame: FrameInfo): void {
    const { width: w, height: h, elapsed, isDark } = frame;
    const style = ANCHOR_STYLES[this.anchorId] ?? ANCHOR_STYLES[DEFAULT_ANCHOR_ID];

    ctx.fillStyle = background(isDark);
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
      color: style.color, isDark, tMax,
    });

    ctx.strokeStyle = divider(isDark);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(10, topH);
    ctx.lineTo(w - 10, topH);
    ctx.stroke();
    ctx.setLineDash([]);

    style.draw({
      ctx, x: 0, y: botY, w, h: botH,
      N0: this.N0, r: this.r, t: this.t,
      ratio, ratio_std: ratioStd,
      isStandard: this.isStandard,
      halfLife: effectiveHalf,
      animT: elapsed, color: style.color, isDark,
    });
  }
}
