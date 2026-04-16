/**
 * VizPanel — 이동/리사이즈 가능한 Visualizer 패널
 *
 * 단일 Visualizer 인스턴스와 Bridge, Preset Bar를 캡슐화한 플로팅 카드.
 * 헤더 드래그로 이동, 우하단 핸들로 폭 리사이즈(정사각형 aspect 유지).
 * ExplorerOverlay가 배열로 관리하며, 동일 수식에 대해 여러 패널을 띄울 수 있다.
 */

import { ExplorerVisualizerController } from './explorer-visualizer';
import { ExplorerPresetsBar } from './explorer-presets-bar';
import type { VisualizerBridgeImpl } from '../visualizer/bridge';
import type { FizzexVisualizer } from '../visualizer/types';
import type { CatalogDetail } from '../analyzer/semantic/types';
import type { RootNode } from '../types';

export interface VizPanelBounds {
  left: number;
  top: number;
  width: number;
}

export interface VizPanelConfig {
  parent: HTMLElement;
  theme: 'light' | 'dark';
  bounds: VizPanelBounds;
  visualizerId: string;
  catalogDetail: CatalogDetail | null;
}

const HEADER_HEIGHT = 26;
const RESIZE_HANDLE_SIZE = 14;
const MIN_WIDTH = 200;
const MAX_WIDTH_ABS = 600;
const MAX_WIDTH_RATIO = 0.6;
const EDGE_MARGIN = 40; // 화면에 최소 이만큼은 남기도록 clamp

export class VizPanel {
  readonly root: HTMLDivElement;
  private header: HTMLDivElement;
  private vizContainer: HTMLDivElement;
  private presetsContainer: HTMLDivElement;
  private resizeHandle: HTMLDivElement;

  private controller: ExplorerVisualizerController;
  private presetsBar: ExplorerPresetsBar | null = null;

  private parent: HTMLElement;
  private theme: 'light' | 'dark';
  private isDark: boolean;
  private visualizerId: string;
  private catalogDetail: CatalogDetail | null;
  private bounds: VizPanelBounds;

  private destroyed = false;

  private dragState: {
    startX: number;
    startY: number;
    origLeft: number;
    origTop: number;
  } | null = null;

  private resizeState: {
    startX: number;
    origWidth: number;
  } | null = null;

