/**
 * ExplorerVisualizerController — headless Visualizer 라이프사이클 관리
 *
 * ExplorerOverlay가 카탈로그 매칭 + visualizerId 탐지 시 생성한다.
 * Visualizer를 로드하고, bridge를 구성하고, 컨테이너에 mount한다.
 */

import type { FizzexVisualizer, ParameterValues } from '../visualizer/types';
import type { CatalogDetail } from '../analyzer/semantic/types';
import { VisualizerBridgeImpl } from '../visualizer/bridge';
import { loadVisualizer } from '../visualizer/loader';
import { extractParameters } from '../visualizer/param-extractor';

export class ExplorerVisualizerController {
  private container: HTMLElement;
  private theme: 'light' | 'dark';
  private visualizer: FizzexVisualizer | null = null;
  private _bridge: VisualizerBridgeImpl | null = null;
  private destroyed = false;

  constructor(container: HTMLElement, theme: 'light' | 'dark') {
    this.container = container;
    this.theme = theme;
  }

  /** bridge 접근자 (controls 패널에서 사용) */
  get bridge(): VisualizerBridgeImpl | null {
    return this._bridge;
  }

  /** Visualizer 접근자 */
  get viz(): FizzexVisualizer | null {
    return this.visualizer;
  }

  /**
   * Visualizer를 로드하고 mount한다.
   * 비동기 — 동적 import가 완료되면 컨테이너에 렌더링된다.
   */
  async init(
    visualizerId: string,
    catalogDetail: CatalogDetail | null,
  ): Promise<boolean> {
    if (this.destroyed) return false;

    const viz = await loadVisualizer(visualizerId);
    if (!viz || this.destroyed) return false;

    this.visualizer = viz;

    // 파라미터 추출 (카탈로그 → ParameterConfig)
    const params = extractParameters([], catalogDetail);
    const initialValues: ParameterValues = {};
    for (const p of (params.length > 0 ? params : viz.parameters)) {
      initialValues[p.id] = p.default;
    }

    // Bridge 생성 + 카탈로그 상수 전달
    this._bridge = new VisualizerBridgeImpl(viz, initialValues);
    this._bridge.setCatalogDetail(catalogDetail);

    // Mount
    const rect = this.container.getBoundingClientRect();
    viz.mount(this.container, {
      width: rect.width || 300,
      height: rect.height || 300,
      theme: this.theme,
      locale: 'ko',
    });

    // 초기 컨텍스트 전송 (params + derived + equationValue)
    // — 케플러처럼 derived(period)에 의존해 애니메이션이 시작되는 Visualizer를 위해 필수
    viz.update(this._bridge.computeUpdateContext());

    return true;
  }

  resize(width: number, height: number): void {
    this.visualizer?.resize(width, height);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this._bridge?.destroy();
    this.visualizer?.unmount();
    this._bridge = null;
    this.visualizer = null;
  }
}
