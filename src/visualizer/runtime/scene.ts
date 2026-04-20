/**
 * 활성 Scene 제어 (설계 §2.5, D4).
 *
 * Scene 전환 시:
 *   - `state`는 유지 (autoT 등 rAF 상태의 연속성 보장)
 *   - `scene.params` 프리셋이 있으면 store.setParam으로 덮어쓴다
 *   - 지정되지 않은 param id는 그대로 유지
 *
 * 같은 id로 setActive 호출 시에도 프리셋을 재적용한다(Scene "리셋" 용도로 호환).
 */

import type { SceneSpec } from './types/scene';
import type { StateStore } from './state';

export interface SceneController {
  getActiveId(): string;
  getActiveScene(): SceneSpec;
  setActive(id: string): void;
  subscribe(listener: (id: string) => void): () => void;
}

export function createSceneController(
  scenes: readonly SceneSpec[],
  store: StateStore,
  initialId?: string,
): SceneController {
  if (scenes.length === 0) throw new Error('scene: scenes must not be empty');

  const index = new Map<string, SceneSpec>();
  for (const s of scenes) index.set(s.id, s);

  const startId = initialId ?? scenes[0].id;
  if (!index.has(startId)) {
    throw new Error(`scene: unknown initial id "${startId}"`);
  }

  let activeId = startId;
  const listeners = new Set<(id: string) => void>();

  applyParamsPreset(index.get(activeId)!, store);

  return {
    getActiveId: () => activeId,
    getActiveScene: () => index.get(activeId)!,
    setActive(id) {
      const next = index.get(id);
      if (!next) throw new Error(`scene: unknown id "${id}"`);
      activeId = id;
      applyParamsPreset(next, store);
      for (const l of listeners) l(id);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function applyParamsPreset(scene: SceneSpec, store: StateStore): void {
  if (!scene.params) return;
  for (const [id, value] of Object.entries(scene.params)) {
    store.setParam(id, value, 'scene');
  }
}
