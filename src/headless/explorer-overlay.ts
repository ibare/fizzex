/**
 * ExplorerOverlay — 순수 DOM 기반 전체화면 수식 탐색 오버레이
 *
 * React 없이 동작한다. Headless 어댑터(DOMRendererView, DOMEditorView, DOMStreamView)에서
 * on-demand로 인스턴스를 생성하고, destroy()로 정리한다.
 *
 * 내부 파이프라인: latex → parseLatex → astToBox → layoutBox → buildExplorerMap
 *                 → Projector 2-pass 렌더링 + 호버 하이라이트
 */

import type { RootNode, MathNode } from '../types';
import type { Box, BoxRenderConfig } from '../box/types';
import { CanvasFontMetrics } from '../box/font-metrics';
import { astToBox } from '../box/ast-to-box';
import { layoutBox } from '../box/box-layout';
import { Projector } from '../box/projector';
import { loadMathFont } from '../fonts';
import { parseLatex } from '../latex';
import {
  buildExplorerMap,
  explorerHitTest,
} from '../box/explorer-map';
import type { ExplorerBoxInfo } from '../box/explorer-map';
import { buildSemanticMap } from '../analyzer/semantic-roles';
import type { SemanticResult } from '../analyzer/semantic-roles';

// =========================================================================
// 타입
// =========================================================================

export interface ExplorerOverlayConfig {
  /** LaTeX 문자열. ast가 없으면 필수. */
  latex?: string;
  /** AST 루트. 있으면 parseLatex를 건너뜀. */
  ast?: RootNode;
  /** 테마 (기본 'light') */
  theme?: 'light' | 'dark';
  /** 오버레이 닫힐 때 콜백 */
  onClose?: () => void;
}

// =========================================================================
// ExplorerOverlay 클래스
// =========================================================================

export class ExplorerOverlay {
  // DOM
  private overlay: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private closeBtn: HTMLButtonElement;
  private hintBar: HTMLDivElement;

  // 데이터
  private ast: RootNode;
  private box: Box | null = null;
  private explorerInfos: ExplorerBoxInfo[] = [];
  private semanticMap: Map<string, SemanticResult> = new Map();

  // 뷰포트
  private viewport = { offsetX: 0, offsetY: 0, scale: 1 };

  // 호버
  private hoveredInfo: ExplorerBoxInfo | null = null;
  private ancestors: ExplorerBoxInfo[] = [];

  // 설정
  private config: BoxRenderConfig;
  private isDark: boolean;
  private destroyed = false;
  private onClose?: () => void;

  // Bound handler 참조 (destroy 시 제거)
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseLeave: () => void;
  private boundResize: () => void;
  private boundClose: () => void;

