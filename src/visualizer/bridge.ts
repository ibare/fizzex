/**
 * Visualizer 통신 브릿지 — 프레임워크 ↔ Visualizer 양방향 동기화
 *
 * source 파라미터로 변경 출처를 추적하여 무한 루프를 방지한다.
 * AST를 보유하여 수식 수정(스테퍼) 시 파생값이 AST 기반으로 재계산된다.
 */

import type { RootNode } from '../types';
import type {
  FizzexVisualizer,
  ParameterValues,
  DerivedValue,
  ComputeContext,
  VisualizerBridge,
} from './types';
import { evaluateEquation } from './evaluator';

export class VisualizerBridgeImpl implements VisualizerBridge {
  private params: ParameterValues;
  private visualizer: FizzexVisualizer;
  private listeners = new Set<(params: ParameterValues, source: string) => void>();
  private derivedDefs: DerivedValue[];
  private ast: RootNode | null = null;
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

  setAst(ast: RootNode | null): void {
    if (this.destroyed) return;
    this.ast = ast;

    // AST 변경 시 구독자에게 알린다 (값 배지 갱신 등)
    for (const listener of this.listeners) {
      listener({ ...this.params }, 'inline');
    }
  }

  getDerivedValues(): Record<string, number> {
    // AST가 있으면 방정식 우변을 평가 (상수 + SI 변환된 파라미터)
    let equationValue: number | undefined;
    if (this.ast) {
      const evalParams: ParameterValues = { ...this.visualizer.constants };
      for (const pc of this.visualizer.parameters) {
        const v = this.params[pc.id];
        if (v != null) evalParams[pc.name] = v * (pc.siMultiplier ?? 1);
      }
      const { rhsValue } = evaluateEquation(this.ast, evalParams);
      if (!isNaN(rhsValue)) equationValue = rhsValue;
    }

    const ctx: ComputeContext = { equationValue, derived: {} };
    const result: Record<string, number> = {};

    for (const dv of this.derivedDefs) {
      const val = dv.compute(this.params, ctx);
      result[dv.id] = val;
      ctx.derived[dv.id] = val;
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
    this.ast = null;
  }
}
