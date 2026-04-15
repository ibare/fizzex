/**
 * SceneSurface — Surface 확장 인터페이스
 *
 * 기존 Surface(Box 렌더링 전용)에 시각화/애니메이션에 필요한
 * Canvas API(arc, clip, measureText 등)를 추가한 확장 인터페이스.
 *
 * SceneSurface extends Surface이므로 기존 Projector에 그대로 전달 가능.
 */

import type { Surface, SurfaceCall } from '../box/surface';
import { CanvasSurface, MockSurface } from '../box/surface';

// ── 인터페이스 ──

export interface SceneSurface extends Surface {
  // 호 그리기
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;

  // 캔버스 초기화
  clearRect(x: number, y: number, w: number, h: number): void;

  // 클리핑
  clip(): void;

  // 사각형 경로
  rect(x: number, y: number, w: number, h: number): void;

  // 둥근 모서리 사각형 경로
  roundRect(x: number, y: number, w: number, h: number, radii: number | number[]): void;

  // 텍스트 측정
  measureText(text: string): { width: number };

  // 텍스트 정렬
  setTextAlign(align: CanvasTextAlign): void;

  // 편의 변환 (transform(1,0,0,1,tx,ty) 대신)
  translate(tx: number, ty: number): void;
  scale(sx: number, sy: number): void;

  // 변환 행렬 리셋 후 설정
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
}

// ── Canvas 구현체 ──

export class CanvasSceneSurface extends CanvasSurface implements SceneSurface {
  private readonly scenCtx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    super(ctx);
    this.scenCtx = ctx;
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    this.scenCtx.arc(x, y, radius, startAngle, endAngle, counterclockwise);
  }

  clearRect(x: number, y: number, w: number, h: number): void {
    this.scenCtx.clearRect(x, y, w, h);
  }

  clip(): void {
    this.scenCtx.clip();
  }

  rect(x: number, y: number, w: number, h: number): void {
    this.scenCtx.rect(x, y, w, h);
  }

  roundRect(x: number, y: number, w: number, h: number, radii: number | number[]): void {
    this.scenCtx.roundRect(x, y, w, h, radii);
  }

  measureText(text: string): { width: number } {
    return this.scenCtx.measureText(text);
  }

  setTextAlign(align: CanvasTextAlign): void {
    this.scenCtx.textAlign = align;
  }

  translate(tx: number, ty: number): void {
    this.scenCtx.translate(tx, ty);
  }

  scale(sx: number, sy: number): void {
    this.scenCtx.scale(sx, sy);
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.scenCtx.setTransform(a, b, c, d, e, f);
  }
}

// ── Mock 구현체 ──

export class MockSceneSurface extends MockSurface implements SceneSurface {
  private textAlign: CanvasTextAlign = 'start';

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    (this.calls as SurfaceCall[]).push({ method: 'arc', args: [x, y, radius, startAngle, endAngle, counterclockwise] });
  }

  clearRect(x: number, y: number, w: number, h: number): void {
    (this.calls as SurfaceCall[]).push({ method: 'clearRect', args: [x, y, w, h] });
  }

  clip(): void {
    (this.calls as SurfaceCall[]).push({ method: 'clip', args: [] });
  }

  rect(x: number, y: number, w: number, h: number): void {
    (this.calls as SurfaceCall[]).push({ method: 'rect', args: [x, y, w, h] });
  }

  roundRect(x: number, y: number, w: number, h: number, radii: number | number[]): void {
    (this.calls as SurfaceCall[]).push({ method: 'roundRect', args: [x, y, w, h, radii] });
  }

  measureText(text: string): { width: number } {
    (this.calls as SurfaceCall[]).push({ method: 'measureText', args: [text] });
    return { width: text.length * 8 };
  }

  setTextAlign(align: CanvasTextAlign): void {
    (this.calls as SurfaceCall[]).push({ method: 'setTextAlign', args: [align] });
    this.textAlign = align;
  }

  translate(tx: number, ty: number): void {
    (this.calls as SurfaceCall[]).push({ method: 'translate', args: [tx, ty] });
  }

  scale(sx: number, sy: number): void {
    (this.calls as SurfaceCall[]).push({ method: 'scale', args: [sx, sy] });
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    (this.calls as SurfaceCall[]).push({ method: 'setTransform', args: [a, b, c, d, e, f] });
  }
}
