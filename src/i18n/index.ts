/**
 * Fizzex i18n — 프레임워크 중립 부분
 *
 * 라벨 타입과 영어 기본값만 둔다. 이를 주입하는 Provider 와 훅은 React 에 묶이므로
 * `src/react/i18n/` 에 있고 `fizzex/react` 로만 나간다 — 여기에 두면 루트가 react 를 문다.
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
