/**
 * Fizzex Expression Analyzer
 *
 * 수식 AST를 분석하여 수학적 특성을 추출
 *
 * @example
 * ```typescript
 * import { parseLatex, analyzeExpression } from 'fizzex';
 *
 * const ast = parseLatex('x^2 + 2x - 3 = 0');
 * const analysis = analyzeExpression(ast);
 *
 * console.log(analysis.primaryDomain);  // 'polynomial'
 * console.log(analysis.polynomial?.degree);  // 2
 * console.log(analysis.features);  // ['single-variable', 'quadratic']
 * console.log(analysis.visualization.graphable2D);  // true
 * ```
 */

import type { RootNode } from '../types';
import type { ExpressionAnalysis } from './types';
import { walkAST, hasEquality, hasInequality } from './ast-walker';
import { createFunctionInfoList } from './function-detector';
import { detectDomains, determinePrimaryDomain } from './domain-detector';
import { analyzePolynomial } from './polynomial-analyzer';
import { classifyVariables } from './variable-classifier';
import {
  extractFeatures,
  analyzeVisualization,
  calculateComplexity,
  generateSummary,
} from './feature-extractor';
import { matchVisualization } from './visualization-matcher';

/**
 * 수식 분석
 *
 * Fizzex AST를 분석하여 수학적 특성을 추출합니다.
 *
 * @param ast - 분석할 Fizzex AST (RootNode)
 * @returns 분석 결과
 */
export function analyzeExpression(ast: RootNode): ExpressionAnalysis {
  // 1. AST 순회하며 기본 정보 수집
  const collected = walkAST(ast);

  // 2. 함수 정보 생성
  const functions = createFunctionInfoList(collected.functions);

  // 3. 도메인 감지
  const domains = detectDomains(collected, functions);
  const primaryDomain = determinePrimaryDomain(domains);

  // 4. 다항식 분석
  const polynomial = analyzePolynomial(ast, collected);

  // 5. 특성 추출
  const features = extractFeatures(collected, polynomial, functions);

  // 6. 시각화 가능성 분석 (기본)
  const baseVisualization = analyzeVisualization(collected, domains, features);

  // 7. 복잡도 계산
  const complexity = calculateComplexity(collected, polynomial, functions);

  // 8. 수식 형태 판별
  let form: 'expression' | 'equation' | 'inequality' = 'expression';
  if (hasEquality(ast)) {
    form = 'equation';
  } else if (hasInequality(ast)) {
    form = 'inequality';
  }

  // 9. 변수 분류 (주 변수 vs 계수)
  const variables = Array.from(collected.variables);
  const constants = Array.from(collected.constants);
  const variableClassification = classifyVariables(ast, variables);

  // 10. 요약 생성
  const summary = generateSummary(
    domains,
    features,
    polynomial,
    functions,
    variables
  );

  // 11. 임시 분석 결과 생성 (시각화 매칭용)
  const tempAnalysis: ExpressionAnalysis = {
    form,
    domains,
    primaryDomain,
    variables,
    variableClassification,
    constants,
    functions,
    polynomial,
    features,
    visualization: baseVisualization,
    complexity,
    summary,
  };

  // 12. 시각화 매칭 (파라미터 추출 포함)
  const vizMatch = matchVisualization(tempAnalysis, ast);

  // 13. 최종 시각화 정보 병합
  const visualization = {
    ...baseVisualization,
    recommended: vizMatch.recommended,
    bestFit: vizMatch.bestFit,
    params: vizMatch.params,
  };

  return {
    form,
    domains,
    primaryDomain,
    variables,
    variableClassification,
    constants,
    functions,
    polynomial,
    features,
    visualization,
    complexity,
    summary,
  };
}

// 타입 export
export type {
  ExpressionAnalysis,
  MathDomain,
  FunctionInfo,
  FunctionCategory,
  PolynomialInfo,
  ExpressionFeature,
  VisualizationCapability,
  VisualizationType,
  VariableClassification,
  VisualizationParams,
  NumberLineParams,
  UnitCircleParams,
  PolarGraphParams,
  FunctionGraph2DParams,
} from './types';

// 시각화 매칭 export
export { matchVisualization } from './visualization-matcher';
export type { VisualizationMatch } from './visualization-matcher';

// 구조적 의미 시스템
export { getSemanticMeaning, buildSemanticMap, buildAstAncestorMap } from './semantic-roles';
export type { SemanticResult, AncestorEntry } from './semantic-roles';

// 개별 유틸리티 함수 export (고급 사용자용)
export { walkAST, findNodes, hasEquality, hasInequality } from './ast-walker';
export { getFunctionCategory, createFunctionInfoList } from './function-detector';
export { detectDomains, determinePrimaryDomain } from './domain-detector';
export { analyzePolynomial, getDegreeLabel, setDebugAnalyzer } from './polynomial-analyzer';
export { classifyVariables } from './variable-classifier';
export {
  extractFeatures,
  analyzeVisualization,
  calculateComplexity,
  generateSummary,
} from './feature-extractor';
