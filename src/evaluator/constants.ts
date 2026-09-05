/**
 * 수학 상수 이름 집합과 표준값
 *
 * 호스트 합의: 상수는 호스트가 공급한다. evaluator 는 자동 바인딩하지 않는다 —
 * `evaluateSync(ast)` 의 기본 바인딩은 비어 있고, 호스트가 명시적으로 넘겨야
 * 값이 들어간다. π 를 3 으로 바꿔 보는 탐색이 가능해야 하기 때문이다.
 *
 * `MATH_CONSTANT_NAMES` 는 `analyzeBindings` 가 자유변수와 상수를 분류할 때 쓰고,
 * `MATH_CONSTANT_VALUES` 는 호스트가 그 분류 결과를 채울 때 참고할 표준값이다.
 * 후자를 제공해도 공급 주체와 결정권은 호스트에 그대로 남는다.
 *
 * 정규화된 이름(유니코드)을 기준으로 한다. LaTeX 표기가 아니라 정규형이 키다 —
 * `\pi` 가 아니라 `π`.
 */

export const MATH_CONSTANT_NAMES: ReadonlySet<string> = new Set([
  'π',
  'e',
  'γ',
  'φ',
  'ϕ',
  '∞',
  'τ',
]);

export function isMathConstantName(name: string): boolean {
  return MATH_CONSTANT_NAMES.has(name);
}

/**
 * 상수의 표준값 조회 결과.
 *
 * `Bindings` 를 쓰지 않는다. 그 타입은 "그대로 평가에 넘길 수 있다"는 뜻인데
 * 이 맵은 그렇지 않다 — 키가 빠질 수 있고(∞), 통째로 넘기면 안 된다.
 * `Partial` 이 그 사실을 타입으로 말한다.
 */
export type MathConstantValues = Readonly<Partial<Record<string, number>>>;

/**
 * 상수의 표준값. 키 집합은 `MATH_CONSTANT_NAMES` 의 **부분집합**이다.
 *
 * `∞` 는 일부러 뺐다. 바인딩해도 `dispatch` 의 유한성 게이트가 곧바로
 * `divergent` 로 접어 값을 얻을 수 없고, 진단이 오히려 나빠진다 —
 * `{status:'unbound', variable:'∞'}` 로 어느 기호가 문제인지 알려주던 것이
 * `{status:'divergent', reason:'non-finite-result'}` 가 되어 기호를 잃는다.
 * 극한의 무한대는 `calculus.ts` 가 구조로 판정하므로 바인딩과 무관하다.
 *
 * ⚠️ **통째로 펼쳐 쓰지 말 것.** `φ`·`ϕ`·`γ` 는 각도·위상·로런츠 인자 같은
 * 자유변수로 쓰이는 일이 흔하다. 전부 스프레드하면 사용자가 각도로 적은 `φ` 가
 * 조용히 황금비로 평가된다 — 조용한 오답은 조용한 실패보다 나쁘다.
 * `analyzeBindings().constants` 중 **호스트가 상수로 의도한 것만** 골라 쓴다.
 */
export const MATH_CONSTANT_VALUES: MathConstantValues = Object.freeze({
  π: Math.PI,
  e: Math.E,
  /** 오일러-마스케로니 상수 */
  γ: 0.5772156649015329,
  /** 황금비 (1+√5)/2. `\varphi` 의 정규형 */
  φ: 1.618033988749895,
  /** 황금비. `\phi` 의 정규형 — 같은 문자의 글자꼴 변형이다 */
  ϕ: 1.618033988749895,
  /** 원주율의 두 배 */
  τ: 2 * Math.PI,
});
