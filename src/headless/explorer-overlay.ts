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
  private infoPanel: HTMLDivElement;
  private roleEl: HTMLDivElement;
  private descEl: HTMLDivElement;
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

    // 호버 Info 패널
    this.infoPanel = document.createElement('div');
    Object.assign(this.infoPanel.style, {
      position: 'absolute',
      top: '16px',
      left: '16px',
      maxWidth: '360px',
      padding: '10px 14px',
      borderRadius: '8px',
      background: this.isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
      color: this.isDark ? '#e5e5e5' : '#1a1a1a',
      fontSize: '14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      border: `1px solid ${this.isDark ? '#404040' : '#e5e5e5'}`,
      pointerEvents: 'none',
      display: 'none',
    });
    this.roleEl = document.createElement('div');
    this.roleEl.style.fontWeight = '600';
    this.roleEl.style.marginBottom = '4px';
    this.descEl = document.createElement('div');
    Object.assign(this.descEl.style, {
      fontSize: '13px',
      color: this.isDark ? '#a0a0a0' : '#555',
      lineHeight: '1.45',
    });
    this.infoPanel.appendChild(this.roleEl);
    this.infoPanel.appendChild(this.descEl);
    this.overlay.appendChild(this.infoPanel);

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
    this.updateInfoPanel();
  }

  private handleMouseLeave(): void {
    if (!this.hoveredInfo) return;
    this.hoveredInfo = null;
    this.ancestors = [];
    this.renderCanvas();
    this.updateInfoPanel();
  }

  private handleResize(): void {
    this.renderCanvas();
  }

  // ---------------------------------------------------------------------------
  // UI 업데이트
  // ---------------------------------------------------------------------------

  /** 호버 Info 패널 업데이트 */
  private updateInfoPanel(): void {
    if (!this.hoveredInfo?.astNode) {
      this.infoPanel.style.display = 'none';
      return;
    }

    const semantic = this.semanticMap.get(
      (this.hoveredInfo.astNode as MathNode).id,
    );
    if (!semantic) {
      this.infoPanel.style.display = 'none';
      return;
    }

    this.roleEl.textContent = semantic.role;
    this.descEl.textContent = semantic.description;
    this.infoPanel.style.display = 'block';
  }
}
