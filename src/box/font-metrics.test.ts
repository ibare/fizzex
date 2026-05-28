import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CanvasFontMetrics, MathConstants } from './font-metrics.js';
import type { BoxRenderConfig } from './types.js';

describe('Font Metrics', () => {
  describe('MathConstants', () => {
    it('fractionRuleThickness가 양수이다', () => {
      expect(MathConstants.fractionRuleThickness).toBeGreaterThan(0);
    });

    it('fractionGap이 양수이다', () => {
      expect(MathConstants.fractionGap).toBeGreaterThan(0);
    });

    it('exponentShift가 양수이다', () => {
      expect(MathConstants.exponentShift).toBeGreaterThan(0);
    });

    it('subscriptShift가 양수이다', () => {
      expect(MathConstants.subscriptShift).toBeGreaterThan(0);
    });

    it('exponentScale이 0과 1 사이이다', () => {
      expect(MathConstants.exponentScale).toBeGreaterThan(0);
      expect(MathConstants.exponentScale).toBeLessThan(1);
    });

    it('subscriptScale이 0과 1 사이이다', () => {
      expect(MathConstants.subscriptScale).toBeGreaterThan(0);
      expect(MathConstants.subscriptScale).toBeLessThan(1);
    });

    it('parenPadding이 양수이다', () => {
      expect(MathConstants.parenPadding).toBeGreaterThan(0);
    });

    it('모든 상수가 정의되어 있다', () => {
      expect(MathConstants.fractionRuleThickness).toBeDefined();
      expect(MathConstants.fractionGap).toBeDefined();
      expect(MathConstants.exponentScale).toBeDefined();
      expect(MathConstants.exponentShift).toBeDefined();
      expect(MathConstants.subscriptScale).toBeDefined();
      expect(MathConstants.subscriptShift).toBeDefined();
      expect(MathConstants.parenPadding).toBeDefined();
      expect(MathConstants.operatorSpacing).toBeDefined();
      expect(MathConstants.sqrtPadding).toBeDefined();
    });
  });

  describe('CanvasFontMetrics', () => {
    let metrics: CanvasFontMetrics;
    let mockCtx: CanvasRenderingContext2D;
    const config: BoxRenderConfig = {
      baseFontSize: 20,
      fontFamily: 'KaTeX_Main',
      color: '#000000',
      cursorColor: '#0000ff',
    };

    beforeEach(() => {
      mockCtx = {
        font: '',
        measureText: vi.fn().mockReturnValue({ width: 10 }),
      } as unknown as CanvasRenderingContext2D;
      metrics = new CanvasFontMetrics(mockCtx, config);
    });

    it('getHeight가 fontSize에 비례하는 값을 반환한다', () => {
      const height1 = metrics.getHeight(1.0);
      const height2 = metrics.getHeight(2.0);

      expect(height1).toBeGreaterThan(0);
      expect(height2).toBeCloseTo(height1 * 2);
    });

    it('getDepth가 fontSize에 비례하는 값을 반환한다', () => {
      const depth1 = metrics.getDepth(1.0);
      const depth2 = metrics.getDepth(2.0);

      expect(depth1).toBeGreaterThan(0);
      expect(depth2).toBeCloseTo(depth1 * 2);
    });

    it('getFont이 올바른 CSS font 문자열을 반환한다', () => {
      const font = metrics.getFont(1.0, false);

      expect(font).toBe('20px KaTeX_Main');
    });

    it('이탤릭 getFont에 italic이 포함된다', () => {
      const font = metrics.getFont(1.0, true);

      expect(font).toBe('italic 20px KaTeX_Main');
    });

    it('getActualFontSize가 올바른 값을 반환한다', () => {
      expect(metrics.getActualFontSize(1.0)).toBe(20);
      expect(metrics.getActualFontSize(0.7)).toBeCloseTo(14);
      expect(metrics.getActualFontSize(2.0)).toBe(40);
    });

    it('measureWidth가 값을 반환한다', () => {
      const width = metrics.measureWidth('x', 1.0, false);

      expect(width).toBe(10);
      expect(mockCtx.measureText).toHaveBeenCalledWith('x');
    });

    it('measureStringWidth가 문자열 너비를 반환한다', () => {
      const width = metrics.measureStringWidth('abc', 1.0, false);

      // 각 문자마다 measureWidth가 호출되어 10 * 3 = 30
      expect(width).toBe(30);
    });
  });
});
