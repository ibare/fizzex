import { describe, it, expect, beforeEach, vi } from 'vitest';
import { astToBox } from './ast-to-box.js';
import { parseLatex } from '../latex/latex-parser.js';
import { resetLatexIdCounter } from '../utils/id-generator.js';
import { layoutBox } from './box-layout.js';
import type { Box, HBox, VBox, SurdBox } from './types.js';

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
      const { ast } = parseLatex('1');
      const box = astToBox(ast, metrics);

      expect(box.type).toBe('hbox');
    });

    it('number 노드를 GlyphBox가 포함된 HBox로 변환한다', () => {
      const { ast } = parseLatex('123');
      const box = astToBox(ast, metrics);

      expect(box.type).toBe('hbox');
      const root = box as HBox;
      expect(root.children.length).toBe(1);
      const numBox = root.children[0] as HBox;
      expect(numBox.type).toBe('hbox');
      expect(numBox.children.length).toBe(3);
      for (const glyph of numBox.children) {
        expect(glyph.type).toBe('glyph');
      }
    });

    it('variable 노드를 이탤릭 GlyphBox로 변환한다', () => {
      const { ast } = parseLatex('x');
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
      const { ast } = parseLatex('+');
      const box = astToBox(ast, metrics);

      const root = box as HBox;
      expect(root.children.length).toBeGreaterThan(0);
      const opBox = root.children[0];
      expect(opBox.type).toBe('hbox');
    });
  });

  describe('복합 노드 변환', () => {
    it('frac 노드를 VBox 분수로 변환한다', () => {
      const { ast } = parseLatex('\\frac{1}{2}');
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
      const { ast } = parseLatex('x^2');
      const box = astToBox(ast, metrics);

      const root = box as HBox;
      expect(root.children.length).toBeGreaterThan(0);
      // power produces an HBox
      const powerBox = root.children[0];
      expect(powerBox.type).toBe('hbox');
    });

    it('subscript 노드를 HBox로 변환한다', () => {
      const { ast } = parseLatex('x_1');
      const box = astToBox(ast, metrics);

      const root = box as HBox;
      expect(root.children.length).toBeGreaterThan(0);
      const subBox = root.children[0];
      expect(subBox.type).toBe('hbox');
    });

    it('sqrt 노드를 SurdBox로 변환한다', () => {
      const { ast } = parseLatex('\\sqrt{x}');
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
      const { ast } = parseLatex('\\left(x\\right)');
      const box = astToBox(ast, metrics);

      const root = box as HBox;
      expect(root.children.length).toBeGreaterThan(0);
      const parenBox = root.children[0];
      expect(parenBox.type).toBe('hbox');
    });

    it('abs 노드를 HBox로 변환한다', () => {
      const { ast } = parseLatex('|x|');
      const box = astToBox(ast, metrics);

      const root = box as HBox;
      expect(root.children.length).toBeGreaterThan(0);
      // abs produces an HBox wrapping delimiters and content
      const absBox = root.children[0];
      expect(absBox.type).toBe('hbox');
    });

    it('func 노드를 HBox로 변환한다', () => {
      const { ast } = parseLatex('\\sin{x}');
      const box = astToBox(ast, metrics);

      const root = box as HBox;
      expect(root.children.length).toBeGreaterThan(0);
      const funcBox = root.children[0];
      expect(funcBox.type).toBe('hbox');
    });
  });

  describe('대형 연산자 변환', () => {
    it('integral 노드를 변환한다', () => {
      const { ast } = parseLatex('\\int_0^1 x \\, dx');
      const box = astToBox(ast, metrics);

      const root = box as HBox;
      expect(root.children.length).toBeGreaterThan(0);
      // integral produces a complex box structure
      const integralBox = root.children[0];
      expect(integralBox.type).toBe('hbox');
    });

    it('sum 노드를 변환한다', () => {
      const { ast } = parseLatex('\\sum_{i=1}^{n} i');
      const box = astToBox(ast, metrics);

      const root = box as HBox;
      expect(root.children.length).toBeGreaterThan(0);
      const sumBox = root.children[0];
      expect(sumBox.type).toBe('hbox');
    });
  });

  describe('sourceId 전파', () => {
    it('변환된 Box에 원본 노드 id를 sourceId로 설정한다', () => {
      const { ast } = parseLatex('x');
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

  // ─────────────────────────────────────────────
  // 화학식 (\ce)
  // ─────────────────────────────────────────────
  describe('화학식 조판', () => {
    function boxOf(latex: string): Box {
      const { ast } = parseLatex(latex);
      return astToBox(ast, metrics, 1.0, true);
    }

    function collectGlyphs(box: Box, out: any[] = []): any[] {
      if (box.type === 'glyph') out.push(box);
      const kids = (box as HBox).children;
      if (Array.isArray(kids)) for (const c of kids) collectGlyphs(c, out);
      return out;
    }

    function collectKerns(box: Box, out: Box[] = []): Box[] {
      if (box.type === 'kern') out.push(box);
      const kids = (box as HBox).children;
      if (Array.isArray(kids)) for (const c of kids) collectKerns(c, out);
      return out;
    }

    it('원소 기호를 곧게 세워 쓴다 — 이탤릭 글리프가 없다', () => {
      const glyphs = collectGlyphs(boxOf('\\ce{H2O}'));
      expect(glyphs.length).toBeGreaterThan(0);
      expect(glyphs.every((g) => g.italic === false)).toBe(true);
    });

    it('화살표 좌우에 여백을 넣는다 — AST 가 아니라 조판이 넣는다', () => {
      const withArrow = boxOf('\\ce{A -> B}');
      const withoutArrow = boxOf('\\ce{AB}');
      expect(collectKerns(withArrow).length).toBeGreaterThan(
        collectKerns(withoutArrow).length,
      );
    });

    it('전하를 아래첨자와 같은 x 에 쌓지 않는다', () => {
      // 한 원자에 담으면 두 첨자가 같은 x 에 세로로 겹친다. 표준 구현은
      // 첨자마다 원자를 따로 만들어 전하가 아래첨자 오른쪽에 온다.
      const box = boxOf('\\ce{SO4^2-}');
      layoutBox(box, 0, 0);
      const glyphs = collectGlyphs(box);
      const four = glyphs.find((g) => g.char === '4');
      const two = glyphs.find((g) => g.char === '2');

      expect(four).toBeDefined();
      expect(two).toBeDefined();
      expect(two.x).toBeGreaterThan(four.x);
    });

    it('전하가 붙어도 아래첨자는 단독일 때와 같은 깊이로 내려간다', () => {
      // 동시 첨자로 두면 TeX Rule 18e 의 간격 확보가 발동해 더 내려간다
      const subShift = (latex: string): number => {
        const box = boxOf(latex);
        layoutBox(box, 0, 0);
        const four = collectGlyphs(box).find((g) => g.char === '4');
        return four.y;
      };

      expect(subShift('\\ce{SO4^2-}')).toBe(subShift('\\ce{SO4}'));
    });

    it('항 사이 공백이 폭 차이로 드러난다 — H2O (l) 이 H2O(l) 보다 넓다', () => {
      expect(boxOf('\\ce{H2O (l)}').width).toBeGreaterThan(boxOf('\\ce{H2O(l)}').width);
    });

    it('라벨 없는 화살표에도 최소 길이를 준다', () => {
      const box = boxOf('\\ce{A -> B}');
      const rules: any[] = [];
      const walk = (b: Box): void => {
        if (b.type === 'rule' && (b as any).xarrow) rules.push(b);
        const kids = (b as HBox).children;
        if (Array.isArray(kids)) for (const c of kids) walk(c);
      };
      walk(box);
      expect(rules).toHaveLength(1);
      expect(rules[0].xarrow.width).toBeGreaterThanOrEqual(20 * 1.0);
    });

    it('가역 화살표는 두 선을 담을 세로 여유를 갖는다', () => {
      const findArrowRule = (latex: string): any => {
        let found: any = null;
        const walk = (b: Box): void => {
          if (b.type === 'rule' && (b as any).xarrow) found = b;
          const kids = (b as HBox).children;
          if (Array.isArray(kids)) for (const c of kids) walk(c);
        };
        walk(boxOf(latex));
        return found;
      };
      const plain = findArrowRule('\\ce{A -> B}');
      const equilibrium = findArrowRule('\\ce{A <=> B}');
      expect(equilibrium.height).toBeGreaterThan(plain.height);
      expect(equilibrium.depth).toBeGreaterThan(plain.depth);
    });
  });
});
