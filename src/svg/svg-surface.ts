/**
 * SVG 투영 표면.
 *
 * `Projector` 는 Box 트리를 `Surface` 로만 그린다 — Canvas 를 직접 만지지 않는다.
 * 그래서 이 구현 하나를 끼우면 654줄의 조판 렌더 로직(분수·근호·구분자·확장
 * 악센트·취소선·행렬…)이 그대로 SVG 로 나온다. 재구현하지 않는다.
 *
 * 글자는 `<text>` 가 아니라 글리프 윤곽선 `<path>` 로 박는다. PDF 로 넘어갈 때
 * 폰트 임베딩이나 수신자 폰트 설치에 기대지 않기 위해서다.
 */

import { parseFontString } from '../box/font-metrics.js';
import type { Surface } from '../box/surface.js';
import type { MathFont } from './types.js';

/** 좌표 소수 자릿수 — 육안으로 구분되지 않으면서 문서 크기를 억제하는 선 */
const PRECISION = 2;

/**
 * 합성 이탤릭 기울기 — tan(12°).
 *
 * 대부분의 변수는 `toMathItalic` 이 유니코드 수학 이탤릭 글리프로 바꿔 주므로 이
 * 경로를 타지 않는다. 하지만 그 매핑에 없는 문자(예: `\hbar` 의 ℏ U+210F)는
 * `italic: true` 인 채로 내려오고, Canvas 는 그때 폰트 합성 기울임으로 그린다.
 * 여기서 같은 처리를 하지 않으면 두 백엔드의 출력이 갈린다.
 * `Projector` 가 적분 기호를 기울일 때 쓰는 계수와 같은 값이다.
 */
const OBLIQUE_SLOPE = 0.21;

/** 2D 아핀 변환 [a, b, c, d, e, f] — Canvas transform 인자 순서와 같다 */
type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** m 다음에 n 을 적용한 행렬. Canvas `transform()` 의 누적 시맨틱과 같다 */
function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

function isIdentity(m: Matrix): boolean {
  return m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0;
}

/** 지수 표기(1e-7)가 섞이지 않게 고정 소수로 줄인다 */
function num(value: number): string {
  return Number(value.toFixed(PRECISION)).toString();
}

/** 속성값으로 들어가는 문자열을 이스케이프한다 — 색상은 호스트가 준 값이다 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 한 시점의 그리기 상태 */
interface DrawState {
  ctm: Matrix;
  fill: string;
  stroke: string;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  alpha: number;
  lineDash: number[];
  font: string;
}

function initialState(): DrawState {
  return {
    ctm: [...IDENTITY] as Matrix,
    fill: '#000000',
    stroke: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    alpha: 1,
    lineDash: [],
    font: '',
  };
}

function cloneState(state: DrawState): DrawState {
  // ctm 과 lineDash 를 복사하지 않으면 push 이후의 transform 이 스택 아래 상태까지
  // 오염시킨다. 참조 공유 금지.
  return { ...state, ctm: [...state.ctm] as Matrix, lineDash: [...state.lineDash] };
}

/** Box 트리를 SVG 요소 목록으로 투영하는 표면 */
export class SvgSurface implements Surface {
  private readonly font: MathFont;
  private readonly elements: string[] = [];
  private state: DrawState = initialState();
  private stack: DrawState[] = [];
  private path: string[] = [];

  constructor(font: MathFont) {
    this.font = font;
  }

  /** 지금까지 투영된 SVG 요소들 */
  toElements(): string[] {
    return [...this.elements];
  }

  // ── 상태 ────────────────────────────────────────────────────
  save(): void {
    this.stack.push(cloneState(this.state));
  }

  restore(): void {
    const restored = this.stack.pop();
    if (restored !== undefined) this.state = restored;
  }

  // ── 스타일 ──────────────────────────────────────────────────
  setFont(font: string): void {
    this.state.font = font;
  }

  setFillStyle(style: string): void {
    this.state.fill = style;
  }

  setStrokeStyle(style: string): void {
    this.state.stroke = style;
  }

  setTextBaseline(_baseline: CanvasTextBaseline): void {
    // 글리프 path 는 baseline 원점으로 그려지므로 이 힌트가 필요 없다.
    // Projector 는 'alphabetic' 만 쓴다.
  }

  setLineWidth(width: number): void {
    this.state.lineWidth = width;
  }

  setLineCap(cap: CanvasLineCap): void {
    this.state.lineCap = cap;
  }

  setLineJoin(join: CanvasLineJoin): void {
    this.state.lineJoin = join;
  }

  setGlobalAlpha(alpha: number): void {
    this.state.alpha = alpha;
  }

  getGlobalAlpha(): number {
    return this.state.alpha;
  }

