import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createGlyph,
  createGlyphString,
  createHBox,
  createVBox,
  createRule,
  createVerticalRule,
  createKern,
  createFraction,
  createPower,
  createParenthesized,
  createOperator,
  createSubscript,
  createAbsoluteValue,
  createIntegralBox,
  createSumBox,
  createLimitBox,
  createProductBox,
  createOverlineBox,
  createAccentBox,
  createMatrixBox,
  createTextBox,
  createAlignBox,
  createCasesBox,
  createGatherBox,
  createArrayBox,
  createSurd,
} from './box-builder';
import type { Box, GlyphBox, HBox, KernBox } from './types';

function createMockMetrics(): any {
  return {
    measureWidth: vi.fn().mockReturnValue(10),
    measureStringWidth: vi.fn().mockReturnValue(50),
    getHeight: vi.fn().mockReturnValue(14),
    getDepth: vi.fn().mockReturnValue(4),
    getFont: vi.fn().mockReturnValue('20px KaTeX_Main'),
    getActualFontSize: vi.fn((fs: number) => 20 * fs),
    updateConfig: vi.fn(),
    getDelimiterGlyph: vi.fn().mockReturnValue({ type: 'single', char: '(' }),
    getDelimiterPair: vi.fn().mockReturnValue({
      open: { sizes: ['('], extensible: null },
      close: { sizes: [')'], extensible: null },
    }),
  };
}

/** 테스트용 간단한 Box 리터럴 생성 */
function makeBox(overrides: Partial<Box> = {}): HBox {
  return {
    type: 'hbox',
    children: [],
    width: 20,
    height: 14,
    depth: 4,
    x: 0,
    y: 0,
    ...overrides,
  } as HBox;
}

function makeGlyphBox(overrides: Partial<GlyphBox> = {}): GlyphBox {
  return {
    type: 'glyph',
    char: 'x',
    italic: false,
    fontSize: 1.0,
    width: 10,
    height: 14,
    depth: 4,
    x: 0,
    y: 0,
    ...overrides,
  };
}

