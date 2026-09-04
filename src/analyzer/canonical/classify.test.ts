/**
 * IR 기반 다항식 프로파일 + 식 분류.
 *
 * 기존 `polynomial-analyzer.ts` 는 평평한 AST 위에서 "변수별 최고 지수" 를 세므로
 * 여러 형태를 오판한다. 이 스위트는 그 오판들이 IR 에서 정확해짐을 고정하고,
 * 계수 값 추출과 등호 좌·우 분리를 검증한다.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../../latex/latex-parser.js';
import { resetLatexIdCounter } from '../../utils/id-generator.js';
import { normalizeAst } from './from-ast.js';
import { classifyExpr } from './classify.js';
import { toPolynomial, symKey, containsVar } from './polynomial.js';
import type { ExprNode } from './expr.js';

beforeEach(() => {
  resetLatexIdCounter();
});

const cls = (latex: string) => classifyExpr(normalizeAst(parseLatex(latex).ast));

/** 계수 맵을 수치로 — 기호 계수는 undefined 로 떨어진다. */
function numericCoeffs(c: ReadonlyMap<number, ExprNode> | undefined): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [d, v] of c ?? []) if (v.kind === 'num') out[d] = v.value;
  return out;
}

describe('다항식 프로파일 — 기존 분석기의 오판 교정', () => {
  it('지수에 변수가 있으면 다항식이 아니다', () => {
    // 기존: degree 1 (밑이 숫자라 power 경로를 안 타고 지수의 x 가 1차 취급)
    expect(cls('2^x').poly).toBeUndefined();
  });

  it('음수 지수는 다항식이 아니다', () => {
    // 기존: degree 1
    expect(cls('x^{-1}').poly).toBeUndefined();
  });

  it('근호 안에 변수가 있으면 다항식이 아니다', () => {
    // 기존: degree 1 + polynomial 도메인
    expect(cls('\\sqrt{x}').poly).toBeUndefined();
  });

  it('분모에 변수가 있으면 다항식이 아니다', () => {
    // 기존: degree 2 (분모를 아예 안 봄)
    expect(cls('\\frac{x^2}{x}').poly).toBeUndefined();
  });

  it('다변수는 항별 total degree 로 센다', () => {
    // 기존: degree 3 (변수별 최대 지수의 최댓값)
    expect(cls('x^2y^3').poly?.degree).toBe(5);
  });

  it('분모가 상수면 다항식이다', () => {
    expect(cls('\\frac{x^2}{2}').poly?.degree).toBe(2);
  });

  it('변수를 안 쓰는 부분식은 형태와 무관하게 상수다', () => {
    // root/abs 만 특례로 두면 `2^{-1}` 이나 `a^{-1}` 이 비다항식으로 떨어진다.
    expect(cls('x + 2^{-1}').poly?.degree).toBe(1);
    expect(cls('a^{-1}x').poly?.degree).toBe(1);
    expect(cls('x + \\sqrt{2}').poly?.degree).toBe(1);
  });
});

describe('다항식 프로파일 — 계수 추출', () => {
  it('수치 계수를 뽑는다', () => {
    // 이 시스템에서 계수 값이 나오는 것은 이것이 처음이다.
    const c = cls('x^2 + 2x - 3 = 0');
    expect(c.poly?.degree).toBe(2);
    expect(numericCoeffs(c.poly?.coefficients)).toEqual({ 2: 1, 1: 2, 0: -3 });
  });

  it('등호 우변을 좌변으로 이항한다', () => {
    const c = cls('x^2 = 4');
    expect(numericCoeffs(c.poly?.coefficients)).toEqual({ 2: 1, 0: -4 });
  });

  it('음수 계수를 정확히 뽑는다', () => {
    // 부호가 별도 노드로 남으면 이 항들이 곱셈 패턴에 붙지 않는다.
    expect(numericCoeffs(cls('x^2 - 2x - 3 = 0').poly?.coefficients)).toEqual({ 2: 1, 1: -2, 0: -3 });
    expect(numericCoeffs(cls('-x^2 + 4 = 0').poly?.coefficients)).toEqual({ 2: -1, 0: 4 });
  });

  it('기호 계수도 자리를 지킨다', () => {
    const c = cls('y = ax^2 + bx + c');
    const coeffs = c.poly?.coefficients;
    expect(coeffs?.get(2)).toMatchObject({ kind: 'sym', name: 'a' });
    expect(coeffs?.get(1)).toMatchObject({ kind: 'sym', name: 'b' });
    expect(coeffs?.get(0)).toMatchObject({ kind: 'sym', name: 'c' });
  });

  it('다변수일 때는 계수를 내지 않는다', () => {
    expect(cls('a^2 + b^2 = c^2').poly?.coefficients).toBeUndefined();
  });
});

