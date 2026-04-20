import { describe, it, expect } from 'vitest';
import { createStateStore } from './state';
import type { StateDecl } from './types/state';

describe('createStateStore', () => {
  it('initialParams 반영', () => {
    const s = createStateStore({ initialParams: { A: 1, omega: 4.5 } });
    expect(s.getParam('A')).toBe(1);
    expect(s.getParam('omega')).toBe(4.5);
  });

  it('미선언 param 접근 throw', () => {
    const s = createStateStore();
    expect(() => s.getParam('xxx')).toThrow();
  });

  it('StateDecl default 반영', () => {
    const decls: StateDecl[] = [
      { id: 'autoT', type: 'number', default: 0 },
      { id: 'userDrivenT', type: 'bool', default: false },
    ];
    const s = createStateStore({ stateDecls: decls });
    expect(s.getState('autoT')).toBe(0);
    expect(s.getState('userDrivenT')).toBe(false);
  });

  it('setParam + onParamChange → pulse', () => {
    const decls: StateDecl[] = [
      { id: 'userDrivenT', type: 'bool', default: false, onParamChange: 't' },
    ];
    const s = createStateStore({ stateDecls: decls, initialParams: { t: 0 } });
    expect(s.hasPulse('userDrivenT')).toBe(false);
    s.setParam('t', 5);
    expect(s.hasPulse('userDrivenT')).toBe(true);
  });

  it('consumePulses 초기화', () => {
    const decls: StateDecl[] = [
      { id: 'userDrivenT', type: 'bool', default: false, onParamChange: 't' },
    ];
    const s = createStateStore({ stateDecls: decls, initialParams: { t: 0 } });
    s.setParam('t', 1);
    s.consumePulses();
    expect(s.hasPulse('userDrivenT')).toBe(false);
  });

  it('setState 후 getState 반영', () => {
    const decls: StateDecl[] = [{ id: 'v', type: 'number', default: 0 }];
    const s = createStateStore({ stateDecls: decls });
    s.setState('v', 42);
    expect(s.getState('v')).toBe(42);
  });

  it('snapshot은 매번 새 객체 (§4 불변)', () => {
    const decls: StateDecl[] = [{ id: 'v', type: 'number', default: 10 }];
    const s = createStateStore({ stateDecls: decls, initialParams: { A: 1 } });
    const a = s.snapshot();
    const b = s.snapshot();
    expect(a).not.toBe(b);
    expect(a.params).not.toBe(b.params);
    expect(a.state).not.toBe(b.state);
    expect(a).toEqual({ params: { A: 1 }, state: { v: 10 } });
  });

  it('snapshot 결과 mutate해도 원본 불변', () => {
    const s = createStateStore({ initialParams: { A: 1 } });
    const snap = s.snapshot();
    snap.params.A = 999;
    expect(s.getParam('A')).toBe(1);
  });

  it('subscribeParams → setParam 시 listener 호출, source 전달', () => {
    const s = createStateStore({ initialParams: { A: 1 } });
    const events: Array<{ A: number; src: string }> = [];
    s.subscribeParams((p, src) => events.push({ A: p.A, src }));
    s.setParam('A', 2);
    s.setParam('A', 3, 'interaction');
    s.setParam('A', 4, 'scene');
    expect(events).toEqual([
      { A: 2, src: 'external' },
      { A: 3, src: 'interaction' },
      { A: 4, src: 'scene' },
    ]);
  });

  it('subscribeParams 반환값으로 unsubscribe', () => {
    const s = createStateStore({ initialParams: { A: 0 } });
    let count = 0;
    const off = s.subscribeParams(() => count++);
    s.setParam('A', 1);
    off();
    s.setParam('A', 2);
    expect(count).toBe(1);
  });

  it('subscribeParams listener에 전달되는 params는 snapshot copy', () => {
    const s = createStateStore({ initialParams: { A: 0 } });
    let captured: Record<string, number> | null = null;
    s.subscribeParams((p) => {
      captured = p;
    });
    s.setParam('A', 5);
    expect(captured).toEqual({ A: 5 });
    captured!.A = 999;
    expect(s.getParam('A')).toBe(5);
  });

  it('여러 파라미터 독립 pulse', () => {
    const decls: StateDecl[] = [
      { id: 'pulseA', type: 'bool', default: false, onParamChange: 'A' },
      { id: 'pulseB', type: 'bool', default: false, onParamChange: 'B' },
    ];
    const s = createStateStore({
      stateDecls: decls,
      initialParams: { A: 0, B: 0 },
    });
    s.setParam('A', 1);
    expect(s.hasPulse('pulseA')).toBe(true);
    expect(s.hasPulse('pulseB')).toBe(false);
  });
});
