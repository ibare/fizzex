/**
 * E6 정적분 수치 평가 — adaptive Simpson 1/3
 *
 * 본 단계는 1차원 정적분만 지원. 부정적분·다중적분은 unsupported.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../../latex/latex-parser.js';
import { resetLatexIdCounter } from '../../utils/id-generator.js';
import { evaluateSync, evaluate } from '../index.js';

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

describe('E6 — 정적분 기본', () => {
  it('\\int_0^1 x^2 \\, dx ≈ 1/3', () => {
    const r = ev('\\int_0^1 x^2 \\, dx');
    expect(r).toBeCloseTo(1 / 3, 6);
  });

  it('\\int_{-1}^1 x \\, dx = 0 (홀함수)', () => {
    const r = ev('\\int_{-1}^1 x \\, dx');
    expect(r).toBeCloseTo(0, 9);
  });

  it('\\int_0^1 1 \\, dx = 1 (상수 함수)', () => {
    const r = ev('\\int_0^1 1 \\, dx');
    expect(r).toBeCloseTo(1, 9);
  });

  it('\\int_0^1 (-x^2) \\, dx ≈ -1/3 (음수 영역)', () => {
    const r = ev('\\int_0^1 (-x^2) \\, dx');
    expect(r).toBeCloseTo(-1 / 3, 6);
  });
});

describe('E6 — 표준 함수 정적분', () => {
  it('\\int_0^\\pi \\sin(x) \\, dx = 2', () => {
    const r = ev('\\int_0^\\pi \\sin(x) \\, dx', { π: PI });
    expect(r).toBeCloseTo(2, 6);
  });

  it('\\int_0^1 e^x \\, dx = e - 1', () => {
    const r = ev('\\int_0^1 e^x \\, dx', { e: E });
    expect(r).toBeCloseTo(E - 1, 6);
  });

  it('\\int_1^e (1/x) \\, dx = 1', () => {
    const r = ev('\\int_1^e \\frac{1}{x} \\, dx', { e: E });
    expect(r).toBeCloseTo(1, 6);
  });
});

describe('E6 — 경계 뒤집힘 / 동일 경계', () => {
  it('동일 경계 → 0', () => {
    const r = ev('\\int_3^3 x^2 \\, dx');
    expect(r).toBeCloseTo(0, 12);
  });

  it('상한이 하한보다 작을 때 부호 뒤집힘: \\int_1^0 x^2 \\, dx = -1/3', () => {
    const r = ev('\\int_1^0 x^2 \\, dx');
    expect(r).toBeCloseTo(-1 / 3, 6);
  });
});

describe('E6 — 피적분 평가 실패 전파', () => {
  it('피적분이 적분 구간에서 발산: \\int_0^1 (1/x) \\, dx → fail (도메인 또는 발산)', () => {
    const r = evCold('\\int_0^1 \\frac{1}{x} \\, dx');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      // x=0 에서 frac domain (division-by-zero) 또는 evaluator 가 divergent 로 흡수
      expect(['domain', 'divergent']).toContain(r.status);
    }
  });

  it('미연결 변수가 피적분에 있으면 unbound 전파 (적분 변수 외)', () => {
    const r = evCold('\\int_0^1 a \\cdot x \\, dx');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unbound');
      expect(r.detail?.variable).toBe('a');
    }
  });

  it('미연결 변수가 피적분에 있으면 핫패스 → undefined', () => {
    expect(ev('\\int_0^1 a \\cdot x \\, dx')).toBeUndefined();
  });

  it('미연결 변수가 적분 구간에 있어도 unbound 전파', () => {
    const r = evCold('\\int_0^b x \\, dx');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unbound');
      expect(r.detail?.variable).toBe('b');
    }
  });
});

describe('E6 — 미지원 형태', () => {
  it('부정적분: \\int x \\, dx → 평가 불가 (unsupported 또는 row 수준 실패)', () => {
    // 파서가 lower/upper 없는 적분을 어떤 형태로 산출하든, evaluator 는 정직하게 실패해야 한다
    const r = evCold('\\int x \\, dx');
    expect(r.ok).toBe(false);
  });
});

describe('E6 — 합성', () => {
  it('적분 결과를 산수에 활용: 2 \\cdot \\int_0^1 x \\, dx = 1', () => {
    const r = ev('2 \\cdot \\int_0^1 x \\, dx');
    expect(r).toBeCloseTo(1, 6);
  });

  it('피적분에 적분 변수 + 외부 변수: \\int_0^1 (a + x) \\, dx with a=1 = 1.5', () => {
    const r = ev('\\int_0^1 (a + x) \\, dx', { a: 1 });
    expect(r).toBeCloseTo(1.5, 6);
  });
});

describe('E6 — throw 금지', () => {
  it('모든 비정상 적분 평가에서 throw 없음', () => {
    const cases = [
      '\\int_0^1 \\frac{1}{x} \\, dx',
      '\\int_0^1 a \\cdot x \\, dx',
      '\\int_0^1 \\ln(-x) \\, dx',
      '\\int x \\, dx',
    ];
    for (const src of cases) {
      expect(() => ev(src)).not.toThrow();
      expect(() => evCold(src)).not.toThrow();
    }
  });
});