  setLineDash(segments: number[]): void {
    this.state.lineDash = [...segments];
  }

  // ── 변환 ────────────────────────────────────────────────────
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.state.ctm = multiply(this.state.ctm, [a, b, c, d, e, f]);
  }

  // ── 텍스트 ──────────────────────────────────────────────────
  fillText(text: string, x: number, y: number): void {
    const { fontSizePx, italic } = parseFontString(this.state.font);
    if (fontSizePx <= 0) return;

    // baseline 을 축으로 기울인다 — 글자는 눕되 앉은 위치는 그대로여야 한다.
    const oblique: Matrix | null = italic
      ? [1, 0, -OBLIQUE_SLOPE, 1, OBLIQUE_SLOPE * y, 0]
      : null;

    // Projector 는 글리프 단위로 부르지만, 문자열이 와도 Canvas 처럼 이어 그린다.
    let cursor = x;
    for (const char of text) {
      const glyph = this.font.charToGlyph(char);
      const d = glyph.getPath(cursor, y, fontSizePx).toPathData(PRECISION);
      if (d.length > 0) {
        this.emit(`<path d="${d}"${this.fillAttrs()}/>`, oblique);
      }
      cursor += ((glyph.advanceWidth ?? 0) / this.font.unitsPerEm) * fontSizePx;
    }
  }

  // ── 도형 ────────────────────────────────────────────────────
  fillRect(x: number, y: number, width: number, height: number): void {
    this.emit(`<rect ${this.rectAttrs(x, y, width, height)}${this.fillAttrs()}/>`);
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this.emit(
      `<rect ${this.rectAttrs(x, y, width, height)} fill="none"${this.strokeAttrs()}/>`,
    );
  }

  // ── 경로 ────────────────────────────────────────────────────
  beginPath(): void {
    this.path = [];
  }

  closePath(): void {
    this.path.push('Z');
  }

  moveTo(x: number, y: number): void {
    this.path.push(`M${num(x)} ${num(y)}`);
  }

  lineTo(x: number, y: number): void {
    this.path.push(`L${num(x)} ${num(y)}`);
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.path.push(`Q${num(cpx)} ${num(cpy)} ${num(x)} ${num(y)}`);
  }

  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number,
  ): void {
    this.path.push(
      `C${num(cp1x)} ${num(cp1y)} ${num(cp2x)} ${num(cp2y)} ${num(x)} ${num(y)}`,
    );
  }

  fill(): void {
    if (this.path.length === 0) return;
    this.emit(`<path d="${this.path.join('')}"${this.fillAttrs()}/>`);
  }

  stroke(): void {
    if (this.path.length === 0) return;
    this.emit(`<path d="${this.path.join('')}" fill="none"${this.strokeAttrs()}/>`);
  }

  // ── 내부 ────────────────────────────────────────────────────
  /**
   * 요소를 낼 때 그 시점의 변환·투명도를 함께 굳힌다 (상태를 나중에 참조하지 않는다).
   *
   * `extra` 는 이 요소에만 덧붙이는 변환이다 — 상태를 건드리지 않으므로 다음 요소로
   * 새지 않는다.
   */
  private emit(element: string, extra: Matrix | null = null): void {
    const attrs = `${this.transformAttr(extra)}${this.alphaAttr()}`;
    if (attrs.length === 0) {
      this.elements.push(element);
      return;
    }
    this.elements.push(element.replace(/\/>$/, `${attrs}/>`));
  }

  private transformAttr(extra: Matrix | null): string {
    const m = extra === null ? this.state.ctm : multiply(this.state.ctm, extra);
    if (isIdentity(m)) return '';
    return ` transform="matrix(${m.map(num).join(' ')})"`;
  }

  private alphaAttr(): string {
    return this.state.alpha === 1 ? '' : ` opacity="${num(this.state.alpha)}"`;
  }

  private rectAttrs(x: number, y: number, width: number, height: number): string {
    return `x="${num(x)}" y="${num(y)}" width="${num(width)}" height="${num(height)}"`;
  }

  private fillAttrs(): string {
    return ` fill="${escapeAttr(this.state.fill)}"`;
  }

  private strokeAttrs(): string {
    const dash =
      this.state.lineDash.length > 0
        ? ` stroke-dasharray="${this.state.lineDash.map(num).join(' ')}"`
        : '';
    const cap = this.state.lineCap === 'butt' ? '' : ` stroke-linecap="${this.state.lineCap}"`;
    const join =
      this.state.lineJoin === 'miter' ? '' : ` stroke-linejoin="${this.state.lineJoin}"`;
    return ` stroke="${escapeAttr(this.state.stroke)}" stroke-width="${num(this.state.lineWidth)}"${cap}${join}${dash}`;
  }
}
