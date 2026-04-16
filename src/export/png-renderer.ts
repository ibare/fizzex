/**
 * Fizzex PNG 익스포터
 *
 * 수식을 고해상도 PNG 이미지로 변환
 * 서버 사이드 렌더링 및 프린트/PDF 출력용
 */

import type { RootNode, EditorState } from '../types';
import type { Box, BoxRenderConfig } from '../box/types';
import { CanvasFontMetrics } from '../box/font-metrics';
import { astToBox } from '../box/ast-to-box';
import { layoutBox } from '../box/box-layout';
import { Projector } from '../box/projector';
import { loadMathFont, NEW_CM_MATH_CONFIG } from '../fonts';

/** PNG 렌더링 결과 */
export interface MathPNGResult {
  /** PNG 데이터 URL (data:image/png;base64,...) */
  dataUrl: string;
  /** CSS 픽셀 단위 너비 (원본 / scale) */
  width: number;
  /** CSS 픽셀 단위 높이 (원본 / scale) */
  height: number;
  /** 인라인 수식용: baseline 위치 (CSS 픽셀, 하단에서 위로) */
  baseline: number;
}

/** PNG 렌더링 옵션 */
export interface MathPNGOptions {
  /** 렌더링 스케일 (기본 3 = ~300 DPI) */
  scale?: number;
  /** 기본 폰트 크기 (px, 기본 20) */
  fontSize?: number;
  /** 텍스트 색상 (기본 '#000000') */
  color?: string;
  /** 배경색 (기본 'transparent') */
  backgroundColor?: string;
  /** 패딩 (CSS 픽셀, 기본 4) */
  padding?: number;
  /** 폰트 패밀리 (기본 New Computer Modern Math) */
  fontFamily?: string;
}

/** 기본 옵션 */
const DEFAULT_OPTIONS: Required<MathPNGOptions> = {
  scale: 3,
  fontSize: 20,
  color: '#000000',
  backgroundColor: 'transparent',
  padding: 4,
  fontFamily: NEW_CM_MATH_CONFIG.fontFamily,
};

/**
 * AST를 PNG로 렌더링
 *
 * @param ast 수식 AST (RootNode)
 * @param options 렌더링 옵션
 * @returns PNG 결과 (dataUrl, 크기, baseline)
 */
export function renderAstToPNG(
  ast: RootNode,
  options?: MathPNGOptions
): MathPNGResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { scale, fontSize, color, backgroundColor, padding, fontFamily } = opts;

  // Box 렌더링 설정
  const config: BoxRenderConfig = {
    baseFontSize: fontSize * scale,
    fontFamily,
    color,
    cursorColor: 'transparent',
    showPlaceholders: false,
  };

  // 오프스크린 캔버스 생성 (초기 크기, 나중에 조정)
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context를 생성할 수 없습니다.');
  }

  // 임시로 큰 캔버스 설정 (크기 계산용)
  canvas.width = 2000 * scale;
  canvas.height = 500 * scale;

  // 메트릭스 및 렌더러 초기화
  const metrics = new CanvasFontMetrics(ctx, config);

  // AST → Box 트리 변환
  const box = astToBox(ast, metrics, 1.0);

  // 레이아웃 계산 (패딩 적용)
  const paddingScaled = padding * scale;
  layoutBox(box, paddingScaled, paddingScaled + box.height);

  // 실제 필요한 크기 계산
  const contentWidth = box.width;
  const contentHeight = box.height + box.depth;
  const canvasWidth = Math.ceil(contentWidth + paddingScaled * 2);
  const canvasHeight = Math.ceil(contentHeight + paddingScaled * 2);

  // 캔버스 크기 재설정
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // 배경 그리기
  if (backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // 렌더러 재생성 (캔버스 리사이즈 후)
  const metricsNew = new CanvasFontMetrics(ctx, config);
  const renderer = new Projector(ctx, config, metricsNew);

  // Box를 다시 레이아웃 (새 캔버스 크기)
  const boxNew = astToBox(ast, metricsNew, 1.0);
  layoutBox(boxNew, paddingScaled, paddingScaled + boxNew.height);

  // 렌더링
  renderer.render(boxNew);

  // PNG 데이터 URL 생성
  const dataUrl = canvas.toDataURL('image/png');

  // baseline 계산 (하단에서 위로의 거리)
  // Box의 y는 baseline 위치, depth는 baseline 아래 영역
  const baselineFromBottom = boxNew.depth + paddingScaled;

  return {
    dataUrl,
    width: canvasWidth / scale,
    height: canvasHeight / scale,
    baseline: baselineFromBottom / scale,
  };
}

