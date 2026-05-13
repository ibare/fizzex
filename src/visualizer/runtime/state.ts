/**
 * 런타임 파라미터·내부 상태 저장소 (설계 §2.3·§2.4·§9·V3).
 *
 * 세 종류 슬롯을 분리해 보관한다:
 *   - `params`: 사용자 조작값 (슬라이더·인터랙션·편집기). **number 한정**
 *   - `state`: 애니메이션 전용 내부 변수. primitive (number | bool | string)
 *   - `bindings`: userBinding(LaTeX 수식) 평가 결과. **unknown**
 *       — scalar 는 number, matrix 는 `Matrix`, complex 는 `{re, im}` 형태로 들어온다.
 *       슬라이더 채널과 분리되어 expr locals 머지 시 params 위에 덮어쓴다.
 *   - `pulses`: 파라미터 변경 시 1프레임 플래그. `StateDecl.onParamChange` 매칭에 사용
 *
 * 외부로 노출되는 `snapshot()`은 매 호출마다 새 객체 (§4 불변 상태).
 * Expression 평가기는 `{ params, state, bindings }`를 Context locals에 그대로 주입한다.
 *
 * `subscribeParams(listener)`는 파라미터 변경을 UI 레이어로 전파하기 위한 경량 관찰자.
 * `source` 파라미터로 변경 출처를 구분하여 무한 루프(슬라이더 ↔ 캔버스 드래그)를 방지한다.
 * bindings 는 외부 일괄 주입 채널이라 별도 listener 를 두지 않는다.
 */

import type { StateDecl } from './types/state';

export type StatePrimitive = number | boolean | string;

/**
 * 파라미터 변경 출처.
 * - `external`: 외부(UI 슬라이더·인라인 컨트롤·프로그래매틱 호출)에서 설정한 값.
 * - `interaction`: 캔버스 포인터·휠 인터랙션으로 변경된 값.
 * - `scene`: scene 전환에 따라 preset이 일괄 적용된 값.
 */
export type ParamChangeSource = 'external' | 'interaction' | 'scene';

export interface StateSnapshot {
  params: Record<string, number>;
  state: Record<string, StatePrimitive>;
  bindings: Record<string, unknown>;
}

export type ParamsListener = (
  params: Record<string, number>,
  source: ParamChangeSource,
) => void;

export interface StateStore {
  getParam(id: string): number;
  setParam(id: string, value: number, source?: ParamChangeSource): void;
  getState(id: string): StatePrimitive;
  setState(id: string, value: StatePrimitive): void;
  /** userBinding 평가 결과(unknown 값) 슬롯에 주입 (V3). */
  setBinding(id: string, value: unknown): void;
  /** id 가 없으면 undefined. setBinding 으로 주입된 적 없는 키를 가리킬 수 있다. */
  getBinding(id: string): unknown;
  /** id 의 binding 슬롯을 제거. unbound 표시를 위한 명시적 해제 채널. */
  clearBinding(id: string): void;
  hasPulse(id: string): boolean;
  consumePulses(): void;
  snapshot(): StateSnapshot;
  subscribeParams(listener: ParamsListener): () => void;
}

export interface StateStoreInit {
  stateDecls?: readonly StateDecl[];
  initialParams?: Readonly<Record<string, number>>;
}

export function createStateStore(init: StateStoreInit = {}): StateStore {
  const params: Record<string, number> = { ...(init.initialParams ?? {}) };
  const state: Record<string, StatePrimitive> = {};
  const bindings: Record<string, unknown> = {};
  const paramChangeToStateId = new Map<string, string>();
  const pulses = new Set<string>();
  const listeners = new Set<ParamsListener>();

  for (const decl of init.stateDecls ?? []) {
    state[decl.id] = decl.default;
    if (decl.onParamChange) {
      paramChangeToStateId.set(decl.onParamChange, decl.id);
    }
  }

  return {
    getParam(id) {
      const v = params[id];
      if (v === undefined) throw new Error(`state: unknown param "${id}"`);
      return v;
    },
    setParam(id, value, source = 'external') {
      params[id] = value;
      const pulseTarget = paramChangeToStateId.get(id);
      if (pulseTarget !== undefined) pulses.add(pulseTarget);
      if (listeners.size > 0) {
        const snapshotCopy = { ...params };
        for (const l of listeners) l(snapshotCopy, source);
      }
    },
    getState(id) {
      const v = state[id];
      if (v === undefined) throw new Error(`state: unknown state id "${id}"`);
      return v;
    },
    setState(id, value) {
      state[id] = value;
    },
    setBinding(id, value) {
      bindings[id] = value;
    },
    getBinding(id) {
      return bindings[id];
    },
    clearBinding(id) {
      delete bindings[id];
    },
    hasPulse(id) {
      return pulses.has(id);
    },
    consumePulses() {
      pulses.clear();
    },
    snapshot() {
      return {
        params: { ...params },
        state: { ...state },
        bindings: { ...bindings },
      };
    },
    subscribeParams(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
