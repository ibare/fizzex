/**
 * Visualizer 통신 브릿지 — 프레임워크 ↔ Visualizer 양방향 동기화
 *
 * source 파라미터로 변경 출처를 추적하여 무한 루프를 방지한다.
 */

import type {
  FizzexVisualizer,
  ParameterValues,
  DerivedValue,
  VisualizerBridge,
} from './types';

export class VisualizerBridgeImpl implements VisualizerBridge {
  private params: ParameterValues;
  private visualizer: FizzexVisualizer;
  private listeners = new Set<(params: ParameterValues, source: string) => void>();
  private derivedDefs: DerivedValue[];
  private destroyed = false;

  constructor(visualizer: FizzexVisualizer, initialParams: ParameterValues) {
    this.params = { ...initialParams };
    this.visualizer = visualizer;
    this.derivedDefs = visualizer.derivedValues;

    // Visualizer → 프레임워크 콜백 등록
    if (visualizer.onParameterChange) {
      visualizer.onParameterChange((paramId, value) => {
        if (!this.destroyed) {
          this.setParam(paramId, value, 'visualizer');
        }
      });
    }
  }

  getParams(): ParameterValues {
    return { ...this.params };
  }

  setParam(paramId: string, value: number, source: 'slider' | 'preset' | 'visualizer' | 'inline'): void {
    if (this.destroyed) return;
    this.params[paramId] = value;

    // Visualizer가 변경한 게 아니면 Visualizer에 알린다
    if (source !== 'visualizer') {
      this.visualizer.update({ ...this.params });
    }

    // 모든 구독자에게 알린다 (슬라이더 UI, 값 흐름 등)
    for (const listener of this.listeners) {
      listener({ ...this.params }, source);
    }
  }

  getDerivedValues(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const dv of this.derivedDefs) {
      result[dv.id] = dv.compute(this.params);
    }
    return result;
  }

  subscribe(listener: (params: ParameterValues, source: string) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.listeners.clear();
  }
}