/**
 * EditorState를 PNG로 렌더링
 *
 * @param state 에디터 상태
 * @param options 렌더링 옵션
 * @returns PNG 결과
 */
export function renderStateToPNG(
  state: EditorState,
  options?: MathPNGOptions
): MathPNGResult {
  return renderAstToPNG(state.ast, options);
}

/**
 * LaTeX 문자열을 PNG로 렌더링
 *
 * @param latex LaTeX 문자열
 * @param options 렌더링 옵션
 * @returns PNG 결과
 */
export async function renderLatexToPNG(
  latex: string,
  options?: MathPNGOptions
): Promise<MathPNGResult> {
  // LaTeX 파서 동적 임포트 (번들 크기 최적화)
  const { parseLatex } = await import('../latex');
  const { ast } = parseLatex(latex);
  return renderAstToPNG(ast, options);
}

/**
 * vertical-align CSS 값 계산
 *
 * 인라인 수식에서 텍스트 baseline과 정렬하기 위한 값
 *
 * @param result PNG 렌더링 결과
 * @returns vertical-align CSS 값 (예: '-3px')
 */
export function calculateVerticalAlign(result: MathPNGResult): string {
  // baseline이 이미지 하단에서 위로 몇 px인지
  // vertical-align은 baseline 아래로 내려갈 양 (음수 = 아래로)
  const offset = result.baseline - result.height;
  return `${Math.round(offset)}px`;
}

/**
 * 서버 사이드 렌더링용 PNG 익스포터
 *
 * Node.js 환경에서 Canvas 폴리필(node-canvas)과 함께 사용
 *
 * @param ast 수식 AST
 * @param canvas Canvas 인스턴스 (node-canvas에서 제공)
 * @param options 렌더링 옵션
 * @returns PNG 결과
 */
export function renderAstToPNGWithCanvas(
  ast: RootNode,
  canvas: HTMLCanvasElement,
  options?: MathPNGOptions
): MathPNGResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { scale, fontSize, color, backgroundColor, padding, fontFamily } = opts;

  const config: BoxRenderConfig = {
    baseFontSize: fontSize * scale,
    fontFamily,
    color,
    cursorColor: 'transparent',
    showPlaceholders: false,
  };

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context를 생성할 수 없습니다.');
  }

  // 임시 크기로 메트릭스 계산
  canvas.width = 2000 * scale;
  canvas.height = 500 * scale;

  const metrics = new CanvasFontMetrics(ctx, config);
  const box = astToBox(ast, metrics, 1.0);

  const paddingScaled = padding * scale;
  layoutBox(box, paddingScaled, paddingScaled + box.height);

  const contentWidth = box.width;
  const contentHeight = box.height + box.depth;
  const canvasWidth = Math.ceil(contentWidth + paddingScaled * 2);
  const canvasHeight = Math.ceil(contentHeight + paddingScaled * 2);

  // 캔버스 리사이즈
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // 배경
  if (backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // 다시 렌더링
  const metricsNew = new CanvasFontMetrics(ctx, config);
  const boxNew = astToBox(ast, metricsNew, 1.0);
  layoutBox(boxNew, paddingScaled, paddingScaled + boxNew.height);

  const renderer = new Projector(ctx, config, metricsNew);
  renderer.render(boxNew);

  const dataUrl = canvas.toDataURL('image/png');
  const baselineFromBottom = boxNew.depth + paddingScaled;

  return {
    dataUrl,
    width: canvasWidth / scale,
    height: canvasHeight / scale,
    baseline: baselineFromBottom / scale,
  };
}

/**
 * 폰트 로드 상태 확인 및 대기
 *
 * PNG 렌더링 전 폰트가 로드되었는지 확인
 */
export async function ensureFontsLoaded(): Promise<void> {
  await loadMathFont();
}
