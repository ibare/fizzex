/**
 * ExplorerVisualizerController — headless Visualizer 라이프사이클 관리
 *
 * spec-loader로 JSON 스펙을 가져와 createVisualizerFromSpec으로 mount한다.
 * 반환 인스턴스를 그대로 노출해 UI 레이어(viz-panel 등)가 store·scene·setParam 등에 접근한다.
 */

import {
  createVisualizerFromSpec,
  loadVisualizerSpec,
  type CreatedVisualizer,
} from '../visualizer/runtime/public-api';

export class ExplorerVisualizerController {
  private container: HTMLElement;
  private theme: 'light' | 'dark';
  private _instance: CreatedVisualizer | null = null;
  private destroyed = false;

  constructor(container: HTMLElement, theme: 'light' | 'dark') {
    this.container = container;
    this.theme = theme;
  }

  get instance(): CreatedVisualizer | null {
    return this._instance;
  }

  /**
   * spec-loader로 Visualizer JSON 스펙을 로드하고 컨테이너에 마운트한다.
   */
  async init(visualizerId: string): Promise<boolean> {
    if (this.destroyed) return false;

    const raw = await loadVisualizerSpec(visualizerId);
    if (this.destroyed) return false;

    const rect = this.container.getBoundingClientRect();
    this._instance = createVisualizerFromSpec(this.container, raw, {
      width: rect.width || 300,
      height: rect.height || 300,
      theme: this.theme,
      locale: 'ko',
    });
    return true;
  }

  resize(width: number, height: number): void {
    this._instance?.resize(width, height);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this._instance?.destroy();
    this._instance = null;
  }
}
