/**
 * Fizzex i18n
 */

export type {
  FizzexLabels,
  PartialFizzexLabels,
  SuggestionLabel,
  SuggestionLabels,
  CategoryLabels,
  KeyboardHintLabels,
} from './types.js';

export { defaultLabels } from './default-labels.js';

export {
  FizzexI18nProvider,
  useFizzexLabels,
  useSuggestionLabel,
  type FizzexI18nProviderProps,
} from './context.js';

export {
  useLocalizedSuggestions,
  useCategoryLabel,
} from './use-localized-suggestions.js';
