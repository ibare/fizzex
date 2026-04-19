/**
 * Visualizer 통신 브릿지 — 프레임워크 ↔ Visualizer 양방향 동기화
 *
 * source 파라미터로 변경 출처를 추적하여 무한 루프를 방지한다.
 * AST를 보유하여 수식 수정(스테퍼) 시 파생값이 AST 기반으로 재계산된다.
 */

import type { RootNode } from '../types';
import type { CatalogDetail } from '../analyzer/semantic/types';
import type {
  AnchorConfig,
  FizzexVisualizer,
  ParameterValues,
  DerivedValue,
  ComputeContext,
  VisualizerBridge,
  VisualizerUpdate,
} from './types';
import { evaluateEquation } from './evaluator';

/** params가 앵커 params와 모든 키에서 일치하는가 (부동소수점 tolerance) */
function paramsMatchAnchor(
  params: ParameterValues,
  anchor: AnchorConfig,
): boolean {
  for (const [key, anchorVal] of Object.entries(anchor.params)) {
    const cur = params[key];
    if (cur == null) return false;
    const tol = Math.max(Math.abs(anchorVal), 1) * 1e-9;
    if (Math.abs(cur - anchorVal) > tol) return false;
  }
  return true;
}

export class VisualizerBridgeImpl implements VisualizerBridge {
  private params: ParameterValues;
  private visualizer: FizzexVisualizer;
  private listeners = new Set<(params: ParameterValues, source: string) => void>();
  private anchorListeners = new Set<(anchorId: string | null) => void>();
  private derivedDefs: DerivedValue[];
  private ast: RootNode | null = null;
  /**
   * 카탈로그 원본 AST. 학습자가 number 노드를 수정해도 이 참조는 유지되어
   * baseline 비교 시각화의 기준이 된다.
   * `this.ast === this.originalAst` 일 때 isStandard 로 간주.
   */
  private originalAst: RootNode | null = null;
  private catalogDetail: CatalogDetail | null = null;
  private activeAnchorId: string | null = null;
  private destroyed = false;

