/**
 * TeX 8-style 수학 스타일 시스템
 *
 * TeX는 수식 내부의 위치에 따라 8가지 스타일을 구분한다.
 * 각 스타일은 폰트 크기, 위첨자 shift, 분수 간격 등에 영향을 미친다.
 *
 * @see The TeXbook, Appendix G: Generating Boxes from Formulas
 */

import { MathConstants } from './font-metrics';

// ── Enum ──

/**
 * TeX 8단계 수학 스타일
 *
 * - D  (0) — Display style
 * - D' (1) — Display style, cramped
 * - T  (2) — Text style
 * - T' (3) — Text style, cramped
 * - S  (4) — Script style
 * - S' (5) — Script style, cramped
 * - SS (6) — ScriptScript style
 * - SS'(7) — ScriptScript style, cramped
 *
 * cramped variant는 위첨자 shift가 줄어드는 스타일로,
 * 분모, 근호 내부, 악센트 내부 등에서 사용된다.
 */
export enum MathStyle {
  Display = 0,
  DisplayCramped = 1,
  Text = 2,
  TextCramped = 3,
  Script = 4,
  ScriptCramped = 5,
  ScriptScript = 6,
  ScriptScriptCramped = 7,
}

// ── 판별 함수 ──

/** cramped variant인지 확인 */
export function isCramped(style: MathStyle): boolean {
  return style % 2 === 1;
}

/** display-size 스타일인지 확인 (D 또는 D') */
export function isDisplay(style: MathStyle): boolean {
  return style <= MathStyle.DisplayCramped;
}

/** script-size 이상 축소된 스타일인지 (S, S', SS, SS') */
export function isScriptOrSmaller(style: MathStyle): boolean {
  return style >= MathStyle.Script;
}

/** scriptscript-size인지 (SS, SS') */
export function isScriptScript(style: MathStyle): boolean {
  return style >= MathStyle.ScriptScript;
}

// ── 스타일 전환 테이블 (TeX Appendix G 정확 매핑) ──

/**
 * 위첨자(superscript)에 적용할 스타일
 *
 * D → S, D' → S', T → S, T' → S', S → SS, S' → SS', SS → SS, SS' → SS'
 *
 * @see The TeXbook, Appendix G, Rule 18a
 */
const SUPERSCRIPT_STYLE: Record<MathStyle, MathStyle> = {
  [MathStyle.Display]: MathStyle.Script,
  [MathStyle.DisplayCramped]: MathStyle.ScriptCramped,
  [MathStyle.Text]: MathStyle.Script,
  [MathStyle.TextCramped]: MathStyle.ScriptCramped,
  [MathStyle.Script]: MathStyle.ScriptScript,
  [MathStyle.ScriptCramped]: MathStyle.ScriptScriptCramped,
  [MathStyle.ScriptScript]: MathStyle.ScriptScript,
  [MathStyle.ScriptScriptCramped]: MathStyle.ScriptScriptCramped,
};

/**
 * 아래첨자(subscript)에 적용할 스타일 (항상 cramped)
 *
 * D → S', D' → S', T → S', T' → S', S → SS', S' → SS', SS → SS', SS' → SS'
 *
 * @see The TeXbook, Appendix G, Rule 18a
 */
const SUBSCRIPT_STYLE: Record<MathStyle, MathStyle> = {
  [MathStyle.Display]: MathStyle.ScriptCramped,
  [MathStyle.DisplayCramped]: MathStyle.ScriptCramped,
  [MathStyle.Text]: MathStyle.ScriptCramped,
  [MathStyle.TextCramped]: MathStyle.ScriptCramped,
  [MathStyle.Script]: MathStyle.ScriptScriptCramped,
  [MathStyle.ScriptCramped]: MathStyle.ScriptScriptCramped,
  [MathStyle.ScriptScript]: MathStyle.ScriptScriptCramped,
  [MathStyle.ScriptScriptCramped]: MathStyle.ScriptScriptCramped,
};

/**
 * 분수 분자에 적용할 스타일
 *
 * D → T, D' → T', T → S, T' → S', S → SS, S' → SS', SS → SS, SS' → SS'
 *
 * @see The TeXbook, Appendix G, Rule 15
 */
const FRAC_NUMERATOR_STYLE: Record<MathStyle, MathStyle> = {
  [MathStyle.Display]: MathStyle.Text,
  [MathStyle.DisplayCramped]: MathStyle.TextCramped,
  [MathStyle.Text]: MathStyle.Script,
  [MathStyle.TextCramped]: MathStyle.ScriptCramped,
  [MathStyle.Script]: MathStyle.ScriptScript,
  [MathStyle.ScriptCramped]: MathStyle.ScriptScriptCramped,
  [MathStyle.ScriptScript]: MathStyle.ScriptScript,
  [MathStyle.ScriptScriptCramped]: MathStyle.ScriptScriptCramped,
};

/**
 * 분수 분모에 적용할 스타일 (항상 cramped)
 *
 * D → T', D' → T', T → S', T' → S', S → SS', S' → SS', SS → SS', SS' → SS'
 *
 * @see The TeXbook, Appendix G, Rule 15
 */
const FRAC_DENOMINATOR_STYLE: Record<MathStyle, MathStyle> = {
  [MathStyle.Display]: MathStyle.TextCramped,
  [MathStyle.DisplayCramped]: MathStyle.TextCramped,
  [MathStyle.Text]: MathStyle.ScriptCramped,
  [MathStyle.TextCramped]: MathStyle.ScriptCramped,
  [MathStyle.Script]: MathStyle.ScriptScriptCramped,
  [MathStyle.ScriptCramped]: MathStyle.ScriptScriptCramped,
  [MathStyle.ScriptScript]: MathStyle.ScriptScriptCramped,
  [MathStyle.ScriptScriptCramped]: MathStyle.ScriptScriptCramped,
};

// ── 스타일 전환 함수 ──

export function superscriptStyle(style: MathStyle): MathStyle {
  return SUPERSCRIPT_STYLE[style];
}

export function subscriptStyle(style: MathStyle): MathStyle {
  return SUBSCRIPT_STYLE[style];
}

export function fracNumeratorStyle(style: MathStyle): MathStyle {
  return FRAC_NUMERATOR_STYLE[style];
}

export function fracDenominatorStyle(style: MathStyle): MathStyle {
  return FRAC_DENOMINATOR_STYLE[style];
}

/** 현재 스타일의 cramped variant (짝수→홀수, 홀수→그대로) */
export function crampedStyle(style: MathStyle): MathStyle {
  return (style | 1) as MathStyle;
}

// ── fontSize 계산 ──

/**
 * MathStyle에 따른 fontSize 계산
 *
 * D, D', T, T' → baseFontSize (축소 없음)
 * S, S'        → baseFontSize × scriptPercentScaleDown (0.8)
 * SS, SS'      → baseFontSize × scriptScriptPercentScaleDown (0.6)
 *
 * @param baseFontSize 현재 컨텍스트의 기본 폰트 크기 (상대 단위)
 * @param style 적용할 수학 스타일
 */
export function fontSizeForStyle(baseFontSize: number, style: MathStyle): number {
  if (style >= MathStyle.ScriptScript) {
    return baseFontSize * MathConstants.scriptScriptPercentScaleDown;
  }
  if (style >= MathStyle.Script) {
    return baseFontSize * MathConstants.exponentScale;
  }
  return baseFontSize;
}
