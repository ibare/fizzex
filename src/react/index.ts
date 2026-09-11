/**
 * Fizzex React 컴포넌트
 */

// 새 이름 (primary)
export { EditorView } from './EditorView.js';
export type { EditorViewProps } from './EditorView.js';

export { StreamView } from './StreamView.js';
export type { StreamViewProps } from './StreamView.js';

// 기타 컴포넌트
export { SuggestionChips } from './SuggestionChips.js';
export type { SuggestionChipsProps } from './SuggestionChips.js';

export { SuggestionPopover } from './SuggestionPopover.js';
export type { SuggestionPopoverProps } from './SuggestionPopover.js';

export { ExpressionExplorer } from './ExpressionExplorer.js';
export type { ExpressionExplorerProps } from './ExpressionExplorer.js';

// 언어 — Provider 와 훅은 React 에 묶이므로 여기서만 나간다
export {
  FizzexI18nProvider,
  useFizzexLabels,
  useSuggestionLabel,
  type FizzexI18nProviderProps,
} from './i18n/context.js';
export { useLocalizedSuggestions, useCategoryLabel } from './i18n/use-localized-suggestions.js';
export type { FizzexLabels, PartialFizzexLabels } from '../i18n/types.js';
