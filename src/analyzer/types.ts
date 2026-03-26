/**
 * Fizzex Expression Analyzer - 타입 정의
 *
 * 수식 분석 결과를 표현하는 타입들
 */

/**
 * 수학 도메인 (수학 분야)
 */
export type MathDomain =
  | 'arithmetic' // 사칙연산
  | 'polynomial' // 다항식
  | 'rational' // 유리식
  | 'trigonometric' // 삼각함수
  | 'exponential' // 지수함수
  | 'logarithmic' // 로그함수
  | 'calculus' // 미적분
  | 'linear-algebra' // 선형대수
  | 'statistics'; // 통계

/**
 * 함수 카테고리
 */
export type FunctionCategory =
  | 'trigonometric' // sin, cos, tan, etc.
  | 'inverse-trigonometric' // arcsin, arccos, etc.
  | 'hyperbolic' // sinh, cosh, etc.
  | 'exponential' // exp
  | 'logarithmic' // log, ln
  | 'root' // sqrt, cbrt
  | 'other'; // 기타

/**
 * 함수 정보
 */
export interface FunctionInfo {
  /** 함수 이름 (sin, log, sqrt 등) */
  name: string;
  /** 함수 카테고리 */
  category: FunctionCategory;
  /** 등장 횟수 */
  count: number;
}

/**
 * 다항식 정보
 */
export interface PolynomialInfo {
  /** 최고차항 차수 */
  degree: number;
  /** 주 변수 (가장 높은 차수의 변수) */
  mainVariable: string;
  /** 포함된 모든 변수 */
  variables: string[];
  /** 계수 정보 (변수별 최고차항) */
  leadingCoefficients: Record<string, number>;
}

/**
 * 수식 특성 플래그
 */
export type ExpressionFeature =
  | 'constant' // 상수만 포함
  | 'linear' // 1차
  | 'quadratic' // 2차
  | 'cubic' // 3차
  | 'single-variable' // 단일 변수
  | 'multi-variable' // 다변수
  | 'has-fraction' // 분수 포함
  | 'has-power' // 거듭제곱 포함
  | 'has-sqrt' // 제곱근 포함
  | 'periodic' // 주기함수 포함
  | 'has-integral' // 적분 포함
  | 'has-sum' // 시그마 합 포함
  | 'has-limit' // 극한 포함
  | 'has-matrix'; // 행렬 포함

/**
 * 시각화 가능 여부
 */
export interface VisualizationCapability {
  /** 2D 함수 그래프 가능 */
  graphable2D: boolean;
  /** 3D 함수 그래프 가능 */
  graphable3D: boolean;
  /** 기하 시각화 가능 */
  geometric: boolean;
  /** 수직선 표현 가능 */
  numberLine: boolean;
  /** 권장 시각화 유형 */
  recommended: VisualizationType[];
  /** 최적 시각화 유형 */
  bestFit?: VisualizationType;
  /** 시각화 파라미터 */
  params?: VisualizationParams;
}

/**
 * 시각화 유형
 */
export type VisualizationType =
  | 'function-graph-2d' // 2D 함수 그래프
  | 'function-graph-3d' // 3D 함수 그래프
  | 'number-line' // 수직선
  | 'coordinate-plane' // 좌표평면 (점, 벡터)
  | 'geometric-shape' // 기하 도형
  | 'unit-circle' // 단위원 (삼각함수)
  | 'polar-graph' // 극좌표 그래프
  | 'table'; // 값 표

/**
 * NumberLine 시각화 파라미터
 */
export interface NumberLineParams {
  /** 표시할 점들 */
  points: Array<{
    value: number;
    label?: string;
    included: boolean; // 포함 여부 (열린/닫힌 점)
  }>;
  /** 구간들 */
  intervals: Array<{
    start: number;
    end: number;
    startIncluded: boolean;
    endIncluded: boolean;
    label?: string;
  }>;
  /** 표시 범위 */
  range: [number, number];
  /** 원본 부등식 정보 */
  inequality?: {
    variable: string;
    operator: '<' | '>' | '≤' | '≥' | '=' | '≠';
    value: number;
  };
}

