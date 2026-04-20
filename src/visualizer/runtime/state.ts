/**
 * 런타임 파라미터·내부 상태 저장소 (설계 §2.3·§2.4·§9).
 *
 * - `params`: 사용자 조작 값 (슬라이더·인터랙션·편집기). number 한정
 * - `state`: 애니메이션 전용 내부 변수. primitive (number | bool | string)
 * - `pulses`: 파라미터 변경 시 1프레임 플래그. `StateDecl.onParamChange` 매칭에 사용
 *
 * 외부로 노출되는 `snapshot()`은 매 호출마다 새 객체 (§4 불변 상태).
 * Expression 평가기는 `{ params, state }`를 Context locals에 그대로 주입한다.
 *
 * `subscribeParams(listener)`는 파라미터 변경을 UI 레이어로 전파하기 위한 경량 관찰자.
 * `source` 파라미터로 변경 출처를 구분하여 무한 루프(슬라이더 ↔ 캔버스 드래그)를 방지한다.
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
    hasPulse(id) {
      return pulses.has(id);
    },
    consumePulses() {
      pulses.clear();
    },
    snapshot() {
      return { params: { ...params }, state: { ...state } };
    },
    subscribeParams(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
