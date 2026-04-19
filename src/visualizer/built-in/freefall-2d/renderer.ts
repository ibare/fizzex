/**
 * 자유낙하 2D 통합 렌더러.
 *
 * 공용 코어(_shared/freefall/core-renderer)를 그대로 사용.
 * 앵커(지구/달/화성/목성)에 따라 장면·중력·색상이 전환된다.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { FreefallCoreRenderer } from '../_shared/freefall/core-renderer';

export class Freefall2DRenderer {
  private core: FreefallCoreRenderer;

  constructor(container: HTMLElement, options: VisualizerMountOptions) {
    this.core = new FreefallCoreRenderer(container, options);
  }

  update(context: VisualizerUpdate): void {
    this.core.update(context);
  }

  resize(width: number, height: number): void {
    this.core.resize(width, height);
  }

  destroy(): void {
    this.core.destroy();
  }
}
