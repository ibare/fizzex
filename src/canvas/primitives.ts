/**
 * 차트 프리미티브 — stateless 시각화 유틸리티 함수
 *
 * 씬 그래프 없이도 독립 사용 가능한 Canvas 그리기 헬퍼.
 * 모든 함수는 SceneSurface를 통해 그리므로 MockSceneSurface로 테스트 가능.
 */

import type { SceneSurface } from './scene-surface';

// ── 스타일 타입 ──

export interface AxisStyle {
  color?: string;
  lineWidth?: number;
  arrowSize?: number;
}

export interface GridStyle {
  color?: string;
  lineWidth?: number;
}

export interface ArrowStyle {
  color?: string;
  lineWidth?: number;
  headSize?: number;
}

export interface DashedLineStyle {
  color?: string;
  lineWidth?: number;
  dash?: number[];
}

export interface LabelStyle {
  font?: string;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
}

export interface DotStyle {
  color?: string;
  filled?: boolean;
}

// ── HiDPI ──

/**
 * HiDPI Canvas 설정 — C4 패턴 준수
 *
 * canvas.width = cssWidth * dpr; ctx.scale(dpr, dpr)
 */
export function setupHiDPI(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): { ctx: CanvasRenderingContext2D; dpr: number } {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  return { ctx, dpr };
}

// ── 축 ──

const DEFAULT_AXIS: Required<AxisStyle> = {
  color: '#374151',
  lineWidth: 1.5,
  arrowSize: 5,
};

/**
 * 축 그리기 (선 + 끝점 화살표)
 *
 * (x1,y1)에서 (x2,y2)로 향하는 직선을 그리고,
 * arrowSize > 0이면 (x2,y2) 쪽에 화살촉을 추가한다.
 */
export function drawAxis(
  s: SceneSurface,
  x1: number, y1: number,
  x2: number, y2: number,
  style?: AxisStyle,
): void {
  const { color, lineWidth, arrowSize } = { ...DEFAULT_AXIS, ...style };

  s.save();
  s.setStrokeStyle(color);
  s.setLineWidth(lineWidth);
  s.setLineCap('round');

  // 축 선
  s.beginPath();
  s.moveTo(x1, y1);
  s.lineTo(x2, y2);
  s.stroke();

  // 화살촉
  if (arrowSize > 0) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const spread = Math.PI / 6;

    s.setFillStyle(color);
    s.beginPath();
    s.moveTo(x2, y2);
    s.lineTo(
      x2 - arrowSize * Math.cos(angle - spread),
      y2 - arrowSize * Math.sin(angle - spread),
    );
    s.lineTo(
      x2 - arrowSize * Math.cos(angle + spread),
      y2 - arrowSize * Math.sin(angle + spread),
    );
    s.closePath();
    s.fill();
  }

  s.restore();
}

// ── 직교 그리드 ──

const DEFAULT_GRID: Required<GridStyle> = {
  color: '#e5e7eb',
  lineWidth: 0.5,
};

/**
 * 직교 그리드
 *
 * (x, y)에서 (x+w, y+h) 영역에 xStep/yStep 간격으로 격자선을 그린다.
 */
export function drawCartesianGrid(
  s: SceneSurface,
  x: number, y: number,
  w: number, h: number,
  xStep: number, yStep: number,
  style?: GridStyle,
): void {
  const { color, lineWidth } = { ...DEFAULT_GRID, ...style };
  if (xStep <= 0 || yStep <= 0) return;

  s.save();
  s.setStrokeStyle(color);
  s.setLineWidth(lineWidth);

  // 수직선
  s.beginPath();
  for (let gx = x + xStep; gx < x + w; gx += xStep) {
    s.moveTo(gx, y);
    s.lineTo(gx, y + h);
  }
  // 수평선
  for (let gy = y + yStep; gy < y + h; gy += yStep) {
    s.moveTo(x, gy);
    s.lineTo(x + w, gy);
  }
  s.stroke();
  s.restore();
}

// ── 극좌표 그리드 ──

/**
 * 극좌표 그리드 (동심원 + 방사형 선)
 */