/**
 * UnitCircle 시각화 파라미터
 */
export interface UnitCircleParams {
  /** 초기 각도 (라디안) */
  initialAngle: number;
  /** 강조할 함수 */
  highlightFunction?: 'sin' | 'cos' | 'tan';
  /** 특수 각도 표시 여부 */
  showSpecialAngles?: boolean;
}

/**
 * PolarGraph 시각화 파라미터
 */
export interface PolarGraphParams {
  /** 극좌표 표현식 (r = f(θ)) */
  expression: string;
  /** θ 범위 */
  thetaRange: [number, number];
  /** 애니메이션 여부 */
  animated?: boolean;
}

/**
 * FunctionGraph 2D 시각화 파라미터
 */
export interface FunctionGraph2DParams {
  /** 표현식 */
  expression: string;
  /** 주변수 */
  mainVariable: string;
  /** 계수들 */
  coefficients: string[];
  /** 초기 범위 */
  range?: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  };
}

/**
 * 시각화 파라미터 (유니온)
 */
export interface VisualizationParams {
  /** NumberLine용 파라미터 */
  numberLine?: NumberLineParams;
  /** UnitCircle용 파라미터 */
  unitCircle?: UnitCircleParams;
  /** PolarGraph용 파라미터 */
  polar?: PolarGraphParams;
  /** FunctionGraph 2D용 파라미터 */
  function2D?: FunctionGraph2DParams;
}

/**
 * 변수 분류 결과
 */
export interface VariableClassification {
  /** 주 변수 (x, y 등 - 방정식에서 풀어야 할 대상) */
  mainVariables: string[];

  /** 계수/파라미터 (a, b, c 등 - 상수 역할) */
  coefficients: string[];

  /** 분류 신뢰도 (0-1) */
  confidence: number;
}

/**
 * 변수 점수 (내부 사용)
 */
export interface VariableScore {
  name: string;
  score: number;
  reasons: string[];
}

/**
 * 수식 분석 결과
 */
export interface ExpressionAnalysis {
  /** 수식 형태 */
  form: 'expression' | 'equation' | 'inequality';

  /** 수학 도메인 (해당하는 모든 분야) */
  domains: MathDomain[];

  /** 주요 도메인 (가장 특징적인 분야) */
  primaryDomain: MathDomain;

  /** 변수 목록 (모든 문자 기호) */
  variables: string[];

  /** 변수 분류 (주 변수 vs 계수) */
  variableClassification: VariableClassification;

  /** 상수 목록 (pi, e 등 수학 상수) */
  constants: string[];

  /** 발견된 함수들 */
  functions: FunctionInfo[];

  /** 다항식 정보 (다항식인 경우) */
  polynomial?: PolynomialInfo;

  /** 수식 특성 */
  features: ExpressionFeature[];

  /** 시각화 가능성 */
  visualization: VisualizationCapability;

  /** 복잡도 점수 (1-10) */
  complexity: number;

  /** 분석 요약 (사람이 읽을 수 있는 설명) */
  summary: string;
}

/**
 * AST 노드 수집 결과 (내부 사용)
 */
export interface ASTCollectionResult {
  /** 변수 노드들 */
  variables: Set<string>;
  /** 숫자 노드들 */
  numbers: number[];
  /** 연산자들 */
  operators: Set<string>;
  /** 함수들 */
  functions: Map<string, number>; // name -> count
  /** 특수 상수들 (pi, e 등) */
  constants: Set<string>;
  /** 노드 타입별 카운트 */
  nodeTypeCounts: Record<string, number>;
  /** 최대 중첩 깊이 */
  maxDepth: number;
  /** 총 노드 수 */
  totalNodes: number;
}
