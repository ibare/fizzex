/**
 * E0 골격 — 핫패스/콜드패스/분석 API 기본 케이스
 *
 * 이 테스트는 E0 출하 시점의 평가기 표면 계약을 잠근다.
 * 후속 단계가 등록 노드를 늘려도, 본 테스트가 검증하는 신호 의미는 유지되어야 한다.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../../latex/latex-parser.js';
import { resetLatexIdCounter } from '../../utils/id-generator.js';
import {
  evaluateSync,
  evaluate,
  analyzeBindings,
  analyzeEvaluability,
} from '../index.js';

beforeEach(() => {
  resetLatexIdCounter();
});

describe('E0 — 핫패스 evaluateSync', () => {
  it('빈 식 → undefined', () => {
    const { ast } = parseLatex('');
    expect(evaluateSync(ast)).toBeUndefined();
  });

  it('단일 정수 NumberNode("7") → 7', () => {
    const { ast } = parseLatex('7');
    expect(evaluateSync(ast)).toBe(7);
  });

  it('단일 소수 NumberNode("3.14") → 3.14', () => {
    const { ast } = parseLatex('3.14');
    expect(evaluateSync(ast)).toBe(3.14);
  });

  it('다자리 정수 NumberNode("123") → 123', () => {
    const { ast } = parseLatex('123');
    expect(evaluateSync(ast)).toBe(123);
  });

  it('미연결 변수 → undefined', () => {
    const { ast } = parseLatex('x');
    expect(evaluateSync(ast)).toBeUndefined();
  });

  it('연결된 변수 → 바인딩 값', () => {
    const { ast } = parseLatex('x');
    expect(evaluateSync(ast, { x: 42 })).toBe(42);
  });

  it('throw 하지 않는다 — 미지원 노드도 undefined 로 흡수', () => {
    const { ast } = parseLatex('\\overline{1}');
    expect(() => evaluateSync(ast)).not.toThrow();
    expect(evaluateSync(ast)).toBeUndefined();
  });
});

describe('E0 — 콜드패스 evaluate', () => {
  it('단일 NumberNode → { ok: true, value }', () => {
    const { ast } = parseLatex('7');
    const r = evaluate(ast);
    expect(r).toEqual({ ok: true, value: 7 });
  });

  it('미연결 변수 → { ok: false, status: "unbound", detail.variable }', () => {
    const { ast } = parseLatex('x');
    const r = evaluate(ast);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unbound');
      expect(r.detail?.variable).toBe('x');
    }
  });

  it('registry 미등록 노드(overline) → { ok: false, status: "unsupported", detail.nodeType }', () => {
    const { ast } = parseLatex('\\overline{1}');
    const r = evaluate(ast);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unsupported');
      expect(r.detail?.nodeType).toBe('overline');
    }
  });

  it('빈 식 → { ok: false, status: "unsupported", detail.reason="empty" }', () => {
    const { ast } = parseLatex('');
    const r = evaluate(ast);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unsupported');
      expect(r.detail?.reason).toBe('empty');
    }
  });
});

describe('E0 — analyzeBindings', () => {
  it('"x + y" → required=[x,y], constants=[]', () => {
    const { ast } = parseLatex('x + y');
    const r = analyzeBindings(ast);
    expect(r.required).toEqual(['x', 'y']);
    expect(r.constants).toEqual([]);
  });

  it('"\\pi" 는 상수로 분류 (정규화 후 π)', () => {
    const { ast } = parseLatex('\\pi');
    const r = analyzeBindings(ast);
    expect(r.constants).toContain('π');
    expect(r.required).toEqual([]);
  });

  it('중복 변수는 dedupe 된다', () => {
    const { ast } = parseLatex('x + x');
    const r = analyzeBindings(ast);
    expect(r.required).toEqual(['x']);
  });

  it('상수와 자유변수 혼합 — "\\pi + x" → required=[x], constants=[π]', () => {
    const { ast } = parseLatex('\\pi + x');
    const r = analyzeBindings(ast);
    expect(r.required).toEqual(['x']);
    expect(r.constants).toEqual(['π']);
  });
});

describe('E0 — analyzeEvaluability', () => {
  it('단일 NumberNode 식 → evaluable=true', () => {
    const { ast } = parseLatex('7');
    const r = analyzeEvaluability(ast);
    expect(r.evaluable).toBe(true);
    expect(r.unsupported).toEqual([]);
  });

  it('단일 VariableNode 식 → evaluable=true (binding 미공급은 평가 시점 unbound)', () => {
    const { ast } = parseLatex('x');
    const r = analyzeEvaluability(ast);
    expect(r.evaluable).toBe(true);
  });

  it('overline 포함 식 → unsupported 에 "overline" 포함', () => {
    const { ast } = parseLatex('\\overline{1}');
    const r = analyzeEvaluability(ast);
    expect(r.evaluable).toBe(false);
    expect(r.unsupported).toContain('overline');
  });
});

describe('E0 — 결정성 / 순수성', () => {
  it('같은 입력에 대해 항상 같은 결과', () => {
    const { ast } = parseLatex('x');
    const a = evaluateSync(ast, { x: 7 });
    const b = evaluateSync(ast, { x: 7 });
    expect(a).toBe(b);
  });

  it('bindings 객체는 변형되지 않는다 (입력 보존)', () => {
    const { ast } = parseLatex('x');
    const b = { x: 1 };
    const snapshot = { ...b };
    evaluateSync(ast, b);
    expect(b).toEqual(snapshot);
  });
});
