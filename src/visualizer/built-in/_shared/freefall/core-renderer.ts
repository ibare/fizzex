/**
 * 자유낙하 공용 코어 렌더러.
 *
 * s = v_0 t + 1/2 a t². update/오토플레이/hCur 계산을 공통화하고
 * activeAnchorId로 지구·달·화성·목성 장면을 분기한다.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../../types';
import { Graphics2D } from '../../../../graphics/Graphics2D';
import { drawEarth } from './earth';
import { drawMoon } from './moon';
import { drawMars } from './mars';
import { drawJupiter } from './jupiter';
import type { SceneDrawArgs } from './types';

const AUTO_PLAY_SECONDS = 6;

const ANCHOR_SCENES: Record<string, (args: SceneDrawArgs) => void> = {
  earth: drawEarth,
  moon: drawMoon,
  mars: drawMars,
  jupiter: drawJupiter,
};

const DEFAULT_ANCHOR_ID = 'earth';

export class FreefallCoreRenderer {
  private graphics: Graphics2D;
  private v0 = 0;
  private a = 9.807;
  private t = 0;
  private hCur = 0;
  private userDrivenT = false;
  private anchorId = DEFAULT_ANCHOR_ID;

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
    const { params, derived, activeAnchorId } = context;
    if (typeof params.v_0 === 'number') this.v0 = params.v_0;
    if (typeof params.a === 'number') this.a = params.a;
    if (typeof params.t === 'number' && params.t !== this.t) {
      this.t = params.t;
      this.userDrivenT = true;
    }
    if (typeof derived.s === 'number' && Number.isFinite(derived.s)) {
      this.hCur = Math.max(0, derived.s);
    }
    if (activeAnchorId && ANCHOR_SCENES[activeAnchorId]) {
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
    const isDark = this.graphics.isDark;
    const draw = ANCHOR_SCENES[this.anchorId] ?? ANCHOR_SCENES[DEFAULT_ANCHOR_ID];
    draw({ ctx, w, h, v0: this.v0, a: this.a, t: this.t, hCur: this.hCur, isDark });
  }
}
