/**
 * 의미 해석 시스템 타입 정의
 */

import type { MathNode } from '../../types';

// ─── 결과 타입 ───

/** AST 조상 경로 항목 */
export interface AncestorEntry {
  /** 부모 AST 노드 */
  node: MathNode;
  /** 이 노드가 부모의 어떤 자식 위치인지 */
  childPosition: string;
}

/** 의미 해석 결과 */
export interface SemanticResult {
  /** 짧은 역할명 */
  role: string;
  /** 설명 문장 */
  description: string;
  /** 어느 레이어에서 왔는지 */
  layer: 'catalog' | 'layer2' | 'layer1' | 'fallback';
  /** 카탈로그 매칭 시 수식 ID */
  catalogId?: string;
  /** 카탈로그 매칭 confidence (0~1) */
  confidence?: number;
  /** 카탈로그 분야 */
  catalogCategory?: CatalogCategory;
}

// ─── 카탈로그 타입 ───

/** 카탈로그 분야 */
export type CatalogCategory =
  // 초중등
  | 'elementary-geometry' | 'solid-geometry' | 'linear-functions'
  | 'ratio-proportion' | 'basic-statistics' | 'trigonometry-basic'
  // 수학 기초
  | 'algebra' | 'calculus' | 'geometry' | 'number-theory' | 'logic'
  // 자연과학
  | 'physics' | 'astronomy' | 'chemistry' | 'biology'
  // 공학
  | 'electrical' | 'mechanical' | 'signal'
  // 경제/금융
  | 'economics' | 'finance'
  // 통계/확률
  | 'statistics' | 'probability'
  // 정보/AI
  | 'cs' | 'ml' | 'information'
  // 사회과학
  | 'social-science';

/** 카탈로그 인덱스 항목 (번들에 포함, 가벼움) */
export interface CatalogIndexEntry {
  id: string;
  category: CatalogCategory;
  /** 매칭에 필요한 AST 노드 타입 */
  requiredNodeTypes?: string[];
  /** 매칭에 필요한 변수명 (exact 매칭용) */
  requiredVariables?: string[];
  /** AST 노드 수 범위 [min, max] */
  complexity?: [number, number];
  /** 매칭 패턴 타입 */
  patternType: 'exact' | 'structural';
  /** 구조 시그니처 — 필수 특징 */
  signature: string[];
  /** 이 수식에 연결된 Visualizer ID */
  visualizerId?: string;
}

/** 카탈로그 파라미터 설정 (JSON 직렬화 가능 — compute 함수 없음) */
export interface CatalogParameterConfig {
  id: string;
  name: string;
  role: string;
  min: number;
  max: number;
  default: number;
  step: number;
  unit?: string;
  scale?: 'linear' | 'log' | string;
  effects?: Array<{
    range: number[];
    description: string;
  }>;
}

// ─── 기호 종류 ───

/** 수식 기호의 종류 */
export type ElementKind = 'input' | 'constant' | 'output' | 'structural';

/** 수식 기호의 역할과 종류 */
export interface ElementMeaning {
  /** 짧은 역할명 (예: "공전 주기", "만유인력 상수") */
  role: string;
  /** 설명 문장 */
  description: string;
  /** 기호 종류: input(슬라이더), constant(읽기전용), output(결과), structural(구조) */
  kind: ElementKind;
  /** constant일 때 실제 값 (예: G = 6.674e-11) */
  value?: number;
  /** 단위 (예: "N·m²/kg²", "km", "초") */
  unit?: string;
}

// ─── 카탈로그 확장 타입 ───

/** 유도값 설정 (JSON 직렬화 가능) */
export interface DerivedValueConfig {
  id: string;
  label: string;
  unit?: string;
  format?: 'number' | 'time' | 'distance' | 'percentage';
  /** 어떤 수식 노드에서 유도되는가 */
  sourceParams: string[];
  /** JavaScript 계산식 (params 변수명 사용) */
  expression?: string;
  /** 단순 변환 */
  transform?: {
    type: 'sqrt' | 'negate' | 'subtract' | 'divide' | 'multiply' | 'custom';
    sourceParam: string;
    operand?: number;
  };
}

/** 유효 조건 */
export interface ConstraintConfig {
  param: string;
  type: 'min' | 'max' | 'notEqual' | 'positive' | 'custom';
  value?: number;
  severity: 'warning' | 'error';
  message: string;
}

/** 이정표 (슬라이더의 의미 있는 지점) */
export interface MilestoneConfig {
  param: string;
  value: number;
  label: string;
  shortLabel?: string;
  description?: string;
  emoji?: string;
}

/** 현실 앵커 범위 */
export interface AnchorRange {
  range: number[];
  template: string;
  referenceValue: number;
  referenceLabel: string;
}

/** 현실 앵커 */
export interface AnchorConfig {
  param: string;
  ranges: AnchorRange[];
}

/** 카탈로그 상세 데이터 (런타임 로드) */
export interface CatalogDetail {
  name: string;
  oneLiner: string;
  description: string;
  discoverer?: string;
  field: string;
  significance?: string;
  /** 각 심볼/부분에 대한 도메인 의미. 키: 변수명 또는 AST 경로 */
  elementMeanings: Record<string, ElementMeaning>;
  relatedFormulas?: string[];
  realWorldExamples?: string[];
  /** Visualizer 파라미터 설정 */
  parameterConfig?: CatalogParameterConfig[];
  /** 유도값 설정 */
  derivedValues?: DerivedValueConfig[];
  /** 유효 조건 */
  constraints?: ConstraintConfig[];
  /** 이정표 */
  milestones?: MilestoneConfig[];
  /** 현실 앵커 */
  anchors?: AnchorConfig[];
}

/** 카탈로그 매칭 결과 */
export interface CatalogMatchResult {
  catalogId: string;
  category: CatalogCategory;
  confidence: number;
  /** 실제 변수 → 카탈로그 역할 매핑 */
  variableMapping?: Record<string, string>;
}

// ─── 규칙 타입 ───

/** Layer 1 규칙 */
export interface SemanticRule {
  parentType: string;
  childPosition: string;
  role: string;
  description: string;
  refinements?: Array<{
    condition: (node: MathNode) => boolean;
    /** 조건 ID — JSON 텍스트 데이터와 매핑용 */
    conditionId?: string;
    description: string;
  }>;
}

/** Layer 2 조합 규칙 */
export interface CombinedSemanticRule {
  /** 경로 패턴 (부모→자식 순서, 끝이 현재 노드 바로 위) */
  pathPattern: string[];
  role?: string;
  description: string;
  condition?: (node: MathNode) => boolean;
}
