import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../latex/latex-parser';
import { resetLatexIdCounter } from '../utils/id-generator';
import { walkAST } from './ast-walker';
import { analyzePolynomial } from './polynomial-analyzer';
import { createFunctionInfoList } from './function-detector';
import { detectDomains } from './domain-detector';
import {
  extractFeatures,
  analyzeVisualization,
  calculateComplexity,
  generateSummary,
} from './feature-extractor';

describe('Feature Extractor', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('extractFeatures', () => {
    it('상수만 있으면 constant를 포함한다', () => {
      const ast = parseLatex('42');
      const collected = walkAST(ast);
      const polynomial = analyzePolynomial(ast, collected);
      const functions = createFunctionInfoList(collected.functions);

      const features = extractFeatures(collected, polynomial, functions);

      expect(features).toContain('constant');
    });

    it('변수 1개면 single-variable를 포함한다', () => {
      const ast = parseLatex('x + 1');
      const collected = walkAST(ast);
      const polynomial = analyzePolynomial(ast, collected);
      const functions = createFunctionInfoList(collected.functions);

      const features = extractFeatures(collected, polynomial, functions);

      expect(features).toContain('single-variable');
      expect(features).not.toContain('multi-variable');
    });

    it('변수 2개 이상이면 multi-variable를 포함한다', () => {
      const ast = parseLatex('x + y');
      const collected = walkAST(ast);
      const polynomial = analyzePolynomial(ast, collected);
      const functions = createFunctionInfoList(collected.functions);

      const features = extractFeatures(collected, polynomial, functions);

      expect(features).toContain('multi-variable');
      expect(features).not.toContain('single-variable');
    });

    it('frac이 있으면 has-fraction을 포함한다', () => {
      const ast = parseLatex('\\frac{1}{2}');
      const collected = walkAST(ast);
      const polynomial = analyzePolynomial(ast, collected);
      const functions = createFunctionInfoList(collected.functions);

      const features = extractFeatures(collected, polynomial, functions);

      expect(features).toContain('has-fraction');
    });

    it('power가 있으면 has-power를 포함한다', () => {
      const ast = parseLatex('x^2');
      const collected = walkAST(ast);
      const polynomial = analyzePolynomial(ast, collected);
      const functions = createFunctionInfoList(collected.functions);

      const features = extractFeatures(collected, polynomial, functions);

      expect(features).toContain('has-power');
    });

    it('sqrt가 있으면 has-sqrt를 포함한다', () => {
      const ast = parseLatex('\\sqrt{x}');
      const collected = walkAST(ast);
      const polynomial = analyzePolynomial(ast, collected);
      const functions = createFunctionInfoList(collected.functions);

      const features = extractFeatures(collected, polynomial, functions);

      expect(features).toContain('has-sqrt');
    });
  });

  describe('analyzeVisualization', () => {
    it('단일 변수면 graphable2D가 true이다', () => {
      const ast = parseLatex('x + 1');
      const collected = walkAST(ast);
      const polynomial = analyzePolynomial(ast, collected);
      const functions = createFunctionInfoList(collected.functions);
      const domains = detectDomains(collected, functions);
      const features = extractFeatures(collected, polynomial, functions);

      const viz = analyzeVisualization(collected, domains, features);

      expect(viz.graphable2D).toBe(true);
    });

    it('2개 변수면 graphable3D가 true이다', () => {
      const ast = parseLatex('x + y');
      const collected = walkAST(ast);
      const polynomial = analyzePolynomial(ast, collected);
      const functions = createFunctionInfoList(collected.functions);
      const domains = detectDomains(collected, functions);
      const features = extractFeatures(collected, polynomial, functions);

      const viz = analyzeVisualization(collected, domains, features);

      expect(viz.graphable3D).toBe(true);
    });

    it('상수면 numberLine이 true이다', () => {
      const ast = parseLatex('42');
      const collected = walkAST(ast);
      const polynomial = analyzePolynomial(ast, collected);
      const functions = createFunctionInfoList(collected.functions);
      const domains = detectDomains(collected, functions);
      const features = extractFeatures(collected, polynomial, functions);

      const viz = analyzeVisualization(collected, domains, features);

      expect(viz.numberLine).toBe(true);
    });

    it('recommended 배열이 비어있지 않다', () => {
      const ast = parseLatex('x + 1');
      const collected = walkAST(ast);
      const polynomial = analyzePolynomial(ast, collected);
      const functions = createFunctionInfoList(collected.functions);
      const domains = detectDomains(collected, functions);
      const features = extractFeatures(collected, polynomial, functions);

      const viz = analyzeVisualization(collected, domains, features);

      expect(viz.recommended.length).toBeGreaterThan(0);
    });
  });

  describe('calculateComplexity', () => {
    it('간단한 수식은 낮은 점수를 반환한다', () => {
      const ast = parseLatex('x + 1');
      const collected = walkAST(ast);
      const polynomial = analyzePolynomial(ast, collected);
      const functions = createFunctionInfoList(collected.functions);

      const score = calculateComplexity(collected, polynomial, functions);

      expect(score).toBeLessThanOrEqual(4);
    });

    it('복잡한 수식은 높은 점수를 반환한다', () => {
      const ast = parseLatex(
        '\\int_{0}^{\\infty} \\frac{\\sin(x^2 + y^2)}{\\sqrt{x^2 + y^2}} dx'
      );
      const collected = walkAST(ast);
      const polynomial = analyzePolynomial(ast, collected);
      const functions = createFunctionInfoList(collected.functions);

      const score = calculateComplexity(collected, polynomial, functions);

      expect(score).toBeGreaterThanOrEqual(5);
    });

    it('점수가 1~10 범위이다', () => {
      const inputs = ['1', 'x', 'x^2 + 2x + 1', '\\frac{x}{y}', '\\sin(x)'];

      for (const input of inputs) {
        const ast = parseLatex(input);
        const collected = walkAST(ast);
        const polynomial = analyzePolynomial(ast, collected);
        const functions = createFunctionInfoList(collected.functions);

        const score = calculateComplexity(collected, polynomial, functions);

        expect(score).toBeGreaterThanOrEqual(1);
        expect(score).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('generateSummary', () => {
    it('요약 문자열을 생성한다', () => {
      const ast = parseLatex('x^2 + 2x + 1');
      const collected = walkAST(ast);
      const polynomial = analyzePolynomial(ast, collected);
      const functions = createFunctionInfoList(collected.functions);
      const domains = detectDomains(collected, functions);
      const features = extractFeatures(collected, polynomial, functions);
      const variables = Array.from(collected.variables);

      const summary = generateSummary(
        domains,
        features,
        polynomial,
        functions,
        variables
      );

      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('빈 문자열이 아니다', () => {
      const ast = parseLatex('42');
      const collected = walkAST(ast);
      const polynomial = analyzePolynomial(ast, collected);
      const functions = createFunctionInfoList(collected.functions);
      const domains = detectDomains(collected, functions);
      const features = extractFeatures(collected, polynomial, functions);
      const variables = Array.from(collected.variables);

      const summary = generateSummary(
        domains,
        features,
        polynomial,
        functions,
        variables
      );

      expect(summary).not.toBe('');
    });
  });
});
