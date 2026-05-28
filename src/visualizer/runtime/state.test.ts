import { describe, it, expect } from 'vitest';
import { createStateStore } from './state.js';
import type { StateDecl } from './types/state.js';

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
    expect(a.bindings).not.toBe(b.bindings);
    expect(a).toEqual({ params: { A: 1 }, state: { v: 10 }, bindings: {} });
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

  it('setBinding/getBinding 기본 동작 (V3 — unknown 슬롯)', () => {
    const s = createStateStore();
    expect(s.getBinding('z')).toBeUndefined();
    s.setBinding('z', { re: 1, im: -2 });
    expect(s.getBinding('z')).toEqual({ re: 1, im: -2 });
    s.setBinding('M', { rows: 2, cols: 2, data: [[1, 2], [3, 4]] });
    const snap = s.snapshot();
    expect(snap.bindings.M).toEqual({ rows: 2, cols: 2, data: [[1, 2], [3, 4]] });
    expect(snap.bindings.z).toEqual({ re: 1, im: -2 });
  });

  it('setBinding은 params/state 와 독립 — 키 충돌해도 별도 슬롯', () => {
    const s = createStateStore({ initialParams: { omega: 4.5 } });
    s.setBinding('omega', { re: 0, im: 1 });
    expect(s.getParam('omega')).toBe(4.5);
    expect(s.getBinding('omega')).toEqual({ re: 0, im: 1 });
  });

  it('clearBinding 으로 명시적 해제', () => {
    const s = createStateStore();
    s.setBinding('M', { rows: 1, cols: 1, data: [[7]] });
    expect(s.getBinding('M')).toBeDefined();
    s.clearBinding('M');
    expect(s.getBinding('M')).toBeUndefined();
    expect(s.snapshot().bindings).toEqual({});
  });

  it('setBinding 은 subscribeParams listener 를 호출하지 않는다', () => {
    const s = createStateStore({ initialParams: { A: 1 } });
    let calls = 0;
    s.subscribeParams(() => calls++);
    s.setBinding('z', { re: 1, im: 0 });
    expect(calls).toBe(0);
  });

  it('snapshot.bindings 변형은 원본에 영향 없음', () => {
    const s = createStateStore();
    s.setBinding('z', { re: 1, im: 2 });
    const snap = s.snapshot();
    delete (snap.bindings as Record<string, unknown>).z;
    expect(s.getBinding('z')).toEqual({ re: 1, im: 2 });
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
