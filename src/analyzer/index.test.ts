import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../latex/latex-parser.js';
import { resetLatexIdCounter } from '../utils/id-generator.js';
import { analyzeExpression } from './index.js';

describe('Expression Analyzer (통합)', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('analyzeExpression', () => {
    it('x + y → expression 형태를 반환한다', () => {
      const { ast } = parseLatex('x + y');
      const result = analyzeExpression(ast);

      expect(result.form).toBe('expression');
    });

    it('x = 5 → equation 형태를 반환한다', () => {
      const { ast } = parseLatex('x = 5');
      const result = analyzeExpression(ast);

      expect(result.form).toBe('equation');
    });

    it('x > 3 → inequality 형태를 반환한다', () => {
      const { ast } = parseLatex('x > 3');
      const result = analyzeExpression(ast);

      expect(result.form).toBe('inequality');
    });

    it('x^2 + 2x + 1 → polynomial 도메인을 반환한다', () => {
      const { ast } = parseLatex('x^2 + 2x + 1');
      const result = analyzeExpression(ast);

      expect(result.domains).toContain('polynomial');
      expect(result.primaryDomain).toBe('polynomial');
    });

    it('\\sin(x) → trigonometric 도메인을 반환한다', () => {
      const { ast } = parseLatex('\\sin(x)');
      const result = analyzeExpression(ast);

      expect(result.domains).toContain('trigonometric');
      expect(result.primaryDomain).toBe('trigonometric');
    });

    it('domains 배열이 비어있지 않다', () => {
      const { ast } = parseLatex('x + 1');
      const result = analyzeExpression(ast);

      expect(result.domains.length).toBeGreaterThan(0);
    });

    it('primaryDomain이 문자열이다', () => {
      const { ast } = parseLatex('x + 1');
      const result = analyzeExpression(ast);

      expect(typeof result.primaryDomain).toBe('string');
      expect(result.primaryDomain.length).toBeGreaterThan(0);
    });

    it('variables 배열을 올바르게 반환한다', () => {
      const { ast } = parseLatex('x + y + z');
      const result = analyzeExpression(ast);

      expect(result.variables).toContain('x');
      expect(result.variables).toContain('y');
      expect(result.variables).toContain('z');
      expect(result.variables).toHaveLength(3);
    });

    it('complexity가 1~10 범위이다', () => {
      const inputs = ['1', 'x', 'x^2 + 2x + 1', '\\frac{x}{y}', '\\sin(x)'];

      for (const input of inputs) {
        const { ast } = parseLatex(input);
        const result = analyzeExpression(ast);

        expect(result.complexity).toBeGreaterThanOrEqual(1);
        expect(result.complexity).toBeLessThanOrEqual(10);
      }
    });

    it('summary 는 조립에 쓸 사실을 담는다', () => {
      const { ast } = parseLatex('x^2 + 1');
      const result = analyzeExpression(ast);

      expect(result.summary.variables).toContain('x');
      expect(result.summary.degree).toBe(2);
      expect(result.summary.chemistry).toBeUndefined();
    });

    it('visualization 객체를 반환한다', () => {
      const { ast } = parseLatex('x + 1');
      const result = analyzeExpression(ast);

      expect(result.visualization).toBeDefined();
      expect(typeof result.visualization.graphable2D).toBe('boolean');
      expect(typeof result.visualization.graphable3D).toBe('boolean');
      expect(typeof result.visualization.numberLine).toBe('boolean');
      expect(typeof result.visualization.geometric).toBe('boolean');
      // recommended 필드는 새 Visualizer 프레임워크로 이전됨
    });

    it('빈 AST도 에러 없이 처리한다', () => {
      const { ast } = parseLatex('');
      const result = analyzeExpression(ast);

      expect(result).toBeDefined();
      expect(result.form).toBe('expression');
      expect(Array.isArray(result.domains)).toBe(true);
      expect(Array.isArray(result.variables)).toBe(true);
      expect(Array.isArray(result.features)).toBe(true);
    });
  });

  // ── 화학식 ──
  //
  // 화학식 안의 기호를 수학 어휘로 집계하면 `+` 가 덧셈이 되고 `2-` 가 지수가 된다.
  // 그 결과가 arithmetic 도메인과 constant/has-power 특징이었다.
  describe('화학식 분류', () => {
    it('화합물은 chemical-formula 이고 도메인이 화학이다', () => {
      const result = analyzeExpression(parseLatex('\\ce{H2O}').ast);

      expect(result.form).toBe('chemical-formula');
      expect(result.primaryDomain).toBe('chemistry');
      expect(result.domains).toEqual(['chemistry']);
      expect(result.summary.chemistry).toEqual({ reaction: false, reversible: false });
    });

    it('반응 화살표가 있으면 chemical-equation 이다', () => {
      const result = analyzeExpression(parseLatex('\\ce{2H2 + O2 -> 2H2O}').ast);

      expect(result.form).toBe('chemical-equation');
      expect(result.features).toContain('chemical-reaction');
      expect(result.features).not.toContain('reversible-reaction');
    });

    it('평형 화살표는 가역 반응으로 표시한다', () => {
      const result = analyzeExpression(parseLatex('\\ce{N2 + 3H2 <=>[Fe] 2NH3}').ast);

      expect(result.features).toContain('reversible-reaction');
      expect(result.summary.chemistry).toEqual({ reaction: true, reversible: true });
    });

    it('앞첨자는 동위원소, 첨자 부호는 전하로 읽는다', () => {
      expect(analyzeExpression(parseLatex('\\ce{^{227}_{90}Th}').ast).features).toContain('isotope');
      expect(analyzeExpression(parseLatex('\\ce{SO4^2-}').ast).features).toContain('ionic-charge');
    });

    it('화학식의 + 는 덧셈이 아니고 첨자는 지수가 아니다', () => {
      const result = analyzeExpression(parseLatex('\\ce{2H2 + O2 -> 2H2O}').ast);

      expect(result.domains).not.toContain('arithmetic');
      expect(result.features).not.toContain('constant');
      expect(result.features).not.toContain('has-power');
      expect(result.variables).toEqual([]);
    });

    it('화학식은 그래프로 그릴 수 없다', () => {
      const { visualization } = analyzeExpression(parseLatex('\\ce{2H2 + O2 -> 2H2O}').ast);

      expect(visualization.graphable2D).toBe(false);
      expect(visualization.graphable3D).toBe(false);
      expect(visualization.numberLine).toBe(false);
      expect(visualization.geometric).toBe(false);
    });

    it('화학식 옆의 수식은 그대로 수학으로 읽는다', () => {
      const result = analyzeExpression(parseLatex('\\ce{H2O} + x^2').ast);

      expect(result.primaryDomain).toBe('chemistry');
      expect(result.variables).toEqual(['x']);
      expect(result.features).toContain('has-power');
    });
  });
});
