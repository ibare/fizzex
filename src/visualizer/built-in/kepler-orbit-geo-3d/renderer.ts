/**
 * 정지궤도(GEO) 위성 3D 궤도 렌더러.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { KeplerOrbit3DCoreRenderer } from '../_shared/kepler-orbit/three-core-renderer';

const DEFAULT_A = 42164;

export class KeplerOrbitGeo3DRenderer {
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
