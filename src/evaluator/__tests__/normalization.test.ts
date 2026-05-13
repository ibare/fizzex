/**
 * E3 NaN/Infinity 정규화 + 콜드패스 detail 일관화
 *
 * 핫패스: 비유한값(NaN/±Infinity)이나 내부 throw 가 새지 않고 undefined 로 흡수
 * 콜드패스: detail.nodeType 가 발생 지점 노드로 채워지고,
 *           divergent 는 reason: 'non-finite-result' 또는 'internal-error' 로 식별 가능
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../../latex/latex-parser';
import { resetLatexIdCounter } from '../../utils/id-generator';
import { evaluateSync, evaluate } from '..';

beforeEach(() => {
  resetLatexIdCounter();
});

describe('E3 — 비유한값 정규화 (핫패스 흡수)', () => {
  it('0 ÷ 0 → undefined (NaN 누수 금지)', () => {
    const { ast } = parseLatex('0 \\div 0');
    expect(evaluateSync(ast)).toBeUndefined();
  });

  it('\\frac{0}{0} → undefined', () => {
    const { ast } = parseLatex('\\frac{0}{0}');
    expect(evaluateSync(ast)).toBeUndefined();
  });

  it('큰 곱 1.7e308 × 1.7e308 → undefined (Infinity 누수 금지)', () => {
    const { ast } = parseLatex('x \\cdot x');
    // 파서가 과학표기 리터럴을 모를 수 있어 변수 바인딩으로 우회
    expect(evaluateSync(ast, { x: 1.7e308 })).toBeUndefined();
  });

  it('\\exp(1000) → undefined (Infinity 누수 금지)', () => {
    const { ast } = parseLatex('\\exp(x)');
    expect(evaluateSync(ast, { x: 1000 })).toBeUndefined();
  });
});

describe('E3 — 콜드패스 detail.nodeType (도메인)', () => {
  it('\\ln(0) → domain, nodeType: func', () => {
    const { ast } = parseLatex('\\ln(0)');
    const r = evaluate(ast);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('domain');
      expect(r.detail?.nodeType).toBe('func');
    }
  });

  it('\\arcsin(2) → domain, nodeType: func', () => {
    const { ast } = parseLatex('\\arcsin(2)');
    const r = evaluate(ast);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('domain');
      expect(r.detail?.nodeType).toBe('func');
    }
  });

  it('\\sqrt{-1} → domain, nodeType: sqrt', () => {
    const { ast } = parseLatex('\\sqrt{-1}');
    const r = evaluate(ast);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('domain');
      expect(r.detail?.nodeType).toBe('sqrt');
    }
  });

  it('0^0 → domain, nodeType: power', () => {
    const { ast } = parseLatex('0^0');
    const r = evaluate(ast);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('domain');
      expect(r.detail?.nodeType).toBe('power');
    }
  });

  it('\\frac{1}{0} → domain, nodeType: frac', () => {
    const { ast } = parseLatex('\\frac{1}{0}');
    const r = evaluate(ast);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('domain');
      expect(r.detail?.nodeType).toBe('frac');
    }
  });

  it('1 \\div 0 → domain, nodeType: operator', () => {
    const { ast } = parseLatex('1 \\div 0');
    const r = evaluate(ast);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('domain');
      expect(r.detail?.nodeType).toBe('operator');
    }
  });
});

describe('E3 — 콜드패스 detail.reason (발산)', () => {
  it('\\exp(1000) → divergent, reason: non-finite-result', () => {
    const { ast } = parseLatex('\\exp(x)');
    const r = evaluate(ast, { x: 1000 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('divergent');
      expect(r.detail?.reason).toBe('non-finite-result');
    }
  });

  it('큰 수의 곱 → divergent, reason: non-finite-result', () => {
    const { ast } = parseLatex('x \\cdot x');
    const r = evaluate(ast, { x: 1.7e308 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('divergent');
      expect(r.detail?.reason).toBe('non-finite-result');
    }
  });
});

describe('E3 — throw 흡수 (재진입 안전)', () => {
  it('도메인 위반 케이스에서 evaluateSync 가 throw 하지 않는다', () => {
    const cases = ['\\ln(0)', '\\arcsin(2)', '\\sqrt{-1}', '0^0', '\\frac{1}{0}'];
    for (const src of cases) {
      const { ast } = parseLatex(src);
      expect(() => evaluateSync(ast)).not.toThrow();
    }
  });

  it('도메인 위반 케이스에서 evaluate 가 throw 하지 않는다', () => {
    const cases = ['\\ln(0)', '\\arcsin(2)', '\\sqrt{-1}', '0^0', '\\frac{1}{0}'];
    for (const src of cases) {
      const { ast } = parseLatex(src);
      expect(() => evaluate(ast)).not.toThrow();
    }
  });

  it('깊이 깊은 식에서도 throw 가 핫패스로 새지 않는다', () => {
    // 다단계 합성: 모든 단계가 도메인 경계를 횡단
    const { ast } = parseLatex('\\sin(\\ln(\\sqrt(x)))');
    expect(() => evaluateSync(ast, { x: -1 })).not.toThrow();
    expect(() => evaluate(ast, { x: -1 })).not.toThrow();
  });
});

describe('E3 — silent-drop 금지 (실패 분류 정확성)', () => {
  it('미연결 변수는 unbound 로 분류 (domain/divergent/unsupported 아님)', () => {
    const { ast } = parseLatex('x + 1');
    const r = evaluate(ast);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unbound');
      expect(r.detail?.variable).toBe('x');
    }
  });

  it('미등록 노드 타입은 unsupported (overline 등)', () => {
    const { ast } = parseLatex('\\overline{x}');
    const r = evaluate(ast);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('unsupported');
  });
});
