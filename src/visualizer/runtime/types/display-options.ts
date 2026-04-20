/**
 * 호스트가 제공하는 표준 opt-in 기능 목록 (설계 §2.2a).
 * v1에는 재생 배속 슬라이더(`timeScale`)만 존재.
 * 신규 항목 추가 시 이 union과 호스트 구현·validator를 동시에 갱신.
 */
export type DisplayOptionId = 'timeScale';

export const DISPLAY_OPTION_IDS: readonly DisplayOptionId[] = ['timeScale'] as const;

export function isDisplayOptionId(value: string): value is DisplayOptionId {
  return (DISPLAY_OPTION_IDS as readonly string[]).includes(value);
}
