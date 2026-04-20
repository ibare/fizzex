import type { ExprString } from './expr';
import type { I18nText } from './i18n';

/**
 * spec 전용 지역 파생 식 (설계 §2.3).
 * 카탈로그 derivedValues와 합쳐져 formulas.* 네임스페이스를 구성.
 * id 충돌 금지.
 */
export interface LocalFormula {
  id: string;
  label: I18nText;
  /** 수식 기호 (LaTeX 허용). 표기용 — i18n 대상 아님 */
  symbol?: string;
  expr: ExprString;
}
