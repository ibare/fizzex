/**
 * 로케일 공개 표면
 *
 * **개별 로케일 모듈(`bundles/*.ts`)을 여기서 재수출하지 않는다.** 하나라도 걸면
 * 이 배럴을 무는 순간 그 언어가 번들에 실리고, 열 개를 다 걸면 5.7MB 가 된다.
 * 언어는 `loadLocale` 이 동적으로만 가져온다.
 */

export {
  registerLocale,
  loadLocale,
  setLocale,
  getLocale,
  getLoadedLocales,
  resetLocales,
} from './registry.js';

export { LOCALES, DEFAULT_LOCALE, RTL_LOCALES, isLocale, isRtl } from './types.js';

export type {
  Locale,
  LocaleBundle,
  UiTexts,
  ExplorerTexts,
  BindingFaultTexts,
  DurationTexts,
  SummaryTexts,
} from './types.js';

export { getUiTexts, fill } from './ui.js';
export { formatSummary } from './summary-format.js';
