/**
 * E11 통계 분포 — `\operatorname{name}(args)` 형태로 평가.
 *
 * 메인 evaluator 표면에 통합. 인자는 paren content 안에서 콤마로 split 된다.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../../latex/latex-parser.js';
import { resetLatexIdCounter } from '../../utils/id-generator.js';
import { evaluateSync, evaluate } from '../index.js';

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

const SQRT_2PI = Math.sqrt(2 * Math.PI);

describe('E11 — 정규분포', () => {
  it('normpdf(0, 0, 1) = 1/√(2π)', () => {
    expect(ev('\\operatorname{normpdf}(0, 0, 1)')).toBeCloseTo(1 / SQRT_2PI, 9);
  });

  it('normpdf(x, μ, σ): 모수 binding 으로 평가', () => {
    expect(ev('\\operatorname{normpdf}(x, m, s)', { x: 1, m: 0, s: 1 }))
      .toBeCloseTo(Math.exp(-0.5) / SQRT_2PI, 9);
  });

  it('normcdf(0, 0, 1) = 0.5', () => {
    expect(ev('\\operatorname{normcdf}(0, 0, 1)')).toBeCloseTo(0.5, 6);
  });

  it('normcdf(1.96, 0, 1) ≈ 0.975', () => {
    expect(ev('\\operatorname{normcdf}(1.96, 0, 1)')).toBeCloseTo(0.975, 4);
  });

  it('norminv(0.5, 0, 1) = 0', () => {
    expect(ev('\\operatorname{norminv}(0.5, 0, 1)')).toBeCloseTo(0, 6);
  });

  it('norminv(0.975, 0, 1) ≈ 1.96', () => {
    expect(ev('\\operatorname{norminv}(0.975, 0, 1)')).toBeCloseTo(1.96, 3);
  });

  it('σ ≤ 0 → domain', () => {
    const r = evCold('\\operatorname{normpdf}(0, 0, 0)');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('domain');
  });
});

describe('E11 — 균등분포', () => {
  it('unifpdf 안에서 = 1/(b-a)', () => {
    expect(ev('\\operatorname{unifpdf}(0.5, 0, 1)')).toBeCloseTo(1, 9);
  });

  it('unifpdf 밖에서 = 0', () => {
    expect(ev('\\operatorname{unifpdf}(2, 0, 1)')).toBeCloseTo(0, 9);
  });

  it('unifcdf 중간 = 0.5', () => {
    expect(ev('\\operatorname{unifcdf}(0.5, 0, 1)')).toBeCloseTo(0.5, 9);
  });

  it('a ≥ b → domain', () => {
    const r = evCold('\\operatorname{unifpdf}(0.5, 1, 0)');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('domain');
  });
});

describe('E11 — 지수분포', () => {
  it('exppdf(0, 1) = 1', () => {
    expect(ev('\\operatorname{exppdf}(0, 1)')).toBeCloseTo(1, 9);
  });

  it('expcdf(1, 1) = 1 - e^{-1}', () => {
    expect(ev('\\operatorname{expcdf}(1, 1)')).toBeCloseTo(1 - Math.exp(-1), 9);
  });

  it('λ ≤ 0 → domain', () => {
    const r = evCold('\\operatorname{exppdf}(0, 0)');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('domain');
  });
});

describe('E11 — 이항분포', () => {
  it('binompmf(3, 10, 0.5) = C(10,3)·0.5^10', () => {
    expect(ev('\\operatorname{binompmf}(3, 10, 0.5)')).toBeCloseTo(120 / 1024, 9);
  });

  it('binomcdf(10, 10, p) = 1', () => {
    expect(ev('\\operatorname{binomcdf}(10, 10, 0.3)')).toBeCloseTo(1, 9);
  });

  it('binompmf 합 = 1', () => {
    let sum = 0;
    for (let k = 0; k <= 5; k++) {
      const v = ev(`\\operatorname{binompmf}(${k}, 5, 0.4)`);
      expect(typeof v).toBe('number');
      sum += v as number;
    }
    expect(sum).toBeCloseTo(1, 9);
  });

  it('n 비정수 → domain', () => {
    const r = evCold('\\operatorname{binompmf}(0, 1.5, 0.5)');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('domain');
  });
});

describe('E11 — 푸아송', () => {
  it('poisspmf(0, 1) = e^{-1}', () => {
    expect(ev('\\operatorname{poisspmf}(0, 1)')).toBeCloseTo(Math.exp(-1), 9);
  });

  it('poisspmf(2, 3) = 9/(2!) e^{-3}', () => {
    expect(ev('\\operatorname{poisspmf}(2, 3)')).toBeCloseTo((9 / 2) * Math.exp(-3), 9);
  });

  it('poisscdf(10, 1) → 1 (사실상)', () => {
    expect(ev('\\operatorname{poisscdf}(10, 1)')).toBeCloseTo(1, 6);
  });

  it('λ ≤ 0 → domain', () => {
    const r = evCold('\\operatorname{poisspmf}(0, 0)');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('domain');
  });
});

describe('E11 — 인자·도메인 가드', () => {
  it('인자 부족 → unsupported', () => {
    const r = evCold('\\operatorname{normpdf}(0, 0)');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('unsupported');
  });

  it('미연결 변수 인자 → unbound', () => {
    const r = evCold('\\operatorname{normpdf}(x, 0, 1)');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unbound');
      expect(r.detail?.variable).toBe('x');
    }
  });

  it('미지의 분포명 — operatorname 형태도 unsupported', () => {
    const r = evCold('\\operatorname{noexist}(1)');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('unsupported');
  });

  it('throw 금지', () => {
    const cases = [
      '\\operatorname{normpdf}(0, 0, 0)',
      '\\operatorname{binompmf}(0, 1.5, 0.5)',
      '\\operatorname{normpdf}(x, 0, 1)',
    ];
    for (const src of cases) {
      expect(() => ev(src)).not.toThrow();
      expect(() => evCold(src)).not.toThrow();
    }
  });
});

describe('E11 — 산수와의 결합', () => {
  it('스칼라 합: normpdf(0,0,1) + normpdf(0,0,1) = 2/√(2π)', () => {
    expect(ev('\\operatorname{normpdf}(0,0,1) + \\operatorname{normpdf}(0,0,1)'))
      .toBeCloseTo(2 / SQRT_2PI, 9);
  });

  it('분포 함수가 변수에 의존하는 산술 식', () => {
    // f(x) = normpdf(x,0,1) — x=1 에서 e^{-0.5}/√(2π)
    expect(ev('2 \\cdot \\operatorname{normpdf}(x, 0, 1)', { x: 1 }))
      .toBeCloseTo((2 * Math.exp(-0.5)) / SQRT_2PI, 9);
  });
});
