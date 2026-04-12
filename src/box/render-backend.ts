/**
 * 렌더링 백엔드 추상화
 *
 * Canvas 의존성을 분리하여 테스트 가능성 향상
 */

/** 렌더링 백엔드 인터페이스 */
export interface RenderBackend {
  // 상태 관리
  save(): void;
  restore(): void;

  // 스타일 속성
  setFont(font: string): void;
  setFillStyle(style: string): void;
  setStrokeStyle(style: string): void;
  setTextBaseline(baseline: CanvasTextBaseline): void;
  setLineWidth(width: number): void;
  setLineCap(cap: CanvasLineCap): void;
  setLineJoin(join: CanvasLineJoin): void;
  setGlobalAlpha(alpha: number): void;
  getGlobalAlpha(): number;
  setLineDash(segments: number[]): void;

  // 변환
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void;

  // 텍스트 렌더링
  fillText(text: string, x: number, y: number): void;

  // 도형 렌더링
  fillRect(x: number, y: number, width: number, height: number): void;
  strokeRect(x: number, y: number, width: number, height: number): void;

  // 경로 작업
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
  fill(): void;
  stroke(): void;
}

/** Canvas 기반 렌더 백엔드 구현 */
export class CanvasRenderBackend implements RenderBackend {
  constructor(private ctx: CanvasRenderingContext2D) {}

  save(): void {
    this.ctx.save();
  }

  restore(): void {
    this.ctx.restore();
  }

  setFont(font: string): void {
    this.ctx.font = font;
  }

  setFillStyle(style: string): void {
    this.ctx.fillStyle = style;
  }

  setStrokeStyle(style: string): void {
    this.ctx.strokeStyle = style;
  }

  setTextBaseline(baseline: CanvasTextBaseline): void {
    this.ctx.textBaseline = baseline;
  }

  setLineWidth(width: number): void {
    this.ctx.lineWidth = width;
  }

  setLineCap(cap: CanvasLineCap): void {
    this.ctx.lineCap = cap;
  }

  setLineJoin(join: CanvasLineJoin): void {
    this.ctx.lineJoin = join;
  }

  setGlobalAlpha(alpha: number): void {
    this.ctx.globalAlpha = alpha;
  }

  getGlobalAlpha(): number {
    return this.ctx.globalAlpha;
  }

  setLineDash(segments: number[]): void {
    this.ctx.setLineDash(segments);
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.ctx.transform(a, b, c, d, e, f);
  }

  fillText(text: string, x: number, y: number): void {
    this.ctx.fillText(text, x, y);
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.ctx.fillRect(x, y, width, height);
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this.ctx.strokeRect(x, y, width, height);
  }

  beginPath(): void {
    this.ctx.beginPath();
  }

  closePath(): void {
    this.ctx.closePath();
  }

  moveTo(x: number, y: number): void {
    this.ctx.moveTo(x, y);
  }

  lineTo(x: number, y: number): void {
    this.ctx.lineTo(x, y);
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.ctx.quadraticCurveTo(cpx, cpy, x, y);
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
  }

  fill(): void {
    this.ctx.fill();
  }

  stroke(): void {
    this.ctx.stroke();
  }

  /** 원본 Canvas 컨텍스트 접근 (특수 케이스용) */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
}

/** 렌더링 호출 기록 타입 */
export interface RenderCall {
  method: string;
  args: unknown[];
}

/** 테스트용 Mock 렌더 백엔드 */
export class MockRenderBackend implements RenderBackend {
  /** 모든 렌더링 호출 기록 */
  readonly calls: RenderCall[] = [];

  /** 현재 상태 (검증용) */
  private stateStack: Array<{
    font: string;
    fillStyle: string;
    strokeStyle: string;
    textBaseline: CanvasTextBaseline;
    lineWidth: number;
    lineCap: CanvasLineCap;
    lineJoin: CanvasLineJoin;
    globalAlpha: number;
    lineDash: number[];
  }> = [];

  private currentState = {
    font: '16px serif',
    fillStyle: '#000000',
    strokeStyle: '#000000',
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    lineWidth: 1,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
    globalAlpha: 1,
    lineDash: [] as number[],
  };

  private record(method: string, ...args: unknown[]): void {
    this.calls.push({ method, args });
  }

  save(): void {
    this.record('save');
    this.stateStack.push({ ...this.currentState, lineDash: [...this.currentState.lineDash] });
  }

  restore(): void {
    this.record('restore');
    const state = this.stateStack.pop();
    if (state) {
      this.currentState = state;
    }
  }

  setFont(font: string): void {
    this.record('setFont', font);
    this.currentState.font = font;
  }

  setFillStyle(style: string): void {
    this.record('setFillStyle', style);
    this.currentState.fillStyle = style;
  }

  setStrokeStyle(style: string): void {
    this.record('setStrokeStyle', style);
    this.currentState.strokeStyle = style;
  }

  setTextBaseline(baseline: CanvasTextBaseline): void {
    this.record('setTextBaseline', baseline);
    this.currentState.textBaseline = baseline;
  }

  setLineWidth(width: number): void {
    this.record('setLineWidth', width);
    this.currentState.lineWidth = width;
  }

  setLineCap(cap: CanvasLineCap): void {
    this.record('setLineCap', cap);
    this.currentState.lineCap = cap;
  }

  setLineJoin(join: CanvasLineJoin): void {
    this.record('setLineJoin', join);
    this.currentState.lineJoin = join;
  }

  setGlobalAlpha(alpha: number): void {
    this.record('setGlobalAlpha', alpha);
    this.currentState.globalAlpha = alpha;
  }

  getGlobalAlpha(): number {
    return this.currentState.globalAlpha;
  }

  setLineDash(segments: number[]): void {
    this.record('setLineDash', segments);
    this.currentState.lineDash = [...segments];
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.record('transform', a, b, c, d, e, f);
  }

  fillText(text: string, x: number, y: number): void {
    this.record('fillText', text, x, y);
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.record('fillRect', x, y, width, height);
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this.record('strokeRect', x, y, width, height);
  }

  beginPath(): void {
    this.record('beginPath');
  }

  closePath(): void {
    this.record('closePath');
  }

  moveTo(x: number, y: number): void {
    this.record('moveTo', x, y);
  }

  lineTo(x: number, y: number): void {
    this.record('lineTo', x, y);
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.record('quadraticCurveTo', cpx, cpy, x, y);
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    this.record('bezierCurveTo', cp1x, cp1y, cp2x, cp2y, x, y);
  }

  fill(): void {
    this.record('fill');
  }

  stroke(): void {
    this.record('stroke');
  }

  /** 호출 기록 초기화 */
  clear(): void {
    this.calls.length = 0;
  }

  /** 특정 메서드 호출 횟수 */
  countCalls(method: string): number {
    return this.calls.filter(c => c.method === method).length;
  }

  /** 특정 메서드 호출 여부 */
  hasCalled(method: string): boolean {
    return this.calls.some(c => c.method === method);
  }

  /** 특정 메서드의 마지막 호출 인자 */
  getLastCallArgs(method: string): unknown[] | undefined {
    const lastCall = [...this.calls].reverse().find(c => c.method === method);
    return lastCall?.args;
  }

  /** 현재 상태 조회 (테스트 검증용) */
  getState() {
    return { ...this.currentState };
  }
}
