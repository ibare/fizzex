/**
 * 자동완성 제안 시스템 타입 정의
 */

/** 제안 항목 카테고리 */
export type SuggestionCategory =
  | 'operator'    // 연산자 (+, -, ×, ÷, =)
  | 'structure'   // 구조 (분수, 거듭제곱, 루트, 괄호)
  | 'function'    // 함수 (sin, cos, log)
  | 'symbol'      // 기호 (그리스 문자, 무한대)
  | 'calculus';   // 미적분 (적분, 시그마, 극한)

/** 커서 컨텍스트 타입 */
export type CursorContext =
  | 'empty'           // 빈 상태
  | 'after_number'    // 숫자 뒤
  | 'after_variable'  // 변수 뒤
  | 'after_operator'  // 연산자 뒤
  | 'after_open_paren'// 여는 괄호 뒤
  | 'start_of_row';   // row 시작 (분수/거듭제곱 등 내부)

/** 제안 항목 */
export interface Suggestion {
  /** 고유 ID */
  id: string;
  /** 표시 레이블 */
  label: string;
  /** 아이콘 (수식 기호) */
  icon: string;
  /** 키보드 단축키 표시 */
  shortcut?: string;
  /** 카테고리 */
  category: SuggestionCategory;
  /** 설명 (툴팁용) */
  description?: string;
  /**
   * 우선순위 점수 (높을수록 먼저 표시)
   * - 10: 키보드 입력 불가 + 복잡 구조 (∫, Σ, Π, lim)
   * - 8: 키보드 입력 불가 + 단순 구조 (√, π, ∞, α)
   * - 5: 단축키 있지만 비직관적 (분수, 거듭제곱)
   * - 3: 단축키 있고 직관적 (괄호, 절댓값)
   * - 0: 직접 타이핑 가능 (제외 대상)
   */
  priority: number;
}

/** 제안 액션 타입 */
export type SuggestionAction =
  | { type: 'insert_operator'; operator: string }
  | { type: 'insert_number'; value: string }
  | { type: 'insert_variable'; name: string }
  | { type: 'insert_frac' }
  | { type: 'insert_power' }
  | { type: 'insert_subscript' }
  | { type: 'insert_sqrt' }
  | { type: 'insert_paren'; parenType: '(' | '[' | '{' }
  | { type: 'insert_abs' }
  | { type: 'insert_integral' }
  | { type: 'insert_sum' }
  | { type: 'insert_limit' }
  | { type: 'insert_product' }
  | { type: 'insert_func'; name: string };

/** 제안 항목 + 액션 */
export interface SuggestionWithAction extends Suggestion {
  action: SuggestionAction;
}
