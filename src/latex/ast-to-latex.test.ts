import { describe, it, expect, beforeEach } from 'vitest';
import { astToLatex } from './ast-to-latex';
import { parseLatex } from './latex-parser';
import {
  num,
  variable,
  operator,
  frac,
  power,
  subscript,
  sqrt,
  paren,
  abs,
  func,
  integral,
  sum,
  limit,
  product,
  overline,
  accent,
  matrix,
  text,
  space,
  root,
  row,
  literal,
  error,
  opaque,
} from './node-factory';
import { resetLatexIdCounter } from '../utils/id-generator';

describe('AST to LaTeX', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('기본 노드 변환', () => {
    it('number 노드를 숫자 문자열로 변환한다', () => {
      const node = root([num('42')]);
      expect(astToLatex(node)).toBe('42');
    });

    it('variable 노드를 변수명으로 변환한다', () => {
      const node = root([variable('x')]);
      expect(astToLatex(node)).toBe('x');
    });

    it('그리스 문자 variable을 LaTeX 명령어로 변환한다', () => {
      const node = root([variable('α')]);
      expect(astToLatex(node)).toBe('\\alpha');
    });

    it('operator 노드를 연산자 문자열로 변환한다', () => {
      const node = root([variable('x'), operator('+'), variable('y')]);
      expect(astToLatex(node)).toBe('x + y');
    });

    it('특수 연산자를 LaTeX 명령어로 변환한다', () => {
      const node = root([variable('a'), operator('×'), variable('b')]);
      expect(astToLatex(node)).toBe('a \\times b');
    });

    it('root 노드의 자식들을 결합한다', () => {
      const node = root([num('1'), operator('+'), num('2')]);
      expect(astToLatex(node)).toBe('1 + 2');
    });
  });

  describe('복합 노드 변환', () => {
    it('frac -> \\frac{num}{den}', () => {
      const node = frac([num('1')], [num('2')]);
      expect(astToLatex(node)).toBe('\\frac{1}{2}');
    });

    it('power -> base^{exp}', () => {
      const node = power([variable('x')], [num('1'), num('0')]);
      expect(astToLatex(node)).toBe('x^{10}');
    });

    it('단일 문자 지수는 중괄호를 생략한다', () => {
      const node = power([variable('x')], [num('2')]);
      expect(astToLatex(node)).toBe('x^2');
    });

    it('subscript -> base_{sub}', () => {
      const node = subscript([variable('a')], [num('1'), num('2')]);
      expect(astToLatex(node)).toBe('a_{12}');
    });

    it('sqrt -> \\sqrt{content}', () => {
      const node = sqrt([variable('x')]);
      expect(astToLatex(node)).toBe('\\sqrt{x}');
    });

    it('sqrt + index -> \\sqrt[n]{content}', () => {
      const node = sqrt([variable('x')], [num('3')]);
      expect(astToLatex(node)).toBe('\\sqrt[3]{x}');
    });

    it('paren -> 괄호 유형별 변환', () => {
      const roundParen = paren([variable('x')], '(');
      expect(astToLatex(roundParen)).toBe('(x)');

      const squareParen = paren([variable('x')], '[');
      expect(astToLatex(squareParen)).toBe('[x]');

      const curlyParen = paren([variable('x')], '{');
      expect(astToLatex(curlyParen)).toBe('\\{x\\}');
    });

    it('abs -> |content|', () => {
      const node = abs([variable('x')]);
      expect(astToLatex(node)).toBe('|x|');
    });

    it('func -> \\name(arg)', () => {
      const node = func('sin', [variable('x')]);
      expect(astToLatex(node)).toBe('\\sin(x)');
    });
  });

  describe('대형 연산자 변환', () => {
    it('integral -> \\int_{lower}^{upper}...', () => {
      const node = integral(
        [variable('f'), paren([variable('x')], '(')],
        'x',
        [num('0')],
        [num('1')],
      );
      expect(astToLatex(node)).toBe('\\int_{0}^{1} f(x) \\, dx');
    });

    it('sum -> \\sum_{lower}^{upper}...', () => {
      const node = sum(
        [variable('i'), operator('='), num('1')],
        [variable('n')],
        [variable('i')],
      );
      expect(astToLatex(node)).toBe('\\sum_{i = 1}^{n} i');
    });

    it('limit -> \\lim_{var \\to approach}...', () => {
      const node = limit('x', [num('0')], [variable('f'), paren([variable('x')], '(')]);
      expect(astToLatex(node)).toBe('\\lim_{x \\to 0} f(x)');
    });

    it('product -> \\prod_{lower}^{upper}...', () => {
      const node = product(
        [variable('i'), operator('='), num('1')],
        [variable('n')],
        [variable('i')],
      );
      expect(astToLatex(node)).toBe('\\prod_{i = 1}^{n} i');
    });
  });

  describe('장식 노드 변환', () => {
    it('overline -> \\overline{content}', () => {
      const node = overline([variable('x')]);
      expect(astToLatex(node)).toBe('\\overline{x}');
    });

    it('accent hat -> \\hat{content}', () => {
      const node = accent([variable('x')], 'hat');
      expect(astToLatex(node)).toBe('\\hat{x}');
    });

    it('accent vec -> \\vec{content}', () => {
      const node = accent([variable('v')], 'vec');
      expect(astToLatex(node)).toBe('\\vec{v}');
    });
  });

  describe('구조 노드 변환', () => {
    it('matrix -> \\begin{pmatrix}...\\end{pmatrix}', () => {
      const node = matrix(
        [
          [root([num('1')]), root([num('2')])],
          [root([num('3')]), root([num('4')])],
        ],
        '(',
      );
      expect(astToLatex(node)).toBe('\\begin{pmatrix}1 & 2 \\\\ 3 & 4\\end{pmatrix}');
    });

    it('text -> \\text{content}', () => {
      const node = text('hello');
      expect(astToLatex(node)).toBe('\\text{hello}');
    });

    it('space -> \\quad 등', () => {
      const quadNode = space(1.0);
      expect(astToLatex(quadNode)).toBe('\\quad ');

      const mediumNode = space(0.5);
      expect(astToLatex(mediumNode)).toBe('\\; ');

      const thinNode = space(0.25);
      expect(astToLatex(thinNode)).toBe('\\, ');
    });
  });

  describe('왕복 변환 검증', () => {
    it('parseLatex -> astToLatex 결과가 의미적으로 동일하다 (단순 수식)', () => {
      const input = 'x + y';
      const { ast } = parseLatex(input);
      const output = astToLatex(ast);
      // 공백 정규화 후 비교 (파서가 공백을 다르게 처리할 수 있으므로)
      expect(output.replace(/\s+/g, ' ').trim()).toBe('x + y');
    });

    it('parseLatex -> astToLatex 결과가 의미적으로 동일하다 (분수)', () => {
      const input = '\\frac{1}{2}';
      const { ast } = parseLatex(input);
      const output = astToLatex(ast);
      expect(output).toBe('\\frac{1}{2}');
    });
  });

  describe('신규 노드 역변환 (literal, error, opaque)', () => {
    it('literal 노드는 raw를 그대로 반환한다', () => {
      const node = literal('\\customMacro{arg}');
      expect(astToLatex(node)).toBe('\\customMacro{arg}');
    });

    it('error 노드는 raw를 그대로 반환한다', () => {
      const node = error('\\broken{', '닫는 괄호 없음');
      expect(astToLatex(node)).toBe('\\broken{');
    });

    it('opaque 노드는 \\command{args} 형태로 반환한다', () => {
      const node = opaque('myCmd', [[variable('x')], [num('1')]]);
      expect(astToLatex(node)).toBe('\\myCmd{x}{1}');
    });

    it('opaque 노드 (인자 없음)는 \\command만 반환한다', () => {
      const node = opaque('noArgs');
      expect(astToLatex(node)).toBe('\\noArgs');
    });

    it('root 안에 literal/error/opaque를 포함할 수 있다', () => {
      const node = root([
        variable('x'),
        operator('+'),
        literal('\\custom'),
      ]);
      expect(astToLatex(node)).toBe('x + \\custom');
    });
  });
});