  // Bound listeners
  private boundHeaderMouseDown: (e: MouseEvent) => void;
  private boundHeaderTouchStart: (e: TouchEvent) => void;
  private boundResizeMouseDown: (e: MouseEvent) => void;
  private boundResizeTouchStart: (e: TouchEvent) => void;
  private boundPointerMove: (e: MouseEvent) => void;
  private boundPointerUp: (e: MouseEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;

  constructor(cfg: VizPanelConfig) {
    this.parent = cfg.parent;
    this.theme = cfg.theme;
    this.isDark = cfg.theme === 'dark';
    this.visualizerId = cfg.visualizerId;
    this.catalogDetail = cfg.catalogDetail;
    this.bounds = { ...cfg.bounds };

    // === DOM 조립 ===
    this.root = document.createElement('div');
    Object.assign(this.root.style, {
      position: 'absolute',
      display: 'flex',
      flexDirection: 'column',
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

    this.header = document.createElement('div');
    Object.assign(this.header.style, {
      height: `${HEADER_HEIGHT}px`,
      cursor: 'move',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '3px',
      background: this.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
      borderBottom: this.isDark
        ? '1px solid rgba(255,255,255,0.06)'
        : '1px solid rgba(0,0,0,0.05)',
      userSelect: 'none',
      touchAction: 'none',
    });
    // 드래그 가능함을 알리는 점 3개
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      Object.assign(dot.style, {
        width: '3px',
        height: '3px',
        borderRadius: '50%',
        background: this.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
      });
      this.header.appendChild(dot);
    }
    this.root.appendChild(this.header);

    this.vizContainer = document.createElement('div');
    Object.assign(this.vizContainer.style, {
      width: '100%',
      aspectRatio: '1',
      position: 'relative',
    });
    this.root.appendChild(this.vizContainer);

    this.presetsContainer = document.createElement('div');
    Object.assign(this.presetsContainer.style, {
      width: '100%',
    });
    this.root.appendChild(this.presetsContainer);

    this.resizeHandle = document.createElement('div');
    Object.assign(this.resizeHandle.style, {
      position: 'absolute',
      right: '0',
      bottom: '0',
      width: `${RESIZE_HANDLE_SIZE}px`,
      height: `${RESIZE_HANDLE_SIZE}px`,
      cursor: 'nwse-resize',
      // 대각선 빗금 2줄로 핸들 시각화
      background: `linear-gradient(135deg, transparent 0 40%, ${this.isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)'} 40% 50%, transparent 50% 65%, ${this.isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)'} 65% 75%, transparent 75%)`,
      touchAction: 'none',
    });
    this.root.appendChild(this.resizeHandle);

    this.applyBounds();
    this.parent.appendChild(this.root);

    // === 컨트롤러 생성 (init은 비동기) ===
    this.controller = new ExplorerVisualizerController(this.vizContainer, this.theme);

    // === 이벤트 바인딩 ===
    this.boundHeaderMouseDown = this.handleHeaderMouseDown.bind(this);
    this.boundHeaderTouchStart = this.handleHeaderTouchStart.bind(this);
    this.boundResizeMouseDown = this.handleResizeMouseDown.bind(this);
    this.boundResizeTouchStart = this.handleResizeTouchStart.bind(this);
    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.boundPointerUp = this.handlePointerUp.bind(this);
    this.boundTouchMove = this.handleTouchMove.bind(this);
    this.boundTouchEnd = this.handleTouchEnd.bind(this);

    this.header.addEventListener('mousedown', this.boundHeaderMouseDown);
    this.header.addEventListener('touchstart', this.boundHeaderTouchStart, { passive: false });
    this.resizeHandle.addEventListener('mousedown', this.boundResizeMouseDown);
    this.resizeHandle.addEventListener('touchstart', this.boundResizeTouchStart, { passive: false });
    window.addEventListener('mousemove', this.boundPointerMove);
    window.addEventListener('mouseup', this.boundPointerUp);
    window.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    window.addEventListener('touchend', this.boundTouchEnd);
  }

  /** 비동기로 Visualizer 로드 → Bridge 준비 → PresetsBar 생성 */
  async init(): Promise<boolean> {
    const ok = await this.controller.init(this.visualizerId, this.catalogDetail);
    if (!ok || this.destroyed) return false;

    const bridge = this.controller.bridge;
    const viz = this.controller.viz;
    if (!bridge || !viz) return false;

    this.presetsBar = new ExplorerPresetsBar(
      this.presetsContainer,
      bridge,
      viz.presets,
      this.theme,
    );
    return true;
  }

  get bridge(): VisualizerBridgeImpl | null {
    return this.controller.bridge;
  }

  get viz(): FizzexVisualizer | null {
    return this.controller.viz;
  }

  /** working AST + optional original AST를 bridge에 전달 (baseline 비교용) */
  setAst(working: RootNode, original?: RootNode): void {
    const b = this.controller.bridge;
    if (!b?.setAst) return;
    b.setAst(working, original);
  }

  /** 창 리사이즈 시 패널 위치/크기를 화면 경계 안으로 보정 */
  clampToViewport(): void {
    if (this.destroyed) return;
    const parentRect = this.parent.getBoundingClientRect();
    const maxWidth = Math.min(MAX_WIDTH_ABS, parentRect.width * MAX_WIDTH_RATIO);
    const width = Math.max(MIN_WIDTH, Math.min(this.bounds.width, maxWidth));

    let { left, top } = this.bounds;
    left = Math.min(left, parentRect.width - EDGE_MARGIN);
    left = Math.max(left, EDGE_MARGIN - width);
    top = Math.min(top, parentRect.height - EDGE_MARGIN);
    top = Math.max(top, 0);

    const changed = width !== this.bounds.width;
    this.bounds = { left, top, width };
    this.applyBounds();

    if (changed) {
      const r = this.vizContainer.getBoundingClientRect();
      this.controller.resize(r.width, r.height);
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.header.removeEventListener('mousedown', this.boundHeaderMouseDown);
    this.header.removeEventListener('touchstart', this.boundHeaderTouchStart);
    this.resizeHandle.removeEventListener('mousedown', this.boundResizeMouseDown);
    this.resizeHandle.removeEventListener('touchstart', this.boundResizeTouchStart);
    window.removeEventListener('mousemove', this.boundPointerMove);
    window.removeEventListener('mouseup', this.boundPointerUp);
    window.removeEventListener('touchmove', this.boundTouchMove);
    window.removeEventListener('touchend', this.boundTouchEnd);

    this.presetsBar?.destroy();
    this.presetsBar = null;
    this.controller.destroy();

    if (this.root.parentElement) {
      this.root.parentElement.removeChild(this.root);
    }
  }

  // ---- 내부 ----

  private applyBounds(): void {
    this.root.style.left = `${this.bounds.left}px`;
    this.root.style.top = `${this.bounds.top}px`;
    this.root.style.width = `${this.bounds.width}px`;
  }

  private handleHeaderMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    e.preventDefault();
    this.dragState = {
      startX: e.clientX,
      startY: e.clientY,
      origLeft: this.bounds.left,
      origTop: this.bounds.top,
    };
  }

  private handleHeaderTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    this.dragState = {
      startX: t.clientX,
      startY: t.clientY,
      origLeft: this.bounds.left,
      origTop: this.bounds.top,
    };
  }

  private handleResizeMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    this.resizeState = { startX: e.clientX, origWidth: this.bounds.width };
  }

