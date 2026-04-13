import { describe, it, expect } from 'vitest';
import {
  MathStyle,
  isCramped,
  isDisplay,
  isScriptOrSmaller,
  isScriptScript,
  superscriptStyle,
  subscriptStyle,
  fracNumeratorStyle,
  fracDenominatorStyle,
  crampedStyle,
  fontSizeForStyle,
} from './math-style';

describe('MathStyle 판별 함수', () => {
  it('isCramped는 홀수 스타일에서 true', () => {
    expect(isCramped(MathStyle.Display)).toBe(false);
    expect(isCramped(MathStyle.DisplayCramped)).toBe(true);
    expect(isCramped(MathStyle.Text)).toBe(false);
    expect(isCramped(MathStyle.TextCramped)).toBe(true);
    expect(isCramped(MathStyle.Script)).toBe(false);
    expect(isCramped(MathStyle.ScriptCramped)).toBe(true);
    expect(isCramped(MathStyle.ScriptScript)).toBe(false);
    expect(isCramped(MathStyle.ScriptScriptCramped)).toBe(true);
  });

  it('isDisplay는 D, D\'에서만 true', () => {
    expect(isDisplay(MathStyle.Display)).toBe(true);
    expect(isDisplay(MathStyle.DisplayCramped)).toBe(true);
    expect(isDisplay(MathStyle.Text)).toBe(false);
    expect(isDisplay(MathStyle.Script)).toBe(false);
    expect(isDisplay(MathStyle.ScriptScript)).toBe(false);
  });

  it('isScriptOrSmaller는 S 이상에서 true', () => {
    expect(isScriptOrSmaller(MathStyle.Display)).toBe(false);
    expect(isScriptOrSmaller(MathStyle.Text)).toBe(false);
    expect(isScriptOrSmaller(MathStyle.TextCramped)).toBe(false);
    expect(isScriptOrSmaller(MathStyle.Script)).toBe(true);
    expect(isScriptOrSmaller(MathStyle.ScriptCramped)).toBe(true);
    expect(isScriptOrSmaller(MathStyle.ScriptScript)).toBe(true);
    expect(isScriptOrSmaller(MathStyle.ScriptScriptCramped)).toBe(true);
  });

  it('isScriptScript는 SS 이상에서만 true', () => {
    expect(isScriptScript(MathStyle.Script)).toBe(false);
    expect(isScriptScript(MathStyle.ScriptCramped)).toBe(false);
    expect(isScriptScript(MathStyle.ScriptScript)).toBe(true);
    expect(isScriptScript(MathStyle.ScriptScriptCramped)).toBe(true);
  });
});

describe('superscriptStyle (TeX Appendix G)', () => {
  it('D → S, D\' → S\'', () => {
    expect(superscriptStyle(MathStyle.Display)).toBe(MathStyle.Script);
    expect(superscriptStyle(MathStyle.DisplayCramped)).toBe(MathStyle.ScriptCramped);
  });

  it('T → S, T\' → S\'', () => {
    expect(superscriptStyle(MathStyle.Text)).toBe(MathStyle.Script);
    expect(superscriptStyle(MathStyle.TextCramped)).toBe(MathStyle.ScriptCramped);
  });

  it('S → SS, S\' → SS\'', () => {
    expect(superscriptStyle(MathStyle.Script)).toBe(MathStyle.ScriptScript);
    expect(superscriptStyle(MathStyle.ScriptCramped)).toBe(MathStyle.ScriptScriptCramped);
  });

  it('SS → SS, SS\' → SS\' (바닥)', () => {
    expect(superscriptStyle(MathStyle.ScriptScript)).toBe(MathStyle.ScriptScript);
    expect(superscriptStyle(MathStyle.ScriptScriptCramped)).toBe(MathStyle.ScriptScriptCramped);
  });
});

describe('subscriptStyle (항상 cramped)', () => {
  it('D → S\', D\' → S\'', () => {
    expect(subscriptStyle(MathStyle.Display)).toBe(MathStyle.ScriptCramped);
    expect(subscriptStyle(MathStyle.DisplayCramped)).toBe(MathStyle.ScriptCramped);
  });

  it('T → S\', T\' → S\'', () => {
    expect(subscriptStyle(MathStyle.Text)).toBe(MathStyle.ScriptCramped);
    expect(subscriptStyle(MathStyle.TextCramped)).toBe(MathStyle.ScriptCramped);
  });

  it('S → SS\', S\' → SS\'', () => {
    expect(subscriptStyle(MathStyle.Script)).toBe(MathStyle.ScriptScriptCramped);
    expect(subscriptStyle(MathStyle.ScriptCramped)).toBe(MathStyle.ScriptScriptCramped);
  });

  it('SS → SS\', SS\' → SS\'', () => {
    expect(subscriptStyle(MathStyle.ScriptScript)).toBe(MathStyle.ScriptScriptCramped);
    expect(subscriptStyle(MathStyle.ScriptScriptCramped)).toBe(MathStyle.ScriptScriptCramped);
  });
});

