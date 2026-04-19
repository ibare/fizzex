/**
 * 케플러 궤도 3D 통합 렌더러 (Three.js).
 * 공용 3D 코어를 그대로 사용. 앵커는 a 파라미터 전환으로 처리된다.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { KeplerOrbit3DCoreRenderer } from '../_shared/kepler-orbit/three-core-renderer';

const DEFAULT_A = 6771;

export class KeplerOrbit3DRenderer {
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
