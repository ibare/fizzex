/**
 * Function Detector - 함수 감지
 *
 * AST에서 사용된 함수들을 감지하고 분류
 */

import type { FunctionInfo, FunctionCategory } from './types';

/** 삼각함수 목록 */
const TRIG_FUNCTIONS = new Set([
  'sin',
  'cos',
  'tan',
  'cot',
  'sec',
  'csc',
  'sinc',
]);

/** 역삼각함수 목록 */
const INVERSE_TRIG_FUNCTIONS = new Set([
  'arcsin',
  'arccos',
  'arctan',
  'arccot',
  'arcsec',
  'arccsc',
  'asin',
  'acos',
  'atan',
  'acot',
  'asec',
  'acsc',
]);

/** 쌍곡선함수 목록 */
const HYPERBOLIC_FUNCTIONS = new Set([
  'sinh',
  'cosh',
  'tanh',
  'coth',
  'sech',
  'csch',
  'asinh',
  'acosh',
  'atanh',
  'acoth',
  'asech',
  'acsch',
]);

/** 지수함수 목록 */
const EXPONENTIAL_FUNCTIONS = new Set(['exp']);

/** 로그함수 목록 */
const LOGARITHMIC_FUNCTIONS = new Set(['log', 'ln', 'lg', 'log10', 'log2']);

/** 루트함수 목록 */
const ROOT_FUNCTIONS = new Set(['sqrt', 'cbrt', 'root']);

/**
 * 함수 이름에서 카테고리 판별
 */
export function getFunctionCategory(name: string): FunctionCategory {
  const lowerName = name.toLowerCase();

  if (TRIG_FUNCTIONS.has(lowerName)) {
    return 'trigonometric';
  }
  if (INVERSE_TRIG_FUNCTIONS.has(lowerName)) {
    return 'inverse-trigonometric';
  }
  if (HYPERBOLIC_FUNCTIONS.has(lowerName)) {
    return 'hyperbolic';
  }
  if (EXPONENTIAL_FUNCTIONS.has(lowerName)) {
    return 'exponential';
  }
  if (LOGARITHMIC_FUNCTIONS.has(lowerName)) {
    return 'logarithmic';
  }
  if (ROOT_FUNCTIONS.has(lowerName)) {
    return 'root';
  }

  return 'other';
}

/**
 * 함수 맵에서 FunctionInfo 배열 생성
 */
export function createFunctionInfoList(
  functionsMap: Map<string, number>
): FunctionInfo[] {
  const result: FunctionInfo[] = [];

  for (const [name, count] of functionsMap) {
    result.push({
      name,
      category: getFunctionCategory(name),
      count,
    });
  }

  // 카테고리별, 이름별 정렬
  result.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });

  return result;
}

/**
 * 삼각함수 포함 여부
 */
export function hasTrigonometric(functions: FunctionInfo[]): boolean {
  return functions.some(
    (f) =>
      f.category === 'trigonometric' || f.category === 'inverse-trigonometric'
  );
}

/**
 * 로그함수 포함 여부
 */
export function hasLogarithmic(functions: FunctionInfo[]): boolean {
  return functions.some((f) => f.category === 'logarithmic');
}

/**
 * 지수함수 포함 여부
 */
export function hasExponential(functions: FunctionInfo[]): boolean {
  return functions.some((f) => f.category === 'exponential');
}

/**
 * 쌍곡선함수 포함 여부
 */
export function hasHyperbolic(functions: FunctionInfo[]): boolean {
  return functions.some((f) => f.category === 'hyperbolic');
}
