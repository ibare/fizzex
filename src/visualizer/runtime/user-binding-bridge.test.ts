import { describe, it, expect } from 'vitest';
import { applyUserBindings, type UserBindingInput } from './user-binding-bridge';
import { createStateStore } from './state';
import { parseLatex } from '../../latex';
import type { MathNode, NumberNode } from '../../types';
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

function numberAst(value: string): NumberNode {
  return { id: `test:${value}`, type: 'number', value };
}

function latexAst(latex: string): MathNode {
  const { ast, hasErrors } = parseLatex(latex);
  if (hasErrors) throw new Error(`test fixture parse failed: ${latex}`);
  return ast;
}

describe('applyUserBindings — scalar (V3)', () => {
  it('inputs 없으면 applied/skipped 모두 빈 배열', () => {
    const spec = makeSpec({});
    const store = createStateStore({ initialParams: { a: 1 } });
    const r = applyUserBindings(spec, {}, store);
    expect(r.applied).toEqual([]);
    expect(r.skipped).toEqual([]);
  });

  it('number 입력 → 내부에서 NumberNode wrap → setParam', () => {
    const spec = makeSpec({
      userBindings: [
        { name: 'a', outputKind: 'scalar', required: true },
        { name: 'b', outputKind: 'scalar', required: true },
      ],
    });
    const store = createStateStore({ initialParams: { a: 1, b: 2 } });
    const r = applyUserBindings(spec, { a: 3, b: 4 }, store);
    expect(r.applied).toEqual([
      { name: 'a', outputKind: 'scalar', value: 3 },
      { name: 'b', outputKind: 'scalar', value: 4 },
    ]);
    expect(r.skipped).toEqual([]);
    expect(store.getParam('a')).toBe(3);
    expect(store.getParam('b')).toBe(4);
  });

  it('NumberNode AST 입력도 동일하게 처리', () => {
    const spec = makeSpec({
      userBindings: [{ name: 'a', outputKind: 'scalar', required: true }],
    });
    const store = createStateStore({ initialParams: { a: 1 } });
    const r = applyUserBindings(spec, { a: numberAst('7') as UserBindingInput }, store);
    expect(r.applied).toEqual([{ name: 'a', outputKind: 'scalar', value: 7 }]);
    expect(store.getParam('a')).toBe(7);
  });

  it('LaTeX 식 AST 입력 (산술 평가 — root 노드 처리)', () => {
    const spec = makeSpec({
      userBindings: [{ name: 'A', outputKind: 'scalar', required: true }],
    });
    const store = createStateStore({ initialParams: { A: 0 } });
    const r = applyUserBindings(spec, { A: latexAst('2 + 3') }, store);
    expect(r.applied).toEqual([{ name: 'A', outputKind: 'scalar', value: 5 }]);
    expect(store.getParam('A')).toBe(5);
  });

  it('inputs 누락 → unbound 로 skip, store 값 유지', () => {
    const spec = makeSpec({
      userBindings: [{ name: 'a', outputKind: 'scalar', required: true }],
    });
    const store = createStateStore({ initialParams: { a: 9 } });
    const r = applyUserBindings(spec, {}, store);
    expect(r.applied).toEqual([]);
    expect(r.skipped).toEqual([
      { name: 'a', outputKind: 'scalar', reason: 'unbound', required: true, detail: 'a' },
    ]);
    expect(store.getParam('a')).toBe(9);
  });

  it('required:false 도 unbound 시 silent skip 기록', () => {
    const spec = makeSpec({
      userBindings: [{ name: 'a', outputKind: 'scalar', required: false }],
    });
    const store = createStateStore({ initialParams: { a: 9 } });
    const r = applyUserBindings(spec, {}, store);
    expect(r.skipped[0]).toMatchObject({
      name: 'a',
      outputKind: 'scalar',
      reason: 'unbound',
      required: false,
    });
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

describe('applyUserBindings — matrix (V3)', () => {
  it('LaTeX 행렬 식 AST → store.setBinding 으로 Matrix 주입', () => {
    const spec = makeSpec({
      userBindings: [{ name: 'M', outputKind: 'matrix', required: true }],
    });
    const store = createStateStore();
    const matrixAst = latexAst('\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}');
    const r = applyUserBindings(spec, { M: matrixAst }, store);
    expect(r.skipped).toEqual([]);
    expect(r.applied).toHaveLength(1);
    expect(r.applied[0].outputKind).toBe('matrix');
    const M = store.getBinding('M');
    expect(M).toEqual({ rows: 2, cols: 2, data: [[1, 2], [3, 4]] });
    expect(store.snapshot().bindings.M).toEqual(M);
  });

  it('matrix outputKind 에 number 입력 → 스칼라(1x1 의미) 로 ok', () => {
    const spec = makeSpec({
      userBindings: [{ name: 's', outputKind: 'matrix', required: true }],
    });
    const store = createStateStore();
    const r = applyUserBindings(spec, { s: 3.5 }, store);
    expect(r.applied).toEqual([{ name: 's', outputKind: 'matrix', value: 3.5 }]);
    expect(store.getBinding('s')).toBe(3.5);
  });

  it('matrix 입력 누락 → clearBinding + skipped', () => {
    const spec = makeSpec({
      userBindings: [{ name: 'M', outputKind: 'matrix', required: true }],
    });
    const store = createStateStore();
    store.setBinding('M', { rows: 1, cols: 1, data: [[99]] });
    const r = applyUserBindings(spec, {}, store);
    expect(r.applied).toEqual([]);
    expect(r.skipped[0]).toMatchObject({
      name: 'M',
      outputKind: 'matrix',
      reason: 'unbound',
      required: true,
    });
    expect(store.getBinding('M')).toBeUndefined();
  });

  it('matrix 슬롯은 params 채널과 독립', () => {
    const spec = makeSpec({
      userBindings: [{ name: 'M', outputKind: 'matrix', required: true }],
    });
    const store = createStateStore({ initialParams: { M: 0 } });
    applyUserBindings(spec, { M: latexAst('\\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix}') }, store);
    expect(store.getParam('M')).toBe(0);
    expect(store.getBinding('M')).toEqual({ rows: 2, cols: 2, data: [[1, 0], [0, 1]] });
  });
});

describe('applyUserBindings — complex (V3)', () => {
  it('complex outputKind 에 number 입력 → {re, im:0} 으로 lift', () => {
    const spec = makeSpec({
      userBindings: [{ name: 'z', outputKind: 'complex', required: true }],
    });
    const store = createStateStore();
    const r = applyUserBindings(spec, { z: 3 }, store);
    expect(r.applied).toEqual([
      { name: 'z', outputKind: 'complex', value: { re: 3, im: 0 } },
    ]);
    expect(store.getBinding('z')).toEqual({ re: 3, im: 0 });
  });

  it('LaTeX 식 AST 로 복소수 평가 (i 단위, 오일러 형태)', () => {
    const spec = makeSpec({
      userBindings: [{ name: 'z', outputKind: 'complex', required: true }],
    });
    const store = createStateStore();
    // z = 2 + 3i 형식의 LaTeX
    const r = applyUserBindings(spec, { z: latexAst('2 + 3 i') }, store);
    expect(r.applied).toHaveLength(1);
    const z = store.getBinding('z') as { re: number; im: number };
    expect(z.re).toBeCloseTo(2, 6);
    expect(z.im).toBeCloseTo(3, 6);
  });

  it('complex 입력 누락 → clearBinding + skipped', () => {
    const spec = makeSpec({
      userBindings: [{ name: 'z', outputKind: 'complex', required: false }],
    });
    const store = createStateStore();
    store.setBinding('z', { re: 1, im: 1 });
    const r = applyUserBindings(spec, {}, store);
    expect(r.applied).toEqual([]);
    expect(r.skipped[0]).toMatchObject({
      name: 'z',
      outputKind: 'complex',
      reason: 'unbound',
      required: false,
    });
    expect(store.getBinding('z')).toBeUndefined();
  });
});

describe('applyUserBindings — 혼합 dispatch (V3)', () => {
  it('scalar + matrix + complex 동시 처리, 각자 다른 채널', () => {
    const spec = makeSpec({
      userBindings: [
        { name: 'a', outputKind: 'scalar', required: true },
        { name: 'M', outputKind: 'matrix', required: true },
        { name: 'z', outputKind: 'complex', required: true },
      ],
    });
    const store = createStateStore({ initialParams: { a: 0 } });
    const r = applyUserBindings(
      spec,
      {
        a: 7,
        M: latexAst('\\begin{pmatrix} 2 & 0 \\\\ 0 & 2 \\end{pmatrix}'),
        z: 5,
      },
      store,
    );
    expect(r.applied).toHaveLength(3);
    expect(r.skipped).toEqual([]);
    expect(store.getParam('a')).toBe(7);
    expect(store.getBinding('M')).toEqual({ rows: 2, cols: 2, data: [[2, 0], [0, 2]] });
    expect(store.getBinding('z')).toEqual({ re: 5, im: 0 });
  });

  it('일부 입력만 줘도 나머지는 unbound 로 skip — 다른 채널 영향 없음', () => {
    const spec = makeSpec({
      userBindings: [
        { name: 'a', outputKind: 'scalar', required: true },
        { name: 'M', outputKind: 'matrix', required: true },
      ],
    });
    const store = createStateStore({ initialParams: { a: 1 } });
    const r = applyUserBindings(spec, { a: 9 }, store);
    expect(r.applied).toEqual([{ name: 'a', outputKind: 'scalar', value: 9 }]);
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0]).toMatchObject({ name: 'M', outputKind: 'matrix', reason: 'unbound' });
    expect(store.getParam('a')).toBe(9);
    expect(store.getBinding('M')).toBeUndefined();
  });
});

describe('applyUserBindings — derivatives (V4)', () => {
  it('도함수 평가 후 store.bindings 에 주입', () => {
    const spec = makeSpec({
      userBindings: [{ name: 'f', outputKind: 'scalar', required: true }],
      derivatives: [{ source: 'f', variable: 'x', order: 1, binding: 'fPrime' }],
      scenes: [
        {
          id: 'default',
          name: { en: 'Default' },
          params: { f: 0, x: 3 },
        },
      ],
    });
    const store = createStateStore({ initialParams: { f: 0, x: 3 } });
    const r = applyUserBindings(spec, { f: latexAst('x^{2}') }, store);
    expect(r.derivatives).toEqual([
      { source: 'f', variable: 'x', binding: 'fPrime', value: 6 },
    ]);
    expect(r.skippedDerivatives).toEqual([]);
    expect(store.getBinding('fPrime')).toBe(6);
  });

  it('source 입력 누락 → unbound 로 skip + 이전 binding 제거', () => {
    const spec = makeSpec({
      userBindings: [{ name: 'f', outputKind: 'scalar', required: true }],
      derivatives: [{ source: 'f', variable: 'x', order: 1, binding: 'fPrime' }],
      scenes: [
        {
          id: 'default',
          name: { en: 'Default' },
          params: { f: 0, x: 1 },
        },
      ],
    });
    const store = createStateStore({ initialParams: { f: 0, x: 1 } });
    store.setBinding('fPrime', 999);
    const r = applyUserBindings(spec, {}, store);
    expect(r.derivatives).toEqual([]);
    expect(r.skippedDerivatives).toEqual([
      { source: 'f', variable: 'x', binding: 'fPrime', reason: 'unbound' },
    ]);
    expect(store.getBinding('fPrime')).toBeUndefined();
  });

  it('source 평가 실패 → source-skipped', () => {
    const spec = makeSpec({
      userBindings: [{ name: 'f', outputKind: 'scalar', required: true }],
      derivatives: [{ source: 'f', variable: 'x', order: 1, binding: 'fPrime' }],
      scenes: [
        {
          id: 'default',
          name: { en: 'Default' },
          params: { f: 0, x: 1 },
        },
      ],
    });
    const store = createStateStore({ initialParams: { f: 0, x: 1 } });
    const r = applyUserBindings(spec, { f: latexAst('1 / 0') }, store);
    expect(r.applied).toEqual([]);
    expect(r.skipped).toHaveLength(1);
    expect(r.derivatives).toEqual([]);
    expect(r.skippedDerivatives).toEqual([
      { source: 'f', variable: 'x', binding: 'fPrime', reason: 'source-skipped' },
    ]);
    expect(store.getBinding('fPrime')).toBeUndefined();
  });

  it('미분 자체가 정의 불가 → eval-failed', () => {
    const spec = makeSpec({
      userBindings: [{ name: 'f', outputKind: 'scalar', required: true }],
      derivatives: [{ source: 'f', variable: 'x', order: 1, binding: 'fPrime' }],
      scenes: [
        {
          id: 'default',
          name: { en: 'Default' },
          params: { f: 0, x: 0 },
        },
      ],
    });
    const store = createStateStore({ initialParams: { f: 0, x: 0 } });
    const r = applyUserBindings(spec, { f: latexAst('|x|') }, store);
    expect(r.applied).toHaveLength(1);
    expect(r.derivatives).toEqual([]);
    expect(r.skippedDerivatives).toEqual([
      { source: 'f', variable: 'x', binding: 'fPrime', reason: 'eval-failed' },
    ]);
    expect(store.getBinding('fPrime')).toBeUndefined();
  });

  it('다중 derivatives — 서로 다른 변수로 미분', () => {
    const spec = makeSpec({
      userBindings: [{ name: 'f', outputKind: 'scalar', required: true }],
      derivatives: [
        { source: 'f', variable: 'x', order: 1, binding: 'dfdx' },
        { source: 'f', variable: 'y', order: 1, binding: 'dfdy' },
      ],
      scenes: [
        {
          id: 'default',
          name: { en: 'Default' },
          params: { f: 0, x: 3, y: 5 },
        },
      ],
    });
    const store = createStateStore({ initialParams: { f: 0, x: 3, y: 5 } });
    const r = applyUserBindings(spec, { f: latexAst('x^{2} + y^{3}') }, store);
    expect(r.derivatives).toEqual([
      { source: 'f', variable: 'x', binding: 'dfdx', value: 6 },
      { source: 'f', variable: 'y', binding: 'dfdy', value: 75 },
    ]);
    expect(store.getBinding('dfdx')).toBe(6);
    expect(store.getBinding('dfdy')).toBe(75);
  });
});
