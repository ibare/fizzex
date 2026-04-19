/**
 * Fizzex Visualizer 프레임워크 — 프로토콜 타입 정의
 *
 * 모든 Visualizer 구현체와 프레임워크가 공유하는 인터페이스.
 */

// ─── 파라미터 정의 ───

/** 카탈로그에서 정의하는 파라미터 설정 */
export interface ParameterConfig {
  /** 파라미터 고유 ID */
  id: string;
  /** AST에서의 변수명 */
  name: string;
  /** 역할 설명 (예: "궤도 반지름") */
  role: string;

  // 슬라이더 설정
  min: number;
  max: number;
  default: number;
  step: number;
  /** 단위 (예: "km", "cm", "m/s") */
  unit?: string;

  /** 슬라이더 스케일. log: 넓은 범위에서 균일한 인지적 간격 */
  scale?: 'linear' | 'log';

  /** SI 단위 변환 승수 (예: km→m = 1000). AST 평가 시 적용 */
  siMultiplier?: number;

  /** 파라미터 범위별 인사이트 */
  effects?: Array<{
    range: [number, number];
    description: string;
  }>;
}

/** 파라미터의 현재 값 */
export type ParameterValues = Record<string, number>;

/**
 * 현실 비유 앵커.
 *
 * 같은 수식 시각화 안에서 학습자가 익숙한 실제 사례(ISS 궤도, 커피 카페인 반감기 등)로
 * 점프할 수 있는 파라미터 스냅포인트. 앵커가 활성화되면 Visualizer는
 * 해당 파라미터 값으로 상태를 맞추고, 원한다면 앵커 ID에 따라 일러스트를 전환한다.
 */
export interface AnchorConfig {
  /** 앵커 고유 ID (예: "iss", "gps", "caffeine") */
  id: string;
  /** 표시 이름 (예: "ISS 궤도") */
  name: string;
  /** 선택용 아이콘/이모지 */
  icon?: string;
  /** 한 줄 부연 설명 */
  description?: string;
  /** 이 앵커가 대표하는 파라미터 값 (카탈로그 단위 기준) */
  params: ParameterValues;
}

/**
 * 프레임워크 → Visualizer 업데이트 컨텍스트.
 *
 * Visualizer는 자체 계산 로직을 가지지 않는다.
 * AST에서 파생된 모든 값을 프레임워크가 계산해 여기로 넘긴다.
 *
 * baseline은 발견적 학습 비교 시각화 용도로,
 * 학습자가 수식 구조(number 노드)를 변형했을 때 원본 카탈로그 식의 결과를
 * 같은 params로 평가한 값을 함께 전달한다. Visualizer는 baseline이 있고
 * isStandard가 false일 때 두 결과를 동시에 시각화할 수 있다.
 */
export interface VisualizerUpdate {
  /** 사용자 조정 파라미터 (카탈로그 parameterConfig 기준, 원본 단위) */
  params: ParameterValues;
  /** derivedValues[*].compute 결과 (id → 값). 이미 AST 평가 후 */
  derived: Record<string, number>;
  /** AST 방정식 우변 평가값 (참고용; derived에 이미 반영됨) */
  equationValue?: number;
  /**
   * 카탈로그 원본 식으로 같은 params에서 계산한 결과.
   * 구조 변경이 없으면 undefined.
   */
  baseline?: { derived: Record<string, number>; equationValue?: number };
  /** 현재 식이 카탈로그 원본과 구조적으로 같은가. */
  isStandard: boolean;
  /**
   * 현재 활성화된 앵커 ID. 사용자가 파라미터를 직접 조정해 앵커와
   * 일치하지 않게 되면 undefined. Visualizer는 이 값으로 일러스트를 분기할 수 있다.
   */
  activeAnchorId?: string;
}

// ─── 파생값 ───

/** compute 함수에 전달되는 컨텍스트 */
export interface ComputeContext {
  /** AST 방정식 우변의 평가 결과 (= 기준 RHS). AST가 없으면 undefined */
  equationValue?: number;
  /** 이전에 계산된 파생값 (순서대로 누적) */
  derived: Record<string, number>;
}

