/**
 * Box 렌더러
 *
 * Box 트리를 Canvas에 렌더링
 * RenderBackend 추상화를 통해 테스트 가능성 향상
 */

import type { Box, BoxRenderConfig, GlyphBox, HBox, VBox, RuleBox, SurdBox, PathBox } from './types';
import { type CanvasFontMetrics, MathConstants } from './font-metrics';
import type { CursorPosition } from '../types';
import { findBoxBySourceId, getCursorXPosition } from './box-layout';
import { isComplexNodeSlot } from './constants';
import type { RenderBackend } from './render-backend';
import { CanvasRenderBackend } from './render-backend';
import { DELIMITER_PATHS } from '../fonts/delimiter-paths';
import type { GlyphPathData } from '../fonts/delimiter-paths';

export class BoxRenderer {
  private backend: RenderBackend;
  private config: BoxRenderConfig;
  private metrics: CanvasFontMetrics;

  /**
   * BoxRenderer 생성
   * @param ctxOrBackend Canvas 컨텍스트 또는 RenderBackend 인스턴스
   * @param config 렌더링 설정
   * @param metrics 폰트 메트릭스
   */
  constructor(
    ctxOrBackend: CanvasRenderingContext2D | RenderBackend,
    config: BoxRenderConfig,
    metrics: CanvasFontMetrics
  ) {
    // Canvas 컨텍스트가 전달되면 CanvasRenderBackend로 래핑 (하위 호환성)
    if ('canvas' in ctxOrBackend) {
      this.backend = new CanvasRenderBackend(ctxOrBackend);
    } else {
      this.backend = ctxOrBackend;
    }
    this.config = config;
    this.metrics = metrics;
  }

  /** 설정 업데이트 */
  updateConfig(config: BoxRenderConfig): void {
    this.config = config;
  }

  /** Box 트리 렌더링 */
  render(box: Box): void {
    switch (box.type) {
      case 'glyph':
        this.renderGlyph(box);
        break;
      case 'hbox':
        this.renderHBox(box);
        break;
      case 'vbox':
        this.renderVBox(box);
        break;
      case 'rule':
        this.renderRule(box);
        break;
      case 'surd':
        this.renderSurd(box);
        break;
      case 'path':
        this.renderPath(box);
        break;
      case 'kern':
        // Kern은 보이지 않음
        break;
    }
  }

  /** 구분자(괄호 등) 문자인지 확인 */
  private static readonly DELIMITER_CHARS = new Set([
    '(', ')', '[', ']', '{', '}', '|',
    // Unicode 확장 괄호 문자들
    '\u239B', '\u239C', '\u239D', '\u239E', '\u239F', '\u23A0', // 소괄호
    '\u23A1', '\u23A2', '\u23A3', '\u23A4', '\u23A5', '\u23A6', // 대괄호
    '\u23A7', '\u23A8', '\u23A9', '\u23AA', '\u23AB', '\u23AC', '\u23AD', // 중괄호
    '\u23D0', '\u2223', // 수직선
  ]);

  /** 적분 기호 (기울임 적용 대상) */
  private static readonly INTEGRAL_CHARS = new Set(['∫', '∬', '∭', '∮']);

  /** Glyph 렌더링 */
  private renderGlyph(glyph: GlyphBox): void {
    this.backend.setFont(this.metrics.getFont(glyph.fontSize, glyph.italic));
    this.backend.setFillStyle(this.config.color);
    this.backend.setTextBaseline('alphabetic');

    // 구분자(괄호 등)는 폰트 스케일만 사용, 수직 스트레칭 비적용
    // 폰트 스케일이 box-builder.ts에서 이미 적절히 계산되어 있음

    // 적분 기호는 기울임 변환 적용
    if (BoxRenderer.INTEGRAL_CHARS.has(glyph.char)) {
      this.backend.save();
      // skewX 변환으로 약 12도 기울임 (tan(12°) ≈ 0.21)
      this.backend.transform(1, 0, -0.21, 1, 0, 0);
      this.backend.fillText(glyph.char, glyph.x, glyph.y);
      this.backend.restore();
    } else {
      // 일반 글리프: y는 baseline 위치
      this.backend.fillText(glyph.char, glyph.x, glyph.y);
    }
  }

