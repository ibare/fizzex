/**
 * E8 수치 극한 — 양극한 + ±∞ 극한
 *
 * 일방향(좌/우)·진동·발산 → divergent. 일치하면 평균 반환.
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

describe('E8 — 유한 극한 (양수렴)', () => {
  it('\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1', () => {
    const r = ev('\\lim_{x \\to 0} \\frac{\\sin(x)}{x}');
    expect(r).toBeCloseTo(1, 4);
  });

  it('\\lim_{x \\to 0} \\frac{1 - \\cos(x)}{x^2} = 1/2', () => {
    const r = ev('\\lim_{x \\to 0} \\frac{1 - \\cos(x)}{x^2}');
    expect(r).toBeCloseTo(0.5, 3);
  });

  it('\\lim_{x \\to 1} x^2 = 1 (연속 함수 — 자명 케이스)', () => {
    const r = ev('\\lim_{x \\to 1} x^2');
    expect(r).toBeCloseTo(1, 6);
  });

  it('\\lim_{x \\to 2} (x + 3) = 5', () => {
    const r = ev('\\lim_{x \\to 2} {x + 3}');
    expect(r).toBeCloseTo(5, 6);
  });
});

describe('E8 — 무한 극한', () => {
  it('\\lim_{x \\to \\infty} \\frac{1}{x} = 0', () => {
    const r = ev('\\lim_{x \\to \\infty} \\frac{1}{x}');
    expect(r).toBeCloseTo(0, 4);
  });

  it('\\lim_{x \\to -\\infty} \\frac{1}{x} = 0', () => {
    const r = ev('\\lim_{x \\to -\\infty} \\frac{1}{x}');
    expect(r).toBeCloseTo(0, 4);
  });

  it('\\lim_{x \\to \\infty} x → divergent (수렴 없음)', () => {
    const r = evCold('\\lim_{x \\to \\infty} x');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('divergent');
      expect(r.detail?.nodeType).toBe('limit');
    }
  });
});

describe('E8 — 일방향 발산 / 좌·우 불일치', () => {
  it('\\lim_{x \\to 0} \\frac{1}{x} → divergent (좌 -∞ / 우 +∞)', () => {
    const r = evCold('\\lim_{x \\to 0} \\frac{1}{x}');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('divergent');
      expect(r.detail?.nodeType).toBe('limit');
    }
  });
});

describe('E8 — 본문 평가 실패 전파', () => {
  it('미연결 변수가 본문에 있으면 unbound: \\lim_{x \\to 0} {a + x} → unbound (변수 a)', () => {
    const r = evCold('\\lim_{x \\to 0} {a + x}');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unbound');
      expect(r.detail?.variable).toBe('a');
    }
  });

  it('미연결 변수가 approach 에 있으면 unbound: \\lim_{x \\to a} x → unbound (변수 a)', () => {
    const r = evCold('\\lim_{x \\to a} x');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unbound');
      expect(r.detail?.variable).toBe('a');
    }
  });

  it('핫패스: 미연결 변수의 극한 → undefined', () => {
    expect(ev('\\lim_{x \\to 0} {a + x}')).toBeUndefined();
    expect(ev('\\lim_{x \\to a} x')).toBeUndefined();
  });
});

describe('E8 — 합성', () => {
  it('극한 결과를 산수에 활용: 2 \\cdot \\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 2', () => {
    const r = ev('2 \\cdot \\lim_{x \\to 0} \\frac{\\sin(x)}{x}');
    expect(r).toBeCloseTo(2, 4);
  });
});

describe('E8 — throw 금지', () => {
  it('모든 비정상 극한 평가에서 throw 없음', () => {
    const cases = [
      '\\lim_{x \\to 0} \\frac{1}{x}',
      '\\lim_{x \\to \\infty} x',
      '\\lim_{x \\to 0} {a + x}',
      '\\lim_{x \\to a} x',
    ];
    for (const src of cases) {
      expect(() => ev(src)).not.toThrow();
      expect(() => evCold(src)).not.toThrow();
    }
  });
});
