import { describe, it, expect, beforeEach } from 'vitest';
import {
  createNode,
  createNodeWithId,
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
  row,
  root,
  isNodeType,
  isAnyNodeType,
  isContainerNode,
  hasChildren,
} from './node-factory';
import { resetLatexIdCounter } from '../utils/id-generator';

describe('Node Factory', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('createNode - 제네릭 팩토리', () => {
    it('숫자 노드를 생성한다', () => {
      const node = createNode('number', { value: '42' });

      expect(node.type).toBe('number');
      expect(node.value).toBe('42');
      expect(node.id).toBeDefined();
    });

    it('변수 노드를 생성한다', () => {
      const node = createNode('variable', { name: 'x' });

      expect(node.type).toBe('variable');
      expect(node.name).toBe('x');
    });

    it('분수 노드를 생성한다', () => {
      const node = createNode('frac', {
        numerator: [createNode('number', { value: '1' })],
        denominator: [createNode('number', { value: '2' })],
      });

      expect(node.type).toBe('frac');
      expect(node.numerator).toHaveLength(1);
      expect(node.denominator).toHaveLength(1);
    });

    it('복잡한 노드 구조를 생성한다', () => {
      // \frac{x^2}{y_i}
      const node = createNode('frac', {
        numerator: [
          createNode('power', {
            base: [createNode('variable', { name: 'x' })],
            exponent: [createNode('number', { value: '2' })],
          }),
        ],
        denominator: [
          createNode('subscript', {
            base: [createNode('variable', { name: 'y' })],
            subscript: [createNode('variable', { name: 'i' })],
          }),
        ],
      });

      expect(node.type).toBe('frac');
      expect(node.numerator[0].type).toBe('power');
      expect(node.denominator[0].type).toBe('subscript');
    });
  });

  describe('createNodeWithId - 커스텀 ID', () => {
    it('지정한 ID로 노드를 생성한다', () => {
      const node = createNodeWithId('custom_id_123', 'number', { value: '99' });

      expect(node.id).toBe('custom_id_123');
      expect(node.value).toBe('99');
    });
  });

  describe('편의 함수들', () => {
    it('num() - 숫자 노드', () => {
      const node = num('123');
      expect(node.type).toBe('number');
      expect(node.value).toBe('123');
    });

    it('variable() - 변수 노드', () => {
      const node = variable('θ');
      expect(node.type).toBe('variable');
      expect(node.name).toBe('θ');
    });

    it('operator() - 연산자 노드', () => {
      const node = operator('+');
      expect(node.type).toBe('operator');
      expect(node.operator).toBe('+');
    });

    it('frac() - 분수 노드', () => {
      const node = frac([num('1')], [num('2')]);
      expect(node.type).toBe('frac');
      expect(node.numerator).toHaveLength(1);
      expect(node.denominator).toHaveLength(1);
    });

    it('power() - 거듭제곱 노드', () => {
      const node = power([variable('x')], [num('2')]);
      expect(node.type).toBe('power');
    });

    it('subscript() - 아래첨자 노드', () => {
      const node = subscript([variable('a')], [num('1')]);
      expect(node.type).toBe('subscript');
    });

    it('sqrt() - 제곱근 노드', () => {
      const node = sqrt([variable('x')]);
      expect(node.type).toBe('sqrt');
      expect(node.index).toBeUndefined();

      const cubeRoot = sqrt([num('8')], [num('3')]);
      expect(cubeRoot.index).toBeDefined();
    });

    it('paren() - 괄호 노드', () => {
      const node = paren([variable('x')], '[', true);
      expect(node.type).toBe('paren');
      expect(node.parenType).toBe('[');
      expect(node.autoSize).toBe(true);
    });

    it('abs() - 절댓값 노드', () => {
      const node = abs([variable('x')]);
      expect(node.type).toBe('abs');
    });

    it('func() - 함수 노드', () => {
      const node = func('sin', [variable('x')]);
      expect(node.type).toBe('func');
      expect(node.name).toBe('sin');
    });

    it('integral() - 적분 노드', () => {
      const node = integral([variable('x')], 'x', [num('0')], [num('1')]);
      expect(node.type).toBe('integral');
      expect(node.differential).toBe('x');
    });

    it('sum() - 시그마 노드', () => {
      const node = sum([variable('i')], [variable('n')], [variable('i')]);
      expect(node.type).toBe('sum');
    });

    it('limit() - 극한 노드', () => {
      const node = limit('x', [variable('∞')], [frac([num('1')], [variable('x')])]);
      expect(node.type).toBe('limit');
      expect(node.variable).toBe('x');
    });

    it('product() - 곱 노드', () => {
      const node = product([variable('i')], [variable('n')], [variable('i')]);
      expect(node.type).toBe('product');
    });

    it('overline() - 윗줄 노드', () => {
      const node = overline([variable('x')]);
      expect(node.type).toBe('overline');
    });

    it('accent() - 악센트 노드', () => {
      const node = accent([variable('x')], 'hat');
      expect(node.type).toBe('accent');
      expect(node.accentType).toBe('hat');
    });

    it('matrix() - 행렬 노드', () => {
      const node = matrix([[num('1'), num('2')], [num('3'), num('4')]], '(');
      expect(node.type).toBe('matrix');
      expect(node.bracketType).toBe('(');
      expect(node.rows).toHaveLength(2);
    });

    it('text() - 텍스트 노드', () => {
      const node = text('hello');
      expect(node.type).toBe('text');
      expect(node.content).toBe('hello');
    });

    it('space() - 공백 노드', () => {
      const node = space(1.0);
      expect(node.type).toBe('space');
      expect(node.width).toBe(1.0);
    });

    it('row() - Row 노드', () => {
      const node = row([num('1'), operator('+'), num('2')]);
      expect(node.type).toBe('row');
      expect(node.children).toHaveLength(3);
    });

    it('root() - Root 노드', () => {
      const node = root([variable('x')]);
      expect(node.type).toBe('root');
      expect(node.children).toHaveLength(1);
    });
  });

  describe('타입 검사 유틸리티', () => {
    it('isNodeType - 단일 타입 검사', () => {
      const fracNode = frac([num('1')], [num('2')]);
      const numNode = num('42');

      expect(isNodeType(fracNode, 'frac')).toBe(true);
      expect(isNodeType(fracNode, 'number')).toBe(false);
      expect(isNodeType(numNode, 'number')).toBe(true);
    });

    it('isAnyNodeType - 복수 타입 검사', () => {
      const numNode = num('42');
      const varNode = variable('x');
      const fracNode = frac([num('1')], [num('2')]);

      expect(isAnyNodeType(numNode, ['number', 'variable'])).toBe(true);
      expect(isAnyNodeType(varNode, ['number', 'variable'])).toBe(true);
      expect(isAnyNodeType(fracNode, ['number', 'variable'])).toBe(false);
    });

    it('isContainerNode - 컨테이너 노드 검사', () => {
      const rowNode = row([num('1')]);
      const rootNode = root([num('1')]);
      const fracNode = frac([num('1')], [num('2')]);

      expect(isContainerNode(rowNode)).toBe(true);
      expect(isContainerNode(rootNode)).toBe(true);
      expect(isContainerNode(fracNode)).toBe(false);
    });

    it('hasChildren - 자식 노드 존재 여부', () => {
      expect(hasChildren(frac([num('1')], [num('2')]))).toBe(true);
      expect(hasChildren(sqrt([num('2')]))).toBe(true);
      expect(hasChildren(row([]))).toBe(true);
      expect(hasChildren(num('42'))).toBe(false);
      expect(hasChildren(operator('+'))).toBe(false);
    });
  });
});
