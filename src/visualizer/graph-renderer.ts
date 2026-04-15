/**
 * Graph Renderer
 *
 * SceneSurface 기반 2D 함수 그래프 렌더러
 */

import type { GraphConfig, EvaluationPoint } from './types';
import { DEFAULT_GRAPH_CONFIG } from './types';
import type { SceneSurface } from '../canvas';

/**
 * 그래프 렌더러
 */
export class GraphRenderer {
  private surface: SceneSurface;
  private config: GraphConfig;

  constructor(surface: SceneSurface, config: Partial<GraphConfig> = {}) {
    this.surface = surface;
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
    this.surface.setFillStyle(backgroundColor || '#ffffff');
    this.surface.fillRect(0, 0, width, height);
  }

  /**
   * 그리드 그리기
   */
  private drawGrid(): void {
    if (!this.config.showGrid) return;

    const { width, height, range, gridColor } = this.config;
    this.surface.setStrokeStyle(gridColor || '#e5e7eb');
    this.surface.setLineWidth(0.5);

    // 적절한 그리드 간격 계산
    const xRange = range.xMax - range.xMin;
    const yRange = range.yMax - range.yMin;
    const xStep = this.calculateGridStep(xRange);
    const yStep = this.calculateGridStep(yRange);

    // 세로선 (X 그리드)
    const xStart = Math.ceil(range.xMin / xStep) * xStep;
    for (let x = xStart; x <= range.xMax; x += xStep) {
      const canvasX = this.toCanvasX(x);
      this.surface.beginPath();
      this.surface.moveTo(canvasX, 0);
      this.surface.lineTo(canvasX, height);
      this.surface.stroke();
    }

    // 가로선 (Y 그리드)
    const yStart = Math.ceil(range.yMin / yStep) * yStep;
    for (let y = yStart; y <= range.yMax; y += yStep) {
      const canvasY = this.toCanvasY(y);
      this.surface.beginPath();
      this.surface.moveTo(0, canvasY);
      this.surface.lineTo(width, canvasY);
      this.surface.stroke();
    }
  }

  /**
   * 축 그리기
   */
  private drawAxis(): void {
    if (!this.config.showAxis) return;

    const { width, height, range, axisColor } = this.config;
    this.surface.setStrokeStyle(axisColor || '#374151');
    this.surface.setLineWidth(1.5);

    // X축 (y=0)
    if (range.yMin <= 0 && range.yMax >= 0) {
      const y0 = this.toCanvasY(0);
      this.surface.beginPath();
      this.surface.moveTo(0, y0);
      this.surface.lineTo(width, y0);
      this.surface.stroke();

      // X축 화살표
      this.surface.beginPath();
      this.surface.moveTo(width - 10, y0 - 5);
      this.surface.lineTo(width, y0);
      this.surface.lineTo(width - 10, y0 + 5);
      this.surface.stroke();
    }

    // Y축 (x=0)
    if (range.xMin <= 0 && range.xMax >= 0) {
      const x0 = this.toCanvasX(0);
      this.surface.beginPath();
      this.surface.moveTo(x0, height);
      this.surface.lineTo(x0, 0);
      this.surface.stroke();

      // Y축 화살표
      this.surface.beginPath();
      this.surface.moveTo(x0 - 5, 10);
      this.surface.lineTo(x0, 0);
      this.surface.lineTo(x0 + 5, 10);
      this.surface.stroke();
    }
  }

  /**
   * 축 라벨 그리기
   */
  private drawLabels(): void {
    if (!this.config.showLabels) return;

    const { range, axisColor } = this.config;
    this.surface.setFillStyle(axisColor || '#374151');
    this.surface.setFont('12px sans-serif');
    this.surface.setTextAlign('center');

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
        this.surface.fillText(this.formatNumber(x), canvasX, y0 + 15);
      }
    }

    // Y축 라벨
    if (range.xMin <= 0 && range.xMax >= 0) {
      const x0 = this.toCanvasX(0);
      this.surface.setTextAlign('right');
      const yStart = Math.ceil(range.yMin / yStep) * yStep;
      for (let y = yStart; y <= range.yMax; y += yStep) {
        if (Math.abs(y) < 0.001) continue; // 0 스킵
        const canvasY = this.toCanvasY(y);
        this.surface.fillText(this.formatNumber(y), x0 - 5, canvasY + 4);
      }
    }

    // 원점 라벨
    if (range.xMin <= 0 && range.xMax >= 0 && range.yMin <= 0 && range.yMax >= 0) {
      const x0 = this.toCanvasX(0);
      const y0 = this.toCanvasY(0);
      this.surface.setTextAlign('right');
      this.surface.fillText('O', x0 - 5, y0 + 15);
    }
  }

  /**
   * 함수 그래프 그리기
   */
  drawFunction(points: EvaluationPoint[], color?: string): void {
    const { lineColor, lineWidth } = this.config;
    this.surface.setStrokeStyle(color || lineColor || '#3b82f6');
    this.surface.setLineWidth(lineWidth || 2);
    this.surface.setLineCap('round');
    this.surface.setLineJoin('round');

    let drawing = false;

    this.surface.beginPath();

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const canvasX = this.toCanvasX(point.x);
      const canvasY = this.toCanvasY(point.y);

      if (point.valid) {
        if (!drawing) {
          this.surface.moveTo(canvasX, canvasY);
          drawing = true;
        } else {
          this.surface.lineTo(canvasX, canvasY);
        }
      } else {
        // 불연속점에서 새로운 path 시작
        if (drawing) {
          this.surface.stroke();
          this.surface.beginPath();
          drawing = false;
        }
      }
    }

    if (drawing) {
      this.surface.stroke();
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
