/**
 * E2 표준 함수 평가자 — 핫패스/콜드패스 양쪽 계약 검증.
 *
 * 라디안 고정. 상수(π, e) 는 호스트가 bindings 로 공급한다 (호스트 합의).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../../latex/latex-parser';
import { resetLatexIdCounter } from '../../utils/id-generator';
import { evaluateSync, evaluate } from '..';

beforeEach(() => {
  resetLatexIdCounter();
});

const PI = Math.PI;
const E = Math.E;

function ev(src: string, bindings: Record<string, number> = {}): number | undefined {
  const { ast } = parseLatex(src);
  return evaluateSync(ast, bindings);
}

function evCold(src: string, bindings: Record<string, number> = {}): ReturnType<typeof evaluate> {
  const { ast } = parseLatex(src);
  return evaluate(ast, bindings);
}

describe('E2 — 삼각함수 (라디안)', () => {
  it('\\sin(0) → 0', () => expect(ev('\\sin(0)')).toBeCloseTo(0, 10));
  it('\\cos(0) → 1', () => expect(ev('\\cos(0)')).toBeCloseTo(1, 10));
  it('\\tan(0) → 0', () => expect(ev('\\tan(0)')).toBeCloseTo(0, 10));
  it('\\sin(π/2) → 1 (π 는 호스트 공급)', () => {
    expect(ev('\\sin(\\pi \\div 2)', { π: PI })).toBeCloseTo(1, 10);
  });
  it('\\cos(π) → -1', () => {
    expect(ev('\\cos(\\pi)', { π: PI })).toBeCloseTo(-1, 10);
  });
});

describe('E2 — 역삼각', () => {
  it('\\arcsin(1) → π/2', () => {
    expect(ev('\\arcsin(1)')).toBeCloseTo(PI / 2, 10);
  });
  it('\\arccos(0) → π/2', () => {
    expect(ev('\\arccos(0)')).toBeCloseTo(PI / 2, 10);
  });
  it('\\arctan(1) → π/4', () => {
    expect(ev('\\arctan(1)')).toBeCloseTo(PI / 4, 10);
  });
  it('\\arcsin(2) → domain', () => {
    const r = evCold('\\arcsin(2)');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('domain');
  });
  it('\\arccos(-2) → domain', () => {
    const r = evCold('\\arccos(-2)');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('domain');
  });
});

describe('E2 — 쌍곡', () => {
  it('\\sinh(0) → 0', () => expect(ev('\\sinh(0)')).toBeCloseTo(0, 10));
  it('\\cosh(0) → 1', () => expect(ev('\\cosh(0)')).toBeCloseTo(1, 10));
  it('\\tanh(0) → 0', () => expect(ev('\\tanh(0)')).toBeCloseTo(0, 10));
});

describe('E2 — 지수/로그', () => {
  it('\\exp(0) → 1', () => expect(ev('\\exp(0)')).toBeCloseTo(1, 10));
  it('\\exp(1) → e', () => expect(ev('\\exp(1)')).toBeCloseTo(E, 10));
  it('\\ln(1) → 0', () => expect(ev('\\ln(1)')).toBeCloseTo(0, 10));
  it('\\ln(e) → 1 (e 는 호스트 공급)', () => {
    expect(ev('\\ln(e)', { e: E })).toBeCloseTo(1, 10);
  });
  it('\\log(10) → 1 (10진)', () => expect(ev('\\log(10)')).toBeCloseTo(1, 10));
  it('\\log(100) → 2', () => expect(ev('\\log(100)')).toBeCloseTo(2, 10));
  it('\\ln(0) → domain', () => {
    const r = evCold('\\ln(0)');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('domain');
  });
  it('\\ln(-1) → domain', () => {
    const r = evCold('\\ln(-1)');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('domain');
  });
  it('\\log(0) → domain', () => {
    const r = evCold('\\log(0)');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('domain');
  });
});

describe('E2 — 인자가 표현식인 경우', () => {
  it('\\sin(x + y) (x=0, y=π/2) → 1', () => {
    expect(ev('\\sin(x + y)', { x: 0, y: PI / 2 })).toBeCloseTo(1, 10);
  });
  it('\\ln(x^2) (x=e) → 2', () => {
    expect(ev('\\ln(x^2)', { x: E })).toBeCloseTo(2, 10);
  });
});

describe('E2 — 함수 합성', () => {
  it('\\sin(\\cos(0)) → sin(1)', () => {
    expect(ev('\\sin(\\cos(0))')).toBeCloseTo(Math.sin(1), 10);
  });
  it('\\exp(\\ln(5)) → 5', () => {
    expect(ev('\\exp(\\ln(5))')).toBeCloseTo(5, 10);
  });
});

describe('E2 — 변수 미연결 전파', () => {
  it('미연결 변수 인자 → undefined (hot)', () => {
    expect(ev('\\sin(x)')).toBeUndefined();
  });
  it('미연결 변수 인자 → unbound (cold)', () => {
    const r = evCold('\\sin(x)');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unbound');
      expect(r.detail?.variable).toBe('x');
    }
  });
});

describe('E2 — throw 금지', () => {
  it('도메인 위배에서도 throw 하지 않는다', () => {
    expect(() => ev('\\ln(-1)')).not.toThrow();
    expect(() => ev('\\arcsin(2)')).not.toThrow();
    expect(() => ev('\\sqrt{-1}')).not.toThrow();
  });
});