  constructor(cfg: ExplorerOverlayConfig) {
    if (!cfg.latex && !cfg.ast) {
      throw new Error('ExplorerOverlay: latex 또는 ast 중 하나를 제공해야 합니다');
    }

    this.isDark = (cfg.theme ?? 'light') === 'dark';
    this.onClose = cfg.onClose;

    // AST 확보
    this.ast = cfg.ast ?? parseLatex(cfg.latex!) as RootNode;

    // BoxRenderConfig
    this.config = {
      baseFontSize: 24,
      fontFamily: '"NewCMMath", "New Computer Modern Math", "Times New Roman", serif',
      color: this.isDark ? '#e5e5e5' : '#1a1a1a',
      cursorColor: 'transparent',
    };

    // ── DOM 생성 ──

    // 오버레이 컨테이너
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '1000',
      backgroundColor: this.isDark ? '#1a1a1a' : '#f8f9fa',
    });

    // Canvas
    this.canvas = document.createElement('canvas');
    Object.assign(this.canvas.style, {
      width: '100%',
      height: '100%',
      cursor: 'default',
    });
    this.overlay.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('ExplorerOverlay: 2d context 획득 실패');
    this.ctx = ctx;

    // 닫기 버튼
    this.closeBtn = document.createElement('button');
    this.closeBtn.type = 'button';
    this.closeBtn.textContent = '\u2715'; // ✕
    this.closeBtn.title = '닫기 (ESC)';
    Object.assign(this.closeBtn.style, {
      position: 'absolute',
      top: '16px',
      right: '16px',
      width: '36px',
      height: '36px',
      borderRadius: '8px',
      border: 'none',
      background: this.isDark ? '#333' : '#e5e5e5',
      color: this.isDark ? '#ccc' : '#333',
      cursor: 'pointer',
      fontSize: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });
    this.overlay.appendChild(this.closeBtn);

    // 조작 힌트
    this.hintBar = document.createElement('div');
    Object.assign(this.hintBar.style, {
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '16px',
      padding: '8px 16px',
      borderRadius: '8px',
      background: this.isDark ? 'rgba(30,30,30,0.8)' : 'rgba(255,255,255,0.8)',
      color: this.isDark ? '#9ca3af' : '#6b7280',
      fontSize: '13px',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      pointerEvents: 'none',
    });
    const hoverHint = document.createElement('span');
    hoverHint.textContent = '호버: 요소 탐색';
    const escHint = document.createElement('span');
    escHint.textContent = 'ESC: 닫기';
    this.hintBar.appendChild(hoverHint);
    this.hintBar.appendChild(escHint);
    this.overlay.appendChild(this.hintBar);

    // ── DOM 삽입 ──
    document.body.appendChild(this.overlay);

    // ── 이벤트 리스너 ──
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseLeave = this.handleMouseLeave.bind(this);
    this.boundResize = this.handleResize.bind(this);
    this.boundClose = () => this.destroy();

    window.addEventListener('keydown', this.boundKeyDown);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('mouseleave', this.boundMouseLeave);
    window.addEventListener('resize', this.boundResize);
    this.closeBtn.addEventListener('click', this.boundClose);

    // ── 비동기 폰트 로딩 → 빌드 + 렌더 ──
    loadMathFont().then((result) => {
      if (this.destroyed) return;
      if (result.status === 'loaded' && result.fontFamily) {
        this.config = { ...this.config, fontFamily: result.fontFamily };
      }
      this.buildAndRender();
    });

    // 폰트 로딩 전에도 fallback 폰트로 즉시 렌더
    this.buildAndRender();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** 오버레이 정리 — DOM 제거, 이벤트 해제, 데이터 해제 */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    // 이벤트 제거
    window.removeEventListener('keydown', this.boundKeyDown);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mouseleave', this.boundMouseLeave);
    window.removeEventListener('resize', this.boundResize);
    this.closeBtn.removeEventListener('click', this.boundClose);

    // DOM 제거
    document.body.removeChild(this.overlay);

    // 콜백
    this.onClose?.();

    // 참조 해제
    this.box = null;
    this.explorerInfos = [];
    this.semanticMap = new Map();
    this.hoveredInfo = null;
    this.ancestors = [];
    (this as Record<string, unknown>).overlay = null;
    (this as Record<string, unknown>).canvas = null;
    (this as Record<string, unknown>).ctx = null;
    (this as Record<string, unknown>).ast = null;
  }

  // ---------------------------------------------------------------------------
  // 내부 구현
  // ---------------------------------------------------------------------------

  /** AST → Box → Layout → ExplorerMap → SemanticMap → 렌더링 */
  private buildAndRender(): void {
    if (this.destroyed) return;

    // Metrics 생성 (measureText는 Canvas transform에 무관)
    const metrics = new CanvasFontMetrics(this.ctx, this.config);
    const box = astToBox(this.ast, metrics, 1.0, true);
    layoutBox(box, 0, 0);

    this.box = box;
    this.explorerInfos = buildExplorerMap(box, this.ast);
    this.semanticMap = buildSemanticMap(this.ast);

    this.renderCanvas();
  }

  /** Canvas 렌더링 — 2-pass 호버 하이라이트 */
  private renderCanvas(): void {
    if (this.destroyed) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // HiDPI (C4)
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);
    this.ctx.clearRect(0, 0, width, height);

    const box = this.box;
    if (!box) return;

    // C4: Canvas 크기 변경 후 Metrics/Renderer 재생성
    const metrics = new CanvasFontMetrics(this.ctx, this.config);
    const renderer = new Projector(this.ctx, this.config, metrics);

    // Viewport 계산
    const padding = 80;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;
    const boxTotalHeight = box.height + box.depth;

    const scaleX = availableWidth / box.width;
    const scaleY = availableHeight / boxTotalHeight;
    const scale = Math.min(scaleX, scaleY, 5);

    const scaledWidth = box.width * scale;
    const startX = (width - scaledWidth) / 2;
    const startY = height / 2 + (box.height - box.depth) * scale / 2;

    this.viewport = { offsetX: startX, offsetY: startY, scale };

    // 렌더링
    this.ctx.save();
    this.ctx.translate(startX, startY);
    this.ctx.scale(scale, scale);

    if (this.hoveredInfo) {
      const pad = 4 / scale;
      const bounds = this.hoveredInfo.bounds;

      // Pass 1: 전체 dim
      this.ctx.save();
      this.ctx.globalAlpha = 0.25;
      renderer.render(box);
      this.ctx.restore();

      // Pass 2: 호버 요소만 정상 렌더링
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(
        bounds.x - pad, bounds.y - pad,
        bounds.width + pad * 2, bounds.height + pad * 2,
      );
      this.ctx.clip();
      this.ctx.clearRect(
        bounds.x - pad, bounds.y - pad,
        bounds.width + pad * 2, bounds.height + pad * 2,
      );
      this.ctx.globalAlpha = 1.0;
      renderer.render(box);
      this.ctx.restore();

      // 강조 배경
      this.ctx.save();
      this.ctx.fillStyle = this.isDark
        ? 'rgba(96, 165, 250, 0.15)'
        : 'rgba(59, 130, 246, 0.1)';
      this.ctx.beginPath();
      this.ctx.roundRect(
        bounds.x - pad, bounds.y - pad,
        bounds.width + pad * 2, bounds.height + pad * 2,
        4 / scale,
      );
      this.ctx.fill();
      this.ctx.restore();

      // 조상 점선 테두리
      for (const ancestor of this.ancestors) {
        const aBounds = ancestor.bounds;
        this.ctx.save();
        this.ctx.strokeStyle = this.isDark
          ? 'rgba(96, 165, 250, 0.3)'
          : 'rgba(59, 130, 246, 0.2)';
        this.ctx.lineWidth = 1 / scale;
        this.ctx.setLineDash([4 / scale, 4 / scale]);
        this.ctx.strokeRect(
          aBounds.x - pad * 2, aBounds.y - pad * 2,
          aBounds.width + pad * 4, aBounds.height + pad * 4,
        );
        this.ctx.restore();
      }
    } else {
      renderer.render(box);
    }

    this.ctx.restore();

    // 화살표 주석 (스크린 좌표계에서 렌더링)
    this.drawAnnotation();

    // 커서 스타일
    this.canvas.style.cursor = this.hoveredInfo ? 'pointer' : 'default';
  }

  // ---------------------------------------------------------------------------
  // 이벤트 핸들러
  // ---------------------------------------------------------------------------

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.destroy();
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.box || this.explorerInfos.length === 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const { offsetX, offsetY, scale } = this.viewport;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const boxX = (screenX - offsetX) / scale;
    const boxY = (screenY - offsetY) / scale;

    const result = explorerHitTest(boxX, boxY, this.explorerInfos);

    if (result) {
      if (this.hoveredInfo && result.hit.box === this.hoveredInfo.box) return;
      this.hoveredInfo = result.hit;
      this.ancestors = result.ancestors;
    } else {
      if (!this.hoveredInfo) return;
      this.hoveredInfo = null;
      this.ancestors = [];
    }

    this.renderCanvas();
  }

  private handleMouseLeave(): void {
    if (!this.hoveredInfo) return;
    this.hoveredInfo = null;
    this.ancestors = [];
    this.renderCanvas();
  }

  private handleResize(): void {
    this.renderCanvas();
  }

  // ---------------------------------------------------------------------------
  // 화살표 주석 렌더링
  // ---------------------------------------------------------------------------

  /**
   * 판서 스타일 화살표 주석.
   *
   * 기본 형태 (위쪽):
   *   요소에서 출발 → 우상단으로 휘는 곡선 → 끝점에서 우측으로 텍스트
   *   텍스트 읽기 방향(좌→우)과 화살표 흐름이 일치한다.
   *
   * 아래쪽: 거울 반전 (우하단으로 휘고 끝점에서 우측 텍스트).
   * 우측 공간 부족 시: 좌측으로 휘어진 화살표 + 좌측 정렬 텍스트.
   */
  private drawAnnotation(): void {
    if (!this.hoveredInfo?.astNode) return;

    const semantic = this.semanticMap.get(
      (this.hoveredInfo.astNode as MathNode).id,
    );
    if (!semantic) return;

    const { offsetX, offsetY, scale } = this.viewport;
    const bounds = this.hoveredInfo.bounds;
    const ctx = this.ctx;
    const canvasW = window.innerWidth;
    const canvasH = window.innerHeight;

    // ── 요소의 스크린 좌표 ──
    const elemX = bounds.x * scale + offsetX;
    const elemY = bounds.y * scale + offsetY;
    const elemW = bounds.width * scale;
    const elemH = bounds.height * scale;
    const elemCX = elemX + elemW / 2;
    const elemCY = elemY + elemH / 2;

    // ── 색상 ──
    const accentColor = this.isDark ? '#9ca3af' : '#555555';
    const roleColor = this.isDark ? '#e5e5e5' : '#1a1a1a';
    const descColor = this.isDark ? '#9ca3af' : '#6b7280';

    // ── 텍스트 측정 ──
    const sysFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const roleFontSize = 18;
    const descFontSize = 15;
    const lineGap = 6;

    ctx.save();

    ctx.font = `600 ${roleFontSize}px ${sysFont}`;
    const roleText = semantic.role;
    const roleW = ctx.measureText(roleText).width;

    ctx.font = `${descFontSize}px ${sysFont}`;
    const descText = semantic.description;
    const descW = ctx.measureText(descText).width;

    const textW = Math.max(roleW, descW);
    const textH = roleFontSize + lineGap + descFontSize;

    // ── 상/하 결정 ──
    const placeAbove = elemCY <= canvasH / 2;

    // ── 좌/우 결정: 기본은 우측, 공간 부족 시 좌측 ──
    const rightMargin = 60;
    const goRight = elemCX + textW + rightMargin < canvasW;

    // ── 화살표: 요소에서 출발 → 여백 영역의 끝점으로 ──
    const arrowStartX = elemCX;
    const arrowStartY = placeAbove ? elemY - 6 : elemY + elemH + 6;

    // 끝점: 화면 여백 영역 (상단 15% / 하단 85%)
    const targetY = placeAbove ? canvasH * 0.15 : canvasH * 0.85;
    // 수평: 요소에서 우측(또는 좌측)으로 충분히 이동
    const horizReach = Math.min(180, canvasW * 0.15);
    let arrowEndX = goRight ? elemCX + horizReach : elemCX - horizReach;
    const arrowEndY = targetY;

    // 끝점 클램핑
    const margin = 40;
    arrowEndX = Math.max(margin, Math.min(canvasW - margin - textW, arrowEndX));

    // ── Bezier 곡선 — 자연스러운 호 ──
    // 제어점: 요소 바로 위(또는 아래)에서 수직으로 올라간 뒤 수평으로 전환
    // → (startX, endY): 시작점의 X + 끝점의 Y → 수직 출발 후 우측 스윕
    const cpX = arrowStartX;
    const cpY = arrowEndY;

    // ── 곡선 그리기 ──
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(arrowStartX, arrowStartY);
    ctx.quadraticCurveTo(cpX, cpY, arrowEndX, arrowEndY);
    ctx.stroke();

    // ── 화살촉 (요소 쪽, 시작점) ──
    const headLen = 10;
    const spread = Math.PI / 7;
    // 접선: 시작점에서의 방향 = 시작점→제어점
    const tanX = arrowStartX - cpX;
    const tanY = arrowStartY - cpY;
    const angle = Math.atan2(tanY, tanX);

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(arrowStartX, arrowStartY);
    ctx.lineTo(
      arrowStartX - headLen * Math.cos(angle - spread),
      arrowStartY - headLen * Math.sin(angle - spread),
    );
    ctx.lineTo(
      arrowStartX - headLen * Math.cos(angle + spread),
      arrowStartY - headLen * Math.sin(angle + spread),
    );
    ctx.closePath();
    ctx.fill();

    // ── 텍스트: 화살표 끝점에서 이어서 렌더링 ──
    const textX = goRight ? arrowEndX + 8 : arrowEndX - textW - 8;
    const textBaseY = arrowEndY - roleFontSize / 2 - lineGap / 2;

    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    ctx.font = `600 ${roleFontSize}px ${sysFont}`;
    ctx.fillStyle = roleColor;
    ctx.fillText(roleText, textX, textBaseY);

    ctx.font = `${descFontSize}px ${sysFont}`;
    ctx.fillStyle = descColor;
    ctx.fillText(descText, textX, textBaseY + roleFontSize + lineGap);

    ctx.restore();
  }
}
