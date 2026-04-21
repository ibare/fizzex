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
import { getVisualizersForCatalog } from '../analyzer/semantic/loader';
import type { VisualizerRef } from '../analyzer/semantic/types';
import type { VisualizerRegistry } from '../visualizer';
import { VizPanel } from './explorer-viz-panel';
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
import type { CreatedVisualizer } from '../visualizer/runtime/public-api';

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
  /**
   * 시각화 패널용 registry. 주입 시 탐색 배너에 시각화 버튼이 렌더된다.
   * 미주입 시 탐색 UX(호버·선택·값 편집)는 그대로 동작하되 시각화 버튼은 숨김.
   */
  visualizerRegistry?: VisualizerRegistry;
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

  // 뷰포트 — userOverridden=true면 renderCanvas의 fit-to-screen 재계산 스킵
  private viewport = { offsetX: 0, offsetY: 0, scale: 1, userOverridden: false };

  // 팬 상태 — 좌클릭 또는 단일 터치 드래그 중일 때만 non-null
  private panState: {
    startX: number;
    startY: number;
    origOffsetX: number;
    origOffsetY: number;
  } | null = null;
  private panMoved = false;

  // 호버
  private hoveredInfo: ExplorerBoxInfo | null = null;
  private ancestors: ExplorerBoxInfo[] = [];

  // 선택 (클릭) + 인라인 컨트롤
  private selectedInfo: ExplorerBoxInfo | null = null;
  private inlineControl: ExplorerInlineControls | null = null;
  private activeControlNodeId: string | null = null;
  private astModState: AstModificationState | null = null;
  private catalogDetail: CatalogDetail | null = null;
  private localParamValues: Record<string, number> = {};
  private paramsUnsubscribe: (() => void) | null = null;

  // 설정
  private config: BoxRenderConfig;
  private isDark: boolean;
  private destroyed = false;
  private onClose?: () => void;
  private visualizerRegistry: VisualizerRegistry | null;

  // Visualizer 통합 — 다중 패널 지원 (현재는 1개 생성, 구조는 N개 대응)
  private vizPanels: VizPanel[] = [];
  private valueBadgeUnsub: (() => void) | null = null;
  private contentWrapper: HTMLDivElement | null = null;
  private formulaPane: HTMLDivElement | null = null;

  /** Inline 컨트롤·값 배지가 참조하는 primary instance (배열 0번째 패널) */
  private get primaryInstance(): CreatedVisualizer | null {
    return this.vizPanels[0]?.instance ?? null;
  }

  // Bound handler 참조 (destroy 시 제거)
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseLeave: (e: MouseEvent) => void;
  private boundClick: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundWheel: (e: WheelEvent) => void;
  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;
  private boundPanMove: (e: MouseEvent) => void;
  private boundPanEnd: (e: MouseEvent) => void;
  private boundResize: () => void;
  private boundClose: () => void;

  constructor(cfg: ExplorerOverlayConfig) {
    if (!cfg.latex && !cfg.ast) {
      throw new Error('ExplorerOverlay: latex 또는 ast 중 하나를 제공해야 합니다');
    }

    this.isDark = (cfg.theme ?? 'light') === 'dark';
    this.onClose = cfg.onClose;
    this.visualizerRegistry = cfg.visualizerRegistry ?? null;

    // AST 확보
    this.ast = cfg.ast ?? parseLatex(cfg.latex!).ast;

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
    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundWheel = this.handleWheel.bind(this);
    this.boundTouchStart = this.handleTouchStart.bind(this);
    this.boundTouchMove = this.handleTouchMove.bind(this);
    this.boundTouchEnd = this.handleTouchEnd.bind(this);
    this.boundPanMove = this.handlePanMove.bind(this);
    this.boundPanEnd = this.handlePanEnd.bind(this);
    this.boundResize = this.handleResize.bind(this);
    this.boundClose = () => this.destroy();

    window.addEventListener('keydown', this.boundKeyDown);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('mouseleave', this.boundMouseLeave);
    this.canvas.addEventListener('click', this.boundClick);
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('wheel', this.boundWheel, { passive: false });
    this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.boundTouchEnd);
    window.addEventListener('mousemove', this.boundPanMove);
    window.addEventListener('mouseup', this.boundPanEnd);
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
    this.paramsUnsubscribe?.();
    this.paramsUnsubscribe = null;
    this.inlineControl?.destroy();
    this.inlineControl = null;
    this.activeControlNodeId = null;

    // Visualizer 패널들 정리
    this.valueBadgeUnsub?.();
    this.valueBadgeUnsub = null;
    for (const panel of this.vizPanels) panel.destroy();
    this.vizPanels = [];

    // 이벤트 제거
    window.removeEventListener('keydown', this.boundKeyDown);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mouseleave', this.boundMouseLeave);
    this.canvas.removeEventListener('click', this.boundClick);
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('wheel', this.boundWheel);
    this.canvas.removeEventListener('touchstart', this.boundTouchStart);
    this.canvas.removeEventListener('touchmove', this.boundTouchMove);
    this.canvas.removeEventListener('touchend', this.boundTouchEnd);
    window.removeEventListener('mousemove', this.boundPanMove);
    window.removeEventListener('mouseup', this.boundPanEnd);
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
    this.contentWrapper = null;
    this.formulaPane = null;
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

    // 활성 요소가 있으면 재매핑 (AST 수정으로 explorerInfos가 재구축되었을 수 있음)
    const activeInfo = this.selectedInfo ?? this.hoveredInfo;
    if (activeInfo) {
      const nodeId = activeInfo.astNode?.id;
      if (nodeId) {
        const newInfo = this.explorerInfos.find(
          (info) => info.astNode?.id === nodeId,
        );
        if (newInfo) {
          if (this.selectedInfo) this.selectedInfo = newInfo;
          if (this.hoveredInfo) this.hoveredInfo = newInfo;
          this.updateInlineControlPosition();
        } else {
          this.selectedInfo = null;
          this.updateActiveControl();
        }
      }
    }
  }

  /**
   * 수식 영역을 포함할 formulaPane을 lazy 생성한다.
   * 첫 Visualizer 패널이 열릴 때 단 1회만 실행되며,
   * canvas를 formulaPane 안으로 옮겨 절대 위치 오버레이 기반의 패널들이 canvas 위에 올라오게 한다.
   */
  private ensureFormulaPane(): HTMLDivElement {
    if (this.formulaPane) return this.formulaPane;

    this.contentWrapper = document.createElement('div');
    Object.assign(this.contentWrapper.style, {
      position: 'absolute',
      inset: '0',
      display: 'flex',
      flexDirection: 'column',
    });

    this.formulaPane = document.createElement('div');
    Object.assign(this.formulaPane.style, {
      flex: '1',
      position: 'relative',
      minHeight: '0',
    });
    this.canvas.style.position = 'absolute';
    this.canvas.style.inset = '0';
    this.formulaPane.appendChild(this.canvas);

    this.contentWrapper.appendChild(this.formulaPane);
    this.overlay.insertBefore(this.contentWrapper, this.overlay.firstChild);
    return this.formulaPane;
  }

  /**
   * 특정 Visualizer 패널을 추가한다.
   * 같은 visualizerId 패널이 이미 열려 있으면 아무 것도 하지 않는다(토글은 호출 측에서 처리).
   */
  private openVisualizerPanel(ref: VisualizerRef): void {
    const rootSemantic = this.semanticMap.get(this.ast.id);
    if (!rootSemantic?.catalogId || !rootSemantic.catalogCategory) return;
    if (!this.visualizerRegistry) return;

    if (this.vizPanels.some((p) => p.visualizerId === ref.id)) return;

    const detail = getCatalogDetail(rootSemantic.catalogId, rootSemantic.catalogCategory);
    const formulaPane = this.ensureFormulaPane();
    const paneRect = formulaPane.getBoundingClientRect();
    const initialWidth = Math.max(200, Math.min(400, paneRect.width * 0.3));

    // cascading: 패널이 추가될 때마다 (24, 24)씩 내려감
    const cascade = this.vizPanels.length * 24;
    const rightMargin = 16 + cascade;
    const top = 60 + cascade;
    const left = Math.max(0, paneRect.width - initialWidth - rightMargin);

    const panel = new VizPanel({
      parent: formulaPane,
      theme: this.isDark ? 'dark' : 'light',
      bounds: { left, top, width: initialWidth },
      visualizerId: ref.id,
      registry: this.visualizerRegistry,
      onClose: () => this.closeVisualizerPanel(ref.id),
    });
    const isFirstPanel = this.vizPanels.length === 0;
    this.vizPanels.push(panel);
    this.refreshVisualizerButtons();
    // detail은 현재 UI 경로에서 더 이상 패널 쪽으로 전달하지 않는다 (spec.catalog가 자체 해결).
    void detail;

    panel.init().then((ok) => {
      if (!ok || this.destroyed) return;
      // primary(배열 0번) 패널만 값 배지 갱신용 subscribe와 연결한다.
      if (isFirstPanel && this.vizPanels[0] === panel) {
        this.valueBadgeUnsub?.();
        const inst = panel.instance;
        if (inst) {
          this.valueBadgeUnsub = inst.store.subscribeParams(() => this.renderCanvas());
        }
        this.renderCanvas();
      }
    });
  }

  /**
   * 특정 Visualizer 패널을 제거한다.
   * 제거된 패널이 primary였다면 남은 첫 패널을 새 primary로 승격시킨다.
   */
  private closeVisualizerPanel(visualizerId: string): void {
    const idx = this.vizPanels.findIndex((p) => p.visualizerId === visualizerId);
    if (idx < 0) return;
    const [removed] = this.vizPanels.splice(idx, 1);
    const wasPrimary = idx === 0;
    removed.destroy();

    if (wasPrimary) {
      this.valueBadgeUnsub?.();
      this.valueBadgeUnsub = null;

      const newPrimary = this.vizPanels[0];
      if (newPrimary) {
        const inst = newPrimary.instance;
        if (inst) {
          this.valueBadgeUnsub = inst.store.subscribeParams(() => this.renderCanvas());
        }
      }
      this.renderCanvas();
    }

    this.refreshVisualizerButtons();
  }

  /** 배너의 Visualizer 버튼들을 현재 열림 상태에 맞춰 다시 그린다 */
  private refreshVisualizerButtons(): void {
    this.updateCatalogBanner();
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

    // Viewport 계산 — 사용자가 줌/팬으로 override한 상태면 기존 값 유지
    if (!this.viewport.userOverridden) {
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

      this.viewport = { offsetX: startX, offsetY: startY, scale, userOverridden: false };
    }

    const { offsetX: startX, offsetY: startY, scale } = this.viewport;

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

    // 수정된 number 노드 표식 — 호버/선택과 무관하게 항상 표시 (baseline 모드 신호)
    this.drawModifiedCues(scale);

    this.ctx.restore();

    // 값 배지 (스크린 좌표계에서 렌더링)
    this.drawValueBadges();

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
        this.selectedInfo = null;
        this.updateActiveControl();
        this.renderCanvas();
      } else {
        this.destroy();
      }
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.panState) return; // 팬 드래그 중엔 호버 갱신 안 함
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

    this.updateActiveControl();
    this.renderCanvas();
  }

  private handleMouseLeave(e: MouseEvent): void {
    // 인라인 컨트롤로 마우스가 이동한 경우 호버 유지
    if (this.inlineControl && e.relatedTarget instanceof HTMLElement) {
      if (this.inlineControl.getElement().contains(e.relatedTarget)) return;
    }
    if (!this.hoveredInfo) return;
    this.hoveredInfo = null;
    this.ancestors = [];
    this.updateActiveControl();
    this.renderCanvas();
  }

  private handleClick(e: MouseEvent): void {
    // 드래그 팬 직후 발생한 click은 무시 (선택 동작과 혼동 방지)
    if (this.panMoved) {
      this.panMoved = false;
      return;
    }
    if (!this.box || this.explorerInfos.length === 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const { offsetX, offsetY, scale } = this.viewport;
    const boxX = (e.clientX - rect.left - offsetX) / scale;
    const boxY = (e.clientY - rect.top - offsetY) / scale;

    const result = explorerHitTest(boxX, boxY, this.explorerInfos);

    if (result) {
      // 같은 요소 클릭 → 선택 해제 (호버 컨트롤은 유지)
      if (this.selectedInfo && result.hit.box === this.selectedInfo.box) {
        this.selectedInfo = null;
      } else {
        // 새 요소 클릭 → 선택 고정
        this.selectedInfo = result.hit;
      }
    } else {
      // 빈 곳 클릭 → 선택 해제
      this.selectedInfo = null;
    }

    this.updateActiveControl();
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
        this.selectedInfo = null;
      } else {
        this.selectedInfo = result.hit;
        this.hoveredInfo = result.hit;
        this.ancestors = result.ancestors;
      }
      this.updateActiveControl();
      this.renderCanvas();
    } else {
      // 히트 없음 → 팬 시작 (터치 디바이스도 마우스와 동일한 모델)
      e.preventDefault();
      this.panState = {
        startX: touch.clientX,
        startY: touch.clientY,
        origOffsetX: this.viewport.offsetX,
        origOffsetY: this.viewport.offsetY,
      };
      this.panMoved = false;
      if (this.selectedInfo) {
        this.selectedInfo = null;
        this.updateActiveControl();
        this.renderCanvas();
      }
    }
  }

  private handleResize(): void {
    // 각 Visualizer 패널을 화면 경계 안으로 보정(크기 변경 시 viz resize 동반)
    for (const panel of this.vizPanels) panel.clampToViewport();
    this.renderCanvas();
    this.updateInlineControlPosition();
  }

  // ---------------------------------------------------------------------------
  // 줌/팬 — 수식 영역만 대상, 부속 UI(배지·주석·인라인 컨트롤)는 screen-fixed
  // ---------------------------------------------------------------------------

  private static readonly MIN_SCALE = 0.9;
  private static readonly MAX_SCALE = 8.0;
  private static readonly PAN_THRESHOLD = 3; // px — 이보다 덜 움직이면 클릭으로 간주

  /** 휠 줌 — 커서 지점을 고정점으로 사용 */
  private handleWheel(e: WheelEvent): void {
    if (!this.box) return;
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    // deltaY 음수(휠 업)=확대, 양수(휠 다운)=축소. 지수형으로 부드럽게.
    const factor = Math.exp(-e.deltaY * 0.0015);
    const current = this.viewport.scale;
    const next = Math.max(
      ExplorerOverlay.MIN_SCALE,
      Math.min(ExplorerOverlay.MAX_SCALE, current * factor),
    );
    if (next === current) return;

    const ratio = next / current;
    const offsetX = cx - (cx - this.viewport.offsetX) * ratio;
    const offsetY = cy - (cy - this.viewport.offsetY) * ratio;

    this.viewport = { offsetX, offsetY, scale: next, userOverridden: true };
    // 최대 줌 비율 실험용 출력
    console.log(`[Explorer zoom] ${next.toFixed(3)}×`);

    this.renderCanvas();
    this.updateInlineControlPosition();
  }

  /** 좌클릭 mousedown — 히트 요소가 없을 때만 팬 시작 */
  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return; // 좌클릭만
    if (!this.box || this.explorerInfos.length === 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const { offsetX, offsetY, scale } = this.viewport;
    const boxX = (e.clientX - rect.left - offsetX) / scale;
    const boxY = (e.clientY - rect.top - offsetY) / scale;

    // 히트된 요소가 있으면 팬 대신 기존 선택 동작(click)을 따르게 둔다
    if (explorerHitTest(boxX, boxY, this.explorerInfos)) return;

    this.panState = {
      startX: e.clientX,
      startY: e.clientY,
      origOffsetX: this.viewport.offsetX,
      origOffsetY: this.viewport.offsetY,
    };
    this.panMoved = false;
    this.canvas.style.cursor = 'grabbing';
  }

  /** 전역 mousemove — 팬 드래그 진행 (커서가 캔버스 밖으로 나가도 추적) */
  private handlePanMove(e: MouseEvent): void {
    if (!this.panState) return;
    const dx = e.clientX - this.panState.startX;
    const dy = e.clientY - this.panState.startY;

    if (!this.panMoved && (Math.abs(dx) >= ExplorerOverlay.PAN_THRESHOLD || Math.abs(dy) >= ExplorerOverlay.PAN_THRESHOLD)) {
      this.panMoved = true;
    }

    this.viewport = {
      offsetX: this.panState.origOffsetX + dx,
      offsetY: this.panState.origOffsetY + dy,
      scale: this.viewport.scale,
      userOverridden: true,
    };

    this.renderCanvas();
    this.updateInlineControlPosition();
  }

  /** 전역 mouseup — 팬 종료. panMoved는 직후 click 핸들러에서 소비 */
  private handlePanEnd(_e: MouseEvent): void {
    if (!this.panState) return;
    this.panState = null;
    this.canvas.style.cursor = 'default';
  }

  /** 터치 이동 — 1-finger pan만 처리 */
  private handleTouchMove(e: TouchEvent): void {
    if (!this.panState) return;
    if (e.touches.length !== 1) return;
    e.preventDefault();

    const touch = e.touches[0];
    const dx = touch.clientX - this.panState.startX;
    const dy = touch.clientY - this.panState.startY;

    if (!this.panMoved && (Math.abs(dx) >= ExplorerOverlay.PAN_THRESHOLD || Math.abs(dy) >= ExplorerOverlay.PAN_THRESHOLD)) {
      this.panMoved = true;
    }

    this.viewport = {
      offsetX: this.panState.origOffsetX + dx,
      offsetY: this.panState.origOffsetY + dy,
      scale: this.viewport.scale,
      userOverridden: true,
    };

    this.renderCanvas();
    this.updateInlineControlPosition();
  }

  private handleTouchEnd(_e: TouchEvent): void {
    if (!this.panState) return;
    this.panState = null;
    // panMoved는 그대로 두어 직후 합성 click이 와도 무시되도록. 다음 touchstart에서 리셋됨.
  }

  // ---------------------------------------------------------------------------
  // 선택 + 인라인 컨트롤
  // ---------------------------------------------------------------------------

  /** 활성 요소(선택 ?? 호버)에 맞춰 인라인 컨트롤을 갱신 */
  private updateActiveControl(): void {
    const active = this.selectedInfo ?? this.hoveredInfo;
    const nodeId = active?.astNode?.id ?? null;

    // 같은 대상이면 스킵
    if (nodeId === this.activeControlNodeId) return;

    // 기존 컨트롤 제거
    this.inlineControl?.destroy();
    this.inlineControl = null;
    this.paramsUnsubscribe?.();
    this.paramsUnsubscribe = null;
    this.activeControlNodeId = null;

    if (!active?.astNode) return;

    const node = active.astNode;
    const semantic = this.semanticMap.get(node.id);
    const inst = this.primaryInstance;

    const config = buildInlineControlConfig(
      node,
      semantic,
      this.catalogDetail,
      inst,
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
        onReset: (nodeId_) => this.handleInlineReset(nodeId_),
      },
      this.isDark,
      showReset,
    );

    this.activeControlNodeId = nodeId;
    this.updateInlineControlPosition();

    // Store → 인라인 컨트롤 동기화 (Visualizer 드래그/Scene 전환 시)
    // external 소스(인라인 컨트롤 자신)은 무시해 순환 갱신을 막는다.
    if (inst && config.controlType === 'slider' && config.paramId) {
      const paramId = config.paramId;
      this.paramsUnsubscribe = inst.store.subscribeParams((params, source) => {
        if (source === 'external') return;
        if (paramId in params) {
          this.inlineControl?.updateValue(params[paramId]);
        }
      });
    }
  }

  private handleInlineValueChange(id: string, value: number, config: InlineControlConfig): void {
    if (config.controlType === 'slider') {
      // 변수 슬라이더: instance에 setParam, 없으면 로컬 파라미터 업데이트
      const inst = this.primaryInstance;
      if (inst) {
        inst.setParam(id, value);
      } else {
        this.localParamValues[id] = value;
      }
    } else if (config.controlType === 'stepper' && this.astModState) {
      // 숫자 스테퍼: AST 수정 → 재렌더링 (새 아키텍처에서 Visualizer로의 AST 동기화는 없음)
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
    const active = this.selectedInfo ?? this.hoveredInfo;
    if (!this.inlineControl || !active?.astNode) return;

    const semantic = this.semanticMap.get(active.astNode.id);
    if (!semantic) return;

    const layout = this.getAnnotationLayout(active, semantic);
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

  /**
   * 학습자가 수정한 number 노드에 빨간 점선 밑줄을 그린다 (Box 좌표계).
   * baseline 비교 모드가 켜져 있음을 시각적으로 알린다.
   * 호버/선택과 무관하게 항상 표시된다.
   */
  private drawModifiedCues(scale: number): void {
    if (!this.astModState || this.astModState.modifications.size === 0) return;
    if (!this.explorerInfos.length) return;

    const ctx = this.ctx;
    const modifications = this.astModState.modifications;

    for (const info of this.explorerInfos) {
      if (!info.astNode) continue;
      if (!modifications.has(info.astNode.id)) continue;

      const bounds = info.bounds;
      const bottomY = bounds.y + bounds.height;

      ctx.save();
      ctx.strokeStyle = this.isDark
        ? 'rgba(248, 113, 113, 0.85)'
        : 'rgba(220, 38, 38, 0.8)';
      ctx.lineWidth = 1.5 / scale;
      ctx.setLineDash([2 / scale, 2 / scale]);
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

    // 시각화 버튼 — 호스트가 VisualizerRegistry를 주입한 경우에만 렌더.
    // 각 버튼은 해당 패널을 토글한다(열려 있으면 닫기, 없으면 열기).
    if (this.visualizerRegistry) {
      const refs = getVisualizersForCatalog(rootSemantic.catalogId);
      for (const ref of refs) {
        const isOpen = this.vizPanels.some((p) => p.visualizerId === ref.id);
        this.catalogBanner.appendChild(this.createVisualizerButton(ref, isOpen));
      }
    }

    this.catalogBanner.style.display = 'flex';
    this.catalogBanner.style.pointerEvents = 'auto';
  }

  /** 배너에 들어갈 시각화 토글 버튼을 만든다 */
  private createVisualizerButton(ref: VisualizerRef, isOpen: boolean): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = isOpen ? `${ref.name} 닫기` : `${ref.name} — ${ref.description}`;

    const activeBg = this.isDark ? 'rgba(96,165,250,0.35)' : 'rgba(59,130,246,0.2)';
    const activeColor = this.isDark ? '#dbeafe' : '#1d4ed8';
    const idleBg = this.isDark ? 'rgba(96,165,250,0.12)' : 'rgba(59,130,246,0.08)';
    const idleColor = this.isDark ? '#60a5fa' : '#3b82f6';

    Object.assign(btn.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: '8px',
      padding: '4px 10px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
      gap: '4px',
      pointerEvents: 'auto',
      whiteSpace: 'nowrap',
      background: isOpen ? activeBg : idleBg,
      color: isOpen ? activeColor : idleColor,
      fontWeight: isOpen ? '600' : '500',
    });

    if (ref.icon) {
      const icon = document.createElement('span');
      icon.textContent = ref.icon;
      icon.style.fontSize = '12px';
      btn.appendChild(icon);
    }
    const label = document.createElement('span');
    label.textContent = ref.name;
    btn.appendChild(label);

    btn.addEventListener('click', () => {
      const currentlyOpen = this.vizPanels.some((p) => p.visualizerId === ref.id);
      if (currentlyOpen) {
        this.closeVisualizerPanel(ref.id);
      } else {
        this.openVisualizerPanel(ref);
      }
    });

    return btn;
  }

  // ---------------------------------------------------------------------------
  // 값 배지 — 수식 변수 옆에 현재 값 표시
  // ---------------------------------------------------------------------------

  /** 수식 변수 옆에 대응하는 값 배지를 렌더링 */
  private drawValueBadges(): void {
    // 값 맵 구축: variableName → { label, value }
    const valueMap = new Map<string, { label: string; value: string }>();

    const inst = this.primaryInstance;
    const params = inst?.store.snapshot().params;
    const parameterConfig = inst?.compiled.catalog.parameterConfig
      ?? this.catalogDetail?.parameterConfig;

    if (parameterConfig) {
      for (const pc of parameterConfig) {
        const value = params?.[pc.id] ?? pc.default;
        valueMap.set(pc.name, {
          label: pc.role,
          value: this.formatBadgeValue(value, pc.unit),
        });
      }
    }

    if (valueMap.size === 0) return;

    const { offsetX, offsetY, scale } = this.viewport;
    const drawn = new Set<string>();

    for (const info of this.explorerInfos) {
      if (!info.astNode || info.astNode.type !== 'variable') continue;
      const varName = info.astNode.name;
      if (drawn.has(varName)) continue;

      const entry = valueMap.get(varName);
      if (!entry) continue;
      drawn.add(varName);

      // Box 좌표 → 스크린 좌표
      const sx = info.bounds.x * scale + offsetX;
      const sy = info.bounds.y * scale + offsetY;
      const sw = info.bounds.width * scale;
      const sh = info.bounds.height * scale;

      this.drawValueBadge(sx + sw / 2, sy + sh + 6, `${entry.label}: ${entry.value}`);
    }
  }

  /** 값 포맷팅 */
  private formatBadgeValue(value: number, unit?: string, format?: string): string {
    let numStr: string;
    if (format === 'time') {
      if (value < 60) return `${value.toFixed(1)}초`;
      if (value < 3600) return `${(value / 60).toFixed(1)}분`;
      if (value < 86400) return `${(value / 3600).toFixed(1)}시간`;
      return `${(value / 86400).toFixed(1)}일`;
    }
    if (Math.abs(value) >= 1000) {
      numStr = Math.round(value).toLocaleString();
    } else if (Math.abs(value) >= 1) {
      numStr = value.toFixed(1);
    } else {
      numStr = value.toPrecision(3);
    }
    return unit ? `${numStr} ${unit}` : numStr;
  }

  /** 단일 값 배지 (pill) 렌더링 */
  private drawValueBadge(cx: number, y: number, text: string): void {
    const ctx = this.ctx;
    const sysFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const fontSize = 13;

    ctx.save();
    ctx.font = `500 ${fontSize}px ${sysFont}`;
    const tw = ctx.measureText(text).width;
    const padX = 7;
    const padY = 4;
    const pillW = tw + padX * 2;
    const pillH = fontSize + padY * 2;
    const x = cx - pillW / 2;

    // 배경
    ctx.fillStyle = this.isDark
      ? 'rgba(96, 165, 250, 0.12)'
      : 'rgba(59, 130, 246, 0.08)';
    ctx.beginPath();
    ctx.roundRect(x, y, pillW, pillH, 4);
    ctx.fill();

    // 테두리
    ctx.strokeStyle = this.isDark
      ? 'rgba(96, 165, 250, 0.25)'
      : 'rgba(59, 130, 246, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // 텍스트
    ctx.fillStyle = this.isDark ? '#93c5fd' : '#2563eb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(text, cx, y + padY);

    ctx.restore();
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
    const targetY = placeAbove ? canvasH * 0.29 : canvasH * 0.71;
    const horizReach = Math.min(108, canvasW * 0.09);
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
