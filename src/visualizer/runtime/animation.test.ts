import { describe, it, expect } from 'vitest';
import { runAnimationFrame } from './animation';
import { createStateStore } from './state';
import { createRenderContext } from './adapter2d/render-context';
import { rootContext } from './expr/context';
import type { AnimationSpec, StateDecl } from './types/state';
import type { FrameInfo } from '../../graphics/types';

function makeFrame(over?: Partial<FrameInfo>): FrameInfo {
  return { dt: 0.016, now: 0, elapsed: 0, width: 400, height: 300, isDark: false, ...over };
}

function makeStore(decls: StateDecl[] = [], params: Record<string, number> = {}) {
  return createStateStore({ stateDecls: decls, initialParams: params });
}

function makeRc(store: ReturnType<typeof makeStore>, frame = makeFrame()) {
  const snap = store.snapshot();
  return createRenderContext({
    exprCtx: rootContext({ state: snap.state, params: snap.params, frame }),
    frame,
  });
}

describe('runAnimationFrame', () => {
  it('spec undefined → no-op', () => {
    const store = makeStore();
    expect(() => runAnimationFrame(undefined, store, makeRc(store))).not.toThrow();
  });

  it('onFrame 빈 배열 → no-op', () => {
    const store = makeStore();
    runAnimationFrame({ onFrame: [] }, store, makeRc(store));
  });

  it('state.<id> 대입', () => {
    const store = makeStore([{ id: 'autoT', type: 'number', default: 0 }]);
    const spec: AnimationSpec = { onFrame: [{ set: 'state.autoT', to: '1 + 2' }] };
    runAnimationFrame(spec, store, makeRc(store));
    expect(store.getState('autoT')).toBe(3);
  });

  it('state의 이전 값 참조', () => {
    const store = makeStore([{ id: 'autoT', type: 'number', default: 5 }]);
    const spec: AnimationSpec = { onFrame: [{ set: 'state.autoT', to: 'state.autoT + 1' }] };
    runAnimationFrame(spec, store, makeRc(store));
    expect(store.getState('autoT')).toBe(6);
  });

  it('frame.dt 참조', () => {
    const store = makeStore([{ id: 'autoT', type: 'number', default: 0 }]);
    const spec: AnimationSpec = { onFrame: [{ set: 'state.autoT', to: 'state.autoT + frame.dt' }] };
    runAnimationFrame(spec, store, makeRc(store, makeFrame({ dt: 0.1 })));
    expect(store.getState('autoT')).toBeCloseTo(0.1);
  });

  it('bool 대입', () => {
    const store = makeStore([{ id: 'flag', type: 'bool', default: true }]);
    runAnimationFrame({ onFrame: [{ set: 'state.flag', to: 'false' }] }, store, makeRc(store));
    expect(store.getState('flag')).toBe(false);
  });

  it('잘못된 set 경로 throw', () => {
    const store = makeStore();
    expect(() =>
      runAnimationFrame({ onFrame: [{ set: 'autoT', to: '0' }] }, store, makeRc(store)),
    ).toThrow(/invalid set path/);
  });

  it('vars. 네임스페이스 throw (MVP 미지원)', () => {
    const store = makeStore();
    expect(() =>
      runAnimationFrame({ onFrame: [{ set: 'vars.tmp', to: '0' }] }, store, makeRc(store)),
    ).toThrow(/state\.<id>/);
  });

  it('평가 결과가 비원시 → throw', () => {
    const store = makeStore([{ id: 'v', type: 'number', default: 0 }]);
    expect(() =>
      runAnimationFrame({ onFrame: [{ set: 'state.v', to: '[1,2,3]' }] }, store, makeRc(store)),
    ).toThrow(/primitive/);
  });

  it('sine-wave autoT 패턴 (mod 루프)', () => {
    const store = makeStore(
      [
        { id: 'autoT', type: 'number', default: 19.9 },
        { id: 'userDrivenT', type: 'bool', default: false },
      ],
      { t: 0 },
    );
    const spec: AnimationSpec = {
      onFrame: [
        {
          set: 'state.autoT',
          to: 'if(state.userDrivenT, state.autoT, mod(state.autoT + frame.dt, 20))',
        },
        { set: 'state.userDrivenT', to: 'false' },
      ],
    };
    runAnimationFrame(spec, store, makeRc(store, makeFrame({ dt: 0.2 })));
    // 19.9 + 0.2 = 20.1 → mod 20 = 0.1 (approx 부동소수점)
    expect(store.getState('autoT') as number).toBeCloseTo(0.1);
    expect(store.getState('userDrivenT')).toBe(false);
  });
});
