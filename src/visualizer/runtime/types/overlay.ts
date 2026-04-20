import type { ExprString } from './expr';
import type { I18nText } from './i18n';

/**
 * HUD overlay (설계 §11). 기본은 HTML 레이어(결정 D3).
 */
export interface OverlaySpec {
  lines?: OverlayLine[];
}

/**
 * 한 줄의 텍스트 요소. 정적 문자열은 i18n 객체, 동적 값은 Expression.
 */
export interface OverlayLine {
  /** 정적 라벨 (i18n) */
  label?: I18nText;
  /** 동적 값을 계산할 Expression. 숫자/문자 평가 결과 */
  value?: ExprString;
  /** 값 포맷팅 템플릿. Expression 함수 `format()`과 동일 문법 */
  format?: string;
  visible?: ExprString;
  style?: OverlayStyle;
}

export interface OverlayStyle {
  color?: ExprString;
  fontSize?: number;
  fontWeight?: number | string;
}
