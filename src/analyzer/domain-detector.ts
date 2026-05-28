/**
 * Domain Detector - 수학 도메인 감지
 *
 * 수식이 속하는 수학 분야를 판별
 */

import type { MathDomain, FunctionInfo, ASTCollectionResult } from './types.js';
import {
  hasTrigonometric,
  hasLogarithmic,
  hasExponential,
} from './function-detector.js';

/**
 * 수집된 AST 정보에서 수학 도메인 감지
 */
export function detectDomains(
  collected: ASTCollectionResult,
  functions: FunctionInfo[]
): MathDomain[] {
  const domains: Set<MathDomain> = new Set();

  // 1. 기본 산술 (항상 포함)
  if (
    collected.numbers.length > 0 ||
    collected.operators.size > 0
  ) {
    domains.add('arithmetic');
  }

  // 2. 삼각함수
  if (hasTrigonometric(functions)) {
    domains.add('trigonometric');
  }

  // 3. 로그함수
  if (hasLogarithmic(functions)) {
    domains.add('logarithmic');
  }

  // 4. 지수함수 (exp 함수 또는 e^x 형태)
  if (hasExponential(functions) || hasExponentialPower(collected)) {
    domains.add('exponential');
  }

  // 5. 다항식 (변수와 거듭제곱만 있는 경우)
  if (isPolynomialLike(collected, functions)) {
    domains.add('polynomial');
  }

  // 6. 유리식 (분수에 변수가 있는 경우)
  if (hasRationalExpression(collected)) {
    domains.add('rational');
  }

  // 7. 미적분 (적분, 극한, 시그마 등)
  if (hasCalculus(collected)) {
    domains.add('calculus');
  }

  // 8. 선형대수 (행렬)
  if (hasLinearAlgebra(collected)) {
    domains.add('linear-algebra');
  }

  // 도메인이 비어있으면 산술로 기본 설정
  if (domains.size === 0) {
    domains.add('arithmetic');
  }

  return Array.from(domains);
}

/**
 * 주요 도메인 결정 (가장 특징적인 도메인)
 */
export function determinePrimaryDomain(domains: MathDomain[]): MathDomain {
  // 우선순위: 미적분 > 선형대수 > 삼각함수 > 로그 > 지수 > 유리식 > 다항식 > 산술
  const priority: MathDomain[] = [
    'calculus',
    'linear-algebra',
    'trigonometric',
    'logarithmic',
    'exponential',
    'rational',
    'polynomial',
    'arithmetic',
  ];

  for (const domain of priority) {
    if (domains.includes(domain)) {
      return domain;
    }
  }

  return 'arithmetic';
}

/**
 * e^x 형태의 지수함수 확인
 */
function hasExponentialPower(collected: ASTCollectionResult): boolean {
  // e가 상수로 있고 power 노드가 있는 경우
  return (
    collected.constants.has('e') &&
    (collected.nodeTypeCounts['power'] || 0) > 0
  );
}

/**
 * 다항식 형태인지 확인
 * (변수, 숫자, 거듭제곱, 사칙연산만 포함)
 */
function isPolynomialLike(
  collected: ASTCollectionResult,
  functions: FunctionInfo[]
): boolean {
  // 함수가 있으면 다항식이 아님 (sqrt 제외)
  const nonPolynomialFunctions = functions.filter(
    (f) => f.category !== 'root'
  );
  if (nonPolynomialFunctions.length > 0) {
    return false;
  }

  // 변수가 있어야 함
  if (collected.variables.size === 0) {
    return false;
  }

  // 미적분 노드가 있으면 다항식이 아님
  if (hasCalculus(collected)) {
    return false;
  }

  return true;
}

/**
 * 유리식 (분수에 변수가 있는 경우)
 */
function hasRationalExpression(collected: ASTCollectionResult): boolean {
  // 분수가 있고 변수가 있는 경우
  // 더 정확하려면 분모에 변수가 있는지 확인해야 하지만,
  // 간단히 분수와 변수가 모두 있으면 유리식으로 판단
  return (
    (collected.nodeTypeCounts['frac'] || 0) > 0 &&
    collected.variables.size > 0
  );
}

/**
 * 미적분 관련 노드 포함 여부
 */
function hasCalculus(collected: ASTCollectionResult): boolean {
  const calculusNodes = ['integral', 'sum', 'limit', 'product'];
  return calculusNodes.some((type) => (collected.nodeTypeCounts[type] || 0) > 0);
}

/**
 * 선형대수 관련 노드 포함 여부
 */
function hasLinearAlgebra(collected: ASTCollectionResult): boolean {
  return (collected.nodeTypeCounts['matrix'] || 0) > 0;
}
