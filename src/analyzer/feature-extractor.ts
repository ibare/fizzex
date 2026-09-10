/**
 * Feature Extractor - 수식 특성 추출
 *
 * 수식의 다양한 특성을 추출
 */

import type {
  ExpressionFeature,
  VisualizationCapability,
  ASTCollectionResult,
  PolynomialInfo,
  FunctionInfo,
  MathDomain,
  AnalysisSummary,
} from './types.js';
import { hasTrigonometric } from './function-detector.js';

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
  if (collected.scriptSlotCounts.superscript > 0) {
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

  // 화학식 특성
  if (collected.chem.hasReaction) {
    features.push('chemical-reaction');
  }
  if (collected.chem.hasEquilibrium) {
    features.push('reversible-reaction');
  }
  if (collected.chem.hasIsotope) {
    features.push('isotope');
  }
  if (collected.chem.hasCharge) {
    features.push('ionic-charge');
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

  return {
    graphable2D,
    graphable3D,
    geometric,
    numberLine,
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
 * 분석 요약 생성 — 사실만 모은다.
 *
 * 어휘를 여기서 고르지 않는 이유: 이 파일은 compute 클로저 안이라 로케일 데이터를
 * 물 수 없고(`subpath-isolation.test.ts`), 애초에 계산 계층이 "2차 다항식" 이라는
 * 한국어를 알고 있을 이유도 없다.
 */
export function generateSummary(
  domains: MathDomain[],
  features: ExpressionFeature[],
  polynomial: PolynomialInfo | undefined,
  functions: FunctionInfo[],
  variables: string[]
): AnalysisSummary {
  // 화학식은 변수도 차수도 없다. 수학 어휘로 요약하면 "상수 표현식" 이 된다.
  if (domains.includes('chemistry')) {
    return {
      chemistry: {
        reaction: features.includes('chemical-reaction'),
        reversible: features.includes('reversible-reaction'),
      },
      variables: [],
      functions: [],
      domains: [],
    };
  }

  const summary: AnalysisSummary = {
    variables,
    functions: functions.slice(0, 3).map((f) => f.name),
    // arithmetic 은 거의 모든 식에 붙어 변별력이 없다
    domains: domains.filter((d) => d !== 'arithmetic').slice(0, 2),
  };
  if (polynomial) summary.degree = polynomial.degree;
  return summary;
}
