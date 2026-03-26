/**
 * Box 모델 공유 상수
 *
 * 여러 Box 관련 모듈에서 사용하는 공통 상수 정의
 */

/**
 * 복합 노드 내부 row 식별 접미사
 *
 * 분수, 거듭제곱, 적분 등 복합 구조 노드의 내부 영역을 식별하는 데 사용
 * 예: frac_1_num (분자), frac_1_den (분모), sqrt_1_content (루트 내용)
 */
export const COMPLEX_NODE_SUFFIXES = [
  '_num',        // 분자 (numerator)
  '_den',        // 분모 (denominator)
  '_content',    // 내용 (sqrt, paren, abs 등)
  '_exp',        // 지수 (exponent)
  '_sub',        // 아래첨자 (subscript)
  '_lower',      // 하한 (integral, sum, product)
  '_upper',      // 상한 (integral, sum, product)
  '_integrand',  // 피적분함수
  '_body',       // 본문 (sum, product, limit)
  '_approach',   // 접근값 (limit)
  '_arg',        // 인자 (function)
] as const;

/** 복합 노드 접미사 타입 */
export type ComplexNodeSuffix = typeof COMPLEX_NODE_SUFFIXES[number];

/**
 * sourceId가 복합 노드의 내부 슬롯인지 확인
 */
export function isComplexNodeSlot(sourceId: string | undefined): boolean {
  if (!sourceId) return false;
  return COMPLEX_NODE_SUFFIXES.some(suffix =>
    sourceId.endsWith(suffix) || sourceId.includes('_cell_')
  );
}