  /** HBox 렌더링 */
  private renderHBox(hbox: HBox): void {
    // 빈 복합 노드 영역이면 placeholder 표시 (편집 모드에서만)
    if (this.config.showPlaceholders && this.isEmptyComplexNodeSlot(hbox)) {
      this.renderPlaceholder(hbox);
    }

    // boxed 마킹이 있으면 테두리 렌더링
    const boxedInfo = (hbox as any).boxed as { padding: number; ruleThickness: number } | undefined;
    if (boxedInfo) {
      this.backend.save();
      this.backend.setStrokeStyle(this.config.color);
      this.backend.setLineWidth(boxedInfo.ruleThickness);
      this.backend.strokeRect(
        hbox.x + boxedInfo.ruleThickness / 2,
        hbox.y - hbox.height + boxedInfo.ruleThickness / 2,
        hbox.width - boxedInfo.ruleThickness,
        hbox.height + hbox.depth - boxedInfo.ruleThickness,
      );
      this.backend.restore();
    }

    for (const child of hbox.children) {
      this.render(child);
    }

    // cancel 마킹이 있으면 취소선 렌더링
    const cancelInfo = (hbox as any).cancel as { cancelType: string; ruleThickness: number } | undefined;
    if (cancelInfo) {
      this.backend.save();
      this.backend.setStrokeStyle(this.config.color);
      this.backend.setLineWidth(cancelInfo.ruleThickness);
      this.backend.beginPath();
      const x = hbox.x;
      const top = hbox.y - hbox.height;
      const bottom = hbox.y + hbox.depth;
      const right = hbox.x + hbox.width;
      if (cancelInfo.cancelType === 'cancel' || cancelInfo.cancelType === 'xcancel') {
        // 좌하 → 우상
        this.backend.moveTo(x, bottom);
        this.backend.lineTo(right, top);
      }
      if (cancelInfo.cancelType === 'bcancel' || cancelInfo.cancelType === 'xcancel') {
        // 좌상 → 우하
        this.backend.moveTo(x, top);
        this.backend.lineTo(right, bottom);
      }
      this.backend.stroke();
      this.backend.restore();
    }
  }

  /** 빈 복합 노드 영역인지 확인 */
  private isEmptyComplexNodeSlot(hbox: HBox): boolean {
    if (hbox.children.length > 0) return false;
    return isComplexNodeSlot(hbox.sourceId);
  }

  /** Placeholder 렌더링 */
  private renderPlaceholder(hbox: HBox): void {
    const config = this.config.placeholder ?? {
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
      borderColor: 'rgba(59, 130, 246, 0.25)',
      borderWidth: 1,
      borderRadius: 2,
    };

    const defaultHeight = this.config.baseFontSize * 0.75;
    const defaultDepth = this.config.baseFontSize * 0.25;
    const minWidth = this.config.baseFontSize * 0.5;

    const x = hbox.x;
    const y = hbox.y - defaultHeight;
    const width = Math.max(hbox.width, minWidth);
    const height = defaultHeight + defaultDepth;
    const r = config.borderRadius;

    // 투명도 적용 (애니메이션용)
    const prevAlpha = this.backend.getGlobalAlpha();
    if (config.opacity !== undefined) {
      this.backend.setGlobalAlpha(config.opacity);
    }

    // 둥근 사각형 경로
    this.backend.beginPath();
    this.backend.moveTo(x + r, y);
    this.backend.lineTo(x + width - r, y);
    this.backend.quadraticCurveTo(x + width, y, x + width, y + r);
    this.backend.lineTo(x + width, y + height - r);
    this.backend.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    this.backend.lineTo(x + r, y + height);
    this.backend.quadraticCurveTo(x, y + height, x, y + height - r);
    this.backend.lineTo(x, y + r);
    this.backend.quadraticCurveTo(x, y, x + r, y);
    this.backend.closePath();

    // 배경
    this.backend.setFillStyle(config.backgroundColor);
    this.backend.fill();

    // 테두리
    this.backend.setStrokeStyle(config.borderColor);
    this.backend.setLineWidth(config.borderWidth);
    this.backend.stroke();

    // 투명도 복원
    this.backend.setGlobalAlpha(prevAlpha);
  }

