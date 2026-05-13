/**
 * DOMEditorView — DOM 환경 인터랙티브 수식 편집기
 *
 * MathEditor + Canvas 렌더링 + hidden <input> 키보드/IME 캡처를 래핑.
 * 프레임워크 무관: 임의의 컨테이너 엘리먼트에서 동작한다.
 */

import { CanvasFontMetrics } from '../box/font-metrics';
import { astToBox } from '../box/ast-to-box';
import { layoutBox, hitTest } from '../box/box-layout';
import { Projector } from '../box/projector';
import type { BoxRenderConfig, Box, HBox } from '../box/types';
import { astToLatex } from '../latex/ast-to-latex';
import { MathEditor, createStateFromLatex, keyToInputAction } from '../editor';
import { boundary } from '../types';
import { loadMathFont } from '../fonts';
import type { FizzexConfig, FizzexSize, FizzexChangeHandler } from './types';
import { resolveBoxRenderConfig } from './types';
import { ExplorerOverlay } from './explorer-overlay';
import { attachExplorerTrigger } from './explorer-trigger';
import type { ExplorerTriggerOptions } from './explorer-trigger';

export class DOMEditorView {
  // DOM elements
  private container: HTMLElement;
  private wrapper: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private hiddenInput: HTMLInputElement;

  // Config
  private userConfig: FizzexConfig;
  private boxConfig: BoxRenderConfig;
  private padding: number;

  // Core state
  private editor: MathEditor;
  private currentBox: Box | null = null;
  private currentSize: FizzexSize = { width: 0, height: 0, baseline: 0 };

  // Focus / cursor
  private isFocused = false;
  private cursorVisible = true;
  private cursorBlinkTimer: ReturnType<typeof setInterval> | null = null;

  // IME
  private isComposing = false;

  // Change handlers
  private changeHandlers = new Set<FizzexChangeHandler>();
  private destroyed = false;
  private explorerOverlay: ExplorerOverlay | null = null;
  private explorerCleanup: (() => void) | null = null;

