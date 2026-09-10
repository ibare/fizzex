/**
 * 의미 데이터 접근
 *
 * 예전에는 한국어 JSON 서른한 개를 정적 import 해 번들에 박아 넣었다. 지금은
 * 로케일 레지스트리(`src/locales/`)에 물어본다 — 열 개 언어를 지원하면서 번들에
 * 한 언어도 싣지 않으려면 데이터가 동적으로 들어와야 하기 때문이다.
 *
 * 조회는 여전히 **동기**다. 비동기로 바꾸면 렌더 경로 전체가 뒤집힌다.
 * 대신 호스트가 미리 `await loadLocale(...)` 을 부르는 계약이고, 부르지 않았으면
 * 빈 텍스트가 나간다 — 설명이 비거나 영문 식별자가 보이지만 크래시하지는 않는다.
 *
 * 로케일과 무관한 것(카탈로그 인덱스, 형식 선언)은 여기 그대로 남는다.
 * 매칭은 이것들만 보므로 **어느 언어를 쓰든 매칭 결과가 같다.**
 */

import type { CatalogIndexEntry, CatalogDetail, FormEntry, FormText, FormVisualizerRef } from './types.js';
import type { SemanticTexts } from './text-types.js';
import { getBundle } from '../../locales/registry.js';
import type { Locale } from '../../locales/types.js';

// 로케일 독립 — 구조 선언이지 설명이 아니다
import catalogIndex from './data/catalog/index.json' with { type: 'json' };
import formIndex from './data/form/index.json' with { type: 'json' };

export type {
  Layer1TextEntry,
  Layer2TextEntry,
  ChemTextKey,
  FallbackTexts,
  ChemicalElement,
  ChemicalElementTexts,
  SemanticTexts,
} from './text-types.js';

/**
 * 아무 언어도 등록되지 않았을 때 쓰는 빈 텍스트.
 *
 * 소비처는 `roles[node.type] ?? node.type` 처럼 빈 값을 견디게 돼 있으므로
 * 설명이 비거나 영문 식별자가 나올 뿐 크래시하지 않는다.
 *
 * `scripts` 와 `chem` 만 키를 일일이 적는다 — 리터럴 union 이라 `{}` 로는 타입이 차지 않는다.
 * 나머지는 인덱스 시그니처라 빈 객체로 충분하다.
 */
const NO_TEXT = { role: '', description: '' } as const;

const EMPTY_TEXTS: SemanticTexts = {
  layer1: {},
  layer2: {},
  fallback: {
    roles: {},
    descriptions: {},
    specialVariables: {},
    operators: {},
    functions: {},
    accents: {},
    defaultAccent: { ...NO_TEXT },
    scripts: {
      superscriptOnly: { ...NO_TEXT },
      subscriptOnly: { ...NO_TEXT },
      both: { ...NO_TEXT },
      withLeft: { ...NO_TEXT },
    },
    chem: {
      formula: { ...NO_TEXT },
      equation: { ...NO_TEXT },
      species: { ...NO_TEXT },
      element: { ...NO_TEXT },
      group: { ...NO_TEXT },
      coefficient: { ...NO_TEXT },
      count: { ...NO_TEXT },
      charge: { ...NO_TEXT },
      chargeSign: { ...NO_TEXT },
      massNumber: { ...NO_TEXT },
      atomicNumber: { ...NO_TEXT },
      arrow: { ...NO_TEXT },
      equilibriumArrow: { ...NO_TEXT },
      condition: { ...NO_TEXT },
      plus: { ...NO_TEXT },
      hydrate: { ...NO_TEXT },
      state: { ...NO_TEXT },
      gas: { ...NO_TEXT },
      precipitate: { ...NO_TEXT },
    },
    defaultOperator: '',
    defaultFunction: '',
  },
  chemicalElements: { descriptionFormat: '{desc}', bySymbol: {} },
};

/** 지금 언어(또는 지정한 언어)의 설명 텍스트 */
export function getSemanticTexts(locale?: Locale): SemanticTexts {
  return getBundle(locale)?.semantic ?? EMPTY_TEXTS;
}

// ─── 카탈로그 ───

/**
 * 카탈로그 인덱스 — 매칭의 입력이다.
 *
 * 시그니처·복잡도·형식만 담고 설명은 담지 않는다. 그래서 로케일과 무관하고,
 * 어느 언어에서든 같은 수식이 같은 항목에 매칭된다.
 */
export function getCatalogIndex(): CatalogIndexEntry[] {
  return catalogIndex.entries as CatalogIndexEntry[];
}

/** 형식 목록. 런타임 검증은 하지 않는다 (`validator/` 는 빌드·테스트 시점 전용). */
export function getFormIndex(): FormEntry[] {
  return formIndex.forms as FormEntry[];
}

/** 형식 텍스트 */
export function getFormText(locale?: Locale): Record<string, FormText> {
  return getBundle(locale)?.semantic.form ?? {};
}

/**
 * 형식이 소유한 시각화 참조.
 * 카탈로그 항목이 아니라 **형식**이 시각화의 앵커다 — 이름 없는 사례도
 * 형식 사례이면 같은 시각화를 받는다.
 */
export function getVisualizersForForm(formId: string): FormVisualizerRef[] {
  return getFormIndex().find((f) => f.id === formId)?.visualizers ?? [];
}

/** 형식 선언 한 건 */
export function getFormEntry(formId: string): FormEntry | null {
  return getFormIndex().find((f) => f.id === formId) ?? null;
}

/** 카탈로그 상세 한 건 */
export function getCatalogDetail(
  catalogId: string,
  category: string,
  locale?: Locale
): CatalogDetail | null {
  return getBundle(locale)?.semantic.catalog[category]?.[catalogId] ?? null;
}
