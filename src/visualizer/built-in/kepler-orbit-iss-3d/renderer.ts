/**
 * ISS(국제우주정거장) 3D 궤도 렌더러.
 * 공용 Three.js 코어를 그대로 사용, 초기 궤도 반지름만 주입한다.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { KeplerOrbit3DCoreRenderer } from '../_shared/kepler-orbit/three-core-renderer';

const DEFAULT_A = 6771;

export class KeplerOrbitIss3DRenderer {
  private core: KeplerOrbit3DCoreRenderer;

  constructor(container: HTMLElement, options: VisualizerMountOptions) {
    this.core = new KeplerOrbit3DCoreRenderer(container, options, DEFAULT_A);
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
