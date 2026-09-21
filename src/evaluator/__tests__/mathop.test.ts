/**
 * 극값·한계 연산자 평가 — `\max`, `\min`, `\sup`, `\inf`, `\gcd`
 *
 * 이 연산자들은 자식을 갖지 않고 피연산자가 형제로 온다. 결합은 시퀀스 단계가 맡고
 * 여기서는 결합 결과가 값으로 떨어지는지, 그리고 계산할 수 없는 것을 계산한 척하지
 * 않는지를 본다.
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

describe('유한 인자', () => {
  it('인자 중 최대/최소를 고른다', () => {
    expect(ev('\\max(3, 7, 5)')).toBe(7);
    expect(ev('\\min(3, 7, 5)')).toBe(3);
  });

  it('유한 집합에서 상한·하한은 최대·최소와 같다', () => {
    expect(ev('\\sup(1, 2)')).toBe(2);
    expect(ev('\\inf(1, 2)')).toBe(1);
  });

  it('인자가 식이어도 평가한다', () => {
    expect(ev('\\max(2 + 3, 4)')).toBe(5);
  });

  it('최대공약수를 구한다', () => {
    expect(ev('\\gcd(12, 18)')).toBe(6);
    expect(ev('\\gcd(12, 18, 27)')).toBe(3);
  });

  it('정수가 아닌 gcd 는 도메인 밖이다', () => {
    expect(ev('\\gcd(1.5, 2)')).toBeUndefined();
  });
});

describe('주변 식과의 결합', () => {
  it('덧셈은 극값 밖에 남는다', () => {
    expect(ev('\\max(3, 7, 5) + 1')).toBe(8);
    expect(ev('\\max_{i=1}^{3} i + 10')).toBe(13);
  });

  it('곱셈은 극값 안으로 들어간다', () => {
    expect(ev('2 \\cdot \\max(3, 7)')).toBe(14);
    expect(ev('\\max_{x \\in [0, 3]} x \\cdot (3 - x)')).toBeCloseTo(2.25, 6);
  });
});

describe('인덱스 범위', () => {
  it('범위를 훑어 극값을 고른다', () => {
    expect(ev('\\max_{i=1}^{4} i')).toBe(4);
    expect(ev('\\min_{i=2}^{5} i')).toBe(2);
  });

  it('본문이 식이어도 훑는다', () => {
    expect(ev('\\max_{i=1}^{3} i^2')).toBe(9);
  });

  it('역순 범위는 도메인 밖이다', () => {
    expect(ev('\\max_{i=5}^{1} i')).toBeUndefined();
  });
});

describe('유한 집합', () => {
  it('집합 원소 중 극값을 고른다', () => {
    expect(ev('\\max_{x \\in \\{1,2,3\\}} x')).toBe(3);
    expect(ev('\\min_{x \\in \\{4,2,9\\}} x')).toBe(2);
  });

  it('본문이 식이어도 원소마다 평가한다', () => {
    expect(ev('\\max_{x \\in \\{1,2,3\\}} x^2')).toBe(9);
  });

  it('\\left\\{ ... \\right\\} 표기도 읽는다', () => {
    expect(ev('\\max_{x \\in \\left\\{1,5,3\\right\\}} x')).toBe(5);
  });

  it('첨자 없이 집합만 줘도 극값을 구한다', () => {
    expect(ev('\\max\\{1, 2\\}')).toBe(2);
    expect(ev('\\min\\{7, 3, 5\\}')).toBe(3);
  });
});

describe('닫힌 구간', () => {
  it('구간 위 극값을 수치로 찾는다', () => {
    expect(ev('\\max_{x \\in [0, 2]} x')).toBeCloseTo(2, 6);
    expect(ev('\\min_{x \\in [-2, 2]} x^2')).toBeCloseTo(0, 6);
  });

  it('내부에 봉우리가 있어도 찾는다', () => {
    expect(ev('\\max_{x \\in [-1, 1]} (1 - x^2)')).toBeCloseTo(1, 6);
    expect(ev('\\min_{x \\in [0, 4]} (x - 3)^2')).toBeCloseTo(0, 6);
  });

  it('빈 구간은 도메인 밖이다', () => {
    expect(ev('\\max_{x \\in [2, 1]} x')).toBeUndefined();
  });
});

describe('계산할 수 없는 것', () => {
  it('행렬식·확률은 값을 지어내지 않는다', () => {
    expect(ev('\\det A')).toBeUndefined();
    expect(ev('\\Pr(A)')).toBeUndefined();
  });

  it('상한극한·하한극한은 아직 값을 주지 않는다', () => {
    expect(ev('\\limsup_{n=1}^{3} n')).toBeUndefined();
    expect(ev('\\liminf_{n=1}^{3} n')).toBeUndefined();
  });

  it('읽을 수 없는 limits 는 미지원이다', () => {
    expect(ev('\\max_{x \\in S} x')).toBeUndefined();
  });

  it('피연산자가 없으면 미지원이다', () => {
    expect(ev('\\max')).toBeUndefined();
  });
});

describe('피연산자가 하나', () => {
  it('바인딩된 값을 그대로 돌려준다', () => {
    expect(ev('\\max x', { x: 5 })).toBe(5);
  });

  it('바인딩이 없으면 값이 없다', () => {
    expect(ev('\\max x')).toBeUndefined();
  });
});

describe('콜드패스', () => {
  // 등록 묶음이 호출처마다 복제되면 한쪽 API 에서만 조용히 죽는다.
  // 핫패스(evaluateSync)와 콜드패스(evaluate) 양쪽을 모두 지난다.
  it('evaluate 도 같은 값을 돌려준다', () => {
    expect(evCold('\\max(3, 7, 5)')).toEqual({ ok: true, value: 7 });
    expect(evCold('\\max_{i=1}^{4} i')).toEqual({ ok: true, value: 4 });
  });

  it('평가자가 등록되지 않은 채로 실패하지 않는다', () => {
    const out = evCold('\\max(1, 2)');
    expect(out.ok).toBe(true);
  });

  it('계산할 수 없는 것은 이유를 붙여 실패한다', () => {
    const out = evCold('\\det A');
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.status).toBe('unsupported');
  });
});
