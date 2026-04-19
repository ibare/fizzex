/**
 * 사인파 2D 통합 렌더러.
 *
 * 공용 코어(_shared/sine-wave/core-renderer)를 그대로 사용.
 * 앵커(스피커/진자/조수/전압계)에 따라 하단 일러스트와 색상이 전환된다.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { SineWaveCoreRenderer } from '../_shared/sine-wave/core-renderer';

export class SineWave2DRenderer {
  private core: SineWaveCoreRenderer;

  constructor(container: HTMLElement, options: VisualizerMountOptions) {
    this.core = new SineWaveCoreRenderer(container, options);
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
