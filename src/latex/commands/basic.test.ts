import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../latex-parser';
import { resetLatexIdCounter } from '../../utils/id-generator';
import type {
  FracNode,
  SqrtNode,
  TextNode,
  ParenNode,
  AbsNode,
  RowNode,
  NumberNode,
  VariableNode,
  OperatorNode,
} from '../../types';

describe('Basic Command Handlers', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('fracHandler', () => {
    it('\\frac{1}{2} → frac 노드를 생성한다', () => {
      const result = parseLatex('\\frac{1}{2}');

      expect(result.children).toHaveLength(1);
      const frac = result.children[0] as FracNode;
      expect(frac.type).toBe('frac');

      // numerator는 [RowNode] 래핑
      expect(frac.numerator).toHaveLength(1);
      const numRow = frac.numerator[0] as RowNode;
      expect(numRow.type).toBe('row');
      expect(numRow.children).toHaveLength(1);
      expect(numRow.children[0].type).toBe('number');
      expect((numRow.children[0] as NumberNode).value).toBe('1');

      // denominator는 [RowNode] 래핑
      expect(frac.denominator).toHaveLength(1);
      const denRow = frac.denominator[0] as RowNode;
      expect(denRow.type).toBe('row');
      expect(denRow.children).toHaveLength(1);
      expect(denRow.children[0].type).toBe('number');
      expect((denRow.children[0] as NumberNode).value).toBe('2');
    });

    it('분자에 여러 항이 있는 분수를 파싱한다', () => {
      const result = parseLatex('\\frac{a+b}{2}');

      expect(result.children).toHaveLength(1);
      const frac = result.children[0] as FracNode;
      expect(frac.type).toBe('frac');

      const numRow = frac.numerator[0] as RowNode;
      expect(numRow.children).toHaveLength(3);
      expect(numRow.children[0].type).toBe('variable');
      expect((numRow.children[0] as VariableNode).name).toBe('a');
      expect(numRow.children[1].type).toBe('operator');
      expect((numRow.children[1] as OperatorNode).operator).toBe('+');
      expect(numRow.children[2].type).toBe('variable');
      expect((numRow.children[2] as VariableNode).name).toBe('b');
    });

    it('분모에 여러 항이 있는 분수를 파싱한다', () => {
      const result = parseLatex('\\frac{1}{x+y}');

      expect(result.children).toHaveLength(1);
      const frac = result.children[0] as FracNode;
      expect(frac.type).toBe('frac');

      const denRow = frac.denominator[0] as RowNode;
      expect(denRow.children).toHaveLength(3);
      expect(denRow.children[0].type).toBe('variable');
      expect((denRow.children[0] as VariableNode).name).toBe('x');
      expect(denRow.children[1].type).toBe('operator');
      expect((denRow.children[1] as OperatorNode).operator).toBe('+');
      expect(denRow.children[2].type).toBe('variable');
      expect((denRow.children[2] as VariableNode).name).toBe('y');
    });

    it('중첩된 분수를 파싱한다', () => {
      const result = parseLatex('\\frac{\\frac{1}{2}}{3}');

      expect(result.children).toHaveLength(1);
      const outerFrac = result.children[0] as FracNode;
      expect(outerFrac.type).toBe('frac');

      // 분자 안에 중첩 분수
      const numRow = outerFrac.numerator[0] as RowNode;
      expect(numRow.children).toHaveLength(1);
      const innerFrac = numRow.children[0] as FracNode;
      expect(innerFrac.type).toBe('frac');

      // 내부 분수의 분자/분모 검증
      const innerNumRow = innerFrac.numerator[0] as RowNode;
      expect(innerNumRow.children).toHaveLength(1);
      expect((innerNumRow.children[0] as NumberNode).value).toBe('1');

      const innerDenRow = innerFrac.denominator[0] as RowNode;
      expect(innerDenRow.children).toHaveLength(1);
      expect((innerDenRow.children[0] as NumberNode).value).toBe('2');

      // 외부 분수의 분모 검증
      const denRow = outerFrac.denominator[0] as RowNode;
      expect(denRow.children).toHaveLength(1);
      expect((denRow.children[0] as NumberNode).value).toBe('3');
    });
  });

  describe('sqrtHandler', () => {
    it('\\sqrt{x} → sqrt 노드를 생성한다', () => {
      const result = parseLatex('\\sqrt{x}');

      expect(result.children).toHaveLength(1);
      const sqrt = result.children[0] as SqrtNode;
      expect(sqrt.type).toBe('sqrt');

      // content는 [RowNode] 래핑
      expect(sqrt.content).toHaveLength(1);
      const contentRow = sqrt.content[0] as RowNode;
      expect(contentRow.type).toBe('row');
      expect(contentRow.children).toHaveLength(1);
      expect(contentRow.children[0].type).toBe('variable');
      expect((contentRow.children[0] as VariableNode).name).toBe('x');

      // index 없음
      expect(sqrt.index).toBeUndefined();
    });

    it('\\sqrt[3]{x} → index가 있는 sqrt를 생성한다', () => {
      const result = parseLatex('\\sqrt[3]{x}');

      expect(result.children).toHaveLength(1);
      const sqrt = result.children[0] as SqrtNode;
      expect(sqrt.type).toBe('sqrt');

      // index는 [RowNode] 래핑
      expect(sqrt.index).toBeDefined();
      expect(sqrt.index).toHaveLength(1);
      const indexRow = sqrt.index![0] as RowNode;
      expect(indexRow.type).toBe('row');
      expect(indexRow.children).toHaveLength(1);
      expect(indexRow.children[0].type).toBe('number');
      expect((indexRow.children[0] as NumberNode).value).toBe('3');

      // content 검증
      const contentRow = sqrt.content[0] as RowNode;
      expect(contentRow.children).toHaveLength(1);
      expect((contentRow.children[0] as VariableNode).name).toBe('x');
    });

    it('\\sqrt{x+1}의 content를 올바르게 파싱한다', () => {
      const result = parseLatex('\\sqrt{x+1}');

      expect(result.children).toHaveLength(1);
      const sqrt = result.children[0] as SqrtNode;
      expect(sqrt.type).toBe('sqrt');

      const contentRow = sqrt.content[0] as RowNode;
      expect(contentRow.children).toHaveLength(3);
      expect(contentRow.children[0].type).toBe('variable');
      expect((contentRow.children[0] as VariableNode).name).toBe('x');
      expect(contentRow.children[1].type).toBe('operator');
      expect((contentRow.children[1] as OperatorNode).operator).toBe('+');
      expect(contentRow.children[2].type).toBe('number');
      expect((contentRow.children[2] as NumberNode).value).toBe('1');
    });
  });

  describe('textHandler', () => {
    it('\\text{hello} → text 노드를 생성한다', () => {
      const result = parseLatex('\\text{hello}');

      expect(result.children).toHaveLength(1);
      const textNode = result.children[0] as TextNode;
      expect(textNode.type).toBe('text');
      expect(textNode.content).toBe('hello');
    });

    it('\\text{hello world}의 내용을 올바르게 파싱한다', () => {
      const result = parseLatex('\\text{hello world}');

      expect(result.children).toHaveLength(1);
      const textNode = result.children[0] as TextNode;
      expect(textNode.type).toBe('text');
      expect(textNode.content).toBe('hello world');
    });
  });

  describe('leftHandler', () => {
    it('\\left(x+1\\right) → paren 노드를 생성한다', () => {
      const result = parseLatex('\\left(x+1\\right)');

      expect(result.children).toHaveLength(1);
      const paren = result.children[0] as ParenNode;
      expect(paren.type).toBe('paren');
      expect(paren.parenType).toBe('(');

      // content는 [RowNode] 래핑
      const contentRow = paren.content[0] as RowNode;
      expect(contentRow.children).toHaveLength(3);
      expect((contentRow.children[0] as VariableNode).name).toBe('x');
      expect((contentRow.children[1] as OperatorNode).operator).toBe('+');
      expect((contentRow.children[2] as NumberNode).value).toBe('1');
    });

    it('\\left[x\\right] → 대괄호 paren을 생성한다', () => {
      const result = parseLatex('\\left[x\\right]');

      expect(result.children).toHaveLength(1);
      const paren = result.children[0] as ParenNode;
      expect(paren.type).toBe('paren');
      expect(paren.parenType).toBe('[');
    });

    it('\\left|x\\right| → abs 노드를 생성한다', () => {
      const result = parseLatex('\\left|x\\right|');

      expect(result.children).toHaveLength(1);
      const abs = result.children[0] as AbsNode;
      expect(abs.type).toBe('abs');

      // content는 [RowNode] 래핑
      const contentRow = abs.content[0] as RowNode;
      expect(contentRow.children).toHaveLength(1);
      expect((contentRow.children[0] as VariableNode).name).toBe('x');
    });

    it('autoSize가 true로 설정된다', () => {
      const result = parseLatex('\\left(x\\right)');

      expect(result.children).toHaveLength(1);
      const paren = result.children[0] as ParenNode;
      expect(paren.type).toBe('paren');
      expect(paren.autoSize).toBe(true);
    });
  });
});
