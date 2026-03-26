/**
 * Fizzex Visualizer 타입 정의
 */

/**
 * 그래프 범위
 */
export interface GraphRange {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/**
 * 그래프 설정
 */
export interface GraphConfig {
  /** 캔버스 너비 */
  width: number;
  /** 캔버스 높이 */
  height: number;
  /** 그래프 범위 */
  range: GraphRange;
  /** 배경색 */
  backgroundColor?: string;
  /** 축 색상 */
  axisColor?: string;
  /** 그리드 색상 */
  gridColor?: string;
  /** 함수 선 색상 */
  lineColor?: string;
  /** 함수 선 두께 */
  lineWidth?: number;
  /** 그리드 표시 여부 */
  showGrid?: boolean;
  /** 축 표시 여부 */
  showAxis?: boolean;
  /** 축 라벨 표시 여부 */
  showLabels?: boolean;
}

/**
 * 기본 그래프 설정
 */
export const DEFAULT_GRAPH_CONFIG: GraphConfig = {
  width: 400,
  height: 300,
  range: {
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10,
  },
  backgroundColor: '#ffffff',
  axisColor: '#374151',
  gridColor: '#e5e7eb',
  lineColor: '#3b82f6',
  lineWidth: 2,
  showGrid: true,
  showAxis: true,
  showLabels: true,
};

/**
 * 함수 평가 결과
 */
export interface EvaluationPoint {
  x: number;
  y: number;
  valid: boolean;
}

/**
 * 그래프 데이터
 */
export interface GraphData {
  /** 함수 표현식 (LaTeX) */
  expression: string;
  /** 평가된 점들 */
  points: EvaluationPoint[];
  /** 변수명 (기본: x) */
  variable: string;
}
