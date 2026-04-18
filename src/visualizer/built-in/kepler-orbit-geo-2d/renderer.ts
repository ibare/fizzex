/**
 * 정지궤도(GEO) 위성 2D 궤도 렌더러.
 * 공용 코어를 그대로 사용, 초기 궤도 반지름만 주입한다.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { KeplerOrbitCoreRenderer } from '../_shared/kepler-orbit/core-renderer';

const DEFAULT_A = 42164; // km — 고도 ≈ 35,786 km, 정확히 24시간 주기

export class KeplerOrbitGeoRenderer {
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
