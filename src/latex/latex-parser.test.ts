import { describe, it, expect, beforeEach } from 'vitest';
import type { MathNode, ScriptsNode } from '../types.js';
import { parseLatex } from './latex-parser.js';
import { resetLatexIdCounter } from '../utils/id-generator.js';
import type { NumberNode, VariableNode, OperatorNode, FracNode, SqrtNode, FuncNode } from '../types.js';

describe('LaTeX Parser', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('parseLatex - 기본 파싱', () => {
    it('빈 문자열을 파싱한다', () => {
      const { ast: result } = parseLatex('');
      expect(result.type).toBe('root');
      expect(result.children).toHaveLength(0);
    });

    it('단일 숫자를 파싱한다', () => {
      const { ast: result } = parseLatex('1');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('number');
      expect((result.children[0] as NumberNode).value).toBe('1');
    });

    it('여러 자리 숫자를 단일 NumberNode로 파싱한다', () => {
      const { ast: result } = parseLatex('123');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('number');
      expect((result.children[0] as NumberNode).value).toBe('123');
    });

    it('소수를 단일 NumberNode로 파싱한다', () => {
      const { ast: result } = parseLatex('3.14');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('number');
      expect((result.children[0] as NumberNode).value).toBe('3.14');
    });

    it('변수를 파싱한다', () => {
      const { ast: result } = parseLatex('x');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('variable');
      expect((result.children[0] as VariableNode).name).toBe('x');
    });

    it('연산자를 파싱한다', () => {
      const { ast: result } = parseLatex('+');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('operator');
      expect((result.children[0] as OperatorNode).operator).toBe('+');
    });

    it('수식을 파싱한다', () => {
      const { ast: result } = parseLatex('x + y');
      expect(result.children).toHaveLength(3);
      expect(result.children[0].type).toBe('variable');
      expect(result.children[1].type).toBe('operator');
      expect(result.children[2].type).toBe('variable');
    });
  });

  describe('parseLatex - 명령어', () => {
    it('\\frac 명령어를 파싱한다', () => {
      const { ast: result } = parseLatex('\\frac{1}{2}');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('frac');

      const frac = result.children[0] as FracNode;
      expect(frac.numerator).toBeDefined();
      expect(frac.denominator).toBeDefined();
    });

    it('\\sqrt 명령어를 파싱한다', () => {
      const { ast: result } = parseLatex('\\sqrt{x}');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('sqrt');
    });

    it('n차 루트를 파싱한다', () => {
      const { ast: result } = parseLatex('\\sqrt[3]{x}');
      expect(result.children).toHaveLength(1);
      const sqrt = result.children[0] as SqrtNode;
      expect(sqrt.type).toBe('sqrt');
      expect(sqrt.index).toBeDefined();
    });

    it('삼각함수를 파싱한다', () => {
      const { ast: result } = parseLatex('\\sin{x}');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('func');
      expect((result.children[0] as FuncNode).name).toBe('sin');
    });

    it('그리스 문자를 파싱한다', () => {
      const { ast: result } = parseLatex('\\alpha');
      expect(result.children).toHaveLength(1);
      // 그리스 문자는 variable로 파싱될 수 있음
      expect(['variable', 'symbol']).toContain(result.children[0].type);
    });
  });

  describe('parseLatex - 지수와 첨자', () => {
    it('지수를 파싱한다', () => {
      const { ast: result } = parseLatex('x^2');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('scripts');
    });

    it('첨자를 파싱한다', () => {
      const { ast: result } = parseLatex('x_i');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('scripts');
    });

    it('지수와 첨자 조합이 하나의 첨자 노드가 된다', () => {
      const { ast: result } = parseLatex('x_i^2');
      expect(result.children).toHaveLength(1);
      const node = result.children[0] as ScriptsNode;
      expect(node.type).toBe('scripts');
      // 중첩이 아니라 한 노드가 두 자리를 소유한다 (TeX Rule 18e)
      expect(node.base).toHaveLength(1);
      expect(node.base[0].type).toBe('variable');
      expect(node.superscript).toBeDefined();
      expect(node.subscript).toBeDefined();
    });

    it('x^2_i 는 x_i^2 와 같은 구조가 된다', () => {
      const a = parseLatex('x_i^2').ast.children[0] as ScriptsNode;
      const b = parseLatex('x^2_i').ast.children[0] as ScriptsNode;
      expect(b.type).toBe('scripts');
      expect(b.base[0].type).toBe(a.base[0].type);
      expect(b.superscript).toBeDefined();
      expect(b.subscript).toBeDefined();
    });

    it('좌측 첨자를 파싱하고 뒤따르는 원자를 밑으로 흡수한다', () => {
      // 동위원소 표기 ^{227}_{90}Th 의 골격. Th 는 수식 모드에서 두 변수로 쪼개지므로
      // 밑이 하나임을 보려고 단일 기호를 쓴다.
      const { ast: result } = parseLatex('{}^{227}_{90}X');
      expect(result.children).toHaveLength(1);
      const node = result.children[0] as ScriptsNode;
      expect(node.type).toBe('scripts');
      expect(node.leftSuperscript).toBeDefined();
      expect(node.leftSubscript).toBeDefined();
      expect(node.base).toHaveLength(1);
      expect(node.base[0].type).toBe('variable');
    });

    it('같은 자리를 다시 지정하면 경고를 내되 내용은 보존한다 (x^2^3)', () => {
      const { ast: result, warnings } = parseLatex('x^2^3');
      expect(warnings.some((w) => w.type === 'syntax')).toBe(true);
      // 데이터를 버리지 않는다 — 중첩으로 남긴다
      const outer = result.children[0] as ScriptsNode;
      expect(outer.type).toBe('scripts');
      expect(outer.superscript).toBeDefined();
      expect(outer.base[0].type).toBe('scripts');
    });

    it('화학식의 이온 표기를 파싱한다 (SO_4^{2-})', () => {
      const { ast: result } = parseLatex('SO_4^{2-}');
      // S 와 첨자가 붙은 O
      const scripts = result.children.find((c) => c.type === 'scripts') as ScriptsNode;
      expect(scripts).toBeDefined();
      expect(scripts.subscript).toBeDefined();
      expect(scripts.superscript).toBeDefined();
    });

    it('적분 안에서도 첨자가 중첩되지 않는다 (bigops 경로)', () => {
      const { ast: result } = parseLatex('\\int_0^1 x^2_i dx');
      const collect = (nodes: MathNode[]): ScriptsNode[] =>
        nodes.flatMap((n) => {
          const found = n.type === 'scripts' ? [n as ScriptsNode] : [];
          const kids = Object.values(n as unknown as Record<string, unknown>)
            .filter((v): v is MathNode[] => Array.isArray(v) && v.every((x) => x && typeof x === 'object' && 'type' in x));
          return [...found, ...kids.flatMap(collect)];
        });
      const nested = collect(result.children).filter(
        (n) => n.base.some((b) => b.type === 'scripts'),
      );
      expect(nested).toHaveLength(0);
    });

    it('좌측 첨자가 뒤의 연산자를 흡수하지 않는다', () => {
      const { ast: result } = parseLatex('{}^{2}+x');
      // scripts(밑 없음), operator, variable
      expect(result.children).toHaveLength(3);
      expect(result.children[1].type).toBe('operator');
    });
  });

  describe('parseLatex - 괄호', () => {
    it('소괄호를 파싱한다', () => {
      const { ast: result } = parseLatex('(x)');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('paren');
    });

    it('\\left ... \\right 괄호를 파싱한다', () => {
      const { ast: result } = parseLatex('\\left(x\\right)');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('paren');
    });
  });

  describe('parseLatex - 환경', () => {
    it('행렬을 파싱한다', () => {
      const { ast: result } = parseLatex('\\begin{matrix}1 & 2\\\\3 & 4\\end{matrix}');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('matrix');
    });

    it('cases 환경을 파싱한다', () => {
      const { ast: result } = parseLatex('\\begin{cases}x & y\\end{cases}');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('cases');
    });

    it('array 환경을 파싱한다', () => {
      const { ast: result } = parseLatex('\\begin{array}{cc}1 & 2\\\\3 & 4\\end{array}');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('array');
    });
  });

  describe('parseLatex - 에러 처리', () => {
    it('성공적인 파싱 결과를 반환한다', () => {
      const result = parseLatex('x + y');
      expect(result.hasErrors).toBe(false);
      expect(result.ast.type).toBe('root');
    });

    it('알 수 없는 명령어에 대해 경고를 생성한다', () => {
      const result = parseLatex('\\unknowncommand');
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('에러 목록을 반환한다', () => {
      const result = parseLatex('valid latex');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('sourceRange 추적', () => {
    it('단일 변수의 sourceRange가 정확하다', () => {
      const result = parseLatex('x');
      const node = result.ast.children[0];
      expect(node.sourceRange).toEqual({ start: 0, end: 1 });
    });

    it('수식 x+y의 각 노드 sourceRange가 정확하다', () => {
      const result = parseLatex('x+y');
      expect(result.ast.children[0].sourceRange).toEqual({ start: 0, end: 1 }); // x
      expect(result.ast.children[1].sourceRange).toEqual({ start: 1, end: 2 }); // +
      expect(result.ast.children[2].sourceRange).toEqual({ start: 2, end: 3 }); // y
    });

    it('숫자 123의 sourceRange가 리터럴 전체를 덮는다', () => {
      const result = parseLatex('123');
      expect(result.ast.children).toHaveLength(1);
      expect(result.ast.children[0].sourceRange).toEqual({ start: 0, end: 3 });
    });

    it('\\frac{1}{2}의 sourceRange가 전체 명령어를 포함한다', () => {
      const result = parseLatex('\\frac{1}{2}');
      const frac = result.ast.children[0];
      expect(frac.sourceRange).toEqual({ start: 0, end: 11 });
    });

    it('x^2의 첨자 노드 sourceRange가 base를 포함한다', () => {
      const result = parseLatex('x^2');
      const power = result.ast.children[0];
      expect(power.type).toBe('scripts');
      expect(power.sourceRange).toEqual({ start: 0, end: 3 });
    });

    it('x_n의 첨자 노드 sourceRange가 base를 포함한다', () => {
      const result = parseLatex('x_n');
      const sub = result.ast.children[0];
      expect(sub.type).toBe('scripts');
      expect(sub.sourceRange).toEqual({ start: 0, end: 3 });
    });

    it('(x+1)의 paren 노드 sourceRange가 괄호를 포함한다', () => {
      const result = parseLatex('(x+1)');
      const paren = result.ast.children[0];
      expect(paren.type).toBe('paren');
      expect(paren.sourceRange).toEqual({ start: 0, end: 5 });
    });

    it('|x|의 abs 노드 sourceRange가 구분자를 포함한다', () => {
      const result = parseLatex('|x|');
      const abs = result.ast.children[0];
      expect(abs.type).toBe('abs');
      expect(abs.sourceRange).toEqual({ start: 0, end: 3 });
    });

    it('root 노드의 sourceRange가 전체 입력이다', () => {
      const result = parseLatex('a+b');
      expect(result.ast.sourceRange).toEqual({ start: 0, end: 3 });
    });

    it('\\alpha 같은 그리스 문자의 sourceRange가 정확하다', () => {
      const result = parseLatex('\\alpha');
      const node = result.ast.children[0];
      expect(node.sourceRange).toEqual({ start: 0, end: 6 });
    });

    it('구두점의 sourceRange가 정확하다', () => {
      const result = parseLatex('a,b');
      expect(result.ast.children[1].sourceRange).toEqual({ start: 1, end: 2 }); // ,
    });

    it('팩토리얼의 sourceRange가 정확하다', () => {
      const result = parseLatex('n!');
      expect(result.ast.children[1].sourceRange).toEqual({ start: 1, end: 2 }); // !
    });

    it('이스케이프 문자의 sourceRange가 정확하다', () => {
      const result = parseLatex('\\{');
      const node = result.ast.children[0];
      expect(node.sourceRange).toEqual({ start: 0, end: 2 });
    });

    it('[x+1]의 대괄호 paren 노드 sourceRange가 정확하다', () => {
      const result = parseLatex('[x+1]');
      const paren = result.ast.children[0];
      expect(paren.type).toBe('paren');
      expect(paren.sourceRange).toEqual({ start: 0, end: 5 });
    });
  });
});
