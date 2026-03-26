import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../latex/latex-parser';
import { resetLatexIdCounter } from '../utils/id-generator';
import { analyzeExpression } from './index';

describe('Expression Analyzer (통합)', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('analyzeExpression', () => {
    it('x + y → expression 형태를 반환한다', () => {
      const ast = parseLatex('x + y');
      const result = analyzeExpression(ast);

      expect(result.form).toBe('expression');
    });

    it('x = 5 → equation 형태를 반환한다', () => {
      const ast = parseLatex('x = 5');
      const result = analyzeExpression(ast);

      expect(result.form).toBe('equation');
    });

    it('x > 3 → inequality 형태를 반환한다', () => {
      const ast = parseLatex('x > 3');
      const result = analyzeExpression(ast);

      expect(result.form).toBe('inequality');
    });

    it('x^2 + 2x + 1 → polynomial 도메인을 반환한다', () => {
      const ast = parseLatex('x^2 + 2x + 1');
      const result = analyzeExpression(ast);

      expect(result.domains).toContain('polynomial');
      expect(result.primaryDomain).toBe('polynomial');
    });

    it('\\sin(x) → trigonometric 도메인을 반환한다', () => {
      const ast = parseLatex('\\sin(x)');
      const result = analyzeExpression(ast);

      expect(result.domains).toContain('trigonometric');
      expect(result.primaryDomain).toBe('trigonometric');
    });

    it('domains 배열이 비어있지 않다', () => {
      const ast = parseLatex('x + 1');
      const result = analyzeExpression(ast);

      expect(result.domains.length).toBeGreaterThan(0);
    });

    it('primaryDomain이 문자열이다', () => {
      const ast = parseLatex('x + 1');
      const result = analyzeExpression(ast);

      expect(typeof result.primaryDomain).toBe('string');
      expect(result.primaryDomain.length).toBeGreaterThan(0);
    });

    it('variables 배열을 올바르게 반환한다', () => {
      const ast = parseLatex('x + y + z');
      const result = analyzeExpression(ast);

      expect(result.variables).toContain('x');
      expect(result.variables).toContain('y');
      expect(result.variables).toContain('z');
      expect(result.variables).toHaveLength(3);
    });

    it('complexity가 1~10 범위이다', () => {
      const inputs = ['1', 'x', 'x^2 + 2x + 1', '\\frac{x}{y}', '\\sin(x)'];

      for (const input of inputs) {
        const ast = parseLatex(input);
        const result = analyzeExpression(ast);

        expect(result.complexity).toBeGreaterThanOrEqual(1);
        expect(result.complexity).toBeLessThanOrEqual(10);
      }
    });

    it('summary가 빈 문자열이 아니다', () => {
      const ast = parseLatex('x^2 + 1');
      const result = analyzeExpression(ast);

      expect(result.summary).not.toBe('');
      expect(typeof result.summary).toBe('string');
    });

    it('visualization 객체를 반환한다', () => {
      const ast = parseLatex('x + 1');
      const result = analyzeExpression(ast);

      expect(result.visualization).toBeDefined();
      expect(typeof result.visualization.graphable2D).toBe('boolean');
      expect(typeof result.visualization.graphable3D).toBe('boolean');
      expect(typeof result.visualization.numberLine).toBe('boolean');
      expect(typeof result.visualization.geometric).toBe('boolean');
      expect(Array.isArray(result.visualization.recommended)).toBe(true);
    });

    it('빈 AST도 에러 없이 처리한다', () => {
      const ast = parseLatex('');
      const result = analyzeExpression(ast);

      expect(result).toBeDefined();
      expect(result.form).toBe('expression');
      expect(Array.isArray(result.domains)).toBe(true);
      expect(Array.isArray(result.variables)).toBe(true);
      expect(Array.isArray(result.features)).toBe(true);
    });
  });
});
