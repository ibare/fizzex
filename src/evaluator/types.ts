/**
 * Evaluator 타입 정의
 *
 * 두 갈래 표면:
 *   - 핫패스 evaluateSync: `number | undefined` (graph propagate)
 *   - 콜드패스 evaluate:    `EvalResult` (디버그·배지·호버)
 *
 * EvalOutcome 은 registry 내부 표현이며, 외부에 노출되지 않는다.
 */
import type { MathNode, MathNodeType } from '../types';

/** 변수 바인딩. 키는 정규화된 변수명 (예: 'x', 'π'). */
export type Bindings = Readonly<Record<string, number>>;

/** 평가 실패 분류 */
export type EvalStatus = 'unbound' | 'domain' | 'divergent' | 'unsupported';

/** 실패 부가 정보 */
export interface EvalDetail {
  /** 'unbound' 시 미연결 변수명 (정규화 후) */
  variable?: string;
  /** 'unsupported' 시 미지원 노드 타입 */
  nodeType?: MathNodeType;
  /** 추가 사유 (단순 문자열) */
  reason?: string;
}

/** 콜드패스 결과 */
export type EvalResult =
  | { ok: true; value: number }
  | { ok: false; status: EvalStatus; detail?: EvalDetail };

/** 내부 표현 — 핸들러는 EvalOutcome 만 반환한다 */
export type EvalOutcome =
  | { kind: 'value'; value: number }
  | { kind: 'fail'; status: EvalStatus; detail?: EvalDetail };

/** 평가 컨텍스트 — 핸들러가 자식 노드 평가/임시 바인딩 확장을 위해 사용 */
export interface EvalContext {
  readonly bindings: Bindings;
  /** 자식 노드 평가 (registry dispatch + 정규화) */
  evaluate(node: MathNode): EvalOutcome;
  /** 임시 변수 바인딩을 추가한 새 컨텍스트 반환 (적분/합/극한 인덱스용) */
  withBinding(name: string, value: number): EvalContext;
}

/** 노드 타입별 평가 함수 */
export type EvalFn = (node: MathNode, ctx: EvalContext) => EvalOutcome;

/** 핸들러 작성 보조 — 정상값 생성 */
export function value(v: number): EvalOutcome {
  return { kind: 'value', value: v };
}

/** 핸들러 작성 보조 — 실패 생성 */
export function fail(status: EvalStatus, detail?: EvalDetail): EvalOutcome {
  return { kind: 'fail', status, detail };
}
