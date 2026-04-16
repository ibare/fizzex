import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../latex/latex-parser';
import { resetLatexIdCounter } from '../utils/id-generator';
import { walkAST } from './ast-walker';
import { createFunctionInfoList } from './function-detector';
import { detectDomains, determinePrimaryDomain } from './domain-detector';

/** parseLatex -> walkAST -> createFunctionInfoList 파이프라인 헬퍼 */
function analyzeLatex(latex: string) {
  const { ast } = parseLatex(latex);
  const collected = walkAST(ast);
  const functions = createFunctionInfoList(collected.functions);
  return { collected, functions };
}

describe('Domain Detector', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('detectDomains', () => {
    it('숫자와 연산자만 있으면 arithmetic을 포함한다', () => {
      const { collected, functions } = analyzeLatex('1 + 2');
      const domains = detectDomains(collected, functions);

      expect(domains).toContain('arithmetic');
    });

    it('삼각함수가 있으면 trigonometric을 포함한다', () => {
      const { collected, functions } = analyzeLatex('\\sin{x}');
      const domains = detectDomains(collected, functions);

      expect(domains).toContain('trigonometric');
    });

    it('로그함수가 있으면 logarithmic을 포함한다', () => {
      const { collected, functions } = analyzeLatex('\\log{x}');
      const domains = detectDomains(collected, functions);

      expect(domains).toContain('logarithmic');
    });

    it('변수와 거듭제곱이 있으면 polynomial을 포함한다', () => {
      const { collected, functions } = analyzeLatex('x^2 + x + 1');
      const domains = detectDomains(collected, functions);

      expect(domains).toContain('polynomial');
    });

    it('분수에 변수가 있으면 rational을 포함한다', () => {
      const { collected, functions } = analyzeLatex('\\frac{x}{y}');
      const domains = detectDomains(collected, functions);

      expect(domains).toContain('rational');
    });

    it('적분/극한이 있으면 calculus를 포함한다', () => {
      const { collected, functions } = analyzeLatex('\\int x dx');
      const domains = detectDomains(collected, functions);

      expect(domains).toContain('calculus');
    });

    it('행렬이 있으면 linear-algebra를 포함한다', () => {
      const { collected, functions } = analyzeLatex(
        '\\begin{matrix}1 & 2\\\\3 & 4\\end{matrix}'
      );
      const domains = detectDomains(collected, functions);

      expect(domains).toContain('linear-algebra');
    });
  });

  describe('determinePrimaryDomain', () => {
    it('calculus가 있으면 calculus를 반환한다', () => {
      const result = determinePrimaryDomain([
        'arithmetic',
        'polynomial',
        'calculus',
      ]);
      expect(result).toBe('calculus');
    });

    it('trigonometric만 있으면 trigonometric을 반환한다', () => {
      const result = determinePrimaryDomain(['trigonometric']);
      expect(result).toBe('trigonometric');
    });

    it('빈 도메인 배열이면 arithmetic을 반환한다', () => {
      const result = determinePrimaryDomain([]);
      expect(result).toBe('arithmetic');
    });

    it('우선순위에 따라 가장 특징적인 도메인을 반환한다', () => {
      // linear-algebra > trigonometric > polynomial > arithmetic
      const result = determinePrimaryDomain([
        'arithmetic',
        'polynomial',
        'trigonometric',
        'linear-algebra',
      ]);
      expect(result).toBe('linear-algebra');
    });
  });
});
