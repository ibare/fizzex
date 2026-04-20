/**
 * 사용자 노출 문자열 i18n 객체. `en`은 필수, 다른 locale은 선택.
 * 설계 §0.5.5.
 */
export interface I18nText {
  en: string;
  [locale: string]: string;
}

export function resolveI18n(text: I18nText, locale: string): string {
  return text[locale] ?? text.en;
}
