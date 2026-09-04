/**
 * 탐색 진입 자격 판정 — 단일 진실 출처
 *
 * 탐색 모드가 이 수식에 대해 **고유하게** 내놓는 것이 있는가를 판정한다.
 * 없다면 진입점(호버 아이콘)을 광고하지 않는다.
 *
 * ## 왜 확정 매칭인가
 *
 * 탐색 모드의 고유 산출물은 넷이고 전부 확정 매칭에서만 열린다 —
 * 정식 이름 배너, 시각화 칩, 값 배지, 의미 있는 파라미터 범위.
 * 미확정(`approximate`) 매칭에서는 `catalogDetail` 이 통째로 비어
 * (explorer-overlay 참조) 남는 것이 "~와(과) 유사" 라는 이름 한 줄뿐이다.
 *
 * 그 이름조차 실측상 오탐이다. 폴백 스코어러는 시그니처 멀티셋 recall
 * 0.75 만 넘으면 이름을 붙이므로 `\sin^2θ + \cos^2θ = 1` 이
 * "하디-바인베르크 법칙" 이 되고, `A = P(1+r)^t` 가 "이차함수 꼭짓점형" 이
 * 된다. 학습 콘텐츠 본문을 가려 가며 띄울 값이 아니다.
 *
 * 그래서 자격 기준을 따로 발명하지 않는다. 오버레이가 이미 쓰고 있는
 * 확정 여부를 진입 **전에** 물어볼 뿐이다. 기준이 한 곳에만 적혀 있어야
 * 카탈로그가 늘어날 때 진입점도 어긋남 없이 함께 늘어난다.
 *
 * ## 진입점이 없는 것과 진입이 막힌 것은 다르다
 *
 * 이 판정은 **광고 여부**만 정한다. 더블클릭 진입은 자격과 무관하게
 * 열려 있다 — 자격 미달인 수식에서도 숫자를 만져 보는 것은 가능해야 한다.
 */

import type { MathNode } from '../types.js';
import type { SemanticResult } from '../analyzer/semantic/types.js';
import { buildSemanticMap } from '../analyzer/semantic/index.js';

/**
 * 루트 매칭 결과가 탐색 진입 자격을 갖는가.
 *
 * 확정 티어는 형식 유니피케이션이 성공했을 때만 나오는 파생값이라
 * 손으로 켤 수 없다. 게이트로 쓰라고 만들어진 값이다.
 */
export function isExplorable(root: SemanticResult | undefined): boolean {
  return root?.tier === 'confirmed';
}

/**
 * AST 를 판정한다. 루트 노드의 매칭 결과가 자격을 정한다.
 *
 * 렌더 경로에서 호출되므로 어떤 입력에도 throw 하지 않는다 — 판정 실패는
 * "자격 없음" 이지 오류가 아니다.
 */
export function judgeExplorable(ast: MathNode): boolean {
  try {
    return isExplorable(buildSemanticMap(ast).get(ast.id));
  } catch {
    return false;
  }
}
