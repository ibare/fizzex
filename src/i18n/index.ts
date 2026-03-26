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
} from './types';

export { defaultLabels } from './default-labels';

export {
  FizzexI18nProvider,
  useFizzexLabels,
  useSuggestionLabel,
  type FizzexI18nProviderProps,
} from './context';

export {
  useLocalizedSuggestions,
  useCategoryLabel,
} from './use-localized-suggestions';
