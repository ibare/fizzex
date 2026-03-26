import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../latex-parser';
import { resetLatexIdCounter } from '../../utils/id-generator';
import type { FuncNode, VariableNode, ParenNode } from '../../types';

describe('Function Command Handlers', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('삼각함수', () => {
    it('\\sin(x) → func 노드를 생성한다', () => {
      const result = parseLatex('\\sin(x)');

      expect(result.children).toHaveLength(1);
      const func = result.children[0] as FuncNode;
      expect(func.type).toBe('func');
      expect(func.name).toBe('sin');
      expect(func.argument).toHaveLength(1);
      expect(func.argument[0].type).toBe('paren');
    });

    it('\\cos(x) → func 노드를 생성한다', () => {
      const result = parseLatex('\\cos(x)');

      expect(result.children).toHaveLength(1);
      const func = result.children[0] as FuncNode;
      expect(func.type).toBe('func');
      expect(func.name).toBe('cos');
      expect(func.argument).toHaveLength(1);
    });

    it('\\tan(x) → func 노드를 생성한다', () => {
      const result = parseLatex('\\tan(x)');

      expect(result.children).toHaveLength(1);
      const func = result.children[0] as FuncNode;
      expect(func.type).toBe('func');
      expect(func.name).toBe('tan');
    });

    it('\\cot(x) → func 노드를 생성한다', () => {
      const result = parseLatex('\\cot(x)');

      expect(result.children).toHaveLength(1);
      const func = result.children[0] as FuncNode;
      expect(func.type).toBe('func');
      expect(func.name).toBe('cot');
    });

    it('\\sec(x) → func 노드를 생성한다', () => {
      const result = parseLatex('\\sec(x)');

      expect(result.children).toHaveLength(1);
      const func = result.children[0] as FuncNode;
      expect(func.type).toBe('func');
      expect(func.name).toBe('sec');
    });

    it('\\csc(x) → func 노드를 생성한다', () => {
      const result = parseLatex('\\csc(x)');

      expect(result.children).toHaveLength(1);
      const func = result.children[0] as FuncNode;
      expect(func.type).toBe('func');
      expect(func.name).toBe('csc');
    });
  });

  describe('역삼각함수', () => {
    it('\\arcsin(x) → func 노드를 생성한다', () => {
      const result = parseLatex('\\arcsin(x)');

      expect(result.children).toHaveLength(1);
      const func = result.children[0] as FuncNode;
      expect(func.type).toBe('func');
      expect(func.name).toBe('arcsin');
      expect(func.argument).toHaveLength(1);
    });

    it('\\arccos(x) → func 노드를 생성한다', () => {
      const result = parseLatex('\\arccos(x)');

      expect(result.children).toHaveLength(1);
      const func = result.children[0] as FuncNode;
      expect(func.type).toBe('func');
      expect(func.name).toBe('arccos');
    });
  });

  describe('로그/지수 함수', () => {
    it('\\log(x) → func 노드를 생성한다', () => {
      const result = parseLatex('\\log(x)');

      expect(result.children).toHaveLength(1);
      const func = result.children[0] as FuncNode;
      expect(func.type).toBe('func');
      expect(func.name).toBe('log');
      expect(func.argument).toHaveLength(1);
    });

    it('\\ln(x) → func 노드를 생성한다', () => {
      const result = parseLatex('\\ln(x)');

      expect(result.children).toHaveLength(1);
      const func = result.children[0] as FuncNode;
      expect(func.type).toBe('func');
      expect(func.name).toBe('ln');
    });

    it('\\exp(x) → func 노드를 생성한다', () => {
      const result = parseLatex('\\exp(x)');

      expect(result.children).toHaveLength(1);
      const func = result.children[0] as FuncNode;
      expect(func.type).toBe('func');
      expect(func.name).toBe('exp');
    });
  });

  describe('쌍곡선함수', () => {
    it('\\sinh(x) → func 노드를 생성한다', () => {
      const result = parseLatex('\\sinh(x)');

      expect(result.children).toHaveLength(1);
      const func = result.children[0] as FuncNode;
      expect(func.type).toBe('func');
      expect(func.name).toBe('sinh');
    });

    it('\\cosh(x) → func 노드를 생성한다', () => {
      const result = parseLatex('\\cosh(x)');

      expect(result.children).toHaveLength(1);
      const func = result.children[0] as FuncNode;
      expect(func.type).toBe('func');
      expect(func.name).toBe('cosh');
    });
  });

  describe('인자 파싱', () => {
    it('괄호 인자를 올바르게 파싱한다', () => {
      const result = parseLatex('\\sin(x)');

      const func = result.children[0] as FuncNode;
      expect(func.argument).toHaveLength(1);
      const paren = func.argument[0] as ParenNode;
      expect(paren.type).toBe('paren');
      expect(paren.parenType).toBe('(');
      const contentRow = paren.content[0] as any;
      expect(contentRow.type).toBe('row');
      expect(contentRow.children).toHaveLength(1);
      expect((contentRow.children[0] as VariableNode).name).toBe('x');
    });

    it('중괄호 인자를 올바르게 파싱한다', () => {
      const result = parseLatex('\\sin{x}');

      const func = result.children[0] as FuncNode;
      expect(func.argument).toHaveLength(1);
      expect(func.argument[0].type).toBe('variable');
      expect((func.argument[0] as VariableNode).name).toBe('x');
    });

    it('인자 없이 함수 이름만 생성할 수 있다', () => {
      const result = parseLatex('\\sin');

      expect(result.children).toHaveLength(1);
      const func = result.children[0] as FuncNode;
      expect(func.type).toBe('func');
      expect(func.name).toBe('sin');
      expect(func.argument).toHaveLength(0);
    });
  });
});
