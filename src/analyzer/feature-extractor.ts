/**
 * Feature Extractor - 수식 특성 추출
 *
 * 수식의 다양한 특성을 추출
 */

import type {
  ExpressionFeature,
  VisualizationCapability,
  VisualizationType,
  ASTCollectionResult,
  PolynomialInfo,
  FunctionInfo,
  MathDomain,
} from './types';
import { hasTrigonometric } from './function-detector';

/**
 * 수식 특성 추출
 */
export function extractFeatures(
  collected: ASTCollectionResult,
  polynomial: PolynomialInfo | undefined,
  functions: FunctionInfo[]
): ExpressionFeature[] {
  const features: ExpressionFeature[] = [];

  // 상수 여부
  if (collected.variables.size === 0 && collected.numbers.length > 0) {
    features.push('constant');
  }

  // 변수 개수
  if (collected.variables.size === 1) {
    features.push('single-variable');
  } else if (collected.variables.size > 1) {
    features.push('multi-variable');
  }

  // 다항식 차수
  if (polynomial) {
    switch (polynomial.degree) {
      case 1:
        features.push('linear');
        break;
      case 2:
        features.push('quadratic');
        break;
      case 3:
        features.push('cubic');
        break;
    }
  }

  // 구조적 특성
  if ((collected.nodeTypeCounts['frac'] || 0) > 0) {
    features.push('has-fraction');
  }
  if ((collected.nodeTypeCounts['power'] || 0) > 0) {
    features.push('has-power');
  }
  if ((collected.nodeTypeCounts['sqrt'] || 0) > 0) {
    features.push('has-sqrt');
  }
  if ((collected.nodeTypeCounts['integral'] || 0) > 0) {
    features.push('has-integral');
  }
  if ((collected.nodeTypeCounts['sum'] || 0) > 0) {
    features.push('has-sum');
  }
  if ((collected.nodeTypeCounts['limit'] || 0) > 0) {
    features.push('has-limit');
  }
  if ((collected.nodeTypeCounts['matrix'] || 0) > 0) {
    features.push('has-matrix');
  }

  // 주기함수 포함 여부
  if (hasTrigonometric(functions)) {
    features.push('periodic');
  }

  return features;
}

/**
 * 시각화 가능성 분석
 */
export function analyzeVisualization(
  collected: ASTCollectionResult,
  domains: MathDomain[],
  features: ExpressionFeature[]
): VisualizationCapability {
  const recommended: VisualizationType[] = [];

  // 2D 그래프 가능 여부 (단일 변수 함수)
  const graphable2D =
    features.includes('single-variable') && !features.includes('has-matrix');

  // 3D 그래프 가능 여부 (2개 변수)
  const graphable3D =
    collected.variables.size === 2 && !features.includes('has-matrix');

  // 수직선 가능 여부 (상수 또는 단순 식)
  const numberLine =
    features.includes('constant') ||
    (features.includes('single-variable') && features.includes('linear'));

  // 기하 시각화 가능 여부
  const geometric = domains.includes('trigonometric');

  // 권장 시각화 결정
  if (graphable2D) {
    recommended.push('function-graph-2d');
  }
  if (graphable3D) {
    recommended.push('function-graph-3d');
  }
  if (numberLine) {
    recommended.push('number-line');
  }
  if (domains.includes('trigonometric')) {
    recommended.push('unit-circle');
  }
  if (features.includes('constant') || collected.variables.size <= 1) {
    recommended.push('table');
  }

  return {
    graphable2D,
    graphable3D,
    geometric,
    numberLine,
    recommended,
  };
}

/**
 * 복잡도 점수 계산 (1-10)
 */
export function calculateComplexity(
  collected: ASTCollectionResult,
  polynomial: PolynomialInfo | undefined,
  functions: FunctionInfo[]
): number {
  let score = 1;

  // 노드 수 기반 (많을수록 복잡)
  score += Math.min(3, Math.floor(collected.totalNodes / 10));

  // 중첩 깊이 기반
  score += Math.min(2, collected.maxDepth - 1);

  // 함수 개수
  score += Math.min(2, functions.length);

  // 다항식 차수
  if (polynomial && polynomial.degree > 2) {
    score += 1;
  }

  // 미적분 연산
  if (
    (collected.nodeTypeCounts['integral'] || 0) > 0 ||
    (collected.nodeTypeCounts['limit'] || 0) > 0
  ) {
    score += 2;
  }

  // 행렬
  if ((collected.nodeTypeCounts['matrix'] || 0) > 0) {
    score += 2;
  }

  return Math.min(10, Math.max(1, score));
}

/**
 * 분석 요약 생성
 */
export function generateSummary(
  domains: MathDomain[],
  features: ExpressionFeature[],
  polynomial: PolynomialInfo | undefined,
  functions: FunctionInfo[],
  variables: string[]
): string {
  const parts: string[] = [];

  // 변수 정보
  if (variables.length === 0) {
    parts.push('상수 표현식');
  } else if (variables.length === 1) {
    parts.push(`변수 ${variables[0]}의`);
  } else {
    parts.push(`변수 ${variables.join(', ')}의`);
  }

  // 다항식 정보
  if (polynomial) {
    const degreeLabels: Record<number, string> = {
      1: '1차',
      2: '2차',
      3: '3차',
      4: '4차',
      5: '5차',
    };
    const degreeLabel = degreeLabels[polynomial.degree] || `${polynomial.degree}차`;
    parts.push(`${degreeLabel} 다항식`);
  }

  // 주요 함수
  if (functions.length > 0) {
    const funcNames = functions.slice(0, 3).map((f) => f.name);
    parts.push(`(${funcNames.join(', ')} 함수 포함)`);
  }

  // 도메인
  const domainLabels: Record<MathDomain, string> = {
    arithmetic: '산술',
    polynomial: '다항식',
    rational: '유리식',
    trigonometric: '삼각함수',
    exponential: '지수함수',
    logarithmic: '로그함수',
    calculus: '미적분',
    'linear-algebra': '선형대수',
    statistics: '통계',
  };

  const mainDomains = domains
    .filter((d) => d !== 'arithmetic')
    .slice(0, 2)
    .map((d) => domainLabels[d]);

  if (mainDomains.length > 0) {
    parts.push(`[${mainDomains.join(', ')}]`);
  }

  return parts.join(' ');
}