describe('식 분류 — shape 판정', () => {
  it('등호 좌변이 단일 심볼이고 우변에 없으면 정의식', () => {
    const c = cls('y = ax^2 + bx + c');
    expect(c.shape).toBe('definition');
    expect(c.dependent).toBe('y');
    // 정의식은 종속변수를 부정원에서 뺀다. 안 그러면 차수 판정이 흐려진다.
    expect(c.mainVariables).not.toContain('y');
    expect(c.mainVariables).toEqual(['x']);
  });

  it('좌변 심볼이 우변에 다시 나오면 정의식이 아니다', () => {
    expect(cls('x = x + 1').shape).toBe('equation');
  });

  it('일반 등식·부등식·수식을 가른다', () => {
    expect(cls('x^2 + 2x - 3 = 0').shape).toBe('equation');
    expect(cls('x < 5').shape).toBe('inequality');
    expect(cls('x \\ne 5').shape).toBe('inequality');
    expect(cls('x + 1').shape).toBe('expression');
  });

  it('관계 연산자가 둘 이상이면 multi-relation', () => {
    expect(cls('x = 1 = 2').shape).toBe('multi-relation');
  });
});

describe('식 분류 — 심볼 분할', () => {
  it('관례적 부정원이 없으면 폴백으로 전부 부정원이 된다', () => {
    // a·b·c 는 전부 계수명이다. 그대로 두면 부정원이 비어 차수가 0 이 된다.
    const c = cls('a^2 + b^2 = c^2');
    expect(c.mainVariables).toEqual(['a', 'b', 'c']);
    expect(c.poly?.degree).toBe(2);
  });

  it('아래첨자 변수를 별개 심볼로 구분한다', () => {
    // name 만으로 키잉하면 v_0 와 v 가 같은 변수로 붕괴한다.
    expect(symKey('v', '0')).toBe('v_0');
    expect(symKey('v', undefined)).toBe('v');
    const c = cls('s = v_0 t + \\frac{1}{2}at^2');
    expect(c.mainVariables).toContain('v_0');
    expect(c.mainVariables).not.toContain('v');
  });

  it('수학 상수는 부정원 폴백에서 제외된다', () => {
    // π 를 부정원으로 삼으면 원의 넓이가 r 이 아니라 π 에 대한 1차식이 된다.
    const c = cls('A = \\pi r^2');
    expect(c.mainVariables).toEqual(['r']);
    expect(c.parameters).toContain('π');
    expect(c.poly?.degree).toBe(2);
  });

  it('수학 상수명과 겹치는 심볼은 태그일 뿐 분할에서 빠지지 않는다', () => {
    // \varphi 는 φ 로 정규화되는데 φ 는 황금비로 상수 목록에 있다.
    // 여기서 제외해버리면 sinusoid 형식의 위상 슬롯이 사라진다.
    const c = cls('y = A\\sin(\\omega t + \\varphi)');
    expect(c.constants).toContain('φ');
    expect([...c.mainVariables, ...c.parameters]).toContain('φ');
  });

  it('내장 함수를 수집한다', () => {
    expect(cls('y = A\\sin(\\omega t + \\varphi)').functions).toEqual(['sin']);
  });
});

describe('다항식 프로파일 — 방어', () => {
  it('관계식 자체는 다항식이 아니다', () => {
    const n = normalizeAst(parseLatex('x = 1').ast);
    expect(toPolynomial(n.root, new Set(['x']))).toBeNull();
  });

  it('모델링 밖 구조는 변수가 없어도 통과시키지 않는다', () => {
    // 정규화 실패가 opaque 로 접히는데 그것을 상수 다항식으로 읽으면
    // 실패가 은폐된다.
    const n = normalizeAst(parseLatex('\\int_0^1 y dy').ast);
    expect(toPolynomial(n.root, new Set(['x']))).toBeNull();
  });

  it('차수 상한을 넘으면 포기한다', () => {
    const n = normalizeAst(parseLatex('(x+1)^{99999}').ast);
    expect(() => toPolynomial(n.root, new Set(['x']))).not.toThrow();
    expect(toPolynomial(n.root, new Set(['x']))).toBeNull();
  });

  it('기호 계수 전개가 폭발하지 않는다', () => {
    // provenance 를 단순 concat 하면 노드 수가 아니라 배열 원소 수가 2^n 으로
    // 자라 OOM 이 난다. 이 경로는 렌더 중 동기 실행된다.
    const n = normalizeAst(parseLatex('(x+a)^{64}').ast);
    const t0 = Date.now();
    const p = toPolynomial(n.root, new Set(['x']));
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(p?.degree).toBe(64);
  });

  it('계수식의 유래가 상한을 넘지 않는다', () => {
    const n = normalizeAst(parseLatex('(x+a)^{32}').ast);
    const p = toPolynomial(n.root, new Set(['x']));
    for (const [, v] of p?.coefficients ?? []) {
      expect(v.src.length).toBeLessThanOrEqual(32);
    }
  });

  it('containsVar 가 아래첨자를 구분한다', () => {
    const n = normalizeAst(parseLatex('v_0 + 1').ast);
    expect(containsVar(n.root, new Set(['v_0']))).toBe(true);
    expect(containsVar(n.root, new Set(['v']))).toBe(false);
  });
});
