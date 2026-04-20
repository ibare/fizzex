/**
 * Expression 문자열. Phase 1에서 jsep로 파싱되어 ExprAst가 된다.
 * Phase 0에서는 직렬화 형태(문자열)만 타입으로 다룬다.
 */
export type ExprString = string;

/**
 * 컴파일 이후 노드. Phase 1에서 구체 정의. 여기는 전방 선언만.
 */
export interface ExprAst {
  readonly kind: string;
  readonly [key: string]: unknown;
}
