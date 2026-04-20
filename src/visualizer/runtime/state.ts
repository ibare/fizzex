/**
 * 런타임 파라미터·내부 상태 저장소 (설계 §2.3·§2.4·§9).
 *
 * - `params`: 사용자 조작 값 (슬라이더·인터랙션·편집기). number 한정
 * - `state`: 애니메이션 전용 내부 변수. primitive (number | bool | string)
 * - `pulses`: 파라미터 변경 시 1프레임 플래그. `StateDecl.onParamChange` 매칭에 사용
 *
 * 외부로 노출되는 `snapshot()`은 매 호출마다 새 객체 (§4 불변 상태).
 * Expression 평가기는 `{ params, state }`를 Context locals에 그대로 주입한다.
 */

import type { StateDecl } from './types/state';

export type StatePrimitive = number | boolean | string;

export interface StateSnapshot {
  params: Record<string, number>;
  state: Record<string, StatePrimitive>;
}

export interface StateStore {
  getParam(id: string): number;
  setParam(id: string, value: number): void;
  getState(id: string): StatePrimitive;
  setState(id: string, value: StatePrimitive): void;
  hasPulse(id: string): boolean;
  consumePulses(): void;
  snapshot(): StateSnapshot;
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
    setParam(id, value) {
      params[id] = value;
      const pulseTarget = paramChangeToStateId.get(id);
      if (pulseTarget !== undefined) pulses.add(pulseTarget);
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
  };
}