/** 수식에서 계산되는 파생값 (중간값 + 결과) */
export interface DerivedValue {
  id: string;
  label: string;
  unit?: string;
  format?: 'number' | 'time' | 'distance';
  /** 이 파생값이 대응하는 수식 변수명 (예: 'T'). 있으면 수식 옆에 값 표시 */
  formulaElement?: string;
  /** 파라미터 + AST 평가 컨텍스트 → 계산값 */
  compute: (params: ParameterValues, ctx?: ComputeContext) => number;
}

// ─── Visualizer 인터페이스 ───

/** 모든 Visualizer가 구현해야 하는 인터페이스 */
export interface FizzexVisualizer {
  /** 고유 ID (예: "kepler-orbit", "circle-area") */
  id: string;
  /** 표시 이름 */
  name: string;

  /** 이 Visualizer에 필요한 파라미터 정의 */
  parameters: ParameterConfig[];
  /** AST 평가용 물리 상수 (변수명 → 값). 수식에는 있지만 사용자가 조절하지 않는 값 */
  constants?: Record<string, number>;
  /** 파생값 정의 */
  derivedValues: DerivedValue[];

  /**
   * 현실 비유 앵커 목록. 정의되면 UI가 칩 버튼으로 렌더링한다.
   * 첫 번째 앵커가 마운트 직후의 초기 상태로 적용된다.
   */
  anchors?: AnchorConfig[];

  /** 초기화 — 컨테이너 안에 렌더링을 준비 */
  mount(container: HTMLElement, options: VisualizerMountOptions): void;
  /**
   * 상태 갱신 (프레임워크 → Visualizer).
   * params뿐 아니라 AST에서 파생된 값도 함께 전달된다.
   * Visualizer는 렌더링에만 집중하고 물리식을 재계산하지 않는다.
   */
  update(context: VisualizerUpdate): void;
  /** 크기 변경 */
  resize(width: number, height: number): void;
  /** 정리 */
  unmount(): void;

  /**
   * Visualizer에서 사용자 조작이 발생하면 프레임워크에 알린다.
   * (Visualizer → 프레임워크)
   */
  onParameterChange?: (callback: (paramId: string, value: number) => void) => void;
}

export interface VisualizerMountOptions {
  width: number;
  height: number;
  theme: 'light' | 'dark';
  locale: string;
}

// ─── 프레임워크 ↔ Visualizer 브릿지 ───

/** 양방향 통신 브릿지 인터페이스 */
export interface VisualizerBridge {
  /** 현재 파라미터 값 */
  getParams(): ParameterValues;
  /** 파라미터 변경 (양방향) */
  setParam(paramId: string, value: number, source: 'slider' | 'visualizer' | 'inline'): void;
  /** 파생값 계산 */
  getDerivedValues(): Record<string, number>;
  /**
   * 수식 AST 설정 (스테퍼 등으로 수식이 수정되었을 때).
   * `original` 인자가 주어지면 dual-AST 모드로 평가되어
   * VisualizerUpdate.baseline / isStandard 가 채워진다.
   * 미지정 시 working === original 로 간주 (구조 변경 없음).
   */
  setAst?(
    working: import('../types').RootNode | null,
    original?: import('../types').RootNode | null,
  ): void;
  /** 파라미터 변경 구독. 반환: unsubscribe 함수 */
  subscribe(listener: (params: ParameterValues, source: string) => void): () => void;

  /** 현재 활성 앵커 ID (없으면 null) */
  getActiveAnchorId(): string | null;
  /** 앵커 선택 — 해당 앵커 params로 파라미터를 일괄 적용한다 */
  setActiveAnchor(anchorId: string): void;
  /** 앵커 상태 변경 구독 */
  subscribeAnchor(listener: (anchorId: string | null) => void): () => void;

  /** 정리 */
  destroy(): void;
}
