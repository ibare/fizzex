import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../latex-parser.js';
import { resetLatexIdCounter } from '../../utils/id-generator.js';
import type {
  IntegralNode,
  SumNode,
  LimitNode,
  ProductNode,
  RowNode,
  NumberNode,
  VariableNode,
  OperatorNode,
} from '../../types.js';

describe('Big Operator Command Handlers', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('적분', () => {
    it('\\int → integral 노드를 생성한다', () => {
      const { ast: result } = parseLatex('\\int');

      expect(result.children).toHaveLength(1);
      const integral = result.children[0] as IntegralNode;
      expect(integral.type).toBe('integral');
      expect(integral.integralType).toBe('int');
    });

    it('\\int_{0}^{1} x dx → 하한/상한/피적분함수를 파싱한다', () => {
      const { ast: result } = parseLatex('\\int_{0}^{1} x dx');

      expect(result.children).toHaveLength(1);
      const integral = result.children[0] as IntegralNode;
      expect(integral.type).toBe('integral');

      // 하한: [RowNode] 래핑, children에 0
      expect(integral.lower).toBeDefined();
      const lowerRow = integral.lower![0] as RowNode;
      expect(lowerRow.type).toBe('row');
      expect(lowerRow.children).toHaveLength(1);
      expect(lowerRow.children[0].type).toBe('number');
      expect((lowerRow.children[0] as NumberNode).value).toBe('0');

      // 상한: [RowNode] 래핑, children에 1
      expect(integral.upper).toBeDefined();
      const upperRow = integral.upper![0] as RowNode;
      expect(upperRow.type).toBe('row');
      expect(upperRow.children).toHaveLength(1);
      expect(upperRow.children[0].type).toBe('number');
      expect((upperRow.children[0] as NumberNode).value).toBe('1');

      // 피적분함수: x가 포함
      const integrandRow = integral.integrand[0] as RowNode;
      expect(integrandRow.type).toBe('row');
      const hasVariable = integrandRow.children.some(
        (n) => n.type === 'variable' && (n as VariableNode).name === 'x',
      );
      expect(hasVariable).toBe(true);

      // differential: 'x'
      expect(integral.differential).toBe('x');
    });

    it('\\iint → integralType이 올바르게 설정된다', () => {
      const { ast: result } = parseLatex('\\iint');

      expect(result.children).toHaveLength(1);
      const integral = result.children[0] as IntegralNode;
      expect(integral.type).toBe('integral');
      expect(integral.integralType).toBe('iint');
    });

    it('\\oint → integralType이 올바르게 설정된다', () => {
      const { ast: result } = parseLatex('\\oint');

      expect(result.children).toHaveLength(1);
      const integral = result.children[0] as IntegralNode;
      expect(integral.type).toBe('integral');
      expect(integral.integralType).toBe('oint');
    });
  });

  describe('시그마', () => {
    it('\\sum → sum 노드를 생성한다', () => {
      const { ast: result } = parseLatex('\\sum');

      expect(result.children).toHaveLength(1);
      const sum = result.children[0] as SumNode;
      expect(sum.type).toBe('sum');
    });

    it('\\sum_{i=1}^{n} i → 하한/상한/본체를 파싱한다', () => {
      const { ast: result } = parseLatex('\\sum_{i=1}^{n} i');

      expect(result.children).toHaveLength(1);
      const sum = result.children[0] as SumNode;
      expect(sum.type).toBe('sum');

      // 하한: i=1
      const lowerRow = sum.lower[0] as RowNode;
      expect(lowerRow.type).toBe('row');
      expect(lowerRow.children.length).toBeGreaterThanOrEqual(3);
      expect(lowerRow.children[0].type).toBe('variable');
      expect((lowerRow.children[0] as VariableNode).name).toBe('i');
      expect(lowerRow.children[1].type).toBe('operator');
      expect((lowerRow.children[1] as OperatorNode).operator).toBe('=');
      expect(lowerRow.children[2].type).toBe('number');
      expect((lowerRow.children[2] as NumberNode).value).toBe('1');

      // 상한: n
      const upperRow = sum.upper[0] as RowNode;
      expect(upperRow.type).toBe('row');
      expect(upperRow.children).toHaveLength(1);
      expect(upperRow.children[0].type).toBe('variable');
      expect((upperRow.children[0] as VariableNode).name).toBe('n');

      // 본체: i
      const bodyRow = sum.body[0] as RowNode;
      expect(bodyRow.type).toBe('row');
      expect(bodyRow.children).toHaveLength(1);
      expect(bodyRow.children[0].type).toBe('variable');
      expect((bodyRow.children[0] as VariableNode).name).toBe('i');
    });
  });

  describe('극한', () => {
    it('\\lim → limit 노드를 생성한다', () => {
      const { ast: result } = parseLatex('\\lim');

      expect(result.children).toHaveLength(1);
      const limit = result.children[0] as LimitNode;
      expect(limit.type).toBe('limit');
    });

    it('\\lim_{x \\to 0} f(x) → 변수/접근값/본체를 파싱한다', () => {
      const { ast: result } = parseLatex('\\lim_{x \\to 0} f(x)');

      // limHandler는 본체로 단일 토큰(f)만 취하고, (x)는 별도 paren 노드
      expect(result.children).toHaveLength(2);
      const limit = result.children[0] as LimitNode;
      expect(limit.type).toBe('limit');

      // 변수: x
      expect(limit.variable).toBe('x');

      // 접근값: 0
      const approachRow = limit.approach[0] as RowNode;
      expect(approachRow.type).toBe('row');
      expect(approachRow.children.length).toBeGreaterThanOrEqual(1);
      const hasZero = approachRow.children.some(
        (n) => n.type === 'number' && (n as NumberNode).value === '0',
      );
      expect(hasZero).toBe(true);

      // 본체: f (단일 변수)
      const bodyRow = limit.body[0] as RowNode;
      expect(bodyRow.type).toBe('row');
      expect(bodyRow.children).toHaveLength(1);
      expect(bodyRow.children[0].type).toBe('variable');
      expect((bodyRow.children[0] as VariableNode).name).toBe('f');

      // (x)는 별도의 paren 노드로 파싱
      expect(result.children[1].type).toBe('paren');
    });
  });

  describe('곱', () => {
    it('\\prod → product 노드를 생성한다', () => {
      const { ast: result } = parseLatex('\\prod');

      expect(result.children).toHaveLength(1);
      const product = result.children[0] as ProductNode;
      expect(product.type).toBe('product');
    });

    it('\\prod_{i=1}^{n} i → 하한/상한/본체를 파싱한다', () => {
      const { ast: result } = parseLatex('\\prod_{i=1}^{n} i');

      expect(result.children).toHaveLength(1);
      const product = result.children[0] as ProductNode;
      expect(product.type).toBe('product');

      // 하한: i=1
      const lowerRow = product.lower[0] as RowNode;
      expect(lowerRow.type).toBe('row');
      expect(lowerRow.children.length).toBeGreaterThanOrEqual(3);
      expect(lowerRow.children[0].type).toBe('variable');
      expect((lowerRow.children[0] as VariableNode).name).toBe('i');
      expect(lowerRow.children[1].type).toBe('operator');
      expect((lowerRow.children[1] as OperatorNode).operator).toBe('=');
      expect(lowerRow.children[2].type).toBe('number');
      expect((lowerRow.children[2] as NumberNode).value).toBe('1');

      // 상한: n
      const upperRow = product.upper[0] as RowNode;
      expect(upperRow.type).toBe('row');
      expect(upperRow.children).toHaveLength(1);
      expect(upperRow.children[0].type).toBe('variable');
      expect((upperRow.children[0] as VariableNode).name).toBe('n');

      // 본체: i
      const bodyRow = product.body[0] as RowNode;
      expect(bodyRow.type).toBe('row');
      expect(bodyRow.children).toHaveLength(1);
      expect(bodyRow.children[0].type).toBe('variable');
      expect((bodyRow.children[0] as VariableNode).name).toBe('i');
    });
  });
});
