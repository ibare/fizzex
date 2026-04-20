/**
 * 2D Canvas 드로잉 공용 헬퍼.
 *
 * 여러 Visualizer에서 공용으로 필요한 소형 드로잉 유틸리티만 모은다.
 * Three.js 의존성이 없어 2D 전용 Visualizer에서도 직접 경로로 import 가능하다
 * (`import { ... } from '../../../graphics/draw'`).
 */

/** `#RRGGBB` 헥스 색상을 alpha 투명도를 붙인 `rgba(...)` 문자열로 변환한다. */
export function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * 둥근 모서리 사각형 경로를 현재 ctx에 쌓는다.
 * fill / stroke 는 호출자 책임. 경로만 생성하고 반환 없음.
 */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/** 값의 절대 크기에 따라 소수점 자리수를 적응적으로 축약한다. */
export function formatN(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '-';
  const abs = Math.abs(n);
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 10) return n.toFixed(1);
  return n.toFixed(digits);
}

// ──────────────────────────────────────────────────────────────────────────
// 2D 프리미티브 (Phase 2, JSON Visualizer 런타임 어댑터용).
// 모두 "경로만 쌓는다" 규칙을 따른다. fill/stroke 는 호출자 책임.
// ──────────────────────────────────────────────────────────────────────────

export interface Point2D {
  x: number;
  y: number;
}

/** 원 경로. */
export function drawCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
}

/** 타원 경로. rotation은 라디안. */
export function drawEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation = 0,
): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, rotation, 0, Math.PI * 2);
  ctx.closePath();
}

/** 호 (열린 선). stroke를 호출하면 그려진다. */
export function drawArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  startRad: number,
  endRad: number,
): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, startRad, endRad);
}

/** 쐐기(wedge) 경로 — 중심점 → 호 → 중심점. fill용. */
export function drawFilledArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  startRad: number,
  endRad: number,
): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, startRad, endRad);
  ctx.closePath();
}

/** 단일 선분. */
export function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
}

/** 열린 꺾은선. 2점 미만이면 no-op. */
export function drawPolyline(ctx: CanvasRenderingContext2D, points: readonly Point2D[]): void {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
}

/** 닫힌 다각형. 3점 미만이면 no-op. */
export function drawPolygon(ctx: CanvasRenderingContext2D, points: readonly Point2D[]): void {
  if (points.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
}

/**
 * SVG path `d` 서브셋 파서. 지원 커맨드: M, L, C, Q, Z (대소문자 공용 = 절대좌표만).
 * 그 외 커맨드는 무시하지 않고 throw한다 (조용한 실패 금지).
 */
export function drawPath(ctx: CanvasRenderingContext2D, d: string): void {
  const tokens = d.match(/[MLCQZmlcqz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g);
  if (!tokens) return;
  ctx.beginPath();
  let i = 0;
  const num = (): number => {
    const t = tokens[i++];
    const n = Number(t);
    if (!Number.isFinite(n)) throw new Error(`drawPath: expected number, got "${t}"`);
    return n;
  };
  while (i < tokens.length) {
    const cmd = tokens[i++];
    switch (cmd) {
      case 'M':
      case 'm':
        ctx.moveTo(num(), num());
        break;
      case 'L':
      case 'l':
        ctx.lineTo(num(), num());
        break;
      case 'C':
      case 'c':
        ctx.bezierCurveTo(num(), num(), num(), num(), num(), num());
        break;
      case 'Q':
      case 'q':
        ctx.quadraticCurveTo(num(), num(), num(), num());
        break;
      case 'Z':
      case 'z':
        ctx.closePath();
        break;
      default:
        throw new Error(`drawPath: unsupported command "${cmd}"`);
    }
  }
}

/**
 * 이미지 드로잉 (동기). img는 로드가 완료된 상태여야 한다(호출 측 책임).
 * dw/dh 생략 시 원본 크기.
 */
export function drawImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  dx: number,
  dy: number,
  dw?: number,
  dh?: number,
): void {
  if (dw === undefined || dh === undefined) {
    ctx.drawImage(img, dx, dy);
  } else {
    ctx.drawImage(img, dx, dy, dw, dh);
  }
}

export interface GradientStop {
  offset: number;
  color: string;
}

/** 선형 그라디언트 생성. caller가 ctx.fillStyle/strokeStyle 에 할당한다. */
export function createLinearGradientFill(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: readonly GradientStop[],
): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const s of stops) g.addColorStop(s.offset, s.color);
  return g;
}

/** 원형 그라디언트 생성 (중심 공유, inner r=0). */
export function createRadialGradientFill(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  stops: readonly GradientStop[],
): CanvasGradient {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const s of stops) g.addColorStop(s.offset, s.color);
  return g;
}
