/**
 * DOMRendererView — DOM 환경 읽기 전용 수식 렌더러
 *
 * 9단계 Canvas 렌더링 파이프라인을 캡슐화.
 * 자체 관리 <canvas> 엘리먼트에 LaTeX 문자열을 렌더링한다.
 */

import { CanvasFontMetrics } from '../box/font-metrics.js';
import { astToBox } from '../box/ast-to-box.js';
import { layoutBox } from '../box/box-layout.js';
import { Projector } from '../box/projector.js';
import type { BoxRenderConfig } from '../box/types.js';
import { parseLatex } from '../latex/index.js';
import { loadMathFont } from '../fonts/index.js';
import type { FizzexConfig, FizzexSize } from './types.js';
import { resolveBoxRenderConfig } from './types.js';
import { ExplorerOverlay } from './explorer-overlay.js';
import { attachExplorerTrigger } from './explorer-trigger.js';
import type { ExplorerTriggerOptions, ExplorerTriggerHandle } from './explorer-trigger.js';
import { judgeExplorable } from './explorability.js';

export class DOMRendererView {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private userConfig: FizzexConfig;
  private boxConfig: BoxRenderConfig;
  private padding: number;

  private currentLatex: string | null = null;
  private currentSize: FizzexSize = { width: 0, height: 0, baseline: 0 };
  private destroyed = false;
  private explorerOverlay: ExplorerOverlay | null = null;
  private explorerTrigger: ExplorerTriggerHandle | null = null;
  private explorable = false;

  constructor(container: HTMLElement, config: FizzexConfig = {}) {
    this.container = container;
    this.userConfig = { ...config };
    this.padding = config.padding ?? 8;
    this.boxConfig = resolveBoxRenderConfig(config, false);

    // Create and append canvas
    this.canvas = document.createElement('canvas');
    this.container.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('DOMRendererView: failed to get 2d context');
    }
    this.ctx = ctx;

    // Start async font loading
    loadMathFont().then((result) => {
      if (this.destroyed) return;
      this.boxConfig = {
        ...this.boxConfig,
        fontFamily: result.fontFamily,
      };
      // Also persist in userConfig so setConfig merges correctly
      this.userConfig.fontFamily = result.fontFamily;
      // Re-render if we already have content
      if (this.currentLatex !== null) {
        this.render(this.currentLatex);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Render a LaTeX string onto the canvas. */
  render(latex: string): void {
    this.currentLatex = latex;

    if (!latex) {
      this.clearCanvas();
      this.currentSize = { width: 0, height: 0, baseline: 0 };
      this.setExplorable(false);
      return;
    }

    // Parse - silently bail on invalid LaTeX
    let ast;
    try {
      ast = parseLatex(latex).ast;
    } catch {
      this.setExplorable(false);
      return;
    }

    // 탐색 진입 자격은 렌더 산출물의 일부다. 방금 얻은 AST 를 그대로 쓰므로
    // 추가 파싱이 없고, LaTeX 가 바뀌면 render() 가 다시 불려 자동으로
    // 갱신된다 — 따로 캐시를 두고 무효화를 관리할 이유가 없다.
    this.setExplorable(judgeExplorable(ast));

    // Fresh metrics (context state is reset on canvas resize)
    const metrics = new CanvasFontMetrics(this.ctx, this.boxConfig);

    // AST -> Box
    const displayStyle = (this.boxConfig.displayMode ?? 'display') === 'display';
    const box = astToBox(ast, metrics, 1.0, displayStyle);

    // Calculate required canvas dimensions
    const cssWidth = box.width + this.padding * 2;
    const cssHeight = box.height + box.depth + this.padding * 2;

    // HiDPI setup (resets context transform & state)
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = cssWidth * dpr;
    this.canvas.height = cssHeight * dpr;
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.ctx.scale(dpr, dpr);

    // Clear
    this.ctx.clearRect(0, 0, cssWidth, cssHeight);

    // After resize the context is fresh - recreate metrics & renderer
    const freshMetrics = new CanvasFontMetrics(this.ctx, this.boxConfig);

    // Layout
    layoutBox(box, this.padding, this.padding + box.height);

    // Render
    new Projector(this.ctx, this.boxConfig, freshMetrics).render(box);

    // Store computed size
    this.currentSize = {
      width: cssWidth,
      height: cssHeight,
      baseline: this.padding + box.height,
    };
  }

  /** Return the last rendered size (or zeros if nothing rendered). */
  getSize(): FizzexSize {
    return { ...this.currentSize };
  }

  /** Return the current LaTeX string (or null if nothing rendered). */
  getLatex(): string | null {
    return this.currentLatex;
  }

  /** Update configuration and re-render if content exists. */
  setConfig(partial: Partial<FizzexConfig>): void {
    Object.assign(this.userConfig, partial);
    if (partial.padding !== undefined) {
      this.padding = partial.padding;
    }
    this.boxConfig = resolveBoxRenderConfig(this.userConfig, false);
    if (this.currentLatex !== null) {
      this.render(this.currentLatex);
    }
  }

  /** 수식 탐색 모드를 즉시 연다. */
  openExplorer(): void {
    if (!this.currentLatex) return;
    this.explorerOverlay?.destroy();
    this.explorerOverlay = new ExplorerOverlay({
      latex: this.currentLatex,
      theme: this.userConfig.theme,
      visualizerRegistry: this.userConfig.visualizerRegistry,
      onClose: () => { this.explorerOverlay = null; },
    });
  }

  /** 자동 탐색 트리거를 활성화한다 (더블클릭/호버 아이콘). */
  enableExplorer(options?: ExplorerTriggerOptions): void {
    this.disableExplorer();
    this.explorerTrigger = attachExplorerTrigger(
      this.container,
      () => this.openExplorer(),
      { theme: this.userConfig.theme, ...options },
    );
    // 호출 측은 render() 뒤에 이 메서드를 부른다. 현재 판정을 곧바로
    // 밀어넣지 않으면 첫 표시가 자격 없음으로 굳는다.
    this.explorerTrigger.setAvailable(this.explorable);
  }

  /** 자동 탐색 트리거를 비활성화한다. */
  disableExplorer(): void {
    this.explorerTrigger?.destroy();
    this.explorerTrigger = null;
  }

  /**
   * 현재 수식이 탐색 진입 자격을 갖는가.
   *
   * 호스트가 문서 전체의 탐색 가능 수식을 파악하는 데 쓸 수 있다.
   * 판정은 render() 가 AST 에서 파생하며, 외부에서 덮어쓸 수 없다.
   */
  isExplorable(): boolean {
    return this.explorable;
  }

  /** Remove the canvas from the DOM and release references. */
  destroy(): void {
    this.destroyed = true;
    this.disableExplorer();
    this.explorerOverlay?.destroy();
    this.explorerOverlay = null;
    this.container.removeChild(this.canvas);
    (this as Record<string, unknown>).canvas = null;
    (this as Record<string, unknown>).ctx = null;
    (this as Record<string, unknown>).container = null;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /** 판정 결과를 보관하고 트리거에 즉시 반영한다. */
  private setExplorable(next: boolean): void {
    this.explorable = next;
    this.explorerTrigger?.setAvailable(next);
  }

  private clearCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr || 1;
    const h = this.canvas.height / dpr || 1;
    this.ctx.clearRect(0, 0, w, h);
  }
}
