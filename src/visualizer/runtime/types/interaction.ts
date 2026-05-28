import type { ExprString } from './expr.js';

/**
 * 제스처 + hitTest + do-list 기반 인터랙션 (설계 §10).
 * 런타임이 pointerdown/move/up/wheel을 캔버스/window에 attach,
 * hitTest + `when` 가드가 통과하면 do 리스트를 순서대로 실행.
 */
export interface InteractionSpec {
  gestures?: GestureSpec[];
}

export type GestureKind = 'pointer' | 'drag' | 'wheel';

export interface GestureSpec {
  kind: GestureKind;
  /** 매칭할 영역. bbox | circle | shape 참조 ids | 'canvas' */
  hitTest?: HitTestSpec;
  when?: ExprString;
  /** 실행할 액션 목록 */
  do: InteractionAction[];
}

export type HitTestSpec =
  | { shape: 'rect'; x: ExprString; y: ExprString; w: ExprString; h: ExprString }
  | { shape: 'circle'; cx: ExprString; cy: ExprString; r: ExprString }
  | { shape: 'canvas' }
  | { ref: string };

/**
 * 런타임이 처리하는 액션.
 * - setParam: 파라미터 슬라이더 외부 콜백으로 전파
 * - setState: 내부 state 변경
 * - pulse: 1프레임 플래그 설정
 */
export type InteractionAction =
  | { setParam: string; to: ExprString }
  | { setState: string; to: ExprString }
  | { pulse: string };
