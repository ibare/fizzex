/**
 * ISS(국제우주정거장) 2D 궤도 렌더러.
 * 공용 코어를 그대로 사용, 초기 궤도 반지름만 주입한다.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { KeplerOrbitCoreRenderer } from '../_shared/kepler-orbit/core-renderer';

const DEFAULT_A = 6771; // km — 고도 ≈ 400 km, 약 90분 주기

export class KeplerOrbitIssRenderer {
  private core: KeplerOrbitCoreRenderer;

  constructor(container: HTMLElement, options: VisualizerMountOptions) {
    this.core = new KeplerOrbitCoreRenderer(container, options, DEFAULT_A);
  }

  update(context: VisualizerUpdate): void {
    this.core.update(context);
  }

  resize(width: number, height: number): void {
    this.core.resize(width, height);
  }

  setParameterChangeCallback(cb: (paramId: string, value: number) => void): void {
    this.core.setParameterChangeCallback(cb);
  }

  destroy(): void {
    this.core.destroy();
  }
}