  /** VBox 렌더링 */
  private renderVBox(vbox: VBox): void {
    for (const child of vbox.children) {
      this.render(child);
    }
  }

  /** Rule (선) 렌더링 */
  private renderRule(rule: RuleBox): void {
    // 확장형 악센트 마킹 감지
    const extensibleAccent = (rule as any).extensibleAccent as { accentType: string; width: number } | undefined;
    if (extensibleAccent) {
      this.renderExtensibleAccent(rule, extensibleAccent);
      return;
    }

    // overbrace/underbrace 마킹 감지
    const braceInfo = (rule as any).brace as { variant: string; width: number } | undefined;
    if (braceInfo) {
      this.renderBrace(rule, braceInfo);
      return;
    }

    // xarrow 마킹 감지
    const xarrowInfo = (rule as any).xarrow as { direction: string; width: number } | undefined;
    if (xarrowInfo) {
      this.renderXArrow(rule, xarrowInfo);
      return;
    }

    this.backend.setFillStyle(this.config.color);
    // y는 baseline, rule은 baseline 중심으로 그림
    const top = rule.y - rule.height;
    this.backend.fillRect(rule.x, top, rule.width, rule.thickness);
  }

  /** 확장형 악센트 렌더링 (widehat, widetilde, overarrow) */
  private renderExtensibleAccent(
    rule: RuleBox,
    info: { accentType: string; width: number }
  ): void {
    const x = rule.x;
    const y = rule.y - rule.height;
    const w = info.width;
    const h = rule.height + rule.depth;
    const lw = this.config.baseFontSize * 0.04;

    this.backend.save();
    this.backend.setStrokeStyle(this.config.color);
    this.backend.setLineWidth(lw);
    this.backend.beginPath();

    if (info.accentType === 'widehat') {
      // ^ 모양
      this.backend.moveTo(x, y + h);
      this.backend.lineTo(x + w / 2, y);
      this.backend.lineTo(x + w, y + h);
    } else if (info.accentType === 'widetilde') {
      // ~ 모양 (베지어 커브)
      const midY = y + h / 2;
      this.backend.moveTo(x, midY + h * 0.3);
      (this.backend as any).quadraticCurveTo?.(x + w * 0.25, y - h * 0.3, x + w / 2, midY) ||
        this.backend.lineTo(x + w / 2, midY);
      (this.backend as any).quadraticCurveTo?.(x + w * 0.75, y + h * 1.3, x + w, midY - h * 0.3) ||
        this.backend.lineTo(x + w, midY - h * 0.3);
    } else if (info.accentType === 'overleftarrow') {
      const midY = y + h / 2;
      this.backend.moveTo(x + w, midY);
      this.backend.lineTo(x, midY);
      // 화살촉 (왼쪽)
      this.backend.moveTo(x + h, midY - h * 0.6);
      this.backend.lineTo(x, midY);
      this.backend.lineTo(x + h, midY + h * 0.6);
    } else if (info.accentType === 'overrightarrow') {
      const midY = y + h / 2;
      this.backend.moveTo(x, midY);
      this.backend.lineTo(x + w, midY);
      // 화살촉 (오른쪽)
      this.backend.moveTo(x + w - h, midY - h * 0.6);
      this.backend.lineTo(x + w, midY);
      this.backend.lineTo(x + w - h, midY + h * 0.6);
    } else if (info.accentType === 'overleftrightarrow') {
      const midY = y + h / 2;
      this.backend.moveTo(x, midY);
      this.backend.lineTo(x + w, midY);
      // 화살촉 (왼쪽)
      this.backend.moveTo(x + h, midY - h * 0.6);
      this.backend.lineTo(x, midY);
      this.backend.lineTo(x + h, midY + h * 0.6);
      // 화살촉 (오른쪽)
      this.backend.moveTo(x + w - h, midY - h * 0.6);
      this.backend.lineTo(x + w, midY);
      this.backend.lineTo(x + w - h, midY + h * 0.6);
    }

    this.backend.stroke();
    this.backend.restore();
  }

