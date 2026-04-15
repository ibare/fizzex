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

// ─── 프리셋 ───

/** 의미 있는 파라미터 조합 */
export interface Preset {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  values: ParameterValues;
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
  /** 프리셋 목록 */
  presets: Preset[];

  /** 초기화 — 컨테이너 안에 렌더링을 준비 */
  mount(container: HTMLElement, options: VisualizerMountOptions): void;
  /** 파라미터 변경 (프레임워크 → Visualizer) */
  update(params: ParameterValues): void;
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
  setParam(paramId: string, value: number, source: 'slider' | 'preset' | 'visualizer' | 'inline'): void;
  /** 파생값 계산 */
  getDerivedValues(): Record<string, number>;
  /** 수식 AST 설정 (스테퍼 등으로 수식이 수정되었을 때) */
  setAst?(ast: import('../types').RootNode | null): void;
  /** 파라미터 변경 구독. 반환: unsubscribe 함수 */
  subscribe(listener: (params: ParameterValues, source: string) => void): () => void;
  /** 정리 */
  destroy(): void;
}
