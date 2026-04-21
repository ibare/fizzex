/**
 * VizPanel — 이동/리사이즈 가능한 Visualizer 패널
 *
 * 단일 Visualizer 인스턴스를 캡슐화한 플로팅 카드.
 * 헤더 드래그로 이동, 우하단 핸들로 폭 리사이즈(정사각형 aspect 유지).
 * ExplorerOverlay가 배열로 관리하며, 동일 수식에 대해 여러 패널을 띄울 수 있다.
 */

import { ExplorerVisualizerController } from './explorer-visualizer';
import { ExplorerSceneChips } from './explorer-scene-chips';
import type { CreatedVisualizer, VisualizerRegistry } from '../visualizer/runtime/public-api';

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
  /** 호스트 주입 VisualizerRegistry — spec을 id로 해석·fetch한다. */
  registry: VisualizerRegistry;
  /**
   * 사용자가 패널 헤더의 닫기(✕) 버튼을 눌러 패널을 닫으려 할 때 호출된다.
   * ExplorerOverlay가 수신해 해당 패널을 배열에서 제거 + destroy + 배너 버튼 상태 갱신을 수행한다.
   * ExplorerOverlay.destroy()에 의한 일괄 destroy()에서는 호출되지 않는다.
   */
  onClose?: () => void;
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
  private captureButton!: HTMLButtonElement;
  private closeButton!: HTMLButtonElement;
  private vizContainer: HTMLDivElement;
  private resizeHandle: HTMLDivElement;

  /** 캡처 피드백 플래시 타이머. destroy 시 정리 대상 */
  private flashTimer: ReturnType<typeof setTimeout> | null = null;

  private controller: ExplorerVisualizerController;
  private sceneChips: ExplorerSceneChips | null = null;

  private parent: HTMLElement;
  private theme: 'light' | 'dark';
  private isDark: boolean;
  /** ExplorerOverlay가 id 기반으로 패널을 찾을 수 있도록 공개한다 (읽기 전용 의도) */
  readonly visualizerId: string;
  private bounds: VizPanelBounds;
  private onCloseCallback: (() => void) | undefined;

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
    this.bounds = { ...cfg.bounds };
    this.onCloseCallback = cfg.onClose;

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
      position: 'relative',
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

    // 📷 캡처 버튼 — 헤더 우측, 닫기 버튼 왼쪽.
    // 클릭 시 vizContainer 의 canvas를 PNG로 클립보드에 복사. 실패 시 다운로드 폴백.
    this.captureButton = document.createElement('button');
    this.captureButton.type = 'button';
    this.captureButton.title = '이미지 복사';
    this.captureButton.textContent = '\u{1F4F7}'; // 📷
    Object.assign(this.captureButton.style, {
      position: 'absolute',
      right: '26px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '22px',
      height: '18px',
      padding: '0',
      border: 'none',
      borderRadius: '4px',
      background: 'transparent',
      cursor: 'pointer',
      fontSize: '12px',
      lineHeight: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'auto',
    });
    this.captureButton.addEventListener('mouseenter', () => {
      this.captureButton.style.background = this.isDark
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(0,0,0,0.08)';
    });
    this.captureButton.addEventListener('mouseleave', () => {
      this.captureButton.style.background = 'transparent';
    });
    this.captureButton.addEventListener('mousedown', (e) => e.stopPropagation());
    this.captureButton.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    this.captureButton.addEventListener('click', (e) => {
      e.stopPropagation();
      void this.handleCapture();
    });
    this.header.appendChild(this.captureButton);

    // 닫기(X) 버튼 — 헤더 우측. 클릭 시 onCloseCallback을 호출하여
    // ExplorerOverlay가 패널 제거 + 배너 버튼 상태 갱신을 처리하게 한다.
    this.closeButton = document.createElement('button');
    this.closeButton.type = 'button';
    this.closeButton.title = '닫기';
    this.closeButton.textContent = '\u2715';
    Object.assign(this.closeButton.style, {
      position: 'absolute',
      right: '4px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '18px',
      height: '18px',
      padding: '0',
      border: 'none',
      borderRadius: '4px',
      background: 'transparent',
      color: this.isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)',
      cursor: 'pointer',
      fontSize: '12px',
      lineHeight: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'auto',
    });
    this.closeButton.addEventListener('mouseenter', () => {
      this.closeButton.style.background = this.isDark
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(0,0,0,0.08)';
    });
    this.closeButton.addEventListener('mouseleave', () => {
      this.closeButton.style.background = 'transparent';
    });
    // mousedown은 헤더 드래그가 먹지 않도록 중단
    this.closeButton.addEventListener('mousedown', (e) => e.stopPropagation());
    this.closeButton.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    this.closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onCloseCallback?.();
    });
    this.header.appendChild(this.closeButton);

    this.root.appendChild(this.header);

    this.vizContainer = document.createElement('div');
    Object.assign(this.vizContainer.style, {
      width: '100%',
      aspectRatio: '1',
      position: 'relative',
    });
    this.root.appendChild(this.vizContainer);

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
    this.controller = new ExplorerVisualizerController(this.vizContainer, this.theme, cfg.registry);

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

  /** 비동기로 Visualizer 스펙 로드 → 인스턴스 마운트 + SceneChips 부착 */
  async init(): Promise<boolean> {
    const ok = await this.controller.init(this.visualizerId);
    if (!ok || this.destroyed) return false;

    const inst = this.controller.instance;
    if (!inst) return false;

    // 2개 이상의 scene이 정의되어 있을 때만 전환 칩 UI 부착
    const scenes = inst.compiled.spec.scenes;
    if (scenes.length > 1) {
      this.sceneChips = new ExplorerSceneChips(this.root, {
        scenes,
        instance: inst,
        theme: this.theme,
      });
      // 헤더 바로 아래에 위치시키기 위해 vizContainer 앞에 삽입
      this.root.insertBefore(this.sceneChips.root, this.vizContainer);
    }

    return true;
  }

  get instance(): CreatedVisualizer | null {
    return this.controller.instance;
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

    if (this.flashTimer !== null) {
      clearTimeout(this.flashTimer);
      this.flashTimer = null;
    }

    this.header.removeEventListener('mousedown', this.boundHeaderMouseDown);
    this.header.removeEventListener('touchstart', this.boundHeaderTouchStart);
    this.resizeHandle.removeEventListener('mousedown', this.boundResizeMouseDown);
    this.resizeHandle.removeEventListener('touchstart', this.boundResizeTouchStart);
    window.removeEventListener('mousemove', this.boundPointerMove);
    window.removeEventListener('mouseup', this.boundPointerUp);
    window.removeEventListener('touchmove', this.boundTouchMove);
    window.removeEventListener('touchend', this.boundTouchEnd);

    this.sceneChips?.destroy();
    this.sceneChips = null;
    this.controller.destroy();

    if (this.root.parentElement) {
      this.root.parentElement.removeChild(this.root);
    }
  }

  // ---- 내부 ----

  /**
   * vizContainer 내부의 canvas를 PNG로 변환해 클립보드에 복사한다.
   * 2D/WebGL 모두 동일 경로(canvas.toBlob)로 처리된다.
   * Clipboard API 가 거부되면 다운로드로 폴백해 사용자가 여전히 이미지를 얻을 수 있도록 한다.
   */
  private async handleCapture(): Promise<void> {
    if (this.destroyed) return;
    const canvas = this.vizContainer.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob || this.destroyed) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        this.flashCapture('\u2713'); // ✓
      } catch {
        // 폴백: HTTPS 비활성/권한 거부 환경에서 다운로드로 대체
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fizzex-${this.visualizerId}-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        this.flashCapture('\u2913'); // ⤓ (저장)
      }
    }, 'image/png');
  }

  /** 캡처 버튼 아이콘을 잠시 교체해 시각 피드백을 준다 */
  private flashCapture(glyph: string): void {
    if (this.destroyed) return;
    this.captureButton.textContent = glyph;
    if (this.flashTimer !== null) clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => {
      this.flashTimer = null;
      if (this.destroyed) return;
      this.captureButton.textContent = '\u{1F4F7}'; // 📷
    }, 900);
  }

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