  /** overbrace/underbrace 렌더링 */
  private renderBrace(
    rule: RuleBox,
    info: { variant: string; width: number }
  ): void {
    const x = rule.x;
    const y = rule.y - rule.height;
    const w = info.width;
    const h = rule.height + rule.depth;
    const lw = this.config.baseFontSize * 0.04;

    this.backend.save();
    this.backend.setStrokeStyle(this.config.color);
    this.backend.setLineWidth(lw);
    this.backend.beginPath();

    if (info.variant === 'overbrace') {
      // ⏞ 모양: 양 끝에서 올라와 중앙에서 뾰족하게
      const midX = x + w / 2;
      const top = y;
      const bottom = y + h;
      this.backend.moveTo(x, bottom);
      this.backend.lineTo(x, top + h * 0.3);
      this.backend.lineTo(midX, top);
      this.backend.lineTo(x + w, top + h * 0.3);
      this.backend.lineTo(x + w, bottom);
    } else {
      // ⏟ 모양: 양 끝에서 내려와 중앙에서 뾰족하게
      const midX = x + w / 2;
      const top = y;
      const bottom = y + h;
      this.backend.moveTo(x, top);
      this.backend.lineTo(x, bottom - h * 0.3);
      this.backend.lineTo(midX, bottom);
      this.backend.lineTo(x + w, bottom - h * 0.3);
      this.backend.lineTo(x + w, top);
    }

    this.backend.stroke();
    this.backend.restore();
  }

  /** 확장 화살표 (xleftarrow/xrightarrow) 렌더링 */
  private renderXArrow(
    rule: RuleBox,
    info: { direction: string; width: number }
  ): void {
    const x = rule.x;
    const midY = rule.y - rule.height / 2;
    const w = info.width;
    const lw = this.config.baseFontSize * 0.04;
    const headSize = this.config.baseFontSize * 0.15;

    this.backend.save();
    this.backend.setStrokeStyle(this.config.color);
    this.backend.setLineWidth(lw);
    this.backend.beginPath();

    // 수평선
    this.backend.moveTo(x, midY);
    this.backend.lineTo(x + w, midY);

    if (info.direction === 'left' || info.direction === 'both') {
      this.backend.moveTo(x + headSize, midY - headSize);
      this.backend.lineTo(x, midY);
      this.backend.lineTo(x + headSize, midY + headSize);
    }
    if (info.direction === 'right' || info.direction === 'both') {
      this.backend.moveTo(x + w - headSize, midY - headSize);
      this.backend.lineTo(x + w, midY);
      this.backend.lineTo(x + w - headSize, midY + headSize);
    }

    this.backend.stroke();
    this.backend.restore();
  }

