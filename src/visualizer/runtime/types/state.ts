import type { ExprString } from './expr.js';

/**
 * 내부 상태 변수 선언 (설계 §2.4).
 * 슬라이더로 노출되지 않음. animation.onFrame에서만 mutate.
 */
export interface StateDecl {
  id: string;
  type: 'number' | 'bool' | 'string';
  default: number | boolean | string;
  /**
   * 파라미터 변경 감지 트리거용.
   * 지정된 파라미터 id가 슬라이더·인터랙션으로 변경되면 pulse true 1프레임.
   */
  onParamChange?: string;
}

/**
 * 단일 animation.onFrame 스텝 (설계 §9).
 * set: 대입 대상 경로(`state.<id>` 또는 `vars.<name>`), to: Expression.
 */
export interface AnimationStep {
  set: string;
  to: ExprString;
}

export interface AnimationSpec {
  onFrame?: AnimationStep[];
}
