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
import { buildSemanticMap, getCatalogDetail } from '../analyzer/semantic-roles';
import type { SemanticResult } from '../analyzer/semantic-roles';
import { getVisualizerIdForCatalog } from '../analyzer/semantic/loader';
import { ExplorerVisualizerController } from './explorer-visualizer';
import { ExplorerControlsPanel } from './explorer-controls';
import { getControlType, buildInlineControlConfig } from './inline-control-types';
import type { InlineControlConfig } from './inline-control-types';
import { ExplorerInlineControls } from './explorer-inline-controls';
import {
  createModificationState,
  modifyNumberNode,
  resetNode,
  hasModifications,
} from './ast-modifier';
import type { AstModificationState } from './ast-modifier';
import type { CatalogDetail } from '../analyzer/semantic/types';
import type { ParameterValues } from '../visualizer/types';
import { evaluateAst } from '../visualizer/evaluator';

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
  private catalogBanner: HTMLDivElement;

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

  // 선택 (클릭)
  private selectedInfo: ExplorerBoxInfo | null = null;
  private inlineControl: ExplorerInlineControls | null = null;
  private astModState: AstModificationState | null = null;
  private catalogDetail: CatalogDetail | null = null;
  private localParamValues: ParameterValues = {};
  private bridgeUnsubscribe: (() => void) | null = null;

  // 설정
  private config: BoxRenderConfig;
  private isDark: boolean;
  private destroyed = false;
  private onClose?: () => void;

  // Visualizer 통합
  private vizController: ExplorerVisualizerController | null = null;
  private vizControls: ExplorerControlsPanel | null = null;
  private vizContainer: HTMLDivElement | null = null;
  private controlsContainer: HTMLDivElement | null = null;
  private contentWrapper: HTMLDivElement | null = null;

  // Bound handler 참조 (destroy 시 제거)
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseLeave: () => void;
  private boundClick: (e: MouseEvent) => void;
  private boundTouchStart: (e: TouchEvent) => void;
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
    const clickHint = document.createElement('span');
    clickHint.textContent = '클릭: 값 조절';
    const escHint = document.createElement('span');
    escHint.textContent = 'ESC: 닫기';
    this.hintBar.appendChild(hoverHint);
    this.hintBar.appendChild(clickHint);
    this.hintBar.appendChild(escHint);
    this.overlay.appendChild(this.hintBar);

    // 카탈로그 배너 (초기 숨김)
    this.catalogBanner = document.createElement('div');
    Object.assign(this.catalogBanner.style, {
      position: 'absolute',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'none',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 18px',
      borderRadius: '10px',
      background: this.isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(8px)',
      color: this.isDark ? '#e5e5e5' : '#1a1a1a',
      fontSize: '14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      maxWidth: '70%',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      boxShadow: this.isDark
        ? '0 2px 8px rgba(0,0,0,0.3)'
        : '0 2px 8px rgba(0,0,0,0.08)',
    });
    this.overlay.appendChild(this.catalogBanner);

    // ── DOM 삽입 ──
    document.body.appendChild(this.overlay);

    // ── 이벤트 리스너 ──
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseLeave = this.handleMouseLeave.bind(this);
    this.boundClick = this.handleClick.bind(this);
    this.boundTouchStart = this.handleTouchStart.bind(this);
    this.boundResize = this.handleResize.bind(this);
    this.boundClose = () => this.destroy();

    window.addEventListener('keydown', this.boundKeyDown);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('mouseleave', this.boundMouseLeave);
    this.canvas.addEventListener('click', this.boundClick);
    this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
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

    // 인라인 컨트롤 정리
    this.bridgeUnsubscribe?.();
    this.bridgeUnsubscribe = null;
    this.inlineControl?.destroy();
    this.inlineControl = null;

    // Visualizer 정리
    this.vizControls?.destroy();
    this.vizController?.destroy();

    // 이벤트 제거
    window.removeEventListener('keydown', this.boundKeyDown);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mouseleave', this.boundMouseLeave);
    this.canvas.removeEventListener('click', this.boundClick);
    this.canvas.removeEventListener('touchstart', this.boundTouchStart);
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
    this.selectedInfo = null;
    this.astModState = null;
    this.catalogDetail = null;
    this.vizController = null;
    this.vizControls = null;
    this.vizContainer = null;
    this.controlsContainer = null;
    this.contentWrapper = null;
    (this as Record<string, unknown>).overlay = null;
    (this as Record<string, unknown>).canvas = null;
    (this as Record<string, unknown>).ctx = null;
    (this as Record<string, unknown>).catalogBanner = null;
    (this as Record<string, unknown>).ast = null;
  }

  // ---------------------------------------------------------------------------
  // 내부 구현
  // ---------------------------------------------------------------------------

  /** AST → Box → Layout → ExplorerMap → SemanticMap → 렌더링 */
  private buildAndRender(overrideAst?: RootNode): void {
    if (this.destroyed) return;

    const ast = overrideAst ?? this.ast;

    // Metrics 생성 (measureText는 Canvas transform에 무관)
    const metrics = new CanvasFontMetrics(this.ctx, this.config);
    const box = astToBox(ast, metrics, 1.0, true);
    layoutBox(box, 0, 0);

    this.box = box;
    this.explorerInfos = buildExplorerMap(box, ast);
    this.semanticMap = buildSemanticMap(ast);

    // 카탈로그 상세 캐싱
    if (!this.catalogDetail) {
      const rootSemantic = this.semanticMap.get(ast.id);
      if (rootSemantic?.catalogId && rootSemantic.catalogCategory) {
        this.catalogDetail = getCatalogDetail(rootSemantic.catalogId, rootSemantic.catalogCategory) ?? null;
      }
    }

    this.updateCatalogBanner();
    this.renderCanvas();

    // 선택된 요소가 있으면 재매핑 (AST 수정으로 explorerInfos가 재구축되었을 수 있음)
    if (this.selectedInfo) {
      const nodeId = this.selectedInfo.astNode?.id;
      if (nodeId) {
        const newInfo = this.explorerInfos.find(
          (info) => info.astNode?.id === nodeId,
        );
        if (newInfo) {
          this.selectedInfo = newInfo;
          this.updateInlineControlPosition();
        } else {
          this.clearSelection();
        }
      }
    }
  }

  /** Visualizer 레이아웃 초기화 (카탈로그 매칭 + visualizerId 있을 때만) */
  private initVisualizer(): void {
    const rootSemantic = this.semanticMap.get(this.ast.id);
    if (!rootSemantic?.catalogId || !rootSemantic.catalogCategory) return;

    const visualizerId = getVisualizerIdForCatalog(rootSemantic.catalogId);
    if (!visualizerId) return;

    // 이미 초기화되었으면 스킵
    if (this.vizController) return;

    const detail = getCatalogDetail(rootSemantic.catalogId, rootSemantic.catalogCategory);

    // DOM 레이아웃 재구성: 수식 전체화면 + Visualizer 우상단 플로팅 + 하단 컨트롤
    this.contentWrapper = document.createElement('div');
    Object.assign(this.contentWrapper.style, {
      position: 'absolute',
      inset: '0',
      display: 'flex',
      flexDirection: 'column',
    });

    // 수식 영역 (전체)
    const formulaPane = document.createElement('div');
    Object.assign(formulaPane.style, {
      flex: '1',
      position: 'relative',
      minHeight: '0',
    });
    this.canvas.style.position = 'absolute';
    this.canvas.style.inset = '0';
    formulaPane.appendChild(this.canvas);

    // Visualizer 영역: 우상단 플로팅 (30% 크기)
    this.vizContainer = document.createElement('div');
    Object.assign(this.vizContainer.style, {
      position: 'absolute',
      top: '60px',
      right: '16px',
      width: '30%',
      maxWidth: '400px',
      minWidth: '200px',
      aspectRatio: '1',
      borderRadius: '12px',
      overflow: 'hidden',
      background: this.isDark ? 'rgba(20, 20, 20, 0.9)' : 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(8px)',
      boxShadow: this.isDark
        ? '0 4px 24px rgba(0,0,0,0.5)'
        : '0 4px 24px rgba(0,0,0,0.12)',
      border: this.isDark
        ? '1px solid rgba(255,255,255,0.08)'
        : '1px solid rgba(0,0,0,0.06)',
      zIndex: '1',
    });
    formulaPane.appendChild(this.vizContainer);

    this.contentWrapper.appendChild(formulaPane);

    // 하단: 컨트롤 패널
    this.controlsContainer = document.createElement('div');
    Object.assign(this.controlsContainer.style, {
      borderTop: this.isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
      maxHeight: '35%',
      overflowY: 'auto',
    });
    this.contentWrapper.appendChild(this.controlsContainer);

    // 오버레이에 삽입 (기존 요소들 앞에)
    this.overlay.insertBefore(this.contentWrapper, this.overlay.firstChild);

    // Visualizer 컨트롤러 + 컨트롤 패널 생성 (비동기)
    this.vizController = new ExplorerVisualizerController(this.vizContainer, this.isDark ? 'dark' : 'light');
    this.vizController.init(visualizerId, detail).then((ok) => {
      if (!ok || this.destroyed || !this.vizController || !this.controlsContainer) return;

      const bridge = this.vizController.bridge;
      const viz = this.vizController.viz;
      if (!bridge || !viz) return;

      this.vizControls = new ExplorerControlsPanel(
        this.controlsContainer,
        bridge,
        viz.parameters,
        viz.presets,
        viz.derivedValues,
        this.isDark ? 'dark' : 'light',
      );
    });
  }

  /** Canvas 렌더링 — 2-pass 호버 하이라이트 */
  private renderCanvas(): void {
    if (this.destroyed) return;

    // Visualizer 활성 시 canvas 부모(formulaPane) 크기, 아니면 전체 화면
    const pane = this.canvas.parentElement;
    const width = (this.contentWrapper && pane) ? pane.clientWidth : window.innerWidth;
    const height = (this.contentWrapper && pane) ? pane.clientHeight : window.innerHeight;

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

    // 하이라이트 대상: 선택 > 호버
    const activeInfo = this.selectedInfo ?? this.hoveredInfo;

    if (activeInfo) {
      const pad = 4 / scale;
      const bounds = activeInfo.bounds;
      const isSelected = !!this.selectedInfo;

      // Pass 1: 전체 dim
      this.ctx.save();
      this.ctx.globalAlpha = 0.25;
      renderer.render(box);
      this.ctx.restore();

      // Pass 2: 활성 요소만 정상 렌더링
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

      // 강조 배경 (선택 시 더 강한 accent)
      this.ctx.save();
      this.ctx.fillStyle = isSelected
        ? (this.isDark ? 'rgba(96, 165, 250, 0.25)' : 'rgba(59, 130, 246, 0.18)')
        : (this.isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(59, 130, 246, 0.1)');
      this.ctx.beginPath();
      this.ctx.roundRect(
        bounds.x - pad, bounds.y - pad,
        bounds.width + pad * 2, bounds.height + pad * 2,
        4 / scale,
      );
      this.ctx.fill();
      this.ctx.restore();

      // 선택 시: solid 테두리 추가
      if (isSelected) {
        this.ctx.save();
        this.ctx.strokeStyle = this.isDark
          ? 'rgba(96, 165, 250, 0.6)'
          : 'rgba(59, 130, 246, 0.4)';
        this.ctx.lineWidth = 2 / scale;
        this.ctx.beginPath();
        this.ctx.roundRect(
          bounds.x - pad, bounds.y - pad,
          bounds.width + pad * 2, bounds.height + pad * 2,
          4 / scale,
        );
        this.ctx.stroke();
        this.ctx.restore();
      }

      // 조상 점선 테두리 (호버 시에만)
      const activeAncestors = this.selectedInfo ? [] : this.ancestors;
      for (const ancestor of activeAncestors) {
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

      // 호버가 선택과 다른 요소일 때: 호버 요소에 lighter 하이라이트
      if (this.selectedInfo && this.hoveredInfo && this.hoveredInfo !== this.selectedInfo) {
        const hBounds = this.hoveredInfo.bounds;
        this.ctx.save();
        this.ctx.strokeStyle = this.isDark
          ? 'rgba(96, 165, 250, 0.25)'
          : 'rgba(59, 130, 246, 0.15)';
        this.ctx.lineWidth = 1 / scale;
        this.ctx.setLineDash([3 / scale, 3 / scale]);
        this.ctx.strokeRect(
          hBounds.x - pad, hBounds.y - pad,
          hBounds.width + pad * 2, hBounds.height + pad * 2,
        );
        this.ctx.restore();
      }
    } else {
      renderer.render(box);
    }

    // 조절 가능 요소 시각적 단서 (선택이 없고 호버도 없을 때)
    if (!activeInfo) {
      this.drawAdjustableCues(scale);
    }

    this.ctx.restore();

    // 화살표 주석 (스크린 좌표계에서 렌더링)
    this.drawAnnotation();

    // 커서 스타일
    if (this.hoveredInfo?.astNode) {
      const ct = getControlType(this.hoveredInfo.astNode, this.catalogDetail);
      this.canvas.style.cursor = (ct === 'slider' || ct === 'stepper') ? 'pointer' : 'help';
    } else {
      this.canvas.style.cursor = 'default';
    }
  }

  // ---------------------------------------------------------------------------
  // 이벤트 핸들러
  // ---------------------------------------------------------------------------

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (this.selectedInfo) {
        this.clearSelection();
        this.renderCanvas();
      } else {
        this.destroy();
      }
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

  private handleClick(e: MouseEvent): void {
    if (!this.box || this.explorerInfos.length === 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const { offsetX, offsetY, scale } = this.viewport;
    const boxX = (e.clientX - rect.left - offsetX) / scale;
    const boxY = (e.clientY - rect.top - offsetY) / scale;

    const result = explorerHitTest(boxX, boxY, this.explorerInfos);

    if (result) {
      // 같은 요소 클릭 → 토글
      if (this.selectedInfo && result.hit.box === this.selectedInfo.box) {
        this.clearSelection();
      } else {
        this.selectedInfo = result.hit;
        this.openInlineControl();
      }
    } else {
      // 빈 곳 클릭 → 선택 해제
      this.clearSelection();
    }

    this.renderCanvas();
  }

  private handleTouchStart(e: TouchEvent): void {
    if (!this.box || this.explorerInfos.length === 0) return;
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const { offsetX, offsetY, scale } = this.viewport;
    const boxX = (touch.clientX - rect.left - offsetX) / scale;
    const boxY = (touch.clientY - rect.top - offsetY) / scale;

    const result = explorerHitTest(boxX, boxY, this.explorerInfos);

    if (result) {
      e.preventDefault();
      if (this.selectedInfo && result.hit.box === this.selectedInfo.box) {
        this.clearSelection();
      } else {
        this.selectedInfo = result.hit;
        this.hoveredInfo = result.hit;
        this.ancestors = result.ancestors;
        this.openInlineControl();
      }
      this.renderCanvas();
    } else if (this.selectedInfo) {
      this.clearSelection();
      this.renderCanvas();
    }
  }

  private handleResize(): void {
    if (this.vizController && this.vizContainer) {
      const rect = this.vizContainer.getBoundingClientRect();
      this.vizController.resize(rect.width, rect.height);
    }
    this.renderCanvas();
    this.updateInlineControlPosition();
  }

  // ---------------------------------------------------------------------------
  // 선택 + 인라인 컨트롤
  // ---------------------------------------------------------------------------

  private clearSelection(): void {
    this.selectedInfo = null;
    this.inlineControl?.destroy();
    this.inlineControl = null;
    this.bridgeUnsubscribe?.();
    this.bridgeUnsubscribe = null;
  }

  private openInlineControl(): void {
    const info = this.selectedInfo;
    if (!info?.astNode) return;

    // 기존 컨트롤 제거
    this.inlineControl?.destroy();
    this.inlineControl = null;

    const node = info.astNode;
    const semantic = this.semanticMap.get(node.id);
    const bridge = this.vizController?.bridge ?? null;

    const config = buildInlineControlConfig(
      node,
      semantic,
      this.catalogDetail,
      bridge,
      this.localParamValues,
    );

    // 'none' 타입이면 컨트롤 없음
    if (config.controlType === 'none') return;

    // AST 수정 상태 초기화 (스테퍼용 — 최초 1회)
    if (!this.astModState) {
      this.astModState = createModificationState(this.ast);
    }

    const showReset = this.astModState.modifications.has(node.id);
    const parent = this.contentWrapper ?? this.overlay;

    this.inlineControl = new ExplorerInlineControls(
      parent,
      config,
      {
        onValueChange: (id, value) => this.handleInlineValueChange(id, value, config),
        onReset: (nodeId) => this.handleInlineReset(nodeId),
      },
      this.isDark,
      showReset,
    );

    this.updateInlineControlPosition();

    // Bridge → 인라인 컨트롤 동기화 (Visualizer 드래그/컨트롤 패널 변경 시)
    this.bridgeUnsubscribe?.();
    this.bridgeUnsubscribe = null;
    if (bridge && config.controlType === 'slider' && config.paramId) {
      const paramId = config.paramId;
      this.bridgeUnsubscribe = bridge.subscribe((params, source) => {
        if (source === 'inline') return; // 자기 자신의 변경은 무시
        if (paramId in params) {
          this.inlineControl?.updateValue(params[paramId]);
        }
      });
    }
  }

  private handleInlineValueChange(id: string, value: number, config: InlineControlConfig): void {
    if (config.controlType === 'slider') {
      // 변수 슬라이더: bridge 또는 로컬 파라미터 업데이트
      const bridge = this.vizController?.bridge;
      if (bridge) {
        bridge.setParam(id, value, 'inline');
      } else {
        this.localParamValues[id] = value;
      }
    } else if (config.controlType === 'stepper' && this.astModState) {
      // 숫자 스테퍼: AST 수정 → 재렌더링
      const modifiedAst = modifyNumberNode(this.astModState, id, value);
      this.buildAndRender(modifiedAst);
      this.inlineControl?.setResetVisible(true);
    }
  }

  private handleInlineReset(nodeId: string): void {
    if (!this.astModState) return;
    const modifiedAst = resetNode(this.astModState, nodeId);
    this.buildAndRender(modifiedAst);
    this.inlineControl?.setResetVisible(hasModifications(this.astModState));

    // 리셋 후 스테퍼 값도 업데이트
    const node = this.selectedInfo?.astNode;
    if (node?.type === 'number') {
      this.inlineControl?.updateValue(parseFloat(node.value));
    }
  }

  private updateInlineControlPosition(): void {
    if (!this.inlineControl || !this.selectedInfo?.astNode) return;

    const semantic = this.semanticMap.get(this.selectedInfo.astNode.id);
    if (!semantic) return;

    const layout = this.getAnnotationLayout(this.selectedInfo, semantic);
    if (!layout) return;

    // 인라인 컨트롤은 주석 텍스트 아래에 위치
    const controlX = layout.textX;
    const controlY = layout.textBaseY + layout.textH + 12;

    this.inlineControl.updatePosition(controlX, controlY);
  }

  // ---------------------------------------------------------------------------
  // 조절 가능 요소 시각적 단서
  // ---------------------------------------------------------------------------

  /** 조절 가능한 변수/숫자에 미세한 점선 밑줄을 그린다 (Box 좌표계) */
  private drawAdjustableCues(scale: number): void {
    if (!this.explorerInfos.length) return;

    const ctx = this.ctx;

    for (const info of this.explorerInfos) {
      if (!info.astNode) continue;
      const ct = getControlType(info.astNode, this.catalogDetail);
      if (ct !== 'slider' && ct !== 'stepper') continue;

      const bounds = info.bounds;
      const bottomY = bounds.y + bounds.height;

      ctx.save();
      ctx.strokeStyle = this.isDark
        ? 'rgba(96, 165, 250, 0.15)'
        : 'rgba(59, 130, 246, 0.12)';
      ctx.lineWidth = 1 / scale;
      ctx.setLineDash([2 / scale, 3 / scale]);
      ctx.beginPath();
      ctx.moveTo(bounds.x, bottomY + 2 / scale);
      ctx.lineTo(bounds.x + bounds.width, bottomY + 2 / scale);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // 카탈로그 배너
  // ---------------------------------------------------------------------------

  /** 카탈로그 매칭 시 상단 배너에 수식명 표시 */
  private updateCatalogBanner(): void {
    const rootSemantic = this.semanticMap.get(this.ast.id);
    if (!rootSemantic?.catalogId || !rootSemantic.catalogCategory) {
      this.catalogBanner.style.display = 'none';
      return;
    }

    const detail = getCatalogDetail(rootSemantic.catalogId, rootSemantic.catalogCategory);
    if (!detail) {
      this.catalogBanner.style.display = 'none';
      return;
    }

    this.catalogBanner.innerHTML = '';

    const confidence = rootSemantic.confidence ?? 0;
    const isUnsure = confidence < 0.8;

    const nameSpan = document.createElement('span');
    nameSpan.style.fontWeight = '600';
    nameSpan.textContent = isUnsure ? `${detail.name}와(과) 유사` : detail.name;

    const sepSpan = document.createElement('span');
    sepSpan.textContent = ' — ';
    sepSpan.style.color = this.isDark ? '#6b7280' : '#9ca3af';

    const descSpan = document.createElement('span');
    descSpan.style.color = this.isDark ? '#9ca3af' : '#6b7280';
    descSpan.textContent = detail.oneLiner;

    this.catalogBanner.appendChild(nameSpan);
    this.catalogBanner.appendChild(sepSpan);
    this.catalogBanner.appendChild(descSpan);

    // Visualizer 활성화 아이콘 (visualizerId가 있고, 아직 로드 안 됐을 때)
    const visualizerId = getVisualizerIdForCatalog(rootSemantic.catalogId);
    if (visualizerId && !this.vizController) {
      const vizBtn = document.createElement('button');
      vizBtn.type = 'button';
      vizBtn.title = '시각화 활성화';
      vizBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">'
        + '<path d="M2 12V4l4 4-4 4zm5-4l4-4v8l-4-4zm5-4v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
        + '</svg>';
      Object.assign(vizBtn.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: '10px',
        padding: '4px 8px',
        border: 'none',
        borderRadius: '6px',
        background: this.isDark ? 'rgba(96,165,250,0.15)' : 'rgba(59,130,246,0.1)',
        color: this.isDark ? '#60a5fa' : '#3b82f6',
        cursor: 'pointer',
        fontSize: '12px',
        gap: '4px',
        pointerEvents: 'auto',
        whiteSpace: 'nowrap',
      });

      const label = document.createElement('span');
      label.textContent = '시각화';
      label.style.fontSize = '12px';
      vizBtn.appendChild(label);

      vizBtn.addEventListener('click', () => {
        this.initVisualizer();
        // 활성화 후 버튼을 "활성" 상태로 변경
        vizBtn.style.opacity = '0.5';
        vizBtn.style.pointerEvents = 'none';
        label.textContent = '로딩…';
      });

      this.catalogBanner.appendChild(vizBtn);
    }

    this.catalogBanner.style.display = 'flex';
    this.catalogBanner.style.pointerEvents = 'auto';
  }

  // ---------------------------------------------------------------------------
  // 화살표 주석 렌더링
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // 화살표 주석: 레이아웃 계산 + 렌더링 분리
  // ---------------------------------------------------------------------------

  /** Canvas 텍스트를 maxWidth 이내로 단어 단위 줄바꿈 */
  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
  ): string[] {
    if (ctx.measureText(text).width <= maxWidth) return [text];

    const words = text.split(' ');
    const lines: string[] = [];
    let cur = '';

    for (const word of words) {
      const test = cur ? cur + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && cur) {
        lines.push(cur);
        cur = word;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);

    return lines.length > 0 ? lines : [text];
  }

  /** 주석 레이아웃 정보 */
  private getAnnotationLayout(
    info: ExplorerBoxInfo,
    semantic: SemanticResult,
  ): {
    textX: number; textBaseY: number; textW: number; textH: number;
    arrowStartX: number; arrowStartY: number;
    arrowEndX: number; arrowEndY: number;
    goRight: boolean; cpX: number; cpY: number;
    roleText: string; descLines: string[];
  } | null {
    if (!info.astNode) return null;

    const { offsetX, offsetY, scale } = this.viewport;
    const bounds = info.bounds;
    const ctx = this.ctx;
    const pane = this.canvas.parentElement;
    const canvasW = (this.contentWrapper && pane) ? pane.clientWidth : window.innerWidth;
    const canvasH = (this.contentWrapper && pane) ? pane.clientHeight : window.innerHeight;

    // 요소의 스크린 좌표
    const elemX = bounds.x * scale + offsetX;
    const elemY = bounds.y * scale + offsetY;
    const elemW = bounds.width * scale;
    const elemH = bounds.height * scale;
    const elemCX = elemX + elemW / 2;
    const elemCY = elemY + elemH / 2;

    // 텍스트 측정
    const sysFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const roleFontSize = 18;
    const descFontSize = 15;
    const lineGap = 6;

    // 최대 텍스트 폭 — 캔버스의 35%, 최대 400px
    const maxTextW = Math.min(canvasW * 0.35, 400);

    ctx.save();
    ctx.font = `600 ${roleFontSize}px ${sysFont}`;
    const roleText = semantic.role;
    const roleW = ctx.measureText(roleText).width;

    ctx.font = `${descFontSize}px ${sysFont}`;
    const descLines = this.wrapText(ctx, semantic.description, maxTextW);
    const descLineH = descFontSize + 4;
    let descMaxLineW = 0;
    for (const line of descLines) {
      descMaxLineW = Math.max(descMaxLineW, ctx.measureText(line).width);
    }
    ctx.restore();

    const textW = Math.max(Math.min(roleW, maxTextW), descMaxLineW);
    const textH = roleFontSize + lineGap + descLineH * descLines.length;

    // 상/하 결정
    const placeAbove = elemCY <= canvasH / 2;

    // 좌/우 결정
    const rightMargin = 60;
    const goRight = elemCX + textW + rightMargin < canvasW;

    // 화살표
    const arrowStartX = elemCX;
    const arrowStartY = placeAbove ? elemY - 6 : elemY + elemH + 6;
    const targetY = placeAbove ? canvasH * 0.15 : canvasH * 0.85;
    const horizReach = Math.min(180, canvasW * 0.15);
    let arrowEndX = goRight ? elemCX + horizReach : elemCX - horizReach;
    const arrowEndY = targetY;

    const margin = 40;
    arrowEndX = Math.max(margin, Math.min(canvasW - margin - textW, arrowEndX));

    const cpX = arrowStartX;
    const cpY = arrowEndY;

    const textX = goRight ? arrowEndX + 8 : arrowEndX - textW - 8;
    const textBaseY = arrowEndY - roleFontSize / 2 - lineGap / 2;

    return {
      textX, textBaseY, textW, textH,
      arrowStartX, arrowStartY, arrowEndX, arrowEndY,
      goRight, cpX, cpY, roleText, descLines,
    };
  }

  /**
   * 판서 스타일 화살표 주석.
   *
   * 활성 요소(선택 또는 호버)에 대해 화살표 + 의미 설명을 렌더링한다.
   */
  private drawAnnotation(): void {
    const activeInfo = this.selectedInfo ?? this.hoveredInfo;
    if (!activeInfo?.astNode) return;

    const semantic = this.semanticMap.get(activeInfo.astNode.id);
    if (!semantic) return;

    const layout = this.getAnnotationLayout(activeInfo, semantic);
    if (!layout) return;

    const ctx = this.ctx;
    const accentColor = this.isDark ? '#9ca3af' : '#555555';
    const roleColor = this.isDark ? '#e5e5e5' : '#1a1a1a';
    const descColor = this.isDark ? '#9ca3af' : '#6b7280';
    const sysFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const roleFontSize = 18;
    const descFontSize = 15;
    const lineGap = 6;

    ctx.save();

    // 곡선 그리기
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(layout.arrowStartX, layout.arrowStartY);
    ctx.quadraticCurveTo(layout.cpX, layout.cpY, layout.arrowEndX, layout.arrowEndY);
    ctx.stroke();

    // 화살촉
    const headLen = 10;
    const spread = Math.PI / 7;
    const tanX = layout.arrowStartX - layout.cpX;
    const tanY = layout.arrowStartY - layout.cpY;
    const angle = Math.atan2(tanY, tanX);

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(layout.arrowStartX, layout.arrowStartY);
    ctx.lineTo(
      layout.arrowStartX - headLen * Math.cos(angle - spread),
      layout.arrowStartY - headLen * Math.sin(angle - spread),
    );
    ctx.lineTo(
      layout.arrowStartX - headLen * Math.cos(angle + spread),
      layout.arrowStartY - headLen * Math.sin(angle + spread),
    );
    ctx.closePath();
    ctx.fill();

    // 텍스트
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    ctx.font = `600 ${roleFontSize}px ${sysFont}`;
    ctx.fillStyle = roleColor;
    ctx.fillText(layout.roleText, layout.textX, layout.textBaseY);

    ctx.font = `${descFontSize}px ${sysFont}`;
    ctx.fillStyle = descColor;
    const descLineH = descFontSize + 4;
    const descStartY = layout.textBaseY + roleFontSize + lineGap;
    for (let i = 0; i < layout.descLines.length; i++) {
      ctx.fillText(layout.descLines[i], layout.textX, descStartY + i * descLineH);
    }

    ctx.restore();
  }
}
