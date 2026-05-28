/**
 * ExplorerVisualizerController — headless Visualizer 라이프사이클 관리
 *
 * 호스트가 주입한 VisualizerRegistry로 id에 해당하는 spec을 가져오고
 * createVisualizer로 컨테이너에 마운트한다.
 *
 * 반환 인스턴스를 그대로 노출해 UI 레이어(viz-panel 등)가 store·scene·setParam 등에 접근한다.
 *
 * destroy()는 진행 중인 registry fetch를 AbortController로 취소하고 mount된 인스턴스를 정리한다.
 */

import {
  createVisualizer,
  type CreatedVisualizer,
  type VisualizerRegistry,
} from '../visualizer/runtime/public-api.js';

export class ExplorerVisualizerController {
  private container: HTMLElement;
  private theme: 'light' | 'dark';
  private registry: VisualizerRegistry;
  private _instance: CreatedVisualizer | null = null;
  private destroyed = false;
  private pendingAbort: AbortController | null = null;

  constructor(container: HTMLElement, theme: 'light' | 'dark', registry: VisualizerRegistry) {
    this.container = container;
    this.theme = theme;
    this.registry = registry;
  }

  get instance(): CreatedVisualizer | null {
    return this._instance;
  }

  /**
   * registry에서 Visualizer JSON 스펙을 로드하고 컨테이너에 마운트한다.
   * destroy()가 이미 호출되었거나 init 도중 destroy가 발생하면 false를 반환한다.
   */
  async init(visualizerId: string): Promise<boolean> {
    if (this.destroyed) return false;

    const abort = new AbortController();
    this.pendingAbort = abort;

    let instance: CreatedVisualizer;
    try {
      const rect = this.container.getBoundingClientRect();
      instance = await createVisualizer(this.container, {
        registry: this.registry,
        id: visualizerId,
        load: { signal: abort.signal },
        width: rect.width || 300,
        height: rect.height || 300,
        theme: this.theme,
        locale: 'ko',
      });
    } finally {
      if (this.pendingAbort === abort) this.pendingAbort = null;
    }

    if (this.destroyed) {
      instance.destroy();
      return false;
    }

    this._instance = instance;
    return true;
  }

  resize(width: number, height: number): void {
    this._instance?.resize(width, height);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.pendingAbort?.abort();
    this.pendingAbort = null;
    this._instance?.destroy();
    this._instance = null;
  }
}