export function drawPolarGrid(
  s: SceneSurface,
  cx: number, cy: number,
  maxRadius: number,
  circleCount: number,
  rayCount: number,
  style?: GridStyle,
): void {
  const { color, lineWidth } = { ...DEFAULT_GRID, ...style };
  if (circleCount <= 0 || maxRadius <= 0) return;

  s.save();
  s.setStrokeStyle(color);
  s.setLineWidth(lineWidth);

  // 동심원
  const rStep = maxRadius / circleCount;
  for (let i = 1; i <= circleCount; i++) {
    s.beginPath();
    s.arc(cx, cy, rStep * i, 0, Math.PI * 2);
    s.stroke();
  }

  // 방사형 선
  if (rayCount > 0) {
    const angleStep = (Math.PI * 2) / rayCount;
    s.beginPath();
    for (let i = 0; i < rayCount; i++) {
      const angle = angleStep * i;
      s.moveTo(cx, cy);
      s.lineTo(
        cx + maxRadius * Math.cos(angle),
        cy + maxRadius * Math.sin(angle),
      );
    }
    s.stroke();
  }

  s.restore();
}

// ── 화살표 ──

const DEFAULT_ARROW: Required<ArrowStyle> = {
  color: '#374151',
  lineWidth: 1.5,
  headSize: 8,
};

/**
 * 화살표 (선 + 삼각형 화살촉)
 */
export function drawArrow(
  s: SceneSurface,
  x1: number, y1: number,
  x2: number, y2: number,
  style?: ArrowStyle,
): void {
  const { color, lineWidth, headSize } = { ...DEFAULT_ARROW, ...style };
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const spread = Math.PI / 7;

  s.save();
  s.setStrokeStyle(color);
  s.setFillStyle(color);
  s.setLineWidth(lineWidth);
  s.setLineCap('round');

  // 선
  s.beginPath();
  s.moveTo(x1, y1);
  s.lineTo(x2, y2);
  s.stroke();

  // 화살촉
  s.beginPath();
  s.moveTo(x2, y2);
  s.lineTo(
    x2 - headSize * Math.cos(angle - spread),
    y2 - headSize * Math.sin(angle - spread),
  );
  s.lineTo(
    x2 - headSize * Math.cos(angle + spread),
    y2 - headSize * Math.sin(angle + spread),
  );
  s.closePath();
  s.fill();

  s.restore();
}

// ── 점선 ──

const DEFAULT_DASHED: Required<DashedLineStyle> = {
  color: '#9ca3af',
  lineWidth: 1,
  dash: [4, 4],
};

/**
 * 점선
 */
export function drawDashedLine(
  s: SceneSurface,
  x1: number, y1: number,
  x2: number, y2: number,
  style?: DashedLineStyle,
): void {
  const { color, lineWidth, dash } = { ...DEFAULT_DASHED, ...style };

  s.save();
  s.setStrokeStyle(color);
  s.setLineWidth(lineWidth);
  s.setLineDash(dash);

  s.beginPath();
  s.moveTo(x1, y1);
  s.lineTo(x2, y2);
  s.stroke();

  s.setLineDash([]);
  s.restore();
}

// ── 텍스트 라벨 ──

const DEFAULT_LABEL: Required<LabelStyle> = {
  font: '12px -apple-system, BlinkMacSystemFont, sans-serif',
  color: '#374151',
  align: 'center',
  baseline: 'middle',
};

/**
 * 텍스트 라벨
 */
export function drawLabel(
  s: SceneSurface,
  text: string,
  x: number, y: number,
  style?: LabelStyle,
): void {
  const { font, color, align, baseline } = { ...DEFAULT_LABEL, ...style };

  s.save();
  s.setFont(font);
  s.setFillStyle(color);
  s.setTextAlign(align);
  s.setTextBaseline(baseline);
  s.fillText(text, x, y);
  s.restore();
}

// ── 원형 점 ──

const DEFAULT_DOT: Required<DotStyle> = {
  color: '#3b82f6',
  filled: true,
};

/**
 * 원형 점 (filled 또는 hollow)
 */
export function drawDot(
  s: SceneSurface,
  x: number, y: number,
  radius: number,
  style?: DotStyle,
): void {
  const { color, filled } = { ...DEFAULT_DOT, ...style };

  s.save();
  s.beginPath();
  s.arc(x, y, radius, 0, Math.PI * 2);

  if (filled) {
    s.setFillStyle(color);
    s.fill();
  } else {
    s.setStrokeStyle(color);
    s.setLineWidth(1.5);
    s.stroke();
  }

  s.restore();
}
