import { describe, it, expect, beforeEach, vi } from 'vitest';
import { astToBox } from './ast-to-box';
import { parseLatex } from '../latex/latex-parser';
import { resetLatexIdCounter } from '../utils/id-generator';
import { layoutBox } from './box-layout';
import type { Box, HBox, VBox, SurdBox } from './types';

function createMockMetrics(): any {
  return {
    measureWidth: vi.fn().mockReturnValue(10),
    measureStringWidth: vi.fn().mockReturnValue(50),
    getHeight: vi.fn().mockReturnValue(14),
    getDepth: vi.fn().mockReturnValue(4),
    getFont: vi.fn().mockReturnValue('20px serif'),
    getActualFontSize: vi.fn((fs: number) => 20 * fs),
    getDelimiterGlyph: vi.fn().mockReturnValue({ type: 'single', char: '(', heightEm: 1 }),
    getDelimiterPair: vi.fn().mockReturnValue({
      open: { sizes: [{ char: '(', heightEm: 1 }] },
      close: { sizes: [{ char: ')', heightEm: 1 }] },
    }),
  };
}

describe('AST to Box', () => {
  let metrics: any;

  beforeEach(() => {
    resetLatexIdCounter();
    metrics = createMockMetrics();
  });

  describe('기본 노드 변환', () => {
    it('root 노드를 HBox로 변환한다', () => {
      const ast = parseLatex('1');
      const box = astToBox(ast, metrics);

      expect(box.type).toBe('hbox');
    });

    it('number 노드를 GlyphBox가 포함된 HBox로 변환한다', () => {
      // parseLatex는 "123"을 3개의 개별 number 노드로 파싱한다
      const ast = parseLatex('123');
      const box = astToBox(ast, metrics);

      expect(box.type).toBe('hbox');
      const root = box as HBox;
      // root에 3개의 number HBox가 자식으로 들어감
      expect(root.children.length).toBe(3);
      for (const numBox of root.children) {
        expect(numBox.type).toBe('hbox');
        const hb = numBox as HBox;
        // 각 number 노드는 단일 문자 → GlyphBox 1개
        expect(hb.children.length).toBe(1);
        expect(hb.children[0].type).toBe('glyph');
      }
    });

    it('variable 노드를 이탤릭 GlyphBox로 변환한다', () => {
      const ast = parseLatex('x');
      const box = astToBox(ast, metrics);

      const root = box as HBox;
      const varBox = root.children[0] as HBox;
      expect(varBox.type).toBe('hbox');
      // variable is converted with math italic unicode mapping (italic=false, mapped char)
      expect(varBox.children.length).toBe(1);
      expect(varBox.children[0].type).toBe('glyph');
      expect((varBox.children[0] as any).italic).toBe(false);
      expect((varBox.children[0] as any).char).toBe(String.fromCodePoint(0x1D465)); // 𝑥
    });

    it('operator 노드를 HBox로 변환한다', () => {
      const ast = parseLatex('+');
      const box = astToBox(ast, metrics);

      const root = box as HBox;
      expect(root.children.length).toBeGreaterThan(0);
      const opBox = root.children[0];
      expect(opBox.type).toBe('hbox');
    });
  });

  describe('복합 노드 변환', () => {
    it('frac 노드를 VBox 분수로 변환한다', () => {
      const ast = parseLatex('\\frac{1}{2}');
      const box = astToBox(ast, metrics);

      const root = box as HBox;
      // frac produces a box inside root
      expect(root.children.length).toBeGreaterThan(0);
      // createFraction은 직접 VBox를 반환한다
      const fracBox = root.children[0];
      expect(fracBox.type).toBe('vbox');
      const vbox = fracBox as VBox;
      // VBox에는 분자, 분수선, 분모가 포함됨
      expect(vbox.children.length).toBeGreaterThan(0);
    });

    it('power 노드를 HBox로 변환한다', () => {
      const ast = parseLatex('x^2');
      const box = astToBox(ast, metrics);

      const root = box as HBox;
      expect(root.children.length).toBeGreaterThan(0);
      // power produces an HBox
      const powerBox = root.children[0];
      expect(powerBox.type).toBe('hbox');
    });

    it('subscript 노드를 HBox로 변환한다', () => {
      const ast = parseLatex('x_1');
      const box = astToBox(ast, metrics);

      const root = box as HBox;
      expect(root.children.length).toBeGreaterThan(0);
      const subBox = root.children[0];
      expect(subBox.type).toBe('hbox');
    });

    it('sqrt 노드를 SurdBox로 변환한다', () => {
      const ast = parseLatex('\\sqrt{x}');
      const box = astToBox(ast, metrics);

      const root = box as HBox;
      expect(root.children.length).toBeGreaterThan(0);
      const sqrtBox = root.children[0];
      expect(sqrtBox.type).toBe('surd');
      const surd = sqrtBox as SurdBox;
      expect(surd.content).toBeDefined();
      expect(surd.ruleThickness).toBeGreaterThan(0);
    });

    it('paren 노드를 HBox로 변환한다', () => {
      const ast = parseLatex('\\left(x\\right)');
      const box = astToBox(ast, metrics);

      const root = box as HBox;
      expect(root.children.length).toBeGreaterThan(0);
      const parenBox = root.children[0];
      expect(parenBox.type).toBe('hbox');
    });

    it('abs 노드를 HBox로 변환한다', () => {
      const ast = parseLatex('|x|');
      const box = astToBox(ast, metrics);

      const root = box as HBox;
      expect(root.children.length).toBeGreaterThan(0);
      // abs produces an HBox wrapping delimiters and content
      const absBox = root.children[0];
      expect(absBox.type).toBe('hbox');
    });

    it('func 노드를 HBox로 변환한다', () => {
      const ast = parseLatex('\\sin{x}');
      const box = astToBox(ast, metrics);

      const root = box as HBox;
      expect(root.children.length).toBeGreaterThan(0);
      const funcBox = root.children[0];
      expect(funcBox.type).toBe('hbox');
    });
  });

  describe('대형 연산자 변환', () => {
    it('integral 노드를 변환한다', () => {
      const ast = parseLatex('\\int_0^1 x \\, dx');
      const box = astToBox(ast, metrics);

      const root = box as HBox;
      expect(root.children.length).toBeGreaterThan(0);
      // integral produces a complex box structure
      const integralBox = root.children[0];
      expect(integralBox.type).toBe('hbox');
    });

    it('sum 노드를 변환한다', () => {
      const ast = parseLatex('\\sum_{i=1}^{n} i');
      const box = astToBox(ast, metrics);

      const root = box as HBox;
      expect(root.children.length).toBeGreaterThan(0);
      const sumBox = root.children[0];
      expect(sumBox.type).toBe('hbox');
    });
  });

  describe('sourceId 전파', () => {
    it('변환된 Box에 원본 노드 id를 sourceId로 설정한다', () => {
      const ast = parseLatex('x');
      const box = astToBox(ast, metrics);

      // root box has sourceId matching ast.id
      expect(box.sourceId).toBe(ast.id);

      // child (variable) also has sourceId
      const root = box as HBox;
      const varBox = root.children[0];
      expect(varBox.sourceId).toBeDefined();
      expect(varBox.sourceId).toBe(ast.children[0].id);
    });
  });
});
