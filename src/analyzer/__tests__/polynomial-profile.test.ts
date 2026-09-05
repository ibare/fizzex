import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../latex/index.js';
import { analyzePolynomialProfile } from '../polynomial-profile.js';
import { analyzeExpression } from '../index.js';

const profile = (latex: string) => analyzePolynomialProfile(parseLatex(latex).ast);

describe('다항식 프로파일', () => {
  describe('analyzeExpression 이 오판하던 것들', () => {
    // 이 여섯이 파사드를 만든 이유다. analyzeExpression 은 전부 1차라고 답한다.
    it.each([
      ['2^x', '지수함수'],
      ['\\frac{1}{x}', '유리식'],
      ['\\sin(x)', '초월함수'],
      ['\\sqrt{x}', '무리식'],
      ['e^x', '자연지수'],
    ])('%s (%s) 는 다항식이 아니다', (latex) => {
      expect(profile(latex).degree).toBeNull();
    });

    it('다변수는 항별 total degree 로 잰다', () => {
      // x^2y 의 total degree 는 3 이다. analyzeExpression 은 2 라고 답한다.
      expect(profile('x^2 y + y^2').degree).toBe(3);
    });

    it('기존 분석기와 실제로 다르다', () => {
      const ast = parseLatex('2^x').ast;
      expect(analyzeExpression(ast).polynomial?.degree).toBe(1); // 오판
      expect(analyzePolynomialProfile(ast).degree).toBeNull(); // 정확
    });
  });

  describe('shape 별 부분식 선택', () => {
    it('정의식은 우변으로 잰다', () => {
      const p = profile('y = ax^2 + bx + c');
      expect(p).toMatchObject({
        shape: 'definition',
        dependent: 'y',
        mainVariables: ['x'],
        parameters: ['a', 'b', 'c'],
        degree: 2,
      });
    });

    it('등식은 한쪽으로 모아서 잰다', () => {
      expect(profile('x^2 + 2x - 3 = 0')).toMatchObject({ shape: 'equation', degree: 2 });
    });

    it('식은 그대로 잰다', () => {
      expect(profile('x^3 - 6x^2 + 11x - 6')).toMatchObject({ shape: 'expression', degree: 3 });
    });

    it('부등식은 다항식이어도 차수를 내지 않는다', () => {
      // shape 가 차수 산출 대상이 아니다 — degree:null 의 두 번째 의미
      expect(profile('x^2 + 1 > 0')).toMatchObject({ shape: 'inequality', degree: null });
    });

    it('관계가 둘 이상이면 차수를 내지 않는다', () => {
      expect(profile('a = b = c')).toMatchObject({ shape: 'multi-relation', degree: null });
    });
  });

  describe('계수', () => {
    it('수치 계수를 차수별로 준다', () => {
      expect(profile('y = x^2 + 6x + 9').coefficients).toEqual({ 0: 9, 1: 6, 2: 1 });
    });

    it('심볼 계수는 이름으로 준다', () => {
      expect(profile('y = ax^2 + bx + c').coefficients).toEqual({ 0: 'c', 1: 'b', 2: 'a' });
    });

    it('부정원이 둘 이상이면 계수를 내지 않는다', () => {
      expect(profile('x^2 y + y^2').coefficients).toBeUndefined();
    });

    it('복합식 계수가 섞이면 통째로 생략한다', () => {
      // 일부만 주면 빠진 차수를 0 으로 오해한다
      const p = profile('y = (a + b)x^2 + 3x');
      expect(p.degree).toBe(2);
      expect(p.coefficients).toBeUndefined();
    });
  });

  describe('상수는 태그일 뿐 분할이 아니다', () => {
    it('상수명과 겹치는 심볼이 부정원·파라미터에도 남는다', () => {
      // φ 가 각도인지 황금비인지 이 층은 모른다. 판단하지 않고 태그만 단다.
      const p = profile('y = \\varphi x');
      expect(p.constants).toContain('φ');
      expect([...p.mainVariables, ...p.parameters]).toContain('φ');
    });
  });

  describe('심볼 표기', () => {
    it('정규형으로 준다 — \\pi 가 아니라 π', () => {
      const p = profile('y = \\pi x^2');
      expect(p.parameters).toContain('π');
      expect(p.constants).toContain('π');
    });

    it('아래첨자를 보존한다 — N_0 와 N 은 다른 심볼', () => {
      const p = profile('y = N_0 x');
      expect(p.parameters).toContain('N_0');
    });
  });

  describe('IR 이 새지 않는다', () => {
    it('공개 필드는 정해진 것뿐이다', () => {
      // 이 파일의 존재 이유가 IR 은닉이다. 누가 canonicalSide 나 src 를 실으면
      // 여기서 걸린다.
      const p = profile('y = ax^2 + bx + c');
      expect(Object.keys(p).sort()).toEqual(
        ['coefficients', 'constants', 'degree', 'dependent', 'mainVariables', 'normalized', 'parameters', 'shape'],
      );
    });

    it('JSON 왕복에서 잃는 것이 없다 — 순수 데이터다', () => {
      const p = profile('x^2 + 2x - 3 = 0');
      expect(JSON.parse(JSON.stringify(p))).toEqual(p);
    });
  });

  describe('정규화 실패', () => {
    it('모델링하지 않는 연산자가 섞이면 normalized 가 false 다', () => {
      const p = profile('x \\pm 1');
      expect(p.normalized).toBe(false);
      // 나머지 필드는 여전히 유효하다
      expect(p.shape).toBe('expression');
    });
  });
});
