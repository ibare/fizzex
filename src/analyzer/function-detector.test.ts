import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../latex/latex-parser';
import { resetLatexIdCounter } from '../utils/id-generator';
import { walkAST } from './ast-walker';
import {
  getFunctionCategory,
  createFunctionInfoList,
  hasTrigonometric,
  hasLogarithmic,
  hasExponential,
} from './function-detector';
import type { FunctionInfo } from './types';

describe('Function Detector', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('getFunctionCategory', () => {
    it('sin -> trigonometric', () => {
      expect(getFunctionCategory('sin')).toBe('trigonometric');
    });

    it('cos -> trigonometric', () => {
      expect(getFunctionCategory('cos')).toBe('trigonometric');
    });

    it('arcsin -> inverse-trigonometric', () => {
      expect(getFunctionCategory('arcsin')).toBe('inverse-trigonometric');
    });

    it('sinh -> hyperbolic', () => {
      expect(getFunctionCategory('sinh')).toBe('hyperbolic');
    });

    it('exp -> exponential', () => {
      expect(getFunctionCategory('exp')).toBe('exponential');
    });

    it('log -> logarithmic', () => {
      expect(getFunctionCategory('log')).toBe('logarithmic');
    });

    it('ln -> logarithmic', () => {
      expect(getFunctionCategory('ln')).toBe('logarithmic');
    });

    it('sqrt -> root', () => {
      expect(getFunctionCategory('sqrt')).toBe('root');
    });

    it('unknown -> other', () => {
      expect(getFunctionCategory('myFunc')).toBe('other');
    });
  });

  describe('createFunctionInfoList', () => {
    it('Map을 FunctionInfo 배열로 변환한다', () => {
      const funcMap = new Map<string, number>([['sin', 2]]);
      const result = createFunctionInfoList(funcMap);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('sin');
      expect(result[0].category).toBe('trigonometric');
      expect(result[0].count).toBe(2);
    });

    it('결과를 카테고리별로 정렬한다', () => {
      const funcMap = new Map<string, number>([
        ['sin', 1],
        ['exp', 1],
        ['log', 1],
      ]);
      const result = createFunctionInfoList(funcMap);

      // 카테고리 알파벳 순: exponential < logarithmic < trigonometric
      expect(result[0].category).toBe('exponential');
      expect(result[1].category).toBe('logarithmic');
      expect(result[2].category).toBe('trigonometric');
    });

    it('등장 횟수를 올바르게 포함한다', () => {
      const { ast } = parseLatex('\\sin{x} + \\sin{y} + \\cos{z}');
      const collected = walkAST(ast);
      const result = createFunctionInfoList(collected.functions);

      const sinInfo = result.find((f) => f.name === 'sin');
      const cosInfo = result.find((f) => f.name === 'cos');
      expect(sinInfo?.count).toBe(2);
      expect(cosInfo?.count).toBe(1);
    });

    it('빈 Map은 빈 배열을 반환한다', () => {
      const funcMap = new Map<string, number>();
      const result = createFunctionInfoList(funcMap);

      expect(result).toHaveLength(0);
    });
  });

  describe('hasTrigonometric', () => {
    it('삼각함수가 있으면 true를 반환한다', () => {
      const functions: FunctionInfo[] = [
        { name: 'sin', category: 'trigonometric', count: 1 },
      ];
      expect(hasTrigonometric(functions)).toBe(true);
    });

    it('삼각함수가 없으면 false를 반환한다', () => {
      const functions: FunctionInfo[] = [
        { name: 'log', category: 'logarithmic', count: 1 },
      ];
      expect(hasTrigonometric(functions)).toBe(false);
    });
  });

  describe('hasLogarithmic', () => {
    it('로그함수가 있으면 true를 반환한다', () => {
      const functions: FunctionInfo[] = [
        { name: 'log', category: 'logarithmic', count: 1 },
      ];
      expect(hasLogarithmic(functions)).toBe(true);
    });

    it('로그함수가 없으면 false를 반환한다', () => {
      const functions: FunctionInfo[] = [
        { name: 'sin', category: 'trigonometric', count: 1 },
      ];
      expect(hasLogarithmic(functions)).toBe(false);
    });
  });

  describe('hasExponential', () => {
    it('지수함수가 있으면 true를 반환한다', () => {
      const functions: FunctionInfo[] = [
        { name: 'exp', category: 'exponential', count: 1 },
      ];
      expect(hasExponential(functions)).toBe(true);
    });

    it('지수함수가 없으면 false를 반환한다', () => {
      const functions: FunctionInfo[] = [
        { name: 'sin', category: 'trigonometric', count: 1 },
      ];
      expect(hasExponential(functions)).toBe(false);
    });
  });
});
