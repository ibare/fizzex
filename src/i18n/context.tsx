/**
 * Fizzex i18n Context
 *
 * 호스트 앱에서 라벨을 주입할 수 있는 Provider와 Hook 제공
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { FizzexLabels, PartialFizzexLabels } from './types';
import { defaultLabels } from './default-labels';

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
    structureViewer: source.structureViewer ?? target.structureViewer,
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
  /** 호스트에서 제공하는 라벨 (부분 가능) */
  labels?: PartialFizzexLabels;
  children: ReactNode;
}

/**
 * Fizzex i18n Provider
 *
 * @example
 * ```tsx
 * // 호스트 앱에서 한국어 라벨 제공
 * <FizzexI18nProvider labels={koLabels}>
 *   <EditorView />
 * </FizzexI18nProvider>
 * ```
 */
export function FizzexI18nProvider({
  labels,
  children,
}: FizzexI18nProviderProps) {
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
