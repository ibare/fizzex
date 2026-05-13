/**
 * E7 유한 합/곱 — 인덱스 변수 반복 바인딩
 *
 * 본 단계는 정수 경계의 닫힌 합·곱만 지원한다. 위반(비정수·역순·항수 초과)은
 * 도메인/미지원 으로 정직하게 분류한다.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../../latex/latex-parser';
import { resetLatexIdCounter } from '../../utils/id-generator';
import { evaluateSync, evaluate } from '..';

beforeEach(() => {
  resetLatexIdCounter();
});

function ev(src: string, bindings: Record<string, number> = {}): number | undefined {
  const { ast } = parseLatex(src);
  return evaluateSync(ast, bindings);
}

function evCold(src: string, bindings: Record<string, number> = {}): ReturnType<typeof evaluate> {
  const { ast } = parseLatex(src);
  return evaluate(ast, bindings);
}

describe('E7 — 합 기본', () => {
  it('\\sum_{i=1}^{10} i = 55', () => {
    expect(ev('\\sum_{i=1}^{10} i')).toBe(55);
  });

  it('\\sum_{k=1}^{5} {k^2} = 55', () => {
    expect(ev('\\sum_{k=1}^{5} {k^2}')).toBe(55);
  });

  it('\\sum_{i=0}^{3} 2 = 8 (상수 항 4회)', () => {
    expect(ev('\\sum_{i=0}^{3} 2')).toBe(8);
  });

  it('시작=종료 → 단일 항: \\sum_{i=7}^{7} i = 7', () => {
    expect(ev('\\sum_{i=7}^{7} i')).toBe(7);
  });

  it('음수 경계 허용: \\sum_{i=-2}^{2} i = 0', () => {
    expect(ev('\\sum_{i=-2}^{2} i')).toBe(0);
  });
});

describe('E7 — 곱 기본', () => {
  it('\\prod_{k=1}^{5} k = 120', () => {
    expect(ev('\\prod_{k=1}^{5} k')).toBe(120);
  });

  it('\\prod_{i=1}^{4} 2 = 16 (상수 곱)', () => {
    expect(ev('\\prod_{i=1}^{4} 2')).toBe(16);
  });

  it('시작=종료 → 단일 인자: \\prod_{i=9}^{9} i = 9', () => {
    expect(ev('\\prod_{i=9}^{9} i')).toBe(9);
  });

  it('인자 중 0 포함 → 결과 0: \\prod_{i=0}^{3} i = 0', () => {
    expect(ev('\\prod_{i=0}^{3} i')).toBe(0);
  });
});

describe('E7 — 인덱스 변수 바인딩 / 외부 변수 합성', () => {
  it('외부 변수 + 인덱스: \\sum_{i=1}^{3} {a + i} with a=10 = 36', () => {
    expect(ev('\\sum_{i=1}^{3} {a + i}', { a: 10 })).toBe(36);
  });

  it('외부 변수가 경계: \\sum_{i=1}^{n} i with n=4 = 10', () => {
    expect(ev('\\sum_{i=1}^{n} i', { n: 4 })).toBe(10);
  });

  it('중첩 합: \\sum_{i=1}^{2} {\\sum_{j=1}^{2} {i+j}} = 12', () => {
    expect(ev('\\sum_{i=1}^{2} {\\sum_{j=1}^{2} {i+j}}')).toBe(12);
  });
});

describe('E7 — 도메인 / 미지원', () => {
  it('역순 경계: \\sum_{i=5}^{1} i → domain (empty-range)', () => {
    const r = evCold('\\sum_{i=5}^{1} i');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('domain');
      expect(r.detail?.nodeType).toBe('sum');
      expect(r.detail?.reason).toBe('empty-range');
    }
  });

  it('비정수 경계: \\sum_{i=1}^{n} i with n=3.5 → domain (non-integer-bound)', () => {
    const r = evCold('\\sum_{i=1}^{n} i', { n: 3.5 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('domain');
      expect(r.detail?.nodeType).toBe('sum');
      expect(r.detail?.reason).toBe('non-integer-bound');
    }
  });

  it('항수 초과: \\sum_{i=1}^{n} i with n=2e6 → unsupported (term-count-exceeds-limit)', () => {
    const r = evCold('\\sum_{i=1}^{n} i', { n: 2_000_000 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unsupported');
      expect(r.detail?.nodeType).toBe('sum');
      expect(r.detail?.reason).toBe('term-count-exceeds-limit');
    }
  });

  it('곱도 동일하게 분류: \\prod_{i=5}^{1} i → domain (empty-range, nodeType=product)', () => {
    const r = evCold('\\prod_{i=5}^{1} i');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('domain');
      expect(r.detail?.nodeType).toBe('product');
      expect(r.detail?.reason).toBe('empty-range');
    }
  });
});

describe('E7 — 미연결 변수 전파', () => {
  it('경계의 외부 변수가 미연결: \\sum_{i=1}^{n} i → unbound (변수 n)', () => {
    const r = evCold('\\sum_{i=1}^{n} i');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unbound');
      expect(r.detail?.variable).toBe('n');
    }
  });

  it('피합 항의 외부 변수가 미연결: \\sum_{i=1}^{3} {a + i} → unbound (변수 a)', () => {
    const r = evCold('\\sum_{i=1}^{3} {a + i}');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unbound');
      expect(r.detail?.variable).toBe('a');
    }
  });

  it('피곱 항의 외부 변수가 미연결: \\prod_{k=1}^{3} {b \\cdot k} → unbound (변수 b)', () => {
    const r = evCold('\\prod_{k=1}^{3} {b \\cdot k}');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unbound');
      expect(r.detail?.variable).toBe('b');
    }
  });

  it('미연결 변수를 가진 합 → 핫패스에서 undefined', () => {
    expect(ev('\\sum_{i=1}^{n} i')).toBeUndefined();
    expect(ev('\\prod_{i=1}^{3} {b \\cdot i}')).toBeUndefined();
  });
});

describe('E7 — 본문 평가 실패 전파', () => {
  it('본문에서 도메인 실패: \\sum_{i=0}^{2} \\frac{1}{i} → fail (도메인)', () => {
    const r = evCold('\\sum_{i=0}^{2} \\frac{1}{i}');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('domain');
    }
  });

  it('본문에서 비유한값: \\sum_{i=1}^{2} {x \\cdot x} with x=1.7e308 → divergent', () => {
    const r = evCold('\\sum_{i=1}^{2} {x \\cdot x}', { x: 1.7e308 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('divergent');
    }
  });
});

describe('E7 — 합성', () => {
  it('합 결과를 산수에 활용: 2 \\cdot \\sum_{i=1}^{4} i = 20', () => {
    expect(ev('2 \\cdot \\sum_{i=1}^{4} i')).toBe(20);
  });

  it('적분과 합 혼합: \\sum_{i=1}^{3} \\int_0^1 i \\, dx = 6', () => {
    const r = ev('\\sum_{i=1}^{3} \\int_0^1 i \\, dx');
    expect(r).toBeCloseTo(6, 6);
  });
});

describe('E7 — throw 금지', () => {
  it('모든 비정상 합/곱 평가에서 throw 없음', () => {
    const cases = [
      '\\sum_{i=5}^{1} i',
      '\\sum_{i=1}^{n} i',
      '\\sum_{i=0}^{2} \\frac{1}{i}',
      '\\prod_{i=5}^{1} i',
      '\\prod_{k=1}^{3} {b \\cdot k}',
    ];
    for (const src of cases) {
      expect(() => ev(src)).not.toThrow();
      expect(() => evCold(src)).not.toThrow();
    }
  });
});