  private handleResizeTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    e.stopPropagation();
    this.resizeState = { startX: e.touches[0].clientX, origWidth: this.bounds.width };
  }

  private handlePointerMove(e: MouseEvent): void {
    if (!this.dragState && !this.resizeState) return;
    this.updateFromPointer(e.clientX, e.clientY);
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.dragState && !this.resizeState) return;
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    this.updateFromPointer(t.clientX, t.clientY);
  }

  private updateFromPointer(cx: number, cy: number): void {
    const parentRect = this.parent.getBoundingClientRect();

    if (this.dragState) {
      const dx = cx - this.dragState.startX;
      const dy = cy - this.dragState.startY;
      let left = this.dragState.origLeft + dx;
      let top = this.dragState.origTop + dy;

      left = Math.min(left, parentRect.width - EDGE_MARGIN);
      left = Math.max(left, EDGE_MARGIN - this.bounds.width);
      top = Math.min(top, parentRect.height - EDGE_MARGIN);
      top = Math.max(top, 0);

      this.bounds = { ...this.bounds, left, top };
      this.applyBounds();
    } else if (this.resizeState) {
      const dx = cx - this.resizeState.startX;
      const maxWidth = Math.min(MAX_WIDTH_ABS, parentRect.width * MAX_WIDTH_RATIO);
      const newWidth = Math.max(MIN_WIDTH, Math.min(this.resizeState.origWidth + dx, maxWidth));
      if (newWidth !== this.bounds.width) {
        this.bounds = { ...this.bounds, width: newWidth };
        this.applyBounds();
        const r = this.vizContainer.getBoundingClientRect();
        this.controller.resize(r.width, r.height);
      }
    }
  }

  private handlePointerUp(_e: MouseEvent): void {
    this.dragState = null;
    this.resizeState = null;
  }

  private handleTouchEnd(_e: TouchEvent): void {
    this.dragState = null;
    this.resizeState = null;
  }
}
