import { describe, it, expect, vi } from 'vitest';
import { createSceneController } from './scene';
import { createStateStore } from './state';
import type { SceneSpec } from './types/scene';

const sceneA: SceneSpec = { id: 'a', name: { ko: '에이', en: 'A' }, params: { A: 1 } };
const sceneB: SceneSpec = { id: 'b', name: { ko: '비', en: 'B' }, params: { A: 2, omega: 3 } };
const sceneC: SceneSpec = { id: 'c', name: { ko: '시', en: 'C' } };

describe('createSceneController', () => {
  it('빈 scenes → throw', () => {
    const store = createStateStore();
    expect(() => createSceneController([], store)).toThrow();
  });

  it('기본 initial은 첫 scene + 프리셋 적용', () => {
    const store = createStateStore({ initialParams: { A: 0, omega: 0 } });
    const ctrl = createSceneController([sceneA, sceneB], store);
    expect(ctrl.getActiveId()).toBe('a');
    expect(store.getParam('A')).toBe(1);
  });

  it('미지정 initialId throw', () => {
    const store = createStateStore();
    expect(() => createSceneController([sceneA], store, 'zzz')).toThrow();
  });

  it('setActive 전환 + 프리셋 적용', () => {
    const store = createStateStore({ initialParams: { A: 0, omega: 0 } });
    const ctrl = createSceneController([sceneA, sceneB], store);
    ctrl.setActive('b');
    expect(ctrl.getActiveId()).toBe('b');
    expect(store.getParam('A')).toBe(2);
    expect(store.getParam('omega')).toBe(3);
  });

  it('setActive 미지정 id throw', () => {
    const store = createStateStore();
    const ctrl = createSceneController([sceneA], store);
    expect(() => ctrl.setActive('z')).toThrow();
  });

  it('D4: 전환 시 state는 유지', () => {
    const store = createStateStore({
      stateDecls: [{ id: 'autoT', type: 'number', default: 7 }],
      initialParams: { A: 0, omega: 0 },
    });
    store.setState('autoT', 12);
    const ctrl = createSceneController([sceneA, sceneB], store);
    ctrl.setActive('b');
    expect(store.getState('autoT')).toBe(12);
  });

  it('params 없는 scene은 파라미터 건드리지 않음', () => {
    const store = createStateStore({ initialParams: { A: 9 } });
    const ctrl = createSceneController([sceneC, sceneA], store, 'c');
    expect(store.getParam('A')).toBe(9);
  });

  it('subscribe + unsubscribe', () => {
    const store = createStateStore({ initialParams: { A: 0, omega: 0 } });
    const ctrl = createSceneController([sceneA, sceneB], store);
    const listener = vi.fn();
    const off = ctrl.subscribe(listener);
    ctrl.setActive('b');
    expect(listener).toHaveBeenCalledWith('b');
    off();
    ctrl.setActive('a');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