  constructor(visualizer: FizzexVisualizer, initialParams: ParameterValues) {
    this.params = { ...initialParams };
    this.visualizer = visualizer;
    this.derivedDefs = visualizer.derivedValues;

    // 초기 활성 앵커: params가 이미 어느 앵커와 일치하면 그 ID, 아니면 null
    const anchors = visualizer.anchors;
    if (anchors && anchors.length > 0) {
      const match = anchors.find((a) => paramsMatchAnchor(this.params, a));
      this.activeAnchorId = match?.id ?? null;
    }

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

  setParam(paramId: string, value: number, source: 'slider' | 'visualizer' | 'inline'): void {
    if (this.destroyed) return;
    this.params[paramId] = value;

    // 수동 조정(slider/visualizer/inline) 시 현재 params가 활성 앵커와 더 이상 일치하지 않으면 해제한다.
    this.reconcileActiveAnchor();

    // Visualizer가 변경한 게 아니면 Visualizer에 알린다 (파생값 + equationValue 포함)
    if (source !== 'visualizer') {
      this.visualizer.update(this.computeUpdateContext());
    }

    // 모든 구독자에게 알린다 (슬라이더 UI, 값 흐름 등)
    for (const listener of this.listeners) {
      listener({ ...this.params }, source);
    }
  }

  getActiveAnchorId(): string | null {
    return this.activeAnchorId;
  }

  setActiveAnchor(anchorId: string): void {
    if (this.destroyed) return;
    const anchor = this.visualizer.anchors?.find((a) => a.id === anchorId);
    if (!anchor) return;

    // 앵커 params로 일괄 적용
    for (const [key, val] of Object.entries(anchor.params)) {
      this.params[key] = val;
    }
    this.activeAnchorId = anchor.id;

    this.visualizer.update(this.computeUpdateContext());

    for (const listener of this.listeners) {
      listener({ ...this.params }, 'slider');
    }
    for (const listener of this.anchorListeners) {
      listener(this.activeAnchorId);
    }
  }

  subscribeAnchor(listener: (anchorId: string | null) => void): () => void {
    this.anchorListeners.add(listener);
    return () => { this.anchorListeners.delete(listener); };
  }

  /**
   * 현재 params 기준으로 activeAnchorId를 재평가한다.
   * 일치하는 앵커가 있으면 그 ID, 없으면 null.
   */
  private reconcileActiveAnchor(): void {
    const anchors = this.visualizer.anchors;
    const prev = this.activeAnchorId;
    let next: string | null = null;
    if (anchors && anchors.length > 0) {
      const match = anchors.find((a) => paramsMatchAnchor(this.params, a));
      next = match?.id ?? null;
    }
    if (next !== prev) {
      this.activeAnchorId = next;
      for (const listener of this.anchorListeners) {
        listener(this.activeAnchorId);
      }
    }
  }

  /** 카탈로그 상세 데이터 설정 — 상수 추출에 사용 */
  setCatalogDetail(detail: CatalogDetail | null): void {
    this.catalogDetail = detail;
  }

  /**
   * 수식 AST 설정.
   * @param working 현재 평가할 AST (사용자가 수정한 결과)
   * @param original 카탈로그 원본 AST. 미지정 시 working 과 동일로 간주
   *   (구조 변경 없음 = isStandard true).
   */
  setAst(working: RootNode | null, original?: RootNode | null): void {
    if (this.destroyed) return;
    this.ast = working;
    this.originalAst = original !== undefined ? original : working;

    // AST 변경 시 Visualizer에 갱신된 파생값 전달
    this.visualizer.update(this.computeUpdateContext());

    // AST 변경 시 구독자에게 알린다 (값 배지 갱신 등)
    for (const listener of this.listeners) {
      listener({ ...this.params }, 'inline');
    }
  }

  getDerivedValues(): Record<string, number> {
    return this.computeUpdateContext().derived;
  }

  /**
   * Visualizer에 전달할 최신 컨텍스트를 생성한다.
   * working AST + (구조 변경 시) originalAst 두 트랙을 같은 params 로 평가한다.
   *
   * 이 함수가 "AST가 계산의 유일한 원천" 원칙의 실행 경로이다.
   * Visualizer는 이 결과만 받아 렌더링한다.
   */
  computeUpdateContext(): VisualizerUpdate {
    const evalParams = this.buildEvalParams();
    const current = this.evaluateAst(this.ast, evalParams);

    // originalAst 가 working 과 다른 객체라면 구조가 변형된 상태 → baseline 평가
    const isStandard = this.originalAst === this.ast;
    let baseline: VisualizerUpdate['baseline'];
    if (!isStandard && this.originalAst) {
      const base = this.evaluateAst(this.originalAst, evalParams);
      baseline = { derived: base.derived, equationValue: base.equationValue };
    }

    return {
      params: { ...this.params },
      derived: current.derived,
      equationValue: current.equationValue,
      baseline,
      isStandard,
      activeAnchorId: this.activeAnchorId ?? undefined,
    };
  }

  /**
   * AST 평가용 파라미터 빌드 (카탈로그 상수 + Visualizer 상수 + SI 변환된 사용자 파라미터).
   * working 과 baseline 모두 같은 params 로 평가하여 비교축을 고정한다.
   */
  private buildEvalParams(): ParameterValues {
    const catalogConstants: ParameterValues = {};
    if (this.catalogDetail?.elementMeanings) {
      for (const [key, em] of Object.entries(this.catalogDetail.elementMeanings)) {
        if ('kind' in em && em.kind === 'constant' && em.value != null) {
          catalogConstants[key] = em.value;
        }
      }
    }

    // 우선순위: 카탈로그 상수 → Visualizer 상수 → 사용자 파라미터(SI 변환)
    const evalParams: ParameterValues = {
      ...catalogConstants,
      ...this.visualizer.constants,
    };
    for (const pc of this.visualizer.parameters) {
      const v = this.params[pc.id];
      if (v != null) evalParams[pc.name] = v * (pc.siMultiplier ?? 1);
    }
    return evalParams;
  }

  /** 단일 AST 트랙 평가 (equationValue + derivedValues). */
  private evaluateAst(
    ast: RootNode | null,
    evalParams: ParameterValues,
  ): { equationValue?: number; derived: Record<string, number> } {
    let equationValue: number | undefined;
    if (ast) {
      const { equationValue: eqVal } = evaluateEquation(ast, evalParams);
      if (!isNaN(eqVal)) equationValue = eqVal;
    }
    const ctx: ComputeContext = { equationValue, derived: {} };
    const derived: Record<string, number> = {};
    for (const dv of this.derivedDefs) {
      const val = dv.compute(this.params, ctx);
      derived[dv.id] = val;
      ctx.derived[dv.id] = val;
    }
    return { equationValue, derived };
  }

  subscribe(listener: (params: ParameterValues, source: string) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.listeners.clear();
    this.anchorListeners.clear();
    this.ast = null;
    this.originalAst = null;
    this.catalogDetail = null;
  }
}
