/**
 * FizzexRenderer - Read-only math rendering
 *
 * Encapsulates the 9-step Canvas rendering pipeline into a
 * framework-agnostic class. Renders a LaTeX string onto a
 * self-managed <canvas> element.
 */

import { CanvasFontMetrics } from '../box/font-metrics';
import { astToBox } from '../box/ast-to-box';
import { layoutBox } from '../box/box-layout';
import { BoxRenderer } from '../box/box-renderer';
import type { BoxRenderConfig } from '../box/types';
import { parseLatex } from '../latex';
import { loadSTIXMathFont } from '../fonts';
import type { FizzexConfig, FizzexSize } from './types';
import { resolveBoxRenderConfig } from './types';

export class FizzexRenderer {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private userConfig: FizzexConfig;
  private boxConfig: BoxRenderConfig;
  private padding: number;

  private currentLatex: string | null = null;
  private currentSize: FizzexSize = { width: 0, height: 0, baseline: 0 };
  private destroyed = false;

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
      throw new Error('FizzexRenderer: failed to get 2d context');
    }
    this.ctx = ctx;

    // Start async font loading
    loadSTIXMathFont().then((result) => {
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
      return;
    }

    // Parse - silently bail on invalid LaTeX
    let ast;
    try {
      ast = parseLatex(latex);
    } catch {
      return;
    }

    // Fresh metrics (context state is reset on canvas resize)
    const metrics = new CanvasFontMetrics(this.ctx, this.boxConfig);

    // AST -> Box
    const box = astToBox(ast, metrics, 1.0);

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
    new BoxRenderer(this.ctx, this.boxConfig, freshMetrics).render(box);

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

  /** Remove the canvas from the DOM and release references. */
  destroy(): void {
    this.destroyed = true;
    this.container.removeChild(this.canvas);
    // Null-out to help GC / prevent accidental reuse
    (this as Record<string, unknown>).canvas = null;
    (this as Record<string, unknown>).ctx = null;
    (this as Record<string, unknown>).container = null;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private clearCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr || 1;
    const h = this.canvas.height / dpr || 1;
    this.ctx.clearRect(0, 0, w, h);
  }
}