describe('Box Builder', () => {
  let metrics: any;

  beforeEach(() => {
    metrics = createMockMetrics();
  });

  // ─────────────────────────────────────────────
  // createGlyph
  // ─────────────────────────────────────────────
  describe('createGlyph', () => {
    it('문자의 GlyphBox를 생성한다', () => {
      const glyph = createGlyph('x', metrics);
      expect(glyph.type).toBe('glyph');
      expect(glyph.char).toBe('x');
    });

    it('sourceId를 설정한다', () => {
      const glyph = createGlyph('a', metrics, 1.0, false, 'node_1');
      expect(glyph.sourceId).toBe('node_1');
    });

    it('이탤릭 여부를 설정한다', () => {
      const normal = createGlyph('x', metrics, 1.0, false);
      const italic = createGlyph('x', metrics, 1.0, true);
      expect(normal.italic).toBe(false);
      expect(italic.italic).toBe(true);
    });

    it('metrics로 너비를 측정한다', () => {
      metrics.measureWidth.mockReturnValue(12);
      const glyph = createGlyph('W', metrics, 1.0, false);
      expect(metrics.measureWidth).toHaveBeenCalledWith('W', 1.0, false);
      expect(glyph.width).toBe(12);
    });

    it('metrics로 height와 depth를 측정한다', () => {
      metrics.getHeight.mockReturnValue(15);
      metrics.getDepth.mockReturnValue(5);
      const glyph = createGlyph('y', metrics, 1.0);
      expect(glyph.height).toBe(15);
      expect(glyph.depth).toBe(5);
    });

    it('fontSize를 전달한다', () => {
      const glyph = createGlyph('x', metrics, 0.7);
      expect(glyph.fontSize).toBe(0.7);
      expect(metrics.measureWidth).toHaveBeenCalledWith('x', 0.7, false);
    });

    it('x, y가 0으로 초기화된다', () => {
      const glyph = createGlyph('x', metrics);
      expect(glyph.x).toBe(0);
      expect(glyph.y).toBe(0);
    });
  });

  // ─────────────────────────────────────────────
  // createGlyphString
  // ─────────────────────────────────────────────
  describe('createGlyphString', () => {
    it('문자열을 개별 Glyph의 HBox로 변환한다', () => {
      const hbox = createGlyphString('abc', metrics);
      expect(hbox.type).toBe('hbox');
      expect(hbox.children).toHaveLength(3);
      expect((hbox.children[0] as GlyphBox).char).toBe('a');
      expect((hbox.children[1] as GlyphBox).char).toBe('b');
      expect((hbox.children[2] as GlyphBox).char).toBe('c');
    });

    it('빈 문자열은 빈 HBox를 반환한다', () => {
      const hbox = createGlyphString('', metrics);
      expect(hbox.type).toBe('hbox');
      expect(hbox.children).toHaveLength(0);
    });

    it('sourceId를 설정한다', () => {
      const hbox = createGlyphString('xy', metrics, 1.0, false, 'str_1');
      expect(hbox.sourceId).toBe('str_1');
    });

    it('이탤릭 여부를 각 글리프에 전달한다', () => {
      const hbox = createGlyphString('ab', metrics, 1.0, true);
      for (const child of hbox.children) {
        expect((child as GlyphBox).italic).toBe(true);
      }
    });
  });

  // ─────────────────────────────────────────────
  // createHBox
  // ─────────────────────────────────────────────
  describe('createHBox', () => {
    it('전체 너비는 자식 너비의 합이다', () => {
      const children = [
        makeBox({ width: 10 }),
        makeBox({ width: 20 }),
        makeBox({ width: 5 }),
      ];
      const hbox = createHBox(children);
      expect(hbox.width).toBe(35);
    });

    it('height는 자식 중 최대값이다', () => {
      const children = [
        makeBox({ height: 10, depth: 2 }),
        makeBox({ height: 20, depth: 3 }),
        makeBox({ height: 5, depth: 1 }),
      ];
      const hbox = createHBox(children);
      expect(hbox.height).toBe(20);
    });

    it('depth는 자식 중 최대값이다', () => {
      const children = [
        makeBox({ height: 10, depth: 2 }),
        makeBox({ height: 5, depth: 8 }),
        makeBox({ height: 3, depth: 4 }),
      ];
      const hbox = createHBox(children);
      expect(hbox.depth).toBe(8);
    });

    it('빈 children이면 크기가 0이다', () => {
      const hbox = createHBox([]);
      expect(hbox.width).toBe(0);
      expect(hbox.height).toBe(0);
      expect(hbox.depth).toBe(0);
    });

    it('sourceId를 설정한다', () => {
      const hbox = createHBox([makeBox()], 'hbox_1');
      expect(hbox.sourceId).toBe('hbox_1');
    });

    it('shift가 음수인 자식은 height를 증가시킨다', () => {
      const child = makeBox({ height: 10, depth: 4, shift: -5 });
      const hbox = createHBox([child]);
      // effectiveHeight = 10 - (-5) = 15
      expect(hbox.height).toBe(15);
    });

    it('shift가 양수인 자식은 depth를 증가시킨다', () => {
      const child = makeBox({ height: 10, depth: 4, shift: 3 });
      const hbox = createHBox([child]);
      // effectiveDepth = 4 + 3 = 7
      expect(hbox.depth).toBe(7);
    });

    it('복합 노드 내부 슬롯이면 빈 children에도 최소 크기를 부여한다', () => {
      const hbox = createHBox([], 'frac_1_num');
      expect(hbox.width).toBeGreaterThan(0);
      expect(hbox.height).toBeGreaterThan(0);
      expect(hbox.depth).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────
  // createVBox
  // ─────────────────────────────────────────────
  describe('createVBox', () => {
    it('너비는 가장 넓은 자식이다', () => {
      const children = [
        makeBox({ width: 10 }),
        makeBox({ width: 30 }),
        makeBox({ width: 20 }),
      ];
      const vbox = createVBox(children);
      expect(vbox.width).toBe(30);
    });

    it('총 높이가 자식 높이의 합이다', () => {
      const children = [
        makeBox({ height: 10, depth: 5 }),
        makeBox({ height: 8, depth: 4 }),
      ];
      const vbox = createVBox(children);
      // totalHeight = (10+5) + (8+4) = 27
      expect(vbox.height + vbox.depth).toBe(27);
    });

    it('center baseline으로 height/depth를 분할한다', () => {
      const children = [
        makeBox({ height: 10, depth: 5 }),
        makeBox({ height: 8, depth: 4 }),
      ];
      const vbox = createVBox(children, 'center');
      // totalHeight = 27, center → 13.5 / 13.5
      expect(vbox.height).toBe(13.5);
      expect(vbox.depth).toBe(13.5);
    });

    it('빈 children이면 크기가 0이다', () => {
      const vbox = createVBox([]);
      expect(vbox.width).toBe(0);
      expect(vbox.height).toBe(0);
      expect(vbox.depth).toBe(0);
    });

    it('top baseline이면 첫 자식의 height를 사용한다', () => {
      const children = [
        makeBox({ height: 12, depth: 3 }),
        makeBox({ height: 8, depth: 4 }),
      ];
      const vbox = createVBox(children, 'top');
      expect(vbox.height).toBe(12);
      // depth = totalHeight - height = (12+3+8+4) - 12 = 15
      expect(vbox.depth).toBe(15);
    });

    it('bottom baseline이면 마지막 자식의 depth를 사용한다', () => {
      const children = [
        makeBox({ height: 10, depth: 5 }),
        makeBox({ height: 8, depth: 6 }),
      ];
      const vbox = createVBox(children, 'bottom');
      expect(vbox.depth).toBe(6);
      // height = totalHeight - depth = (10+5+8+6) - 6 = 23
      expect(vbox.height).toBe(23);
    });

    it('숫자 인덱스 baseline이면 해당 자식의 baseline을 사용한다', () => {
      const children = [
        makeBox({ height: 5, depth: 3 }),  // index 0: total 8
        makeBox({ height: 10, depth: 4 }), // index 1: baseline here
      ];
      const vbox = createVBox(children, 1);
      // aboveHeight = (5+3) + 10 = 18
      expect(vbox.height).toBe(18);
      // depth = totalHeight - height = (5+3+10+4) - 18 = 4
      expect(vbox.depth).toBe(4);
    });

    it('sourceId를 설정한다', () => {
      const vbox = createVBox([makeBox()], 'center', 'vbox_1');
      expect(vbox.sourceId).toBe('vbox_1');
    });

    it('baselineType을 저장한다', () => {
      const vbox = createVBox([makeBox()], 'top');
      expect(vbox.baselineType).toBe('top');
    });
  });

  // ─────────────────────────────────────────────
  // createRule
  // ─────────────────────────────────────────────
  describe('createRule', () => {
    it('지정된 너비와 두께의 RuleBox를 생성한다', () => {
      const rule = createRule(100, 2);
      expect(rule.type).toBe('rule');
      expect(rule.width).toBe(100);
      expect(rule.thickness).toBe(2);
    });

    it('height와 depth는 두께의 절반이다', () => {
      const rule = createRule(50, 4);
      expect(rule.height).toBe(2);
      expect(rule.depth).toBe(2);
    });

    it('sourceId를 설정한다', () => {
      const rule = createRule(50, 2, 'rule_1');
      expect(rule.sourceId).toBe('rule_1');
    });
  });

  // ─────────────────────────────────────────────
  // createVerticalRule
  // ─────────────────────────────────────────────
  describe('createVerticalRule', () => {
    it('세로선 RuleBox를 생성한다', () => {
      const rule = createVerticalRule(2, 10, 5);
      expect(rule.type).toBe('rule');
      expect(rule.width).toBe(2);
      expect(rule.height).toBe(10);
      expect(rule.depth).toBe(5);
    });

    it('thickness는 height + depth이다', () => {
      const rule = createVerticalRule(1, 8, 3);
      expect(rule.thickness).toBe(11);
    });

    it('sourceId를 설정한다', () => {
      const rule = createVerticalRule(1, 5, 3, 'vrule_1');
      expect(rule.sourceId).toBe('vrule_1');
    });
  });

  // ─────────────────────────────────────────────
  // createKern
  // ─────────────────────────────────────────────
  describe('createKern', () => {
    it('지정된 너비의 KernBox를 생성한다', () => {
      const kern = createKern(8);
      expect(kern.type).toBe('kern');
      expect(kern.width).toBe(8);
    });

    it('height와 depth는 0이다', () => {
      const kern = createKern(15);
      expect(kern.height).toBe(0);
      expect(kern.depth).toBe(0);
    });
  });

  // ─────────────────────────────────────────────
  // createFraction
  // ─────────────────────────────────────────────
  describe('createFraction', () => {
    it('분수 VBox를 생성한다', () => {
      const num = makeBox({ width: 20, height: 14, depth: 4 });
      const den = makeBox({ width: 30, height: 14, depth: 4 });
      const frac = createFraction(num, den, metrics);
      expect(frac.type).toBe('vbox');
    });

    it('분수선이 포함된다', () => {
      const num = makeBox({ width: 20 });
      const den = makeBox({ width: 20 });
      const frac = createFraction(num, den, metrics);
      // VBox children: numBox(HBox), numGapKern(KernBox), rule(RuleBox), denGapKern(KernBox), denBox(HBox)
      expect(frac.children).toHaveLength(5);
      // rule is at index 2
      expect(frac.children[2].type).toBe('rule');
    });

    it('sourceId를 전달한다', () => {
      const num = makeBox();
      const den = makeBox();
      const frac = createFraction(num, den, metrics, 1.0, 'frac_1');
      expect(frac.sourceId).toBe('frac_1');
    });

    it('분수선 너비가 분자/분모 중 큰 값 기준이다', () => {
      const num = makeBox({ width: 30 });
      const den = makeBox({ width: 50 });
      const frac = createFraction(num, den, metrics);
      // ruleWidth = max(30,50) + gap*2 = 50 + (20*0.2)*2 = 50 + 8 = 58
      const rule = frac.children[2];
      expect(rule.width).toBe(58);
    });

    it('baselineType이 2이다 (분수선 위치)', () => {
      const num = makeBox();
      const den = makeBox();
      const frac = createFraction(num, den, metrics);
      expect(frac.baselineType).toBe(2);
    });

    it('axis height만큼 shift가 적용된다', () => {
      const num = makeBox();
      const den = makeBox();
      const frac = createFraction(num, den, metrics);
      // axisHeight = actualFontSize * 0.25 = 20 * 0.25 = 5
      expect(frac.shift).toBe(-5);
    });
  });

  // ─────────────────────────────────────────────
  // createPower
  // ─────────────────────────────────────────────
  describe('createPower', () => {
    it('base와 exponent를 HBox로 결합한다', () => {
      const base = makeBox({ width: 20 });
      const exp = makeBox({ width: 10 });
      const power = createPower(base, exp, metrics);
      expect(power.type).toBe('hbox');
      expect(power.children).toHaveLength(2);
    });

    it('exponent에 음수 shift를 적용한다', () => {
      const base = makeBox({ width: 20, height: 14 });
      const exp = makeBox({ width: 10 });
      const power = createPower(base, exp, metrics);
      const shiftedExp = power.children[1];
      expect(shiftedExp.shift).toBeDefined();
      expect(shiftedExp.shift!).toBeLessThan(0);
    });

    it('sourceId를 설정한다', () => {
      const base = makeBox();
      const exp = makeBox();
      const power = createPower(base, exp, metrics, 1.0, 'pow_1');
      expect(power.sourceId).toBe('pow_1');
    });

    it('base 높이가 클수록 shift가 증가한다', () => {
      const base1 = makeBox({ height: 14 });
      const base2 = makeBox({ height: 30 });
      const exp = makeBox();

      const power1 = createPower(base1, exp, metrics);
      const power2 = createPower(base2, exp, metrics);

      // base2가 더 높으므로 더 큰 (절대값) shift
      expect(Math.abs(power2.children[1].shift!)).toBeGreaterThan(
        Math.abs(power1.children[1].shift!)
      );
    });
  });

  // ─────────────────────────────────────────────
  // createSubscript
  // ─────────────────────────────────────────────
  describe('createSubscript', () => {
    it('base와 subscript를 HBox로 결합한다', () => {
      const base = makeBox({ width: 20 });
      const sub = makeBox({ width: 8 });
      const result = createSubscript(base, sub, metrics);
      expect(result.type).toBe('hbox');
      expect(result.children).toHaveLength(2);
    });

    it('subscript에 양수 shift를 적용한다', () => {
      const base = makeBox();
      const sub = makeBox();
      const result = createSubscript(base, sub, metrics);
      const shiftedSub = result.children[1];
      expect(shiftedSub.shift).toBeGreaterThan(0);
    });

    it('sourceId를 설정한다', () => {
      const base = makeBox();
      const sub = makeBox();
      const result = createSubscript(base, sub, metrics, 1.0, 'sub_1');
      expect(result.sourceId).toBe('sub_1');
    });

    it('depth가 subscript shift를 고려한다', () => {
      const base = makeBox({ depth: 4 });
      const sub = makeBox({ depth: 4 });
      const result = createSubscript(base, sub, metrics);
      // shift = 20 * 0.2 = 4, depth >= sub.depth + shift = 4 + 4 = 8
      expect(result.depth).toBeGreaterThanOrEqual(8);
    });
  });

  // ─────────────────────────────────────────────
  // createSurd
  // ─────────────────────────────────────────────
  describe('createSurd', () => {
    it('SurdBox를 생성한다', () => {
      const content = makeBox({ width: 30, height: 14, depth: 4 });
      const surd = createSurd(content, metrics);
      expect(surd.type).toBe('surd');
    });

    it('content를 포함한다', () => {
      const content = makeBox({ width: 30 });
      const surd = createSurd(content, metrics);
      expect(surd.content).toBe(content);
    });

    it('ruleThickness가 양수이다', () => {
      const content = makeBox();
      const surd = createSurd(content, metrics);
      expect(surd.ruleThickness).toBeGreaterThan(0);
    });

    it('너비가 sqrt기호 폭 + content 너비 + gap이다', () => {
      const content = makeBox({ width: 30 });
      const surd = createSurd(content, metrics);
      // sqrtWidth = 20 * 0.6 = 12, gap = 20 * 0.08 = 1.6
      // totalWidth = 12 + 30 + 1.6 = 43.6
      expect(surd.width).toBeCloseTo(43.6);
    });

    it('높이가 content.height + gap + ruleThickness이다', () => {
      const content = makeBox({ height: 14, depth: 4 });
      const surd = createSurd(content, metrics);
      // gap = 20 * 0.08 = 1.6
      // ruleThickness = 20 * 0.04 * 1.5 = 1.2
      // totalHeight = 14 + 1.6 + 1.2 = 16.8
      expect(surd.height).toBeCloseTo(16.8);
    });

    it('depth는 content의 depth와 같다', () => {
      const content = makeBox({ depth: 7 });
      const surd = createSurd(content, metrics);
      expect(surd.depth).toBe(7);
    });

    it('sourceId를 설정한다', () => {
      const content = makeBox();
      const surd = createSurd(content, metrics, 1.0, 'sqrt_1');
      expect(surd.sourceId).toBe('sqrt_1');
    });
  });

  // ─────────────────────────────────────────────
  // createOperator
  // ─────────────────────────────────────────────
  describe('createOperator', () => {
    it('연산자 HBox를 생성한다', () => {
      const op = createOperator('+', metrics);
      expect(op.type).toBe('hbox');
    });

    it('좌우 간격을 포함한다', () => {
      const op = createOperator('+', metrics);
      // kern + glyph + kern = 3 children
      expect(op.children).toHaveLength(3);
      expect(op.children[0].type).toBe('kern');
      expect(op.children[2].type).toBe('kern');
    });

    it('sourceId를 설정한다', () => {
      const op = createOperator('+', metrics, 1.0, 'op_1');
      // sourceId is on the glyph (children[1]), not the outer HBox
      // Actually, createOperator passes sourceId to createGlyph, not to the outer HBox
      const glyph = op.children[1] as GlyphBox;
      expect(glyph.sourceId).toBe('op_1');
    });

    it('마이너스 기호를 유니코드로 변환한다', () => {
      const op = createOperator('-', metrics);
      const glyph = op.children[1] as GlyphBox;
      expect(glyph.char).toBe('\u2212');
    });

    it('곱하기 기호를 유니코드로 변환한다', () => {
      const op = createOperator('*', metrics);
      const glyph = op.children[1] as GlyphBox;
      expect(glyph.char).toBe('\u00D7');
    });

    it('후위 연산자(!)는 간격 없이 렌더링한다', () => {
      const op = createOperator('!', metrics);
      // 후위 연산자: glyph만 포함
      expect(op.children).toHaveLength(1);
      expect(op.children[0].type).toBe('glyph');
    });
  });

  // ─────────────────────────────────────────────
  // createParenthesized
  // ─────────────────────────────────────────────
  describe('createParenthesized', () => {
    it('괄호 HBox를 생성한다', () => {
      const content = makeBox({ width: 30 });
      const result = createParenthesized(content, '(', metrics);
      expect(result.type).toBe('hbox');
    });

    it('여는/닫는 괄호를 포함한다', () => {
      const content = makeBox({ width: 30, height: 14, depth: 4 });
      const result = createParenthesized(content, '(', metrics);
      // open + padding + content + padding + close = 5 children
      expect(result.children).toHaveLength(5);
      expect(result.children[0].type).toBe('glyph');
      expect(result.children[4].type).toBe('glyph');
    });

    it('sourceId를 설정한다', () => {
      const content = makeBox();
      const result = createParenthesized(content, '(', metrics, 1.0, 'paren_1');
      expect(result.sourceId).toBe('paren_1');
    });

    it('내부 패딩이 포함된다', () => {
      const content = makeBox({ width: 30 });
      const result = createParenthesized(content, '(', metrics);
      // children[1] and children[3] are kern (padding)
      expect(result.children[1].type).toBe('kern');
      expect(result.children[3].type).toBe('kern');
    });

    it('대괄호 타입을 지원한다', () => {
      const content = makeBox();
      metrics.getDelimiterGlyph
        .mockReturnValueOnce({ type: 'single', char: '[' })
        .mockReturnValueOnce({ type: 'single', char: ']' });
      const result = createParenthesized(content, '[', metrics);
      expect(result.children).toHaveLength(5);
    });

    it('중괄호 타입을 지원한다', () => {
      const content = makeBox();
      metrics.getDelimiterGlyph
        .mockReturnValueOnce({ type: 'single', char: '{' })
        .mockReturnValueOnce({ type: 'single', char: '}' });
      const result = createParenthesized(content, '{', metrics);
      expect(result.children).toHaveLength(5);
    });

    it('빈 content일 때 최소 너비를 확보한다', () => {
      const emptyContent = makeBox({ width: 0, height: 0, depth: 0 });
      const result = createParenthesized(emptyContent, '(', metrics);
      // content 자리에 kern이 대체됨
      expect(result.width).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────
  // createAbsoluteValue
  // ─────────────────────────────────────────────
  describe('createAbsoluteValue', () => {
    it('절댓값 HBox를 생성한다', () => {
      const content = makeBox({ width: 20 });
      const result = createAbsoluteValue(content, metrics);
      expect(result.type).toBe('hbox');
    });

    it('양쪽에 | 기호를 포함한다', () => {
      const content = makeBox({ width: 20, height: 14, depth: 4 });
      const result = createAbsoluteValue(content, metrics);
      // open bar + content + close bar = 3 children
      expect(result.children).toHaveLength(3);
      expect((result.children[0] as GlyphBox).char).toBe('|');
      expect((result.children[2] as GlyphBox).char).toBe('|');
    });

    it('sourceId를 설정한다', () => {
      const content = makeBox();
      const result = createAbsoluteValue(content, metrics, 1.0, 'abs_1');
      expect(result.sourceId).toBe('abs_1');
    });

    it('빈 content일 때 최소 너비를 확보한다', () => {
      const emptyContent = makeBox({ width: 0, height: 0, depth: 0 });
      const result = createAbsoluteValue(emptyContent, metrics);
      expect(result.width).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────
  // createIntegralBox
  // ─────────────────────────────────────────────
  describe('createIntegralBox', () => {
    it('적분 HBox를 생성한다', () => {
      const lower = makeBox({ width: 10 });
      const upper = makeBox({ width: 10 });
      const integrand = makeBox({ width: 30 });
      const result = createIntegralBox(lower, upper, integrand, 'x', metrics);
      expect(result.type).toBe('hbox');
    });

    it('적분 기호를 포함한다', () => {
      const lower = makeBox({ width: 0 });
      const upper = makeBox({ width: 0 });
      const integrand = makeBox({ width: 30 });
      const result = createIntegralBox(lower, upper, integrand, 'x', metrics);
      // 적분 기호(HBox) + spacing + integrand + thinKern + diffBox
      expect(result.children.length).toBeGreaterThanOrEqual(2);
    });

    it('differential을 포함한다', () => {
      const lower = makeBox({ width: 0 });
      const upper = makeBox({ width: 0 });
      const integrand = makeBox({ width: 30 });
      const result = createIntegralBox(lower, upper, integrand, 'x', metrics);
      // The last child should be the diff HBox containing 'd' and variable glyph
      const lastChild = result.children[result.children.length - 1] as HBox;
      expect(lastChild.type).toBe('hbox');
    });

    it('sourceId를 설정한다', () => {
      const lower = makeBox({ width: 0 });
      const upper = makeBox({ width: 0 });
      const integrand = makeBox({ width: 20 });
      const result = createIntegralBox(lower, upper, integrand, 'x', metrics, 1.0, 'int_1');
      expect(result.sourceId).toBe('int_1');
    });

    it('상하한이 있으면 limits를 배치한다', () => {
      const lower = makeBox({ width: 15, height: 10, depth: 3 });
      const upper = makeBox({ width: 15, height: 10, depth: 3 });
      const integrand = makeBox({ width: 30 });
      const result = createIntegralBox(lower, upper, integrand, 'x', metrics);
      // 적분 기호 + spacing + limits + ...
      expect(result.children.length).toBeGreaterThanOrEqual(3);
    });

    it('다양한 적분 타입을 지원한다', () => {
      const lower = makeBox({ width: 0 });
      const upper = makeBox({ width: 0 });
      const integrand = makeBox({ width: 20 });

      const iint = createIntegralBox(lower, upper, integrand, 'x', metrics, 1.0, undefined, 'iint');
      expect(iint.type).toBe('hbox');

      const iiint = createIntegralBox(lower, upper, integrand, 'x', metrics, 1.0, undefined, 'iiint');
      expect(iiint.type).toBe('hbox');

      const oint = createIntegralBox(lower, upper, integrand, 'x', metrics, 1.0, undefined, 'oint');
      expect(oint.type).toBe('hbox');
    });
  });

  // ─────────────────────────────────────────────
  // createSumBox
  // ─────────────────────────────────────────────
  describe('createSumBox', () => {
    it('시그마 HBox를 생성한다', () => {
      const lower = makeBox({ width: 20 });
      const upper = makeBox({ width: 15 });
      const body = makeBox({ width: 30 });
      const result = createSumBox(lower, upper, body, metrics);
      expect(result.type).toBe('hbox');
    });

    it('시그마 기호, 상하한, 본문을 포함한다', () => {
      const lower = makeBox({ width: 20 });
      const upper = makeBox({ width: 15 });
      const body = makeBox({ width: 30 });
      const result = createSumBox(lower, upper, body, metrics);
      // sigmaWithLimits(VBox in HBox) + kern + body = 3 children
      expect(result.children).toHaveLength(3);
    });

    it('sourceId를 설정한다', () => {
      const lower = makeBox();
      const upper = makeBox();
      const body = makeBox();
      const result = createSumBox(lower, upper, body, metrics, 1.0, 'sum_1');
      expect(result.sourceId).toBe('sum_1');
    });
  });

  // ─────────────────────────────────────────────
  // createLimitBox
  // ─────────────────────────────────────────────
  describe('createLimitBox', () => {
    it('극한 HBox를 생성한다', () => {
      const approach = makeBox({ width: 10 });
      const body = makeBox({ width: 30 });
      const result = createLimitBox('x', approach, body, metrics);
      expect(result.type).toBe('hbox');
    });

    it('lim 텍스트와 변수, 화살표, 접근값을 포함한다', () => {
      const approach = makeBox({ width: 10 });
      const body = makeBox({ width: 30 });
      const result = createLimitBox('x', approach, body, metrics);
      // limWithInfo(VBox) + kern + body = 3 children
      expect(result.children).toHaveLength(3);
    });

    it('sourceId를 설정한다', () => {
      const approach = makeBox();
      const body = makeBox();
      const result = createLimitBox('x', approach, body, metrics, 1.0, 'lim_1');
      expect(result.sourceId).toBe('lim_1');
    });
  });

  // ─────────────────────────────────────────────
  // createProductBox
  // ─────────────────────────────────────────────
  describe('createProductBox', () => {
    it('곱 기호 HBox를 생성한다', () => {
      const lower = makeBox({ width: 20 });
      const upper = makeBox({ width: 15 });
      const body = makeBox({ width: 30 });
      const result = createProductBox(lower, upper, body, metrics);
      expect(result.type).toBe('hbox');
    });

    it('곱 기호, 상하한, 본문을 포함한다', () => {
      const lower = makeBox({ width: 20 });
      const upper = makeBox({ width: 15 });
      const body = makeBox({ width: 30 });
      const result = createProductBox(lower, upper, body, metrics);
      // productWithLimits(VBox) + kern + body = 3 children
      expect(result.children).toHaveLength(3);
    });

    it('sourceId를 설정한다', () => {
      const lower = makeBox();
      const upper = makeBox();
      const body = makeBox();
      const result = createProductBox(lower, upper, body, metrics, 1.0, 'prod_1');
      expect(result.sourceId).toBe('prod_1');
    });
  });

  // ─────────────────────────────────────────────
  // createOverlineBox
  // ─────────────────────────────────────────────
  describe('createOverlineBox', () => {
    it('윗줄 VBox를 생성한다', () => {
      const content = makeBox({ width: 30 });
      const result = createOverlineBox(content, metrics);
      expect(result.type).toBe('vbox');
    });

    it('윗줄(rule), 간격, 내용을 포함한다', () => {
      const content = makeBox({ width: 30 });
      const result = createOverlineBox(content, metrics);
      // rule + kern(gap) + contentBox = 3 children
      expect(result.children).toHaveLength(3);
      expect(result.children[0].type).toBe('rule');
    });

    it('sourceId를 설정한다', () => {
      const content = makeBox();
      const result = createOverlineBox(content, metrics, 1.0, 'overline_1');
      expect(result.sourceId).toBe('overline_1');
    });

    it('baselineType이 2이다 (내용 baseline 사용)', () => {
      const content = makeBox();
      const result = createOverlineBox(content, metrics);
      expect(result.baselineType).toBe(2);
    });
  });

  // ─────────────────────────────────────────────
  // createAccentBox
  // ─────────────────────────────────────────────
  describe('createAccentBox', () => {
    it('악센트 HBox를 생성한다', () => {
      const content = makeBox({ width: 10, height: 14, depth: 4 });
      const result = createAccentBox(content, 'hat', metrics);
      expect(result.type).toBe('hbox');
    });

    it('sourceId를 설정한다', () => {
      const content = makeBox();
      const result = createAccentBox(content, 'hat', metrics, 1.0, 'accent_1');
      expect(result.sourceId).toBe('accent_1');
    });

    it('높이가 악센트를 포함하도록 조정된다', () => {
      const content = makeBox({ width: 10, height: 14, depth: 4 });
      const result = createAccentBox(content, 'hat', metrics);
      expect(result.height).toBeGreaterThanOrEqual(content.height);
    });

    it('다양한 악센트 타입을 지원한다', () => {
      const content = makeBox({ width: 10, height: 14, depth: 4 });
      const types: Array<'hat' | 'vec' | 'dot' | 'ddot' | 'tilde' | 'bar' | 'breve' | 'check'> =
        ['hat', 'vec', 'dot', 'ddot', 'tilde', 'bar', 'breve', 'check'];
      for (const accentType of types) {
        const result = createAccentBox(content, accentType, metrics);
        expect(result.type).toBe('hbox');
      }
    });
  });

  // ─────────────────────────────────────────────
  // createMatrixBox
  // ─────────────────────────────────────────────
  describe('createMatrixBox', () => {
    it('행렬 HBox를 생성한다', () => {
      const cells = [
        [makeBox({ width: 10 }), makeBox({ width: 10 })],
        [makeBox({ width: 10 }), makeBox({ width: 10 })],
      ];
      const result = createMatrixBox(cells, '(', metrics);
      expect(result.type).toBe('hbox');
    });

    it('빈 cells이면 빈 HBox를 반환한다', () => {
      const result = createMatrixBox([], '(', metrics);
      expect(result.type).toBe('hbox');
      expect(result.children).toHaveLength(0);
    });

    it('sourceId를 설정한다', () => {
      const cells = [[makeBox()]];
      const result = createMatrixBox(cells, '(', metrics, 1.0, 'matrix_1');
      expect(result.sourceId).toBe('matrix_1');
    });

    it('none 타입은 괄호 없이 렌더링한다', () => {
      const cells = [[makeBox({ width: 10 })]];
      const result = createMatrixBox(cells, 'none', metrics);
      // 괄호 없이 matrixContent만
      expect(result.children).toHaveLength(1);
    });

    it('괄호를 포함한다', () => {
      const cells = [[makeBox({ width: 10 })]];
      const result = createMatrixBox(cells, '(', metrics);
      // shiftedOpen + padding + matrixContent + padding + shiftedClose
      expect(result.children).toHaveLength(5);
    });

    it('|| 타입은 이중 세로줄을 사용한다', () => {
      const cells = [[makeBox({ width: 10 })]];
      const result = createMatrixBox(cells, '||', metrics);
      // bar1 + barGap + bar2 + padding + content + padding + bar1 + barGap + bar2
      expect(result.children).toHaveLength(9);
    });
  });

  // ─────────────────────────────────────────────
  // createTextBox
  // ─────────────────────────────────────────────
  describe('createTextBox', () => {
    it('텍스트 HBox를 생성한다', () => {
      const result = createTextBox('hello', metrics);
      expect(result.type).toBe('hbox');
    });

    it('정체(upright)로 렌더링한다', () => {
      const result = createTextBox('ab', metrics);
      for (const child of result.children) {
        expect((child as GlyphBox).italic).toBe(false);
      }
    });

    it('sourceId를 설정한다', () => {
      const result = createTextBox('hi', metrics, 1.0, 'text_1');
      expect(result.sourceId).toBe('text_1');
    });
  });

  // ─────────────────────────────────────────────
  // createAlignBox
  // ─────────────────────────────────────────────
  describe('createAlignBox', () => {
    it('정렬 VBox를 생성한다', () => {
      const rows = [
        [makeBox({ width: 20 }), makeBox({ width: 30 })],
        [makeBox({ width: 15 }), makeBox({ width: 25 })],
      ];
      const result = createAlignBox(rows, metrics);
      expect(result.type).toBe('vbox');
    });

    it('빈 rows이면 빈 VBox를 반환한다', () => {
      const result = createAlignBox([], metrics);
      expect(result.type).toBe('vbox');
      expect(result.children).toHaveLength(0);
    });

    it('sourceId를 설정한다', () => {
      const rows = [[makeBox()]];
      const result = createAlignBox(rows, metrics, 1.0, 'align_1');
      expect(result.sourceId).toBe('align_1');
    });

    it('행 간격을 포함한다', () => {
      const rows = [
        [makeBox()],
        [makeBox()],
      ];
      const result = createAlignBox(rows, metrics);
      // row1 + gap + row2 = 3 children
      expect(result.children).toHaveLength(3);
    });
  });

  // ─────────────────────────────────────────────
  // createCasesBox
  // ─────────────────────────────────────────────
  describe('createCasesBox', () => {
    it('cases HBox를 생성한다', () => {
      const rows = [
        [makeBox({ width: 20 }), makeBox({ width: 30 })],
        [makeBox({ width: 15 }), makeBox({ width: 25 })],
      ];
      const result = createCasesBox(rows, metrics);
      expect(result.type).toBe('hbox');
    });

    it('빈 rows이면 빈 HBox를 반환한다', () => {
      const result = createCasesBox([], metrics);
      expect(result.type).toBe('hbox');
      expect(result.children).toHaveLength(0);
    });

    it('왼쪽 중괄호를 포함한다', () => {
      const rows = [[makeBox()]];
      const result = createCasesBox(rows, metrics);
      // openBrace + padding + casesContent = 3 children
      expect(result.children).toHaveLength(3);
      expect((result.children[0] as GlyphBox).char).toBe('{');
    });

    it('sourceId를 설정한다', () => {
      const rows = [[makeBox()]];
      const result = createCasesBox(rows, metrics, 1.0, 'cases_1');
      expect(result.sourceId).toBe('cases_1');
    });
  });

  // ─────────────────────────────────────────────
  // createGatherBox
  // ─────────────────────────────────────────────
  describe('createGatherBox', () => {
    it('gather VBox를 생성한다', () => {
      const rows = [
        makeBox({ width: 30 }),
        makeBox({ width: 20 }),
      ];
      const result = createGatherBox(rows, metrics);
      expect(result.type).toBe('vbox');
    });

    it('빈 rows이면 빈 VBox를 반환한다', () => {
      const result = createGatherBox([], metrics);
      expect(result.type).toBe('vbox');
      expect(result.children).toHaveLength(0);
    });

    it('각 행을 중앙 정렬한다', () => {
      const rows = [
        makeBox({ width: 30 }),
        makeBox({ width: 10 }),
      ];
      const result = createGatherBox(rows, metrics);
      // row1 + gap + row2 = 3 children
      expect(result.children).toHaveLength(3);
      // 각 행은 HBox로 감싸져 있고, 좌우 kern 패딩이 있음
      const row2 = result.children[2] as HBox;
      expect(row2.type).toBe('hbox');
      // 두 번째 행은 더 좁으므로 더 많은 패딩이 있어야 함
      expect(row2.children[0].type).toBe('kern');
    });

    it('sourceId를 설정한다', () => {
      const rows = [makeBox()];
      const result = createGatherBox(rows, metrics, 1.0, 'gather_1');
      expect(result.sourceId).toBe('gather_1');
    });
  });

  // ─────────────────────────────────────────────
  // createArrayBox
  // ─────────────────────────────────────────────
  describe('createArrayBox', () => {
    it('array VBox를 생성한다', () => {
      const cells = [
        [makeBox({ width: 10 }), makeBox({ width: 10 })],
        [makeBox({ width: 10 }), makeBox({ width: 10 })],
      ];
      const result = createArrayBox(cells, ['c', 'c'], [false, false, false], [false, false, false], metrics);
      expect(result.type).toBe('vbox');
    });

    it('빈 cells이면 빈 VBox를 반환한다', () => {
      const result = createArrayBox([], ['c'], [false], [false], metrics);
      expect(result.type).toBe('vbox');
      expect(result.children).toHaveLength(0);
    });

    it('sourceId를 설정한다', () => {
      const cells = [[makeBox()]];
      const result = createArrayBox(cells, ['c'], [false, false], [false, false], metrics, 1.0, 'array_1');
      expect(result.sourceId).toBe('array_1');
    });

    it('열 정렬을 지원한다', () => {
      const cells = [[makeBox({ width: 10 }), makeBox({ width: 20 })]];
      const resultLeft = createArrayBox(cells, ['l', 'c'], [false, false, false], [false, false], metrics);
      const resultRight = createArrayBox(cells, ['r', 'c'], [false, false, false], [false, false], metrics);
      expect(resultLeft.type).toBe('vbox');
      expect(resultRight.type).toBe('vbox');
    });

    it('세로선을 지원한다', () => {
      const cells = [[makeBox({ width: 10 }), makeBox({ width: 10 })]];
      const result = createArrayBox(cells, ['c', 'c'], [true, false, true], [false, false], metrics);
      // 세로선이 추가되면 children이 더 많아짐
      const row = result.children[0] as HBox;
      // row에 세로선 관련 kern + rule + kern이 포함
      expect(row.children.length).toBeGreaterThan(6); // 기본(6) + 세로선 요소
    });

    it('가로선을 지원한다', () => {
      const cells = [
        [makeBox({ width: 10 })],
        [makeBox({ width: 10 })],
      ];
      const result = createArrayBox(cells, ['c'], [false, false], [false, true, false], metrics);
      // 행 사이에 가로선 관련 요소가 추가됨
      expect(result.children.length).toBeGreaterThan(2);
    });
  });
});
