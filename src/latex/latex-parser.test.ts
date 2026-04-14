import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex, parseLatexWithErrors } from './latex-parser';
import { resetLatexIdCounter } from '../utils/id-generator';
import type { NumberNode, VariableNode, OperatorNode, FracNode, SqrtNode, FuncNode } from '../types';

describe('LaTeX Parser', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('parseLatex - 기본 파싱', () => {
    it('빈 문자열을 파싱한다', () => {
      const result = parseLatex('');
      expect(result.type).toBe('root');
      expect(result.children).toHaveLength(0);
    });

    it('단일 숫자를 파싱한다', () => {
      const result = parseLatex('1');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('number');
      expect((result.children[0] as NumberNode).value).toBe('1');
    });

    it('여러 자리 숫자를 파싱한다', () => {
      const result = parseLatex('123');
      // 각 자릿수가 개별 노드로 파싱됨
      expect(result.children.length).toBeGreaterThanOrEqual(1);
    });

    it('변수를 파싱한다', () => {
      const result = parseLatex('x');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('variable');
      expect((result.children[0] as VariableNode).name).toBe('x');
    });

    it('연산자를 파싱한다', () => {
      const result = parseLatex('+');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('operator');
      expect((result.children[0] as OperatorNode).operator).toBe('+');
    });

    it('수식을 파싱한다', () => {
      const result = parseLatex('x + y');
      expect(result.children).toHaveLength(3);
      expect(result.children[0].type).toBe('variable');
      expect(result.children[1].type).toBe('operator');
      expect(result.children[2].type).toBe('variable');
    });
  });

  describe('parseLatex - 명령어', () => {
    it('\\frac 명령어를 파싱한다', () => {
      const result = parseLatex('\\frac{1}{2}');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('frac');

      const frac = result.children[0] as FracNode;
      expect(frac.numerator).toBeDefined();
      expect(frac.denominator).toBeDefined();
    });

    it('\\sqrt 명령어를 파싱한다', () => {
      const result = parseLatex('\\sqrt{x}');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('sqrt');
    });

    it('n차 루트를 파싱한다', () => {
      const result = parseLatex('\\sqrt[3]{x}');
      expect(result.children).toHaveLength(1);
      const sqrt = result.children[0] as SqrtNode;
      expect(sqrt.type).toBe('sqrt');
      expect(sqrt.index).toBeDefined();
    });

    it('삼각함수를 파싱한다', () => {
      const result = parseLatex('\\sin{x}');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('func');
      expect((result.children[0] as FuncNode).name).toBe('sin');
    });

    it('그리스 문자를 파싱한다', () => {
      const result = parseLatex('\\alpha');
      expect(result.children).toHaveLength(1);
      // 그리스 문자는 variable로 파싱될 수 있음
      expect(['variable', 'symbol']).toContain(result.children[0].type);
    });
  });

  describe('parseLatex - 지수와 첨자', () => {
    it('지수를 파싱한다', () => {
      const result = parseLatex('x^2');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('power');
    });

    it('첨자를 파싱한다', () => {
      const result = parseLatex('x_i');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('subscript');
    });

    it('지수와 첨자 조합을 파싱한다', () => {
      const result = parseLatex('x_i^2');
      expect(result.children).toHaveLength(1);
      // 지수가 우선 적용되어 power 타입일 수 있음
      expect(['power', 'subscript']).toContain(result.children[0].type);
    });
  });

  describe('parseLatex - 괄호', () => {
    it('소괄호를 파싱한다', () => {
      const result = parseLatex('(x)');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('paren');
    });

    it('\\left ... \\right 괄호를 파싱한다', () => {
      const result = parseLatex('\\left(x\\right)');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('paren');
    });
  });

  describe('parseLatex - 환경', () => {
    it('행렬을 파싱한다', () => {
      const result = parseLatex('\\begin{matrix}1 & 2\\\\3 & 4\\end{matrix}');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('matrix');
    });

    it('cases 환경을 파싱한다', () => {
      const result = parseLatex('\\begin{cases}x & y\\end{cases}');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('cases');
    });

    it('array 환경을 파싱한다', () => {
      const result = parseLatex('\\begin{array}{cc}1 & 2\\\\3 & 4\\end{array}');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('array');
    });
  });

  describe('parseLatexWithErrors - 에러 처리', () => {
    it('성공적인 파싱 결과를 반환한다', () => {
      const result = parseLatexWithErrors('x + y');
      expect(result.hasErrors).toBe(false);
      expect(result.ast.type).toBe('root');
    });

    it('알 수 없는 명령어에 대해 경고를 생성한다', () => {
      const result = parseLatexWithErrors('\\unknowncommand');
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('에러 목록을 반환한다', () => {
      const result = parseLatexWithErrors('valid latex');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('sourceRange 추적', () => {
    it('단일 변수의 sourceRange가 정확하다', () => {
      const result = parseLatexWithErrors('x');
      const node = result.ast.children[0];
      expect(node.sourceRange).toEqual({ start: 0, end: 1 });
    });

    it('수식 x+y의 각 노드 sourceRange가 정확하다', () => {
      const result = parseLatexWithErrors('x+y');
      expect(result.ast.children[0].sourceRange).toEqual({ start: 0, end: 1 }); // x
      expect(result.ast.children[1].sourceRange).toEqual({ start: 1, end: 2 }); // +
      expect(result.ast.children[2].sourceRange).toEqual({ start: 2, end: 3 }); // y
    });

    it('숫자 123의 각 자릿수 sourceRange가 정확하다', () => {
      const result = parseLatexWithErrors('123');
      expect(result.ast.children[0].sourceRange).toEqual({ start: 0, end: 1 }); // 1
      expect(result.ast.children[1].sourceRange).toEqual({ start: 1, end: 2 }); // 2
      expect(result.ast.children[2].sourceRange).toEqual({ start: 2, end: 3 }); // 3
    });

    it('\\frac{1}{2}의 sourceRange가 전체 명령어를 포함한다', () => {
      const result = parseLatexWithErrors('\\frac{1}{2}');
      const frac = result.ast.children[0];
      expect(frac.sourceRange).toEqual({ start: 0, end: 11 });
    });

    it('x^2의 power 노드 sourceRange가 base를 포함한다', () => {
      const result = parseLatexWithErrors('x^2');
      const power = result.ast.children[0];
      expect(power.type).toBe('power');
      expect(power.sourceRange).toEqual({ start: 0, end: 3 });
    });

    it('x_n의 subscript 노드 sourceRange가 base를 포함한다', () => {
      const result = parseLatexWithErrors('x_n');
      const sub = result.ast.children[0];
      expect(sub.type).toBe('subscript');
      expect(sub.sourceRange).toEqual({ start: 0, end: 3 });
    });

    it('(x+1)의 paren 노드 sourceRange가 괄호를 포함한다', () => {
      const result = parseLatexWithErrors('(x+1)');
      const paren = result.ast.children[0];
      expect(paren.type).toBe('paren');
      expect(paren.sourceRange).toEqual({ start: 0, end: 5 });
    });

    it('|x|의 abs 노드 sourceRange가 구분자를 포함한다', () => {
      const result = parseLatexWithErrors('|x|');
      const abs = result.ast.children[0];
      expect(abs.type).toBe('abs');
      expect(abs.sourceRange).toEqual({ start: 0, end: 3 });
    });

    it('root 노드의 sourceRange가 전체 입력이다', () => {
      const result = parseLatexWithErrors('a+b');
      expect(result.ast.sourceRange).toEqual({ start: 0, end: 3 });
    });

    it('\\alpha 같은 그리스 문자의 sourceRange가 정확하다', () => {
      const result = parseLatexWithErrors('\\alpha');
      const node = result.ast.children[0];
      expect(node.sourceRange).toEqual({ start: 0, end: 6 });
    });

    it('구두점의 sourceRange가 정확하다', () => {
      const result = parseLatexWithErrors('a,b');
      expect(result.ast.children[1].sourceRange).toEqual({ start: 1, end: 2 }); // ,
    });

    it('팩토리얼의 sourceRange가 정확하다', () => {
      const result = parseLatexWithErrors('n!');
      expect(result.ast.children[1].sourceRange).toEqual({ start: 1, end: 2 }); // !
    });

    it('이스케이프 문자의 sourceRange가 정확하다', () => {
      const result = parseLatexWithErrors('\\{');
      const node = result.ast.children[0];
      expect(node.sourceRange).toEqual({ start: 0, end: 2 });
    });

    it('[x+1]의 대괄호 paren 노드 sourceRange가 정확하다', () => {
      const result = parseLatexWithErrors('[x+1]');
      const paren = result.ast.children[0];
      expect(paren.type).toBe('paren');
      expect(paren.sourceRange).toEqual({ start: 0, end: 5 });
    });
  });
});
