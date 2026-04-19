/**
 * 케플러 궤도 2D 통합 렌더러.
 * 공용 코어를 그대로 사용. 앵커(iss/gps/geo/moon)는 파라미터 전환만 필요하므로
 * 별도 일러스트 분기 없이 궤도 반지름 a 변경으로 처리한다.
 */

import type { VisualizerMountOptions, VisualizerUpdate } from '../../types';
import { KeplerOrbitCoreRenderer } from '../_shared/kepler-orbit/core-renderer';

const DEFAULT_A = 6771;

export class KeplerOrbit2DRenderer {
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
