import { describe, it, expect } from 'vitest';
import { applyUserBindings } from './user-binding-bridge';
import { createStateStore } from './state';
import type { VisualizerSpec } from './types/spec';

function makeSpec(partial: Partial<VisualizerSpec>): VisualizerSpec {
  return {
    $schema: 'fizzex-visualizer/v1',
    id: 'test',
    catalog: 'category/id',
    name: { en: 'Test' },
    description: { en: 'Test' },
    renderer: '2d',
    scenes: [
      {
        id: 'default',
        name: { en: 'Default' },
        params: { a: 1, b: 2 },
      },
    ],
    viewports: {},
    root: { kind: 'group', children: [] },
    ...partial,
  } as VisualizerSpec;
}

describe('applyUserBindings', () => {
  it('no userBindings → applied/skipped 모두 빈 배열', () => {
    const spec = makeSpec({});
    const store = createStateStore({ initialParams: { a: 1, b: 2 } });
    const r = applyUserBindings(spec, { a: 10, b: 20 }, store);
    expect(r.applied).toEqual([]);
    expect(r.skipped).toEqual([]);
    expect(store.getParam('a')).toBe(1);
  });

  it('scalar binding 정상 주입 → store.setParam 호출', () => {
    const spec = makeSpec({
      userBindings: [
        { name: 'a', outputKind: 'scalar', required: true },
        { name: 'b', outputKind: 'scalar', required: true },
      ],
    });
    const store = createStateStore({ initialParams: { a: 1, b: 2 } });
    const r = applyUserBindings(spec, { a: 3, b: 4 }, store);
    expect(r.applied).toEqual([
      { name: 'a', value: 3 },
      { name: 'b', value: 4 },
    ]);
    expect(r.skipped).toEqual([]);
    expect(store.getParam('a')).toBe(3);
    expect(store.getParam('b')).toBe(4);
  });

  it('bindings 누락 → unbound 로 skip, store 값 유지', () => {
    const spec = makeSpec({
      userBindings: [{ name: 'a', outputKind: 'scalar', required: true }],
    });
    const store = createStateStore({ initialParams: { a: 7 } });
    const r = applyUserBindings(spec, {}, store);
    expect(r.applied).toEqual([]);
    expect(r.skipped).toEqual([
      { name: 'a', reason: 'unbound', required: true, detail: 'a' },
    ]);
    expect(store.getParam('a')).toBe(7);
  });

  it('required:false 도 unbound 시 동일하게 skip 기록 (silent)', () => {
    const spec = makeSpec({
      userBindings: [{ name: 'a', outputKind: 'scalar', required: false }],
    });
    const store = createStateStore({ initialParams: { a: 9 } });
    const r = applyUserBindings(spec, {}, store);
    expect(r.applied).toEqual([]);
    expect(r.skipped[0]).toMatchObject({ name: 'a', reason: 'unbound', required: false });
    expect(store.getParam('a')).toBe(9);
  });

  it('outputKind !== scalar → unsupported-output-kind skip', () => {
    const spec = makeSpec({
      userBindings: [
        { name: 'M', outputKind: 'matrix', required: true },
        { name: 'z', outputKind: 'complex', required: false },
      ],
    });
    const store = createStateStore({ initialParams: {} });
    const r = applyUserBindings(spec, { M: 0, z: 0 }, store);
    expect(r.applied).toEqual([]);
    expect(r.skipped).toEqual([
      { name: 'M', reason: 'unsupported-output-kind', required: true, detail: 'matrix' },
      { name: 'z', reason: 'unsupported-output-kind', required: false, detail: 'complex' },
    ]);
  });

  it('일부 binding 만 누락 → applied/skipped 동시 채워짐', () => {
    const spec = makeSpec({
      userBindings: [
        { name: 'a', outputKind: 'scalar', required: true },
        { name: 'b', outputKind: 'scalar', required: true },
      ],
    });
    const store = createStateStore({ initialParams: { a: 1, b: 2 } });
    const r = applyUserBindings(spec, { a: 5 }, store);
    expect(r.applied).toEqual([{ name: 'a', value: 5 }]);
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0]).toMatchObject({ name: 'b', reason: 'unbound', required: true });
    expect(store.getParam('a')).toBe(5);
    expect(store.getParam('b')).toBe(2);
  });

  it('카논화 변수명: π·\\theta 등도 매칭', () => {
    const spec = makeSpec({
      userBindings: [{ name: '\\theta', outputKind: 'scalar', required: true }],
    });
    const store = createStateStore({ initialParams: { '\\theta': 0 } });
    // bindings 키는 정규화된 이름(θ) 또는 raw 이름(\\theta) 둘 다 evaluator 가 수용
    const r = applyUserBindings(spec, { '\\theta': 1.57 }, store);
    expect(r.applied).toEqual([{ name: '\\theta', value: 1.57 }]);
  });

  it('source=external 로 store.setParam 호출 (subscribeParams 확인)', () => {
    const spec = makeSpec({
      userBindings: [{ name: 'a', outputKind: 'scalar', required: true }],
    });
    const store = createStateStore({ initialParams: { a: 1 } });
    const sources: string[] = [];
    store.subscribeParams((_p, src) => sources.push(src));
    applyUserBindings(spec, { a: 42 }, store);
    expect(sources).toContain('external');
  });
});