  // Bound event handlers (stored for removal in destroy)
  private boundCanvasClick: (e: MouseEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundInput: (e: Event) => void;
  private boundCompositionStart: () => void;
  private boundCompositionEnd: (e: CompositionEvent) => void;
  private boundFocus: () => void;
  private boundBlur: () => void;

  constructor(container: HTMLElement, config: FizzexConfig = {}) {
    this.container = container;
    this.userConfig = { ...config };
    this.padding = config.padding ?? 8;
    this.boxConfig = resolveBoxRenderConfig(config, true);

    // --- DOM setup ---

    // Wrapper div
    this.wrapper = document.createElement('div');
    this.wrapper.style.position = 'relative';
    this.wrapper.style.display = 'inline-block';

    // Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.cursor = 'text';
    this.wrapper.appendChild(this.canvas);

    // Hidden input for keyboard / IME capture
    this.hiddenInput = document.createElement('input');
    this.hiddenInput.type = 'text';
    this.hiddenInput.autocomplete = 'off';
    this.hiddenInput.setAttribute('autocorrect', 'off');
    this.hiddenInput.setAttribute('autocapitalize', 'off');
    this.hiddenInput.spellcheck = false;
    Object.assign(this.hiddenInput.style, {
      position: 'absolute',
      opacity: '0',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '0',
      border: 'none',
      outline: 'none',
      left: '0',
      top: '0',
      pointerEvents: 'none',
    } as Partial<CSSStyleDeclaration>);
    this.wrapper.appendChild(this.hiddenInput);

    this.container.appendChild(this.wrapper);

    // Canvas context
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('DOMEditorView: failed to get 2d context');
    }
    this.ctx = ctx;

    // --- Editor core ---

    this.editor = new MathEditor((/* state */) => {
      // MathEditor calls this on every mutation.
      // We re-render and notify external listeners.
      this.renderFrame();
      this.notifyChange();
    });

    // --- Font loading ---

    loadMathFont().then((result) => {
      if (this.destroyed) return;
      this.boxConfig = { ...this.boxConfig, fontFamily: result.fontFamily };
      this.userConfig.fontFamily = result.fontFamily;
      this.renderFrame();
    });

    // --- Event listeners ---

    this.boundCanvasClick = this.handleCanvasClick.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundInput = this.handleInput.bind(this);
    this.boundCompositionStart = this.handleCompositionStart.bind(this);
    this.boundCompositionEnd = this.handleCompositionEnd.bind(this);
    this.boundFocus = this.handleFocus.bind(this);
    this.boundBlur = this.handleBlur.bind(this);

    this.canvas.addEventListener('click', this.boundCanvasClick);
    this.hiddenInput.addEventListener('keydown', this.boundKeyDown);
    this.hiddenInput.addEventListener('input', this.boundInput);
    this.hiddenInput.addEventListener('compositionstart', this.boundCompositionStart);
    this.hiddenInput.addEventListener('compositionend', this.boundCompositionEnd);
    this.hiddenInput.addEventListener('focus', this.boundFocus);
    this.hiddenInput.addEventListener('blur', this.boundBlur);

    // --- Initial render ---
    this.renderFrame();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Replace the current content with the given LaTeX string. */
  setLatex(latex: string): void {
    const state = createStateFromLatex(latex);
    this.editor.setState(state);
    this.renderFrame();
    this.notifyChange();
  }

  /** Return the current content as a LaTeX string. */
  getLatex(): string {
    return astToLatex(this.editor.getState().ast);
  }

  /** Return the rendered size. */
  getSize(): FizzexSize {
    return { ...this.currentSize };
  }

  /** Register a change callback. Returns an unsubscribe function. */
  onChange(callback: FizzexChangeHandler): () => void {
    this.changeHandlers.add(callback);
    return () => {
      this.changeHandlers.delete(callback);
    };
  }

  /** Programmatically focus the editor. */
  focus(): void {
    this.hiddenInput.focus();
  }

  /** Programmatically blur the editor. */
  blur(): void {
    this.hiddenInput.blur();
  }

  /** Update configuration and re-render. */
  setConfig(partial: Partial<FizzexConfig>): void {
    Object.assign(this.userConfig, partial);
    if (partial.padding !== undefined) {
      this.padding = partial.padding;
    }
    this.boxConfig = resolveBoxRenderConfig(this.userConfig, true);
    this.renderFrame();
  }

  /** 수식 탐색 모드를 즉시 연다. */
  openExplorer(): void {
    this.explorerOverlay?.destroy();
    this.explorerOverlay = new ExplorerOverlay({
      ast: this.editor.getState().ast,
      theme: this.userConfig.theme,
      visualizerRegistry: this.userConfig.visualizerRegistry,
      onClose: () => { this.explorerOverlay = null; },
    });
  }

  /** 자동 탐색 트리거를 활성화한다 (더블클릭/호버 아이콘). */
  enableExplorer(options?: ExplorerTriggerOptions): void {
    this.disableExplorer();
    this.explorerCleanup = attachExplorerTrigger(
      this.container,
      () => this.openExplorer(),
      { theme: this.userConfig.theme, ...options },
    );
  }

  /** 자동 탐색 트리거를 비활성화한다. */
  disableExplorer(): void {
    this.explorerCleanup?.();
    this.explorerCleanup = null;
  }

  /** Tear down all DOM and timers. */
  destroy(): void {
    this.destroyed = true;
    // Stop explorer
    this.disableExplorer();
    this.explorerOverlay?.destroy();
    this.explorerOverlay = null;
    // Stop cursor blink
    this.stopCursorBlink();

    // Remove event listeners
    this.canvas.removeEventListener('click', this.boundCanvasClick);
    this.hiddenInput.removeEventListener('keydown', this.boundKeyDown);
    this.hiddenInput.removeEventListener('input', this.boundInput);
    this.hiddenInput.removeEventListener('compositionstart', this.boundCompositionStart);
    this.hiddenInput.removeEventListener('compositionend', this.boundCompositionEnd);
    this.hiddenInput.removeEventListener('focus', this.boundFocus);
    this.hiddenInput.removeEventListener('blur', this.boundBlur);

    // Remove DOM
    this.container.removeChild(this.wrapper);

    // Null-out references
    this.changeHandlers.clear();
    (this as Record<string, unknown>).canvas = null;
    (this as Record<string, unknown>).ctx = null;
    (this as Record<string, unknown>).wrapper = null;
    (this as Record<string, unknown>).hiddenInput = null;
    (this as Record<string, unknown>).container = null;
    (this as Record<string, unknown>).editor = null;
    (this as Record<string, unknown>).currentBox = null;
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  private renderFrame(): void {
    const state = this.editor.getState();
    const { ast } = state;

    // Parse the AST into a Box tree
    // (astToBox works directly from a MathNode, no parseLatex needed here
    //  because MathEditor already maintains the AST)

    // Fresh metrics - context state resets on canvas resize
    const metrics = new CanvasFontMetrics(this.ctx, this.boxConfig);
    const displayStyle = (this.boxConfig.displayMode ?? 'display') === 'display';
    const box = astToBox(ast, metrics, 1.0, displayStyle);

    // Calculate canvas dimensions
    const cssWidth = box.width + this.padding * 2;
    const cssHeight = box.height + box.depth + this.padding * 2;

    // HiDPI
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = cssWidth * dpr;
    this.canvas.height = cssHeight * dpr;
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.ctx.scale(dpr, dpr);

    // Clear
    this.ctx.clearRect(0, 0, cssWidth, cssHeight);

    // Recreate metrics after resize (context was reset)
    const freshMetrics = new CanvasFontMetrics(this.ctx, this.boxConfig);

    // Layout
    layoutBox(box, this.padding, this.padding + box.height);

    // Render boxes
    const renderer = new Projector(this.ctx, this.boxConfig, freshMetrics);
    renderer.render(box);

    // Cursor
    if (this.isFocused && this.cursorVisible && !this.isComposing) {
      renderer.renderCursor(box, state.cursor);
    }

    // Store for hit-testing and size queries
    this.currentBox = box;
    this.currentSize = {
      width: cssWidth,
      height: cssHeight,
      baseline: this.padding + box.height,
    };
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  private handleCanvasClick(e: MouseEvent): void {
    // Always focus on click
    this.hiddenInput.focus();

    if (!this.currentBox) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hitBox = hitTest(this.currentBox, x, y);
    if (hitBox && hitBox.sourceId) {
      const offset = this.calculateOffsetFromClick(hitBox, x);
      const state = this.editor.getState();
      this.editor.setState({
        ...state,
        cursor: boundary(hitBox.sourceId, offset),
      });
      this.cursorVisible = true;
      this.renderFrame();
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // During IME composition, let the browser handle everything
    if (this.isComposing) return;

    // 숫자/영문 단일 문자는 hidden input의 `input` 이벤트가 처리한다 (IME 호환).
    // 키→액션 매핑이 있으면서 단일 문자(숫자/변수)에 해당하지 않는 키만 위임.
    const action = keyToInputAction(e.key);
    if (!action) return;
    if (action.type === 'insertNumber' || action.type === 'insertVariable') return;

    e.preventDefault();
    this.editor.handleKeyDown(e);
    this.cursorVisible = true;
  }

  private handleInput(e: Event): void {
    if (this.isComposing) return;

    const input = e.target as HTMLInputElement;
    const value = input.value;
    if (!value) return;

    for (const char of value) {
      if (/[0-9.]/.test(char)) {
        this.editor.insertNumber(char);
      } else if (!/[\s]/.test(char)) {
        this.editor.insertVariable(char);
      }
    }

    // Clear the hidden input
    input.value = '';
    this.cursorVisible = true;
  }

  private handleCompositionStart(): void {
    this.isComposing = true;
  }

  private handleCompositionEnd(e: CompositionEvent): void {
    this.isComposing = false;

    const data = e.data;
    if (data) {
      for (const char of data) {
        this.editor.insertVariable(char);
      }
      this.hiddenInput.value = '';
      this.cursorVisible = true;
    }
  }

  private handleFocus(): void {
    this.isFocused = true;
    this.cursorVisible = true;
    this.startCursorBlink();
    this.renderFrame();
  }

  private handleBlur(): void {
    this.isFocused = false;
    this.stopCursorBlink();
    this.renderFrame();
  }

  // ---------------------------------------------------------------------------
  // Cursor blink
  // ---------------------------------------------------------------------------

  private startCursorBlink(): void {
    this.stopCursorBlink();
    this.cursorBlinkTimer = setInterval(() => {
      this.cursorVisible = !this.cursorVisible;
      this.renderFrame();
    }, 530);
  }

  private stopCursorBlink(): void {
    if (this.cursorBlinkTimer !== null) {
      clearInterval(this.cursorBlinkTimer);
      this.cursorBlinkTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private notifyChange(): void {
    if (this.changeHandlers.size === 0) return;
    const latex = this.getLatex();
    for (const handler of this.changeHandlers) {
      handler(latex);
    }
  }

  /**
   * Given a Box that was hit, determine the cursor offset
   * based on where the click landed horizontally.
   */
  private calculateOffsetFromClick(box: Box, clickX: number): number {
    if (box.type !== 'hbox') {
      return 0;
    }

    const hbox = box as HBox;
    let x = hbox.x;

    for (let i = 0; i < hbox.children.length; i++) {
      const child = hbox.children[i];
      const childCenter = x + child.width / 2;
      if (clickX < childCenter) {
        return i;
      }
      x += child.width;
    }

    return hbox.children.length;
  }
}