describe('fracNumeratorStyle', () => {
  it('D → T, D\' → T\'', () => {
    expect(fracNumeratorStyle(MathStyle.Display)).toBe(MathStyle.Text);
    expect(fracNumeratorStyle(MathStyle.DisplayCramped)).toBe(MathStyle.TextCramped);
  });

  it('T → S, T\' → S\'', () => {
    expect(fracNumeratorStyle(MathStyle.Text)).toBe(MathStyle.Script);
    expect(fracNumeratorStyle(MathStyle.TextCramped)).toBe(MathStyle.ScriptCramped);
  });

  it('S → SS, S\' → SS\'', () => {
    expect(fracNumeratorStyle(MathStyle.Script)).toBe(MathStyle.ScriptScript);
    expect(fracNumeratorStyle(MathStyle.ScriptCramped)).toBe(MathStyle.ScriptScriptCramped);
  });

  it('SS → SS, SS\' → SS\' (바닥)', () => {
    expect(fracNumeratorStyle(MathStyle.ScriptScript)).toBe(MathStyle.ScriptScript);
    expect(fracNumeratorStyle(MathStyle.ScriptScriptCramped)).toBe(MathStyle.ScriptScriptCramped);
  });
});

describe('fracDenominatorStyle (항상 cramped)', () => {
  it('D → T\', D\' → T\'', () => {
    expect(fracDenominatorStyle(MathStyle.Display)).toBe(MathStyle.TextCramped);
    expect(fracDenominatorStyle(MathStyle.DisplayCramped)).toBe(MathStyle.TextCramped);
  });

  it('T → S\', T\' → S\'', () => {
    expect(fracDenominatorStyle(MathStyle.Text)).toBe(MathStyle.ScriptCramped);
    expect(fracDenominatorStyle(MathStyle.TextCramped)).toBe(MathStyle.ScriptCramped);
  });

  it('S → SS\', S\' → SS\'', () => {
    expect(fracDenominatorStyle(MathStyle.Script)).toBe(MathStyle.ScriptScriptCramped);
    expect(fracDenominatorStyle(MathStyle.ScriptCramped)).toBe(MathStyle.ScriptScriptCramped);
  });
});

describe('crampedStyle', () => {
  it('non-cramped → cramped', () => {
    expect(crampedStyle(MathStyle.Display)).toBe(MathStyle.DisplayCramped);
    expect(crampedStyle(MathStyle.Text)).toBe(MathStyle.TextCramped);
    expect(crampedStyle(MathStyle.Script)).toBe(MathStyle.ScriptCramped);
    expect(crampedStyle(MathStyle.ScriptScript)).toBe(MathStyle.ScriptScriptCramped);
  });

  it('cramped → cramped (변화 없음)', () => {
    expect(crampedStyle(MathStyle.DisplayCramped)).toBe(MathStyle.DisplayCramped);
    expect(crampedStyle(MathStyle.TextCramped)).toBe(MathStyle.TextCramped);
    expect(crampedStyle(MathStyle.ScriptCramped)).toBe(MathStyle.ScriptCramped);
    expect(crampedStyle(MathStyle.ScriptScriptCramped)).toBe(MathStyle.ScriptScriptCramped);
  });
});

describe('fontSizeForStyle', () => {
  const base = 1.0;

  it('D, T 스타일은 축소 없음', () => {
    expect(fontSizeForStyle(base, MathStyle.Display)).toBe(1.0);
    expect(fontSizeForStyle(base, MathStyle.DisplayCramped)).toBe(1.0);
    expect(fontSizeForStyle(base, MathStyle.Text)).toBe(1.0);
    expect(fontSizeForStyle(base, MathStyle.TextCramped)).toBe(1.0);
  });

  it('S 스타일은 scriptPercentScaleDown (0.8) 적용', () => {
    expect(fontSizeForStyle(base, MathStyle.Script)).toBeCloseTo(0.8, 5);
    expect(fontSizeForStyle(base, MathStyle.ScriptCramped)).toBeCloseTo(0.8, 5);
  });

  it('SS 스타일은 scriptScriptPercentScaleDown (0.6) 적용', () => {
    expect(fontSizeForStyle(base, MathStyle.ScriptScript)).toBeCloseTo(0.6, 5);
    expect(fontSizeForStyle(base, MathStyle.ScriptScriptCramped)).toBeCloseTo(0.6, 5);
  });

  it('baseFontSize 스케일링이 올바르게 적용된다', () => {
    expect(fontSizeForStyle(2.0, MathStyle.Script)).toBeCloseTo(1.6, 5);
    expect(fontSizeForStyle(2.0, MathStyle.ScriptScript)).toBeCloseTo(1.2, 5);
  });
});
