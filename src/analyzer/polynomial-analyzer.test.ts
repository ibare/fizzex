import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../latex/latex-parser';
import { resetLatexIdCounter } from '../utils/id-generator';
import { walkAST } from './ast-walker';
import { analyzePolynomial, getDegreeLabel } from './polynomial-analyzer';

describe('Polynomial Analyzer', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('analyzePolynomial', () => {
    it('변수가 없으면 undefined를 반환한다', () => {
      const { ast } = parseLatex('123');
      const collected = walkAST(ast);
      const result = analyzePolynomial(ast, collected);

      expect(result).toBeUndefined();
    });

    it('x -> degree 1을 반환한다', () => {
      const { ast } = parseLatex('x');
      const collected = walkAST(ast);
      const result = analyzePolynomial(ast, collected);

      expect(result).toBeDefined();
      expect(result!.degree).toBe(1);
      expect(result!.mainVariable).toBe('x');
    });

    it('x^2 -> degree 2를 반환한다', () => {
      const { ast } = parseLatex('x^2');
      const collected = walkAST(ast);
      const result = analyzePolynomial(ast, collected);

      expect(result).toBeDefined();
      expect(result!.degree).toBe(2);
      expect(result!.mainVariable).toBe('x');
    });

    it('x^3 + x^2 + x -> degree 3을 반환한다', () => {
      const { ast } = parseLatex('x^3+x^2+x');
      const collected = walkAST(ast);
      const result = analyzePolynomial(ast, collected);

      expect(result).toBeDefined();
      expect(result!.degree).toBe(3);
    });

    it('ax^2 + bx + c에서 올바른 차수를 반환한다', () => {
      const { ast } = parseLatex('ax^2+bx+c');
      const collected = walkAST(ast);
      const result = analyzePolynomial(ast, collected);

      expect(result).toBeDefined();
      expect(result!.degree).toBe(2);
    });

    it('mainVariable을 올바르게 결정한다', () => {
      const { ast } = parseLatex('x^2+y');
      const collected = walkAST(ast);
      const result = analyzePolynomial(ast, collected);

      expect(result).toBeDefined();
      // x는 2차이고 y는 1차이므로 x가 mainVariable
      expect(result!.mainVariable).toBe('x');
    });

    it('variables 배열을 올바르게 포함한다', () => {
      const { ast } = parseLatex('x^2+y');
      const collected = walkAST(ast);
      const result = analyzePolynomial(ast, collected);

      expect(result).toBeDefined();
      expect(result!.variables).toContain('x');
      expect(result!.variables).toContain('y');
    });
  });

  describe('getDegreeLabel', () => {
    it('1 -> linear', () => {
      expect(getDegreeLabel(1)).toBe('linear');
    });

    it('2 -> quadratic', () => {
      expect(getDegreeLabel(2)).toBe('quadratic');
    });

    it('3 -> cubic', () => {
      expect(getDegreeLabel(3)).toBe('cubic');
    });

    it('4 이상 -> degree-N 형태', () => {
      expect(getDegreeLabel(4)).toBe('quartic');
      expect(getDegreeLabel(5)).toBe('quintic');
      expect(getDegreeLabel(6)).toBe('degree-6');
      expect(getDegreeLabel(10)).toBe('degree-10');
    });
  });
});
