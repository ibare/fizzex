/**
 * 사인파 공용 코어 렌더러.
 *
 * 상단 42%는 회전 원 + 파형(abstract), 하단 58%는 앵커별 장면.
 * activeAnchorId로 드로어·색상이 전환되며, 사용자 조작이 없을 때 t가 자동 재생된다.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../../types';
import { Graphics2D } from '../../../../graphics/Graphics2D';
import { drawAbstract } from './abstract';
import { drawSpeaker } from './speaker';
import { drawPendulum } from './pendulum';
import { drawTide } from './tide';
import { drawVoltmeter } from './voltmeter';
import type { SceneDrawArgs } from './types';

const TOP_RATIO = 0.42;
const AUTO_PLAY_SECONDS = 20;

interface AnchorStyle {
  draw: (args: SceneDrawArgs) => void;
  color: string;
}

const ANCHOR_STYLES: Record<string, AnchorStyle> = {
  speaker: { draw: drawSpeaker, color: '#7C3AED' },
  pendulum: { draw: drawPendulum, color: '#C2410C' },
  tide: { draw: drawTide, color: '#0284C7' },
  voltmeter: { draw: drawVoltmeter, color: '#0891B2' },
};

const DEFAULT_ANCHOR_ID = 'speaker';

export class SineWaveCoreRenderer {
  private graphics: Graphics2D;
  private A = 1;
  private omega = 4.5;
  private phi = 0;
  private t = 0;
  private yCur = 0;
  private yStd = 0;
  private isStandard = true;
  private animT = 0;
  private userDrivenT = false;
  private anchorId = DEFAULT_ANCHOR_ID;

  constructor(container: HTMLElement, options: VisualizerMountOptions) {
    this.graphics = new Graphics2D(container, {
      width: options.width,
      height: options.height,
      theme: options.theme,
      onFrame: (ctx, frame) => {
        this.animT += frame.dt;
        this.tickAutoPlay(frame.dt);
        this.yCur = this.A * Math.sin(this.omega * this.t + this.phi);
        this.render(ctx, frame.width, frame.height);
      },
    });
  }

  update(context: VisualizerUpdate): void {
    const { params, derived, baseline, isStandard, activeAnchorId } = context;
    if (typeof params.A === 'number') this.A = params.A;
    const omega = params['\\omega'] ?? params.omega;
    if (typeof omega === 'number') this.omega = omega;
    const phi = params['\\varphi'] ?? params.phi;
    if (typeof phi === 'number') this.phi = phi;
    if (typeof params.t === 'number' && params.t !== this.t) {
      this.t = params.t;
      this.userDrivenT = true;
    }
    if (typeof derived.x === 'number' && Number.isFinite(derived.x)) {
      this.yCur = derived.x;
    }
    this.isStandard = isStandard;
    const std = baseline?.derived?.x;
    this.yStd = typeof std === 'number' && Number.isFinite(std) ? std : this.yCur;
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
    const style = ANCHOR_STYLES[this.anchorId] ?? ANCHOR_STYLES[DEFAULT_ANCHOR_ID];

    ctx.fillStyle = isDark ? '#0b1220' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    const topH = Math.floor(h * TOP_RATIO);
    const botY = topH;
    const botH = h - topH;

    drawAbstract({
      ctx, x: 0, y: 0, w, h: topH,
      A: this.A, omega: this.omega, phi: this.phi, t: this.t,
      y_cur: this.yCur, y_std: this.yStd,
      color: style.color, isDark, isStandard: this.isStandard,
    });

    ctx.strokeStyle = isDark ? 'rgba(120,140,170,0.25)' : 'rgba(100,115,140,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(10, topH);
    ctx.lineTo(w - 10, topH);
    ctx.stroke();
    ctx.setLineDash([]);

    const absA = Math.max(1e-6, Math.abs(this.A));
    const yNorm = Math.max(-1, Math.min(1, this.yCur / absA));
    style.draw({
      ctx, x: 0, y: botY, w, h: botH,
      A: this.A, y0: this.yCur, yNorm,
      animT: this.animT, color: style.color, isDark,
    });
  }
}
