/**
 * 복리 2D 통합 렌더러.
 *
 * 공용 코어(_shared/compound-interest/core-renderer)를 그대로 사용.
 * 앵커(예금/주식/적금/인플레이션)에 따라 색상·tMax·하단 일러스트·inverse가 전환된다.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { CompoundInterestCoreRenderer } from '../_shared/compound-interest/core-renderer';

export class CompoundInterest2DRenderer {
  private core: CompoundInterestCoreRenderer;

  constructor(container: HTMLElement, options: VisualizerMountOptions) {
    this.core = new CompoundInterestCoreRenderer(container, options);
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
