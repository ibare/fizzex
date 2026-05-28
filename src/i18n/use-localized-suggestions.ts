/**
 * 제안 항목에 i18n 라벨을 적용하는 훅
 */

import { useMemo } from 'react';
import { useFizzexLabels } from './context.js';
import type { SuggestionWithAction } from '../suggestion/types.js';
import type { SuggestionLabels } from './types.js';

/**
 * 제안 목록에 i18n 라벨 적용
 */
export function useLocalizedSuggestions(
  suggestions: SuggestionWithAction[]
): SuggestionWithAction[] {
  const labels = useFizzexLabels();

  return useMemo(() => {
    return suggestions.map(suggestion => {
      const labelData = labels.suggestions[suggestion.id as keyof SuggestionLabels];

      if (labelData) {
        return {
          ...suggestion,
          label: labelData.label,
          description: labelData.description ?? suggestion.description,
        };
      }

      return suggestion;
    });
  }, [suggestions, labels]);
}

/**
 * 카테고리 라벨 가져오기
 */
export function useCategoryLabel(category: string): string {
  const labels = useFizzexLabels();
  return labels.categories[category as keyof typeof labels.categories] ?? category;
}
