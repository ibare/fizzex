/**
 * UserBindingSpec — manifest v2 의 일급 슬롯 (설계 통합 V1).
 *
 * 사용자 LaTeX 수식의 변수가 카탈로그 visualizer 의 어떤 슬롯으로 흐르는지
 * 명시한다. evaluator 가 산출한 값(스칼라/행렬/복소수)이 이 슬롯을 통해
 * scenes[].params → StateStore 의 일급 입력으로 들어간다.
 *
 * V1: 모든 binding 의 outputKind 는 'scalar'. matrix/complex 는 V3 에서 활성화.
 */

import type { I18nText } from './i18n';

export type OutputKind = 'scalar' | 'matrix' | 'complex';

export interface UserBindingSpec {
  /** scenes[].params 의 키 = 사용자 LaTeX 수식 변수명 */
  name: string;
  description?: I18nText;
  outputKind: OutputKind;
  /** false 면 누락 시 scenes[].params 의 기본값 사용 */
  required: boolean;
}
