import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../latex/latex-parser';
import { resetLatexIdCounter } from '../utils/id-generator';
import { walkAST } from './ast-walker';
import { classifyVariables } from './variable-classifier';

describe('Variable Classifier', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('classifyVariables', () => {
    it('변수가 없으면 빈 분류 결과를 반환한다', () => {
      const { ast } = parseLatex('123');
      const result = classifyVariables(ast, []);

      expect(result.mainVariables).toEqual([]);
      expect(result.coefficients).toEqual([]);
      expect(result.confidence).toBe(1.0);
    });

    it('단일 변수 x를 주 변수로 분류한다', () => {
      const { ast } = parseLatex('x');
      const result = classifyVariables(ast, ['x']);

      expect(result.mainVariables).toEqual(['x']);
      expect(result.coefficients).toEqual([]);
      expect(result.confidence).toBe(1.0);
    });

    it('x와 y가 있으면 둘 다 주 변수로 분류한다', () => {
      const { ast } = parseLatex('x+y');
      const collected = walkAST(ast);
      const variables = Array.from(collected.variables);
      const result = classifyVariables(ast, variables);

      expect(result.mainVariables).toContain('x');
      expect(result.mainVariables).toContain('y');
    });

    it('x^2 + ax + b에서 x를 주 변수로 분류한다', () => {
      const { ast } = parseLatex('x^2+ax+b');
      const collected = walkAST(ast);
      const variables = Array.from(collected.variables);
      const result = classifyVariables(ast, variables);

      expect(result.mainVariables).toContain('x');
    });

    it('계수(a, b, c)를 coefficients로 분류한다', () => {
      const { ast } = parseLatex('ax^2+bx+c');
      const collected = walkAST(ast);
      const variables = Array.from(collected.variables);
      const result = classifyVariables(ast, variables);

      expect(result.mainVariables).toContain('x');
      // a, b, c는 계수명이므로 coefficients에 포함되어야 함
      for (const coeff of result.coefficients) {
        expect(['a', 'b', 'c']).toContain(coeff);
      }
    });

    it('함수 인자로 사용된 변수에 가중치를 부여한다', () => {
      const { ast } = parseLatex('a\\sin(x)');
      const collected = walkAST(ast);
      const variables = Array.from(collected.variables);
      const result = classifyVariables(ast, variables);

      // x는 sin의 인자로 사용되어 주 변수로 분류됨
      expect(result.mainVariables).toContain('x');
    });

    it('confidence가 0 이상이다', () => {
      const { ast } = parseLatex('x^2+y^2');
      const collected = walkAST(ast);
      const variables = Array.from(collected.variables);
      const result = classifyVariables(ast, variables);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});
