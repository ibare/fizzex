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
  | 'statistics' // 통계
  | 'chemistry'; // 화학 — 수학 분야는 아니지만 수식이 속한 분야다 (\ce{} 화학식)

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
  /** 변수별 최고 지수 (계수 값이 아니다 — 계수는 canonical/polynomial.ts 가 산출한다) */
  degreesByVariable: Record<string, number>;
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
  | 'has-matrix' // 행렬 포함
  | 'chemical-reaction' // 반응 화살표가 있는 화학 반응식
  | 'reversible-reaction' // 가역 반응 (평형 화살표)
  | 'isotope' // 동위원소 표기 (질량수·원자번호 앞첨자)
  | 'ionic-charge'; // 이온 전하 표기

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
  /**
   * 수식 형태.
   *
   * 화학식은 등호가 아니라 반응 화살표로 좌우가 갈리므로 `equation` 과 구분한다.
   */
  form: 'expression' | 'equation' | 'inequality' | 'chemical-formula' | 'chemical-equation';

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

  /** 분석 요약 — 문장이 아니라 사실이다. 문장은 표시 계층이 만든다 */
  summary: AnalysisSummary;
}

/**
 * 분석 요약 — **어휘가 아니라 사실만 담는다.**
 *
 * 계산 계층은 어느 말로 설명할지 모른다. "2차 다항식" 인지 "quadratic polynomial" 인지는
 * 로케일을 아는 표시 계층이 정한다. 그래서 여기에는 조립에 필요한 재료만 둔다.
 *
 * 워커 경계를 넘으므로 `structuredClone` 가능한 순수 데이터여야 한다.
 */
export interface AnalysisSummary {
  /** 화학식이면 이것만 채워진다 — 화학식에는 변수도 차수도 없다 */
  chemistry?: { reaction: boolean; reversible: boolean };

  /** 식에 등장하는 변수. 비어 있으면 상수 표현식이다 */
  variables: string[];

  /** 다항식일 때의 차수 */
  degree?: number;

  /** 눈에 띄는 함수 이름 (최대 3개) */
  functions: string[];

  /** 눈에 띄는 도메인 (최대 2개). `arithmetic` 은 모든 식에 붙으므로 제외한다 */
  domains: MathDomain[];
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
  /**
   * 첨자 슬롯별 등장 횟수.
   *
   * 첨자는 노드 타입 하나(scripts)로 합쳐져 있어 nodeTypeCounts 만으로는
   * 거듭제곱(x^2)과 아래첨자(x_i)를 구분할 수 없다.
   */
  scriptSlotCounts: {
    superscript: number;
    subscript: number;
    leftSuperscript: number;
    leftSubscript: number;
  };
  /**
   * 화학식에서 수집한 사실.
   *
   * chem 스코프 안의 기호는 수학 어휘로 집계하지 않는다 — `+` 는 화학종
   * 구분자이지 덧셈이 아니고 `SO4^2-` 의 `2-` 는 지수가 아니라 전하다.
   * 그래서 위의 수학 지표(variables/operators/numbers/nodeTypeCounts 등)는
   * chem 안쪽을 보지 않고, 화학의 사실은 전부 이 필드로 온다.
   */
  chem: ChemCollectionFacts;
  /** 최대 중첩 깊이 */
  maxDepth: number;
  /** 총 노드 수 */
  totalNodes: number;
}

/** 화학식에서 수집한 사실 */
export interface ChemCollectionFacts {
  /** \ce{} 노드 수 */
  count: number;
  /** 반응 화살표가 있는가 — 있으면 반응식, 없으면 화학식 */
  hasReaction: boolean;
  /** 가역(평형) 화살표가 있는가 */
  hasEquilibrium: boolean;
  /** 앞첨자로 질량수·원자번호를 적었는가 */
  hasIsotope: boolean;
  /** 전하를 적었는가 */
  hasCharge: boolean;
}
