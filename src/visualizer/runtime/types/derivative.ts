/**
 * DerivativeSpec — manifest 의 일급 도함수 슬롯 (설계 통합 V4).
 *
 * 사용자 LaTeX 수식(`userBindings` 의 한 항목) 을 특정 변수에 대해 미분하여
 * 결과 도함수값을 또 다른 슬롯으로 흘려보낸다. bridge 는 평가 시점마다
 * evaluator 의 `differentiateAt` 을 호출하고, 결과를 StateStore 의 binding
 * 슬롯에 주입한다. jsep DSL 에서는 `bindings.<binding>` 으로 접근한다.
 *
 * V4: order 는 1 만 지원. 차수가 늘어나면 literal union 으로 확장한다.
 */

export interface DerivativeSpec {
  /** 미분 대상 userBindings.name. outputKind === 'scalar' 만 허용. */
  source: string;
  /** 미분 변수명 — evaluator 정규화된 변수 이름과 동일. */
  variable: string;
  /** 도함수 차수. V4 는 1 만 허용. */
  order: 1;
  /** 결과 도함수값을 저장할 슬롯 이름. userBindings.name 과 겹칠 수 없다. */
  binding: string;
}
