/**
 * E10 자동미분 — forward-mode 듀얼넘버.
 *
 * 메인 evaluator 의 number 계약은 변경 없이, 별도 진입점
 * differentiateAt(ast, variable, bindings) 가 partial 미분값을 산출한다.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../../latex/latex-parser';
import { resetLatexIdCounter } from '../../utils/id-generator';
import { differentiateAt, differentiate } from '..';

beforeEach(() => {
  resetLatexIdCounter();
});

function dAt(src: string, variable: string, bindings: Record<string, number> = {}): number | undefined {
  const { ast } = parseLatex(src);
  return differentiateAt(ast, variable, bindings);
}

function dCold(src: string, variable: string, bindings: Record<string, number> = {}): ReturnType<typeof differentiate> {
  const { ast } = parseLatex(src);
  return differentiate(ast, variable, bindings);
}

describe('E10 — 다항식·기본 산술', () => {
  it('d/dx[x^2]|_{x=3} = 6 (지정 케이스)', () => {
    expect(dAt('x^2', 'x', { x: 3 })).toBeCloseTo(6, 9);
  });

  it('d/dx[x] = 1', () => {
    expect(dAt('x', 'x', { x: 5 })).toBeCloseTo(1, 9);
  });

  it('상수 미분: d/dx[7] = 0', () => {
    expect(dAt('7', 'x', { x: 5 })).toBeCloseTo(0, 9);
  });

  it('식에 없는 변수: d/dy[x^2] = 0 (y 값 임의)', () => {
    expect(dAt('x^2', 'y', { x: 3, y: 99 })).toBeCloseTo(0, 9);
  });

  it('d/dx[x^3 + 2x]|_{x=2} = 14', () => {
    expect(dAt('x^3 + 2 x', 'x', { x: 2 })).toBeCloseTo(14, 9);
  });

  it('단항 마이너스: d/dx[-x^2]|_{x=3} = -6', () => {
    expect(dAt('-x^2', 'x', { x: 3 })).toBeCloseTo(-6, 9);
  });

  it('스칼라 곱: d/dx[5x]|_{x=2} = 5', () => {
    expect(dAt('5 x', 'x', { x: 2 })).toBeCloseTo(5, 9);
  });

  it('product rule: d/dx[x · sin(x)]|_{x=π/2} = sin(π/2) + (π/2) cos(π/2) = 1', () => {
    const x = Math.PI / 2;
    expect(dAt('x \\sin(x)', 'x', { x })).toBeCloseTo(Math.sin(x) + x * Math.cos(x), 9);
  });
});

describe('E10 — 분수·역수', () => {
  it('d/dx[1/x]|_{x=2} = -0.25', () => {
    expect(dAt('\\frac{1}{x}', 'x', { x: 2 })).toBeCloseTo(-0.25, 9);
  });

  it('quotient rule: d/dx[\\frac{sin x}{x}]|_{x=1} = (cos(1) - sin(1)) / 1', () => {
    expect(dAt('\\frac{\\sin(x)}{x}', 'x', { x: 1 })).toBeCloseTo(Math.cos(1) - Math.sin(1), 9);
  });

  it('0 나눔 → domain', () => {
    const r = dCold('\\frac{1}{x}', 'x', { x: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('domain');
      expect(r.detail?.reason).toBe('division-by-zero');
    }
  });
});

describe('E10 — 거듭제곱·제곱근', () => {
  it('d/dx[x^{1/2}]|_{x=4} = 1/(2·2) = 0.25', () => {
    expect(dAt('\\sqrt{x}', 'x', { x: 4 })).toBeCloseTo(0.25, 9);
  });

  it('상수 분수 지수: d/dx[x^{\\frac{1}{3}}]|_{x=8} = (1/3) · 8^{-2/3} = 1/12', () => {
    expect(dAt('x^{\\frac{1}{3}}', 'x', { x: 8 })).toBeCloseTo(1 / 12, 9);
  });

  it('변수 지수: d/dx[e^x]|_{x=0} = 1', () => {
    expect(dAt('e^x', 'x', { x: 0, e: Math.E })).toBeCloseTo(1, 9);
  });

  it('일반 변수 지수: d/dx[x^x]|_{x=2} = 2^2 (ln 2 + 1) = 4(ln2+1)', () => {
    expect(dAt('x^x', 'x', { x: 2 })).toBeCloseTo(4 * (Math.log(2) + 1), 9);
  });

  it('음수 밑 + 분수 지수 → domain', () => {
    const r = dCold('x^{0.5}', 'x', { x: -1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('domain');
  });
});

describe('E10 — 표준 함수', () => {
  it('d/dx[sin x]|_{x=0} = 1 (지정 케이스)', () => {
    expect(dAt('\\sin(x)', 'x', { x: 0 })).toBeCloseTo(1, 9);
  });

  it('d/dx[cos x]|_{x=0} = 0', () => {
    expect(dAt('\\cos(x)', 'x', { x: 0 })).toBeCloseTo(0, 9);
  });

  it('d/dx[tan x]|_{x=0} = 1', () => {
    expect(dAt('\\tan(x)', 'x', { x: 0 })).toBeCloseTo(1, 9);
  });

  it('d/dx[exp x]|_{x=1} = e', () => {
    expect(dAt('\\exp(x)', 'x', { x: 1 })).toBeCloseTo(Math.E, 9);
  });

  it('d/dx[ln x]|_{x=1} = 1', () => {
    expect(dAt('\\ln(x)', 'x', { x: 1 })).toBeCloseTo(1, 9);
  });

  it('d/dx[ln x]|_{x≤0} → domain', () => {
    const r = dCold('\\ln(x)', 'x', { x: -1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('domain');
  });

  it('chain rule: d/dx[sin(x^2)]|_{x=1} = 2 cos(1)', () => {
    expect(dAt('\\sin(x^2)', 'x', { x: 1 })).toBeCloseTo(2 * Math.cos(1), 9);
  });

  it('chain rule: d/dx[ln(sin x)]|_{x=π/4} = cot(π/4) = 1', () => {
    expect(dAt('\\ln(\\sin(x))', 'x', { x: Math.PI / 4 })).toBeCloseTo(1, 9);
  });

  it('d/dx[sinh x]|_{x=0} = cosh(0) = 1', () => {
    expect(dAt('\\sinh(x)', 'x', { x: 0 })).toBeCloseTo(1, 9);
  });
});

describe('E10 — 미연결 변수·미지원 노드', () => {
  it('미분 변수 미연결: d/dx[x^2], x 없음 → unbound (콜드)', () => {
    const r = dCold('x^2', 'x', {});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unbound');
      expect(r.detail?.variable).toBe('x');
    }
  });

  it('미분 변수 미연결: 핫패스 → undefined', () => {
    expect(dAt('x^2', 'x', {})).toBeUndefined();
  });

  it('다른 변수 미연결: d/dx[x + a]|_{x=1} (a 없음) → unbound', () => {
    const r = dCold('x + a', 'x', { x: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unbound');
      expect(r.detail?.variable).toBe('a');
    }
  });

  it('행렬 노드 → unsupported (별도 표면 밖)', () => {
    const r = dCold('\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}', 'x', { x: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('unsupported');
  });

  it('적분 노드 → unsupported (자동미분 표면 밖)', () => {
    const r = dCold('\\int_0^1 t \\, dt', 'x', { x: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('unsupported');
  });
});

describe('E10 — throw 금지', () => {
  it('비정상 입력에서 throw 없음', () => {
    const cases: Array<[string, string, Record<string, number>]> = [
      ['\\frac{1}{x}', 'x', { x: 0 }],
      ['\\ln(x)', 'x', { x: -1 }],
      ['x^2', 'x', {}],
      ['\\begin{pmatrix} 1 \\end{pmatrix}', 'x', {}],
      ['\\sqrt{x}', 'x', { x: -1 }],
    ];
    for (const [src, v, b] of cases) {
      expect(() => dAt(src, v, b)).not.toThrow();
      expect(() => dCold(src, v, b)).not.toThrow();
    }
  });
});
