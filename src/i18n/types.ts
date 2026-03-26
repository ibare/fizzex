/**
 * Fizzex i18n 타입 정의
 */

/** 제안 항목 라벨 */
export interface SuggestionLabel {
  label: string;
  description?: string;
}

/** 카테고리 라벨 */
export interface CategoryLabels {
  operator: string;
  structure: string;
  function: string;
  symbol: string;
  calculus: string;
}

/** 키보드 힌트 라벨 */
export interface KeyboardHintLabels {
  move: string;
  select: string;
  close: string;
}

/** 제안 항목 라벨 맵 */
export interface SuggestionLabels {
  // 미적분
  integral: SuggestionLabel;
  sum: SuggestionLabel;
  product: SuggestionLabel;
  limit: SuggestionLabel;

  // 구조 - 키보드 입력 불가
  sqrt: SuggestionLabel;

  // 기호
  pi: SuggestionLabel;
  infinity: SuggestionLabel;
  alpha: SuggestionLabel;
  beta: SuggestionLabel;
  theta: SuggestionLabel;
  delta: SuggestionLabel;
  lambda: SuggestionLabel;
  mu: SuggestionLabel;
  epsilon: SuggestionLabel;
  gamma: SuggestionLabel;
  omega: SuggestionLabel;
  phi: SuggestionLabel;
  psi: SuggestionLabel;
  xi: SuggestionLabel;
  nabla: SuggestionLabel;
  partial: SuggestionLabel;
  transpose: SuggestionLabel;
  cdot: SuggestionLabel;
  parallel: SuggestionLabel;
  factorial: SuggestionLabel;

  // mathbb 집합 기호
  natural: SuggestionLabel;
  integer: SuggestionLabel;
  rational: SuggestionLabel;
  real: SuggestionLabel;
  complex: SuggestionLabel;

  // mathcal 스크립트
  fourier: SuggestionLabel;
  laplace: SuggestionLabel;
  hilbert: SuggestionLabel;

  // 함수
  sin: SuggestionLabel;
  cos: SuggestionLabel;
  tan: SuggestionLabel;
  log: SuggestionLabel;
  ln: SuggestionLabel;
  det: SuggestionLabel;
  tr: SuggestionLabel;

  // 구조 - 단축키 비직관적
  frac: SuggestionLabel;
  power: SuggestionLabel;
  subscript: SuggestionLabel;

  // 구조 - 단축키 직관적
  paren_round: SuggestionLabel;
  paren_square: SuggestionLabel;
  abs: SuggestionLabel;

  // 연산자 - 키보드 입력 어려움
  leq: SuggestionLabel;
  geq: SuggestionLabel;

  // 연산자 - 직접 타이핑 가능
  add: SuggestionLabel;
  subtract: SuggestionLabel;
  multiply: SuggestionLabel;
  divide_op: SuggestionLabel;
  equals: SuggestionLabel;
  less_than: SuggestionLabel;
  greater_than: SuggestionLabel;
}

/** Fizzex 전체 라벨 */
export interface FizzexLabels {
  /** 입력 플레이스홀더 */
  placeholder: string;
  /** 디버그 토글 버튼 */
  debugToggle: string;
  /** 구조 시각화 버튼 */
  structureViewer: string;
  /** 더보기 버튼 */
  showMore: string;
  /** 접기 버튼 */
  showLess: string;
  /** 모든 수식 보기 버튼 */
  showAll: string;
  /** 키보드 힌트 */
  keyboard: KeyboardHintLabels;
  /** 카테고리 라벨 */
  categories: CategoryLabels;
  /** 제안 항목 라벨 */
  suggestions: SuggestionLabels;
}

/** 부분 라벨 (호스트에서 일부만 오버라이드 가능) */
export type PartialFizzexLabels = {
  placeholder?: string;
  debugToggle?: string;
  structureViewer?: string;
  showMore?: string;
  showLess?: string;
  showAll?: string;
  keyboard?: Partial<KeyboardHintLabels>;
  categories?: Partial<CategoryLabels>;
  suggestions?: Partial<{
    [K in keyof SuggestionLabels]?: Partial<SuggestionLabels[K]>;
  }>;
};
