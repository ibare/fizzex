/**
 * Fizzex i18n Context
 *
 * 호스트 앱에서 라벨을 주입할 수 있는 Provider와 Hook 제공
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { FizzexLabels, PartialFizzexLabels } from '../../i18n/types.js';
import { defaultLabels } from '../../i18n/default-labels.js';
import { loadLocale, setLocale } from '../../locales/registry.js';
import type { Locale } from '../../locales/types.js';

/** Context */
const FizzexI18nContext = createContext<FizzexLabels>(defaultLabels);

/** Deep merge utility */
function deepMerge(
  target: FizzexLabels,
  source: PartialFizzexLabels | undefined
): FizzexLabels {
  if (!source) return target;

  return {
    placeholder: source.placeholder ?? target.placeholder,
    debugToggle: source.debugToggle ?? target.debugToggle,
    showMore: source.showMore ?? target.showMore,
    showLess: source.showLess ?? target.showLess,
    showAll: source.showAll ?? target.showAll,
    keyboard: {
      move: source.keyboard?.move ?? target.keyboard.move,
      select: source.keyboard?.select ?? target.keyboard.select,
      close: source.keyboard?.close ?? target.keyboard.close,
    },
    categories: {
      operator: source.categories?.operator ?? target.categories.operator,
      structure: source.categories?.structure ?? target.categories.structure,
      function: source.categories?.function ?? target.categories.function,
      symbol: source.categories?.symbol ?? target.categories.symbol,
      calculus: source.categories?.calculus ?? target.categories.calculus,
    },
    suggestions: mergeSuggestions(target.suggestions, source.suggestions),
  };
}

/** Merge suggestions */
function mergeSuggestions(
  target: FizzexLabels['suggestions'],
  source: PartialFizzexLabels['suggestions']
): FizzexLabels['suggestions'] {
  if (!source) return target;

  const result = { ...target };

  for (const key of Object.keys(target) as (keyof typeof target)[]) {
    const sourceItem = source[key];
    if (sourceItem) {
      result[key] = {
        label: sourceItem.label ?? target[key].label,
        description: sourceItem.description ?? target[key].description,
      };
    }
  }

  return result;
}

/** Provider Props */
export interface FizzexI18nProviderProps {
  /**
   * 표시 언어.
   *
   * 주면 해당 언어의 설명 데이터를 내려받아 등록한다 — 수식 각 부분의 역할·설명,
   * 원소 이름, 카탈로그가 이 언어로 나온다. 데이터는 번들에 없고 이때 처음 받으므로
   * 첫 렌더에서는 설명이 비어 있다가 도착하면 채워진다.
   *
   * 주지 않으면 영어로 남는다.
   */
  locale?: Locale;
  /** 호스트에서 제공하는 라벨 (부분 가능) */
  labels?: PartialFizzexLabels;
  children: ReactNode;
}

/**
 * Fizzex i18n Provider
 *
 * @example
 * ```tsx
 * // 한국어로 표시한다 — 설명 데이터는 이 시점에 내려받는다
 * <FizzexI18nProvider locale="ko">
 *   <EditorView />
 * </FizzexI18nProvider>
 * ```
 */
export function FizzexI18nProvider({
  locale,
  labels,
  children,
}: FizzexI18nProviderProps) {
  // 데이터가 도착하면 다시 그려야 한다 — 조회는 동기라서 스스로는 알 수 없다
  const [, bumpLoaded] = useState(0);

  useEffect(() => {
    if (!locale) return;
    let alive = true;
    setLocale(locale);
    void loadLocale(locale).then(() => {
      if (alive) bumpLoaded((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, [locale]);

  const mergedLabels = useMemo(
    () => deepMerge(defaultLabels, labels),
    [labels]
  );

  return (
    <FizzexI18nContext.Provider value={mergedLabels}>
      {children}
    </FizzexI18nContext.Provider>
  );
}

/**
 * Fizzex 라벨 Hook
 *
 * @example
 * ```tsx
 * const labels = useFizzexLabels();
 * console.log(labels.placeholder); // "Enter formula..." or 호스트 번역
 * ```
 */
export function useFizzexLabels(): FizzexLabels {
  return useContext(FizzexI18nContext);
}

/**
 * 특정 제안 항목 라벨 가져오기
 */
export function useSuggestionLabel(id: string): { label: string; description?: string } {
  const labels = useFizzexLabels();
  const suggestion = labels.suggestions[id as keyof typeof labels.suggestions];
  return suggestion || { label: id };
}
