/**
 * 로케일 번들의 타입
 *
 * 이 파일은 **데이터를 물지 않는다.** 여기서 JSON 을 import 하면 레지스트리를
 * 부르는 모든 호스트가 열 개 언어를 전부 내려받게 된다.
 */

import type { CatalogDetail, FormText } from '../analyzer/semantic/types.js';
import type { SemanticTexts } from '../analyzer/semantic/text-types.js';

/**
 * 지원 언어 — **단일 진실.**
 *
 * `scripts/validate-locale-parity.ts` 도 이 목록을 읽는다. 두 곳에 적으면 갈린다.
 */
export const LOCALES = ['ko', 'en', 'ja', 'zh', 'ar', 'es', 'fr', 'hi', 'id', 'pt'] as const;

export type Locale = (typeof LOCALES)[number];

/** 아무 언어도 고르지 않았을 때 */
export const DEFAULT_LOCALE: Locale = 'en';

/** 오른쪽에서 왼쪽으로 읽는 언어 — 호스트가 `dir` 을 정할 때 쓴다 */
export const RTL_LOCALES: readonly Locale[] = ['ar'];

/** 지원하는 언어인가 */
export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** 오른쪽에서 왼쪽으로 읽는 언어인가 */
export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

// ─── UI 문구 ───

/** 탐색 패널의 문구 */
export interface ExplorerTexts {
  close: string;
  closeWithKey: string;
  hintHover: string;
  hintClick: string;
  hintEsc: string;
  explore: string;
  copyImage: string;
  reset: string;
  /** `{name}` 을 카탈로그 이름으로 바꾼다 */
  similarTo: string;
  /** `{name}` 을 시각화 이름으로 바꾼다 */
  closeNamed: string;
  /** `{reason}` 을 아래 `bindingFault` 문구로 바꾼다 */
  domainGuard: string;
}

/**
 * 시각화에 값을 묶지 못한 이유.
 *
 * 전부 `{name}` 을 바인딩 이름으로 바꾼다. 진단처럼 보이지만 배너로 그려지는
 * 사용자 문구다 — "의미 있는 실패만 노출한다" 는 계약이 explorer-overlay 에 있다.
 */
export interface BindingFaultTexts {
  derivative: string;
  domain: string;
  divergent: string;
  unsupported: string;
  evalFailed: string;
  unbound: string;
  unknown: string;
}

/** 시간 단위 — `{value}` 를 숫자로 바꾼다 */
export interface DurationTexts {
  seconds: string;
  minutes: string;
  hours: string;
  days: string;
}

/**
 * 분석 요약을 문장으로 조립할 때 쓰는 어휘.
 *
 * `AnalysisSummary` 는 사실만 담고 문장은 여기서 만든다 — 계산 계층은 언어를 모른다.
 */
export interface SummaryTexts {
  /** `{names}` 를 변수 목록으로 바꾼다 */
  variables: string;
  constantExpression: string;
  /** `{degree}` 를 차수로 바꾼다 */
  polynomialOfDegree: string;
  /** `{names}` 를 함수 이름 목록으로 바꾼다 */
  withFunctions: string;
  /** `{names}` 를 도메인 이름 목록으로 바꾼다 */
  domains: string;
  chemicalFormula: string;
  chemicalEquation: string;
  reversibleChemicalEquation: string;
  /** 도메인 식별자 → 이름 */
  domainNames: Record<string, string>;
  /** 목록을 이을 때 쓰는 구분자 */
  listSeparator: string;
}

export interface UiTexts {
  explorer: ExplorerTexts;
  bindingFault: BindingFaultTexts;
  duration: DurationTexts;
  summary: SummaryTexts;
}

// ─── 번들 ───

/**
 * 한 언어의 모든 문구.
 *
 * `src/locales/<locale>.ts` 가 이것을 default export 하고, `loadLocale` 이
 * 동적 import 로 가져온다. 정적으로 물리는 곳이 없어야 번들에 언어가 안 실린다.
 */
export interface LocaleBundle {
  locale: Locale;
  ui: UiTexts;
  /**
   * 설명 텍스트. `SemanticTexts` 를 그대로 담고 형식·카탈로그를 더한다 —
   * `getSemanticTexts()` 가 이 객체를 그냥 돌려줄 수 있어야 변환 계층이 없어진다.
   */
  semantic: SemanticTexts & {
    form: Record<string, FormText>;
    catalog: Record<string, Record<string, CatalogDetail>>;
  };
}
