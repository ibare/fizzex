import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../latex/latex-parser.js';
import { resetLatexIdCounter } from '../utils/id-generator.js';
import { walkAST, findNodes, hasEquality, hasInequality } from './ast-walker.js';
import type { OperatorNode, FuncNode, VariableNode } from '../types.js';

describe('AST Walker', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('walkAST', () => {
    it('빈 AST에서 기본 결과를 반환한다', () => {
      const { ast } = parseLatex('');
      const result = walkAST(ast);

      expect(result.variables.size).toBe(0);
      expect(result.numbers).toHaveLength(0);
      expect(result.operators.size).toBe(0);
      expect(result.functions.size).toBe(0);
      expect(result.constants.size).toBe(0);
    });

    it('변수를 variables Set에 수집한다', () => {
      const { ast } = parseLatex('x + y');
      const result = walkAST(ast);

      expect(result.variables.has('x')).toBe(true);
      expect(result.variables.has('y')).toBe(true);
      expect(result.variables.size).toBe(2);
    });

    it('특수 상수(pi, e)를 constants로 분류한다', () => {
      const { ast } = parseLatex('\\pi + e');
      const result = walkAST(ast);

      // pi는 그리스 문자로 파싱되어 variable name이 'pi' 또는 'π'
      const hasPI = result.constants.has('pi') || result.constants.has('Pi') || result.constants.has('π');
      expect(hasPI).toBe(true);
      expect(result.constants.has('e')).toBe(true);
      // 특수 상수는 variables에 포함되지 않음
      expect(result.variables.has('e')).toBe(false);
    });

    it('숫자를 numbers 배열에 수집한다', () => {
      const { ast } = parseLatex('1 + 2');
      const result = walkAST(ast);

      expect(result.numbers).toContain(1);
      expect(result.numbers).toContain(2);
    });

    it('연산자를 operators Set에 수집한다', () => {
      const { ast } = parseLatex('x + y - z');
      const result = walkAST(ast);

      expect(result.operators.has('+')).toBe(true);
      expect(result.operators.has('-')).toBe(true);
    });

    it('함수를 functions Map에 수집한다', () => {
      const { ast } = parseLatex('\\sin{x}');
      const result = walkAST(ast);

      expect(result.functions.has('sin')).toBe(true);
      expect(result.functions.get('sin')).toBe(1);
    });

    it('같은 함수가 여러 번 등장하면 카운트를 증가시킨다', () => {
      const { ast } = parseLatex('\\sin{x} + \\sin{y}');
      const result = walkAST(ast);

      expect(result.functions.get('sin')).toBe(2);
    });

    it('nodeTypeCounts를 올바르게 집계한다', () => {
      const { ast } = parseLatex('x + y');
      const result = walkAST(ast);

      expect(result.nodeTypeCounts['root']).toBe(1);
      expect(result.nodeTypeCounts['variable']).toBe(2);
      expect(result.nodeTypeCounts['operator']).toBe(1);
    });

    it('maxDepth를 올바르게 계산한다', () => {
      // 단순 수식 vs 중첩 수식의 깊이 비교
      const { ast: simpleAst } = parseLatex('x');
      const simpleResult = walkAST(simpleAst);

      const { ast: nestedAst } = parseLatex('\\frac{\\frac{1}{2}}{3}');
      const nestedResult = walkAST(nestedAst);

      expect(nestedResult.maxDepth).toBeGreaterThan(simpleResult.maxDepth);
    });

    it('totalNodes를 올바르게 계산한다', () => {
      const { ast } = parseLatex('x');
      const result = walkAST(ast);

      // root(1) + variable(1) = 최소 2
      expect(result.totalNodes).toBeGreaterThanOrEqual(2);
    });

    it('frac 내부까지 순회한다', () => {
      const { ast } = parseLatex('\\frac{x}{y}');
      const result = walkAST(ast);

      expect(result.variables.has('x')).toBe(true);
      expect(result.variables.has('y')).toBe(true);
      expect(result.nodeTypeCounts['frac']).toBe(1);
    });

    it('power/subscript 내부까지 순회한다', () => {
      const { ast } = parseLatex('x^2');
      const result = walkAST(ast);

      expect(result.variables.has('x')).toBe(true);
      expect(result.numbers).toContain(2);
      expect(result.nodeTypeCounts['power']).toBe(1);
    });

    it('integral 내부까지 순회한다', () => {
      const { ast } = parseLatex('\\int_{0}^{1} x dx');
      const result = walkAST(ast);

      expect(result.nodeTypeCounts['integral']).toBe(1);
      expect(result.numbers).toContain(0);
      expect(result.numbers).toContain(1);
      expect(result.variables.has('x')).toBe(true);
    });
  });

  describe('findNodes', () => {
    it('특정 타입의 모든 노드를 찾는다', () => {
      const { ast } = parseLatex('x + y');
      const operators = findNodes<OperatorNode>(ast, 'operator');

      expect(operators).toHaveLength(1);
      expect(operators[0].operator).toBe('+');
    });

    it('깊게 중첩된 노드도 찾는다', () => {
      const { ast } = parseLatex('\\frac{\\sin{x}}{y}');
      const funcs = findNodes<FuncNode>(ast, 'func');

      expect(funcs).toHaveLength(1);
      expect(funcs[0].name).toBe('sin');
    });

    it('해당 타입이 없으면 빈 배열을 반환한다', () => {
      const { ast } = parseLatex('x + y');
      const funcs = findNodes<FuncNode>(ast, 'func');

      expect(funcs).toHaveLength(0);
    });
  });

  describe('hasEquality', () => {
    it('= 연산자가 있으면 true를 반환한다', () => {
      const { ast } = parseLatex('x = 1');
      expect(hasEquality(ast)).toBe(true);
    });

    it('= 연산자가 없으면 false를 반환한다', () => {
      const { ast } = parseLatex('x + 1');
      expect(hasEquality(ast)).toBe(false);
    });
  });

  describe('hasInequality', () => {
    it('< 연산자가 있으면 true를 반환한다', () => {
      const { ast } = parseLatex('x < 1');
      expect(hasInequality(ast)).toBe(true);
    });

    it('> 연산자가 있으면 true를 반환한다', () => {
      const { ast } = parseLatex('x > 1');
      expect(hasInequality(ast)).toBe(true);
    });

    it('부등호가 없으면 false를 반환한다', () => {
      const { ast } = parseLatex('x + 1');
      expect(hasInequality(ast)).toBe(false);
    });
  });
});