  /** Surd (제곱근) 렌더링 - √ 기호와 vinculum */
  private renderSurd(surd: SurdBox): void {
    // degree 영역 폭 계산 (TeX kern 기반)
    const em = surd.actualFontSize;
    const degreeExtraWidth = surd.index
      ? Math.max(0, em * MathConstants.radicalKernBeforeDegree + surd.index.width + em * MathConstants.radicalKernAfterDegree)
      : 0;
    const sqrtWidth = surd.width - surd.content.width - surd.gap - degreeExtraWidth;
    const totalHeight = surd.height + surd.depth;
    const contentTop = surd.y - surd.height + surd.ruleThickness;
    const contentRight = surd.content.x + surd.content.width;
    const sqrtX = surd.x + degreeExtraWidth;

    const sqrtEntry = DELIMITER_PATHS['√'];

    if (sqrtEntry) {
      // 경로 기반 √ 렌더링
      const targetHeightNorm = totalHeight / this.config.baseFontSize;
      const variant = this.selectSurdVariant(sqrtEntry, targetHeightNorm);

      this.renderDelimiterPath(
        variant,
        sqrtX,
        surd.y,
        totalHeight,
        sqrtWidth,
        surd.height,
      );
    } else {
      // 폴백: 직선 기반 √ 렌더링
      this.backend.setStrokeStyle(this.config.color);
      this.backend.setLineWidth(surd.ruleThickness);
      this.backend.setLineCap('square');
      this.backend.setLineJoin('miter');

      const serifStartX = sqrtX;
      const serifStartY = surd.y - totalHeight * 0.4;
      const serifEndX = sqrtX + sqrtWidth * 0.18;
      const serifEndY = surd.y - totalHeight * 0.42;
      const checkBottomX = sqrtX + sqrtWidth * 0.45;
      const checkBottomY = surd.y + surd.depth * 0.8;
      const sqrtTopX = sqrtX + sqrtWidth;
      const sqrtTopY = contentTop;

      this.backend.beginPath();
      this.backend.moveTo(serifStartX, serifStartY);
      this.backend.lineTo(serifEndX, serifEndY);
      this.backend.lineTo(checkBottomX, checkBottomY);
      this.backend.lineTo(sqrtTopX, sqrtTopY);
      this.backend.lineTo(contentRight + surd.gap * 0.5, sqrtTopY);
      this.backend.stroke();
    }

    // vinculum (가로선) — √ 상단에서 content 끝까지
    this.backend.setFillStyle(this.config.color);
    const vinculumLeft = sqrtX + sqrtWidth;
    const vinculumTop = contentTop - surd.ruleThickness;
    const vinculumWidth = contentRight + surd.gap * 0.5 - vinculumLeft;
    this.backend.fillRect(vinculumLeft, vinculumTop, vinculumWidth, surd.ruleThickness);

    // 인덱스 렌더링 (좌표는 layoutSurd에서 설정)
    if (surd.index) {
      this.render(surd.index);
    }

    // content 렌더링
    this.render(surd.content);
  }

  /** √ 글리프 크기 변형 선택 */
  private selectSurdVariant(entry: typeof DELIMITER_PATHS[string], targetHeightNorm: number): GlyphPathData {
    const baseHeight = entry.base.ascent + entry.base.descent;
    if (targetHeightNorm <= baseHeight) return entry.base;

    if (entry.variants) {
      for (const v of entry.variants) {
        if (v.ascent + v.descent >= targetHeightNorm) return v;
      }
      return entry.variants[entry.variants.length - 1];
    }

    return entry.base;
  }

  /** Path Box 렌더링 — 글리프 경로 데이터를 Canvas bezier curve로 그림 */
  private renderPath(pathBox: PathBox): void {
    const entry = DELIMITER_PATHS[pathBox.pathChar];
    if (!entry) return;

    // 크기 변형 선택
    let pathData: GlyphPathData;
    if (pathBox.variantIndex < 0) {
      pathData = entry.base;
    } else if (entry.variants && pathBox.variantIndex < entry.variants.length) {
      pathData = entry.variants[pathBox.variantIndex];
    } else {
      pathData = entry.base;
    }

    const totalHeight = pathBox.height + pathBox.depth;
    this.renderDelimiterPath(
      pathData,
      pathBox.x,
      pathBox.y,
      totalHeight,
      pathBox.targetWidth,
      pathBox.height,
    );
  }

