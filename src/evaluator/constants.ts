/**
 * 수학 상수 이름 집합
 *
 * 호스트 합의: 상수는 호스트가 공급한다.
 * evaluator는 자동 바인딩하지 않으며, analyzeBindings 가 자유변수와 상수를 분류할 때만 사용한다.
 *
 * 정규화된 이름(유니코드)을 기준으로 한다.
 */
export const MATH_CONSTANT_NAMES: ReadonlySet<string> = new Set([
  'π',
  'e',
  'γ',
  'φ',
  '∞',
  'τ',
]);

export function isMathConstantName(name: string): boolean {
  return MATH_CONSTANT_NAMES.has(name);
}
