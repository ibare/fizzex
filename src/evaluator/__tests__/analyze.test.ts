/**
 * E4 분석 API — analyzeBindings / analyzeEvaluability 계약 잠금.
 *
 * 호스트가 식 노드 생성 시 1회 호출하여 입력 슬롯·배지 UX 를 결정한다.
 * 본 테스트는 그 신호 의미가 후속 단계에서도 유지됨을 보장한다.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../../latex/latex-parser';
import { resetLatexIdCounter } from '../../utils/id-generator';
import { analyzeBindings, analyzeEvaluability } from '..';

beforeEach(() => {
  resetLatexIdCounter();
});

describe('E4 — analyzeBindings: 자유변수', () => {
  it('상수식 → required, constants 모두 빈 배열', () => {
    const { ast } = parseLatex('1 + 2');
    const a = analyzeBindings(ast);
    expect(a.required).toEqual([]);
    expect(a.constants).toEqual([]);
  });

  it('단일 변수 → required:[x]', () => {
    const { ast } = parseLatex('x');
    const a = analyzeBindings(ast);
    expect(a.required).toEqual(['x']);
    expect(a.constants).toEqual([]);
  });

  it('다중 변수 dedupe·정렬 → required: 알파벳순', () => {
    const { ast } = parseLatex('y + x + x \\cdot z');
    const a = analyzeBindings(ast);
    expect(a.required).toEqual(['x', 'y', 'z']);
  });

  it('함수 인자 내부 변수도 수집 → required:[x, y]', () => {
    const { ast } = parseLatex('\\sin(x + y)');
    const a = analyzeBindings(ast);
    expect(a.required).toEqual(['x', 'y']);
  });

  it('분수·거듭제곱·제곱근 내부 변수도 수집', () => {
    const { ast } = parseLatex('\\frac{a}{b} + c^d + \\sqrt{f}');
    const a = analyzeBindings(ast);
    expect(a.required).toEqual(['a', 'b', 'c', 'd', 'f']);
  });
});

describe('E4 — analyzeBindings: 상수 분류', () => {
  it('\\pi → constants:[π], required:[]', () => {
    const { ast } = parseLatex('\\pi');
    const a = analyzeBindings(ast);
    expect(a.required).toEqual([]);
    expect(a.constants).toEqual(['π']);
  });

  it('자유변수와 상수 분리: \\sin(\\pi x) → required:[x], constants:[π]', () => {
    const { ast } = parseLatex('\\sin(\\pi x)');
    const a = analyzeBindings(ast);
    expect(a.required).toEqual(['x']);
    expect(a.constants).toEqual(['π']);
  });

  it('상수 dedupe: 같은 상수 다중 등장 → 한 번만', () => {
    const { ast } = parseLatex('\\pi + \\pi \\cdot \\pi');
    const a = analyzeBindings(ast);
    expect(a.constants).toEqual(['π']);
  });

  it('알려진 상수 집합: π, γ, ϕ, τ, ∞ 가 constants 로 분류 (파서 산출 유니코드 기준)', () => {
    // 각 상수가 독립적으로 분류되는지 검증
    // 파서는 \pi → π, \phi → ϕ (U+03D5), \varphi → φ (U+03C6) 로 변환한다
    expect(analyzeBindings(parseLatex('\\pi').ast).constants).toEqual(['π']);
    expect(analyzeBindings(parseLatex('\\gamma').ast).constants).toEqual(['γ']);
    expect(analyzeBindings(parseLatex('\\phi').ast).constants).toEqual(['ϕ']);
    expect(analyzeBindings(parseLatex('\\tau').ast).constants).toEqual(['τ']);
    expect(analyzeBindings(parseLatex('\\infty').ast).constants).toEqual(['∞']);
  });
});

describe('E4 — analyzeEvaluability: 등록 노드', () => {
  it('산수식 → evaluable=true, unsupported=[]', () => {
    const { ast } = parseLatex('x + y \\cdot z');
    const a = analyzeEvaluability(ast);
    expect(a.evaluable).toBe(true);
    expect(a.unsupported).toEqual([]);
  });

  it('함수·분수·거듭제곱·제곱근·절댓값·괄호 → evaluable=true', () => {
    const { ast } = parseLatex('\\sin(\\frac{x^2}{\\sqrt{y}}) + |z|');
    const a = analyzeEvaluability(ast);
    expect(a.evaluable).toBe(true);
  });
});

describe('E4 — analyzeEvaluability: 미등록 노드', () => {
  it('\\int → evaluable=false, unsupported 에 integral', () => {
    const { ast } = parseLatex('\\int_0^1 x \\, dx');
    const a = analyzeEvaluability(ast);
    expect(a.evaluable).toBe(false);
    expect(a.unsupported).toContain('integral');
  });

  it('\\sum → evaluable=false, unsupported 에 sum', () => {
    const { ast } = parseLatex('\\sum_{i=1}^{n} i');
    const a = analyzeEvaluability(ast);
    expect(a.evaluable).toBe(false);
    expect(a.unsupported).toContain('sum');
  });

  it('\\lim → evaluable=false', () => {
    const { ast } = parseLatex('\\lim_{x \\to 0} \\frac{\\sin(x)}{x}');
    const a = analyzeEvaluability(ast);
    expect(a.evaluable).toBe(false);
  });

  it('unsupported 정렬·dedupe: 같은 미등록 타입 중복 제거', () => {
    const { ast } = parseLatex('\\sum_{i=1}^{3} i + \\sum_{j=1}^{2} j');
    const a = analyzeEvaluability(ast);
    expect(a.unsupported.filter((t) => t === 'sum').length).toBe(1);
  });
});

describe('E4 — 합성 시나리오', () => {
  it('미등록 노드 안에 자유변수가 있어도 변수 수집은 정상 작동', () => {
    const { ast } = parseLatex('\\sum_{i=1}^{n} a_i');
    const b = analyzeBindings(ast);
    // n 은 자유변수
    expect(b.required).toContain('n');
  });

  it('분석은 부작용 없음 (반복 호출 시 결과 동일)', () => {
    const { ast } = parseLatex('\\sin(\\pi x) + y');
    const a1 = analyzeBindings(ast);
    const a2 = analyzeBindings(ast);
    expect(a1).toEqual(a2);
    const e1 = analyzeEvaluability(ast);
    const e2 = analyzeEvaluability(ast);
    expect(e1).toEqual(e2);
  });
});
