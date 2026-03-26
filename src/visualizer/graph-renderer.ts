/**
 * Graph Renderer
 *
 * Canvas 기반 2D 함수 그래프 렌더러
 */

import type { GraphConfig, GraphRange, EvaluationPoint } from './types';
import { DEFAULT_GRAPH_CONFIG } from './types';

/**
 * 그래프 렌더러
 */
export class GraphRenderer {
  private ctx: CanvasRenderingContext2D;
  private config: GraphConfig;

  constructor(ctx: CanvasRenderingContext2D, config: Partial<GraphConfig> = {}) {
    this.ctx = ctx;
    this.config = { ...DEFAULT_GRAPH_CONFIG, ...config };
  }

  /**
   * 설정 업데이트
   */
  setConfig(config: Partial<GraphConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 수학 좌표를 캔버스 좌표로 변환
   */
  private toCanvasX(x: number): number {
    const { width, range } = this.config;
    return ((x - range.xMin) / (range.xMax - range.xMin)) * width;
  }

  private toCanvasY(y: number): number {
    const { height, range } = this.config;
    // Y축은 위아래가 반전됨
    return height - ((y - range.yMin) / (range.yMax - range.yMin)) * height;
  }

  /**
   * 배경 그리기
   */
  private drawBackground(): void {
    const { width, height, backgroundColor } = this.config;
    this.ctx.fillStyle = backgroundColor || '#ffffff';
    this.ctx.fillRect(0, 0, width, height);
  }

  /**
   * 그리드 그리기
   */
  private drawGrid(): void {
    if (!this.config.showGrid) return;

    const { width, height, range, gridColor } = this.config;
    this.ctx.strokeStyle = gridColor || '#e5e7eb';
    this.ctx.lineWidth = 0.5;

    // 적절한 그리드 간격 계산
    const xRange = range.xMax - range.xMin;
    const yRange = range.yMax - range.yMin;
    const xStep = this.calculateGridStep(xRange);
    const yStep = this.calculateGridStep(yRange);

    // 세로선 (X 그리드)
    const xStart = Math.ceil(range.xMin / xStep) * xStep;
    for (let x = xStart; x <= range.xMax; x += xStep) {
      const canvasX = this.toCanvasX(x);
      this.ctx.beginPath();
      this.ctx.moveTo(canvasX, 0);
      this.ctx.lineTo(canvasX, height);
      this.ctx.stroke();
    }

    // 가로선 (Y 그리드)
    const yStart = Math.ceil(range.yMin / yStep) * yStep;
    for (let y = yStart; y <= range.yMax; y += yStep) {
      const canvasY = this.toCanvasY(y);
      this.ctx.beginPath();
      this.ctx.moveTo(0, canvasY);
      this.ctx.lineTo(width, canvasY);
      this.ctx.stroke();
    }
  }

  /**
   * 축 그리기
   */
  private drawAxis(): void {
    if (!this.config.showAxis) return;

    const { width, height, range, axisColor } = this.config;
    this.ctx.strokeStyle = axisColor || '#374151';
    this.ctx.lineWidth = 1.5;

    // X축 (y=0)
    if (range.yMin <= 0 && range.yMax >= 0) {
      const y0 = this.toCanvasY(0);
      this.ctx.beginPath();
      this.ctx.moveTo(0, y0);
      this.ctx.lineTo(width, y0);
      this.ctx.stroke();

      // X축 화살표
      this.ctx.beginPath();
      this.ctx.moveTo(width - 10, y0 - 5);
      this.ctx.lineTo(width, y0);
      this.ctx.lineTo(width - 10, y0 + 5);
      this.ctx.stroke();
    }

    // Y축 (x=0)
    if (range.xMin <= 0 && range.xMax >= 0) {
      const x0 = this.toCanvasX(0);
      this.ctx.beginPath();
      this.ctx.moveTo(x0, height);
      this.ctx.lineTo(x0, 0);
      this.ctx.stroke();

      // Y축 화살표
      this.ctx.beginPath();
      this.ctx.moveTo(x0 - 5, 10);
      this.ctx.lineTo(x0, 0);
      this.ctx.lineTo(x0 + 5, 10);
      this.ctx.stroke();
    }
  }

  /**
   * 축 라벨 그리기
   */
  private drawLabels(): void {
    if (!this.config.showLabels) return;

    const { range, axisColor } = this.config;
    this.ctx.fillStyle = axisColor || '#374151';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';

    const xRange = range.xMax - range.xMin;
    const yRange = range.yMax - range.yMin;
    const xStep = this.calculateGridStep(xRange);
    const yStep = this.calculateGridStep(yRange);

    // X축 라벨
    if (range.yMin <= 0 && range.yMax >= 0) {
      const y0 = this.toCanvasY(0);
      const xStart = Math.ceil(range.xMin / xStep) * xStep;
      for (let x = xStart; x <= range.xMax; x += xStep) {
        if (Math.abs(x) < 0.001) continue; // 0 스킵
        const canvasX = this.toCanvasX(x);
        this.ctx.fillText(this.formatNumber(x), canvasX, y0 + 15);
      }
    }

    // Y축 라벨
    if (range.xMin <= 0 && range.xMax >= 0) {
      const x0 = this.toCanvasX(0);
      this.ctx.textAlign = 'right';
      const yStart = Math.ceil(range.yMin / yStep) * yStep;
      for (let y = yStart; y <= range.yMax; y += yStep) {
        if (Math.abs(y) < 0.001) continue; // 0 스킵
        const canvasY = this.toCanvasY(y);
        this.ctx.fillText(this.formatNumber(y), x0 - 5, canvasY + 4);
      }
    }

    // 원점 라벨
    if (range.xMin <= 0 && range.xMax >= 0 && range.yMin <= 0 && range.yMax >= 0) {
      const x0 = this.toCanvasX(0);
      const y0 = this.toCanvasY(0);
      this.ctx.textAlign = 'right';
      this.ctx.fillText('O', x0 - 5, y0 + 15);
    }
  }

  /**
   * 함수 그래프 그리기
   */
  drawFunction(points: EvaluationPoint[], color?: string): void {
    const { lineColor, lineWidth } = this.config;
    this.ctx.strokeStyle = color || lineColor || '#3b82f6';
    this.ctx.lineWidth = lineWidth || 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    let drawing = false;

    this.ctx.beginPath();

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const canvasX = this.toCanvasX(point.x);
      const canvasY = this.toCanvasY(point.y);

      if (point.valid) {
        if (!drawing) {
          this.ctx.moveTo(canvasX, canvasY);
          drawing = true;
        } else {
          this.ctx.lineTo(canvasX, canvasY);
        }
      } else {
        // 불연속점에서 새로운 path 시작
        if (drawing) {
          this.ctx.stroke();
          this.ctx.beginPath();
          drawing = false;
        }
      }
    }

    if (drawing) {
      this.ctx.stroke();
    }
  }

