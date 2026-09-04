/**
 * 의미 해석 시스템 타입 정의
 */

import type { MathNode } from '../../types.js';

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

/**
 * 카탈로그 분야 목록.
 * 타입과 zod 스키마가 이 배열 하나에서 파생된다 — 이중 관리 금지.
 */
export const CATALOG_CATEGORY_IDS = [
  // 초중등
  'elementary-geometry', 'solid-geometry', 'linear-functions',
  'ratio-proportion', 'basic-statistics', 'trigonometry-basic',
  // 수학 기초
  'algebra', 'calculus', 'geometry', 'number-theory', 'logic',
  // 자연과학
  'physics', 'astronomy', 'chemistry', 'biology',
  // 공학
  'electrical', 'mechanical', 'signal',
  // 경제/금융
  'economics', 'finance',
  // 통계/확률
  'statistics', 'probability',
  // 정보/AI
  'cs', 'ml', 'information',
  // 사회과학
  'social-science',
] as const;

/** 카탈로그 분야 */
export type CatalogCategory = (typeof CATALOG_CATEGORY_IDS)[number];

/**
 * 수식에 연결된 Visualizer 참조.
 * 같은 수식이 서로 독립적인 시각화 앱 여러 개를 가질 수 있도록 배열 형태로 노출한다.
 */
export interface VisualizerRef {
  /** 레지스트리에서 찾을 Visualizer ID (예: "kepler-orbit-2d", "kepler-orbit-3d") */
  id: string;
  /** 사용자에게 표시할 이름 (예: "지구 궤도 — 2D") */
  name: string;
  /** 짧은 설명 (예: "ISS·GPS·정지궤도·달을 앵커로 전환하며 관찰") */
  description: string;
  /** 이모지 또는 아이콘 기호 */
  icon?: string;
  /** 기본 선택 여부 (UI에서 우선 강조할 시각화) */
  default?: boolean;
}

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
  /** 이 수식에 연결된 Visualizer 참조 목록 (동일 수식에 여러 시각화 관점이 있을 수 있다) */
  visualizers?: VisualizerRef[];
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
/**
 * 기호 종류 목록.
 * 타입과 zod 스키마가 이 배열 하나에서 파생된다 — 이중 관리 금지.
 */
export const ELEMENT_KIND_IDS = ['input', 'constant', 'output', 'structural'] as const;

export type ElementKind = (typeof ELEMENT_KIND_IDS)[number];

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

// ─── 형식(form) ───

/** 슬롯을 채우는 출처. formula = 수식에서 읽는다, viewer = 사용자가 움직인다. */
export type FormSlotSource = 'formula' | 'viewer';

export interface FormSlotRange {
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface FormSlot {
  /** spec.userBindings.name 과 문자열이 정확히 같아야 한다 (`\omega`, `v_0` 등). */
  name: string;
  outputKind: 'scalar' | 'matrix' | 'complex';
  source: FormSlotSource;
  /** 대응 항이 없어도 되는 슬롯. 곱셈 자리는 1, 덧셈 자리는 0 으로 파생된다. */
  optional?: boolean;
  range: FormSlotRange;
}

export interface FormShape {
  /** 메타변수 sigil 없는 정상 LaTeX. slots·free 밖의 토큰은 전부 리터럴이다. */
  latex: string;
  slots: string[];
  free: string[];
}

export interface FormExample {
  latex: string;
  /** 슬롯 이름 → 기대 바인딩(LaTeX). 자가 증식 테스트의 유일한 저작물이다. */
  slots: Record<string, string>;
}

/** 형식 — 시각화가 붙는 단위. 카탈로그 항목은 이름을 소유하고 형식을 참조한다. */
export interface FormEntry {
  id: string;
  slots: FormSlot[];
  shapes: FormShape[];
  /** 이 형식이 일반화하는 형식들 — 진짜 포함관계일 때만. */
  subsumes?: string[];
  visualizers: FormVisualizerRef[];
  examples: FormExample[];
  counterExamples: string[];
}

export interface FormVisualizerRef {
  id: string;
  icon?: string;
  default?: boolean;
}

export interface FormSlotText {
  role: string;
  description: string;
}

export interface FormText {
  name: string;
  oneLiner: string;
  slots: Record<string, FormSlotText>;
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
