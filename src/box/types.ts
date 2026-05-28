import type { ConfidenceIndicatorConfig } from './confidence-indicator.js';

/**
 * Box 모델 타입 정의
 *
 * TeX의 박스 모델을 참고한 레이아웃 시스템
 * 모든 수식 요소는 Box로 표현되며, Box는 width, height, depth를 가짐
 *
 * height: baseline 위쪽 높이
 * depth: baseline 아래쪽 깊이
 * 전체 높이 = height + depth
 */

/** Box 타입 */
export type BoxType =
  | 'hbox'    // 가로 나열 (baseline 정렬)
  | 'vbox'    // 세로 나열
  | 'glyph'   // 단일 문자/기호
  | 'rule'    // 선 (분수선 등)
  | 'kern'    // 간격 (spacing)
  | 'surd'    // 제곱근 (√ + vinculum)
  | 'path';   // 경로 기반 글리프 (베지어 커브)

/** 기본 Box 인터페이스 */
export interface BoxBase {
  type: BoxType;
  /** 너비 */
  width: number;
  /** baseline 위쪽 높이 */
  height: number;
  /** baseline 아래쪽 깊이 */
  depth: number;
  /** 렌더링 x 좌표 */
  x: number;
  /** 렌더링 y 좌표 (baseline 위치) */
  y: number;
  /** baseline 이동량 (음수 = 위로 이동, 지수 등에 사용) */
  shift?: number;
  /** 원본 AST 노드 ID (커서 매핑용) */
  sourceId?: string;
}

/** Glyph Box - 단일 문자 */
export interface GlyphBox extends BoxBase {
  type: 'glyph';
  /** 표시할 문자 */
  char: string;
  /** 이탤릭 여부 */
  italic: boolean;
  /** 폰트 크기 (상대값, 1.0 = 기본) */
  fontSize: number;
}

/** HBox - 가로 나열 */
export interface HBox extends BoxBase {
  type: 'hbox';
  /** 자식 Box들 */
  children: Box[];
}

/** VBox - 세로 나열 */
export interface VBox extends BoxBase {
  type: 'vbox';
  /** 자식 Box들 */
  children: Box[];
  /**
   * baseline 설정 방식
   * - 'top': 첫 번째 자식의 baseline
   * - 'center': 중앙 (분수용)
   * - 'bottom': 마지막 자식의 baseline
   * - number: 위에서부터 해당 인덱스 자식의 baseline
   */
  baselineType: 'top' | 'center' | 'bottom' | number;
}

/** Rule Box - 선 */
export interface RuleBox extends BoxBase {
  type: 'rule';
  /** 선 두께 */
  thickness: number;
}

/** Kern Box - 간격 */
export interface KernBox extends BoxBase {
  type: 'kern';
  // width만 사용, height/depth는 0
}

/** Surd Box - 제곱근 (√ + vinculum) */
export interface SurdBox extends BoxBase {
  type: 'surd';
  /** 내용물 Box */
  content: Box;
  /** n차 근호 인덱스 (예: ³√ 의 3) */
  index?: Box;
  /** vinculum(가로선) 두께 */
  ruleThickness: number;
  /** √ 기호와 내용물 사이 간격 */
  gap: number;
  /** 실제 폰트 크기 (em→px 변환용) */
  actualFontSize: number;
}

/** Path Box - 경로 기반 글리프 렌더링 (베지어 커브) */
export interface PathBox extends BoxBase {
  type: 'path';
  /** 경로 데이터 키 (DELIMITER_PATHS 참조용) */
  pathChar: string;
  /** 크기 변형 인덱스 (-1 = base, 0~ = variants[]) */
  variantIndex: number;
  /** 렌더링 폭 (px) */
  targetWidth: number;
}

/** 모든 Box 타입 */
export type Box = GlyphBox | HBox | VBox | RuleBox | KernBox | SurdBox | PathBox;

/** Placeholder 렌더링 설정 */
export interface PlaceholderConfig {
  /** 배경색 */
  backgroundColor: string;
  /** 테두리 색 */
  borderColor: string;
  /** 테두리 두께 */
  borderWidth: number;
  /** 모서리 반경 */
  borderRadius: number;
  /** 현재 투명도 (애니메이션용, 0~1) */
  opacity?: number;
}

/** 렌더링 설정 */
export interface BoxRenderConfig {
  /** 기본 폰트 크기 (px) */
  baseFontSize: number;
  /** 폰트 패밀리 */
  fontFamily: string;
  /** 텍스트 색상 */
  color: string;
  /** 커서 색상 */
  cursorColor: string;
  /** 표시 모드 (display: 독립 수식, inline: 본문 내 수식) */
  displayMode?: 'display' | 'inline';
  /** Placeholder 설정 (선택적) */
  placeholder?: PlaceholderConfig;
  /** 빈 영역 Placeholder 표시 여부 (편집 모드에서만 true) */
  showPlaceholders?: boolean;
  /** Confidence 오버레이 설정 (없으면 오버레이 비활성) */
  confidence?: Partial<ConfidenceIndicatorConfig>;
}

/** 폰트 메트릭스 (문자 측정용) */
export interface FontMetrics {
  /** 문자 너비 측정 */
  measureWidth(char: string, fontSize: number, italic: boolean): number;
  /** 폰트의 height (baseline 위) */
  getHeight(fontSize: number): number;
  /** 폰트의 depth (baseline 아래) */
  getDepth(fontSize: number): number;
}