  /** 경로 데이터를 Canvas에 렌더링 */
  private renderDelimiterPath(
    pathData: GlyphPathData,
    x: number,
    baselineY: number,
    targetHeight: number,
    targetWidth: number,
    heightAboveBaseline: number,
  ): void {
    const pathNaturalHeight = pathData.ascent + pathData.descent;
    if (pathNaturalHeight <= 0 || pathData.advanceWidth <= 0) return;

    const scaleX = targetWidth / pathData.advanceWidth;
    const scaleY = targetHeight / pathNaturalHeight;

    this.backend.save();
    // baseline 기준으로 위치 조정: pathData에서 ascent 부분이 baseline 위
    // 변환: (x, baselineY - heightAboveBaseline) 이 경로의 상단
    // 경로 좌표에서 ascent 부분은 음수 Y (Canvas 위쪽)
    // translate 후 scale 적용
    this.backend.transform(scaleX, 0, 0, scaleY, x, baselineY - heightAboveBaseline + pathData.ascent * scaleY);

    this.backend.setFillStyle(this.config.color);
    this.backend.beginPath();

    for (const cmd of pathData.commands) {
      switch (cmd.type) {
        case 'M':
          this.backend.moveTo(cmd.args[0], cmd.args[1]);
          break;
        case 'L':
          this.backend.lineTo(cmd.args[0], cmd.args[1]);
          break;
        case 'Q':
          this.backend.quadraticCurveTo(cmd.args[0], cmd.args[1], cmd.args[2], cmd.args[3]);
          break;
        case 'C':
          this.backend.bezierCurveTo(cmd.args[0], cmd.args[1], cmd.args[2], cmd.args[3], cmd.args[4], cmd.args[5]);
          break;
        case 'Z':
          this.backend.closePath();
          break;
      }
    }

    this.backend.fill();
    this.backend.restore();
  }

  /** 커서 위치 계산 */
  getCursorPosition(rootBox: Box, cursor: CursorPosition): { x: number; y: number; height: number } | null {
    // 커서가 위치한 Box 찾기
    const targetBox = findBoxBySourceId(rootBox, cursor.nodeId);
    if (!targetBox) return null;

    let cursorX: number;
    let cursorTop: number;
    let cursorBottom: number;

    // 기본 커서 높이 (빈 Box용)
    const defaultHeight = this.config.baseFontSize * 0.75;
    const defaultDepth = this.config.baseFontSize * 0.25;

    if (targetBox.type === 'hbox') {
      // HBox 내에서 offset 위치의 x 좌표
      cursorX = getCursorXPosition(targetBox, cursor.offset);
      // 빈 HBox인 경우 기본 높이 사용
      const height = targetBox.height > 0 ? targetBox.height : defaultHeight;
      const depth = targetBox.depth > 0 ? targetBox.depth : defaultDepth;
      cursorTop = targetBox.y - height;
      cursorBottom = targetBox.y + depth;
    } else {
      // 다른 타입은 Box 끝에 커서
      cursorX = targetBox.x + targetBox.width;
      cursorTop = targetBox.y - targetBox.height;
      cursorBottom = targetBox.y + targetBox.depth;
    }

    return {
      x: cursorX,
      y: cursorBottom,
      height: cursorBottom - cursorTop,
    };
  }

  /** 커서 렌더링 */
  renderCursor(rootBox: Box, cursor: CursorPosition): void {
    const pos = this.getCursorPosition(rootBox, cursor);
    if (!pos) return;

    const cursorTop = pos.y - pos.height;
    const cursorBottom = pos.y;

    // 커서 그리기
    this.backend.beginPath();
    this.backend.setStrokeStyle(this.config.cursorColor);
    this.backend.setLineWidth(2);
    this.backend.moveTo(pos.x, cursorTop);
    this.backend.lineTo(pos.x, cursorBottom);
    this.backend.stroke();
  }

  /** 디버그: Box 경계 표시 */
  renderDebugBounds(box: Box, depth: number = 0): void {
    const colors = ['red', 'green', 'blue', 'orange', 'purple'];
    const color = colors[depth % colors.length];

    const top = box.y - box.height;
    const height = box.height + box.depth;

    this.backend.setStrokeStyle(color);
    this.backend.setLineWidth(1);
    this.backend.setLineDash([2, 2]);
    this.backend.strokeRect(box.x, top, box.width, height);
    this.backend.setLineDash([]);

    // baseline 표시
    this.backend.setStrokeStyle('rgba(0, 0, 0, 0.3)');
    this.backend.beginPath();
    this.backend.moveTo(box.x, box.y);
    this.backend.lineTo(box.x + box.width, box.y);
    this.backend.stroke();

    // 자식들
    if (box.type === 'hbox' || box.type === 'vbox') {
      for (const child of box.children) {
        this.renderDebugBounds(child, depth + 1);
      }
    } else if (box.type === 'surd') {
      this.renderDebugBounds(box.content, depth + 1);
    }
  }
}