  /**
   * 전체 그래프 렌더링
   */
  render(pointsList: EvaluationPoint[][], colors?: string[]): void {
    this.drawBackground();
    this.drawGrid();
    this.drawAxis();
    this.drawLabels();

    // 여러 함수 그리기
    pointsList.forEach((points, index) => {
      const color = colors?.[index];
      this.drawFunction(points, color);
    });
  }

  /**
   * 단일 함수 렌더링 (편의 메서드)
   */
  renderSingle(points: EvaluationPoint[], color?: string): void {
    this.render([points], color ? [color] : undefined);
  }

  /**
   * 그리드 간격 계산
   */
  private calculateGridStep(range: number): number {
    const targetSteps = 10;
    const rawStep = range / targetSteps;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;

    let step: number;
    if (normalized < 1.5) {
      step = magnitude;
    } else if (normalized < 3) {
      step = 2 * magnitude;
    } else if (normalized < 7) {
      step = 5 * magnitude;
    } else {
      step = 10 * magnitude;
    }

    return step;
  }

  /**
   * 숫자 포맷팅
   */
  private formatNumber(n: number): string {
    if (Math.abs(n) >= 1000 || (Math.abs(n) < 0.01 && n !== 0)) {
      return n.toExponential(1);
    }
    // 소수점 이하 불필요한 0 제거
    return parseFloat(n.toPrecision(4)).toString();
  }
}
