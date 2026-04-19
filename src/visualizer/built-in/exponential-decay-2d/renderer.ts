/**
 * 지수 감소 2D 통합 렌더러.
 *
 * 공용 코어(_shared/exponential-decay/core-renderer)를 그대로 사용.
 * 앵커(caffeine/battery/carbon14/drug)에 따라 하단 일러스트와 색상이 전환된다.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { ExponentialDecayCoreRenderer } from '../_shared/exponential-decay/core-renderer';

export class ExponentialDecay2DRenderer {
  private core: ExponentialDecayCoreRenderer;

  constructor(container: HTMLElement, options: VisualizerMountOptions) {
    this.core = new ExponentialDecayCoreRenderer(container, options);
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
