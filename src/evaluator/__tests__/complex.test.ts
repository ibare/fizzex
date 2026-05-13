/**
 * E12 복소수 평가자 — 별도 표면.
 *
 * 메인 evaluator 의 number 계약은 변경 없이, 새 진입점이 AST 를 복소수로 평가한다.
 * `i` 는 imaginary unit 으로 자동 인식되며, bindings 에 명시 시 사용자 값이 우선한다.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../../latex/latex-parser';
import { resetLatexIdCounter } from '../../utils/id-generator';
import { evaluateComplexSync, evaluateComplex, type Complex } from '..';

beforeEach(() => {
  resetLatexIdCounter();
});

function evC(src: string, bindings: Record<string, number> = {}): Complex | undefined {
  const { ast } = parseLatex(src);
  return evaluateComplexSync(ast, bindings);
}

function evCCold(src: string, bindings: Record<string, number> = {}): ReturnType<typeof evaluateComplex> {
  const { ast } = parseLatex(src);
  return evaluateComplex(ast, bindings);
}

function eqC(z: Complex | undefined, re: number, im: number, prec = 9): void {
  expect(z).toBeDefined();
  if (!z) return;
  expect(z.re).toBeCloseTo(re, prec);
  expect(z.im).toBeCloseTo(im, prec);
}

describe('E12 — imaginary unit 과 기본 산술', () => {
  it('i = (0, 1)', () => {
    eqC(evC('i'), 0, 1);
  });

  it('i^2 = -1', () => {
    eqC(evC('i^2'), -1, 0);
  });

  it('(1+i)(1-i) = 2', () => {
    eqC(evC('(1+i)(1-i)'), 2, 0);
  });

  it('(1+i)/(1-i) = i', () => {
    eqC(evC('\\frac{1+i}{1-i}'), 0, 1);
  });

  it('실수만 있는 식은 im=0: 2 + 3 = 5', () => {
    eqC(evC('2 + 3'), 5, 0);
  });

  it('단항 마이너스: -(1+i) = -1 - i', () => {
    eqC(evC('-(1+i)'), -1, -1);
  });

  it('bindings 가 i 를 오버라이드: i 를 변수처럼 사용', () => {
    eqC(evC('i', { i: 5 }), 5, 0);
  });
});

describe('E12 — 기본 함수', () => {
  it('|3 + 4i| = 5', () => {
    eqC(evC('|3 + 4 i|'), 5, 0);
  });

  it('\\sqrt{-1} = i', () => {
    eqC(evC('\\sqrt{-1}'), 0, 1);
  });

  it('\\sqrt{i} = (√2/2, √2/2)', () => {
    eqC(evC('\\sqrt{i}'), Math.SQRT1_2, Math.SQRT1_2);
  });

  it('\\ln(-1) = πi', () => {
    eqC(evC('\\ln(-1)'), 0, Math.PI);
  });

  it('\\ln(0) → domain', () => {
    const r = evCCold('\\ln(0)');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('domain');
  });

  it('e^{iπ} = -1 (Euler)', () => {
    eqC(evC('e^{i \\pi}', { e: Math.E, '\\pi': Math.PI, π: Math.PI }), -1, 0, 9);
  });

  it('\\exp(i π/2) = i', () => {
    eqC(evC('\\exp(\\frac{i \\pi}{2})', { π: Math.PI, '\\pi': Math.PI }), 0, 1, 9);
  });

  it('\\sin(i) = i sinh(1)', () => {
    eqC(evC('\\sin(i)'), 0, Math.sinh(1));
  });

  it('\\cos(i) = cosh(1)', () => {
    eqC(evC('\\cos(i)'), Math.cosh(1), 0);
  });
});

describe('E12 — 거듭제곱', () => {
  it('정수 지수: (1+i)^4 = -4', () => {
    eqC(evC('(1+i)^4'), -4, 0);
  });

  it('음의 정수 지수: i^{-1} = -i', () => {
    eqC(evC('i^{-1}'), 0, -1);
  });

  it('일반 복소 지수: i^i = e^{-π/2} (실수)', () => {
    eqC(evC('i^i'), Math.exp(-Math.PI / 2), 0, 9);
  });

  it('0^0 → domain', () => {
    const r = evCCold('0^0');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('domain');
  });
});

describe('E12 — 도메인·미연결·미지원', () => {
  it('1/0 → domain', () => {
    const r = evCCold('\\frac{1}{0}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('domain');
  });

  it('미연결 변수 → unbound', () => {
    const r = evCCold('x + i');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unbound');
      expect(r.detail?.variable).toBe('x');
    }
  });

  it('핫패스 미연결 → undefined', () => {
    expect(evC('x + i')).toBeUndefined();
  });

  it('행렬 노드 → unsupported', () => {
    const r = evCCold('\\begin{pmatrix} 1 & 2 \\end{pmatrix}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('unsupported');
  });

  it('적분 노드 → unsupported', () => {
    const r = evCCold('\\int_0^1 t \\, dt');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('unsupported');
  });
});

describe('E12 — throw 금지', () => {
  it('비정상 입력에서 throw 없음', () => {
    const cases: Array<[string, Record<string, number>]> = [
      ['\\frac{1}{0}', {}],
      ['\\ln(0)', {}],
      ['0^0', {}],
      ['\\begin{pmatrix} 1 \\end{pmatrix}', {}],
      ['x + i', {}],
    ];
    for (const [src, b] of cases) {
      expect(() => evC(src, b)).not.toThrow();
      expect(() => evCCold(src, b)).not.toThrow();
    }
  });
});
