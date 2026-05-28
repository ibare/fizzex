/**
 * DOMStreamView — DOM 환경 스트리밍 수식 렌더러
 *
 * FizzexStreamParser의 출력을 DOM으로 렌더링한다.
 * 텍스트는 <span>, 수식은 인라인 <canvas>, 실패는 원본 텍스트 span으로 표시.
 */

import { FizzexStreamParser } from '../latex/streaming/index.js';
import type { StreamOutput, StreamParserOptions } from '../latex/streaming/index.js';
import type { Diagnostic, RenderDecision } from '../latex/tolerant/types.js';
import { CanvasFontMetrics } from '../box/font-metrics.js';
import { astToBox } from '../box/ast-to-box.js';
import { layoutBox, collectBoxPositions } from '../box/box-layout.js';
import { Projector } from '../box/projector.js';
import type { BoxRenderConfig, Box } from '../box/types.js';
import type { ConfidenceRegion, ConfidenceLevel } from '../box/confidence-indicator.js';
import { DEFAULT_CONFIDENCE_CONFIG } from '../box/confidence-indicator.js';
import { loadMathFont } from '../fonts/index.js';
import type { FizzexConfig } from './types.js';
import { resolveBoxRenderConfig } from './types.js';
import { ExplorerOverlay } from './explorer-overlay.js';
import type { ExplorerTriggerOptions } from './explorer-trigger.js';

// =========================================================================
// 타입 정의
// =========================================================================

/** 스트리밍 뷰 설정 */
export interface DOMStreamViewConfig extends FizzexConfig {
  /** confidence 오버레이 표시 (기본: true) */
  showConfidence?: boolean;
  /** tooltip 표시 (기본: true) */
  showTooltip?: boolean;
  /** StreamParser 옵션 */
  parserOptions?: Partial<StreamParserOptions>;
}

/** 내부 DOM 노드 추적 */
interface StreamNode {
  type: 'text' | 'math' | 'pending' | 'failed';
  element: HTMLElement;
}

/** tooltip 이벤트 리스너 정리 함수를 추적하는 WeakMap */
const tooltipCleanupMap = new WeakMap<HTMLElement, () => void>();

// =========================================================================
// Diagnostic → ConfidenceRegion 변환
// =========================================================================

/** Diagnostic의 confidence 수준을 분류한다 */
export function classifyConfidence(diagnostic: Diagnostic): ConfidenceLevel {
  if (
    diagnostic.parseStatus === 'parsed' &&
    diagnostic.semanticSafety === 'safe' &&
    diagnostic.normalizations.length === 0
  ) {
    return 'clean';
  }

  if (
    diagnostic.parseStatus === 'parsed' &&
    diagnostic.semanticSafety === 'safe' &&
    diagnostic.normalizations.length > 0
  ) {
    return 'normalized';
  }

  if (
    diagnostic.parseStatus === 'partial' ||
    diagnostic.semanticSafety === 'unknown'
  ) {
    return 'uncertain';
  }

  return 'failed';
}

/** Diagnostic 배열과 Box 위치 맵으로 ConfidenceRegion 배열을 생성한다 */
export function buildConfidenceRegions(
  diagnostics: Diagnostic[],
  boxPositions: Map<string, { x: number; y: number; width: number; height: number; depth: number }>,
  rootBox: Box,
): ConfidenceRegion[] {
  const regions: ConfidenceRegion[] = [];

  for (const diag of diagnostics) {
    const level = classifyConfidence(diag);
    if (level === 'clean') continue;

    const pos = boxPositions.get(diag.nodeId);
    if (pos) {
      // 노드 단위 물결선
      regions.push({ level, ...pos });
    } else {
      // 폴백: 수식 전체 bbox
      regions.push({
        level,
        x: rootBox.x,
        y: rootBox.y,
        width: rootBox.width,
        height: rootBox.height,
        depth: rootBox.depth,
      });
    }
  }

  return regions;
}

// =========================================================================
// DOMStreamView 클래스
// =========================================================================

/**
 * Headless 스트리밍 렌더러
 *
 * LLM 토큰 스트리밍에 최적화. feed(chunk)으로 텍스트를 공급하면
 * 자동으로 텍스트/수식/실패를 구분하여 DOM에 렌더링한다.
 */
export class DOMStreamView {
  private container: HTMLElement;
  private parser: FizzexStreamParser;
  private config: DOMStreamViewConfig;
  private boxConfig: BoxRenderConfig;
  private padding: number;

  private nodes: StreamNode[] = [];
  private pendingNode: StreamNode | null = null;
  private fullText = '';
  private destroyed = false;
  private fontReady = false;
  private explorerOverlay: ExplorerOverlay | null = null;
  private explorerDblclickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(container: HTMLElement, config: DOMStreamViewConfig = {}) {
    this.container = container;
    this.config = { showConfidence: true, showTooltip: true, ...config };
    this.padding = config.padding ?? 4;
    this.boxConfig = this.resolveConfig();

    this.parser = new FizzexStreamParser(this.config.parserOptions);

    // 비동기 폰트 로드
    loadMathFont().then((result) => {
      if (this.destroyed) return;
      this.fontReady = true;
      this.config.fontFamily = result.fontFamily;
      this.boxConfig = this.resolveConfig();
    });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** 텍스트 청크를 공급한다 */
  feed(chunk: string): void {
    if (this.destroyed) return;
    this.fullText += chunk;

    const outputs = this.parser.feed(chunk);
    this.processOutputs(outputs);
  }

  /** 스트림을 종료한다 */
  end(): void {
    if (this.destroyed) return;

    const outputs = this.parser.end();
    this.processOutputs(outputs);
    this.clearPending();
  }

  /** 전체 리셋 */
  reset(): void {
    if (this.destroyed) return;
    this.parser.reset();
    this.clearAllNodes();
    this.pendingNode = null;
    this.fullText = '';
  }

  /** 현재 전체 텍스트 반환 */
  getText(): string {
    return this.fullText;
  }

  /** 설정 변경 */
  setConfig(partial: Partial<DOMStreamViewConfig>): void {
    Object.assign(this.config, partial);
    if (partial.padding !== undefined) {
      this.padding = partial.padding;
    }
    this.boxConfig = this.resolveConfig();
  }

  /**
   * 자동 탐색 트리거를 활성화한다.
   * 컨테이너 레벨 이벤트 위임: 개별 수식 canvas를 더블클릭하면 해당 수식의 탐색 모드 진입.
   */
  enableExplorer(options?: Partial<ExplorerTriggerOptions>): void {
    this.disableExplorer();
    const theme = options?.theme ?? this.config.theme ?? 'light';
    this.explorerDblclickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const wrapper = target.closest('.fizzex-stream-math') as HTMLElement | null;
      if (!wrapper?.dataset.latex) return;
      e.preventDefault();
      this.explorerOverlay?.destroy();
      this.explorerOverlay = new ExplorerOverlay({
        latex: wrapper.dataset.latex,
        theme,
        visualizerRegistry: this.config.visualizerRegistry,
        onClose: () => { this.explorerOverlay = null; },
      });
    };
    this.container.addEventListener('dblclick', this.explorerDblclickHandler);
  }

  /** 자동 탐색 트리거를 비활성화한다. */
  disableExplorer(): void {
    if (this.explorerDblclickHandler) {
      this.container.removeEventListener('dblclick', this.explorerDblclickHandler);
      this.explorerDblclickHandler = null;
    }
  }

  /** 렌더러 정리 — 모든 DOM 요소 및 이벤트 리스너 제거 */
  destroy(): void {
    this.destroyed = true;
    this.disableExplorer();
    this.explorerOverlay?.destroy();
    this.explorerOverlay = null;
    this.clearAllNodes();
    this.pendingNode = null;
    this.fullText = '';
    (this as Record<string, unknown>).container = null;
    (this as Record<string, unknown>).parser = null;
  }

  // ---------------------------------------------------------------------------
  // 내부 구현
  // ---------------------------------------------------------------------------

  /** StreamOutput 배열 처리 */
  private processOutputs(outputs: StreamOutput[]): void {
    for (const output of outputs) {
      switch (output.type) {
        case 'text':
          this.clearPending();
          this.appendText(output.content);
          break;

        case 'math_complete':
          this.clearPending();
          this.appendMathComplete(output);
          break;

        case 'math_pending':
          this.updatePending(output.rawLatex);
          break;

        case 'math_failed':
          this.clearPending();
          this.appendFailed(output.rawLatex);
          break;

        case 'ambiguous_delimiter':
          this.clearPending();
          this.appendText(output.content);
          break;
      }
    }
  }

  /** 텍스트 span 추가 */
  private appendText(content: string): void {
    // 마지막 노드가 text면 content 추가
    const last = this.nodes[this.nodes.length - 1];
    if (last?.type === 'text') {
      last.element.textContent += content;
      return;
    }

    const span = document.createElement('span');
    span.className = 'fizzex-stream-text';
    span.textContent = content;
    this.container.appendChild(span);
    this.nodes.push({ type: 'text', element: span });
  }

  /** math_complete: Canvas 렌더링 + confidence 오버레이 */
  private appendMathComplete(output: StreamOutput & { type: 'math_complete' }): void {
    const wrapper = document.createElement('span');
    wrapper.className = 'fizzex-stream-math';
    wrapper.style.display = output.displayMode ? 'block' : 'inline-block';
    wrapper.style.position = 'relative';
    wrapper.dataset.latex = output.latex;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('2d context unavailable');

      // Box 변환 + 레이아웃
      const metrics = new CanvasFontMetrics(ctx, this.boxConfig);
      const box = astToBox(output.ast, metrics, 1.0, output.displayMode);

      const cssWidth = box.width + this.padding * 2;
      const cssHeight = box.height + box.depth + this.padding * 2;

      // HiDPI 설정
      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      // Canvas 크기 변경 후 metrics/renderer 재생성 (C4 MUST 준수)
      const freshMetrics = new CanvasFontMetrics(ctx, this.boxConfig);
      layoutBox(box, this.padding, this.padding + box.height);
      const renderer = new Projector(ctx, this.boxConfig, freshMetrics);
      renderer.render(box);

      // Confidence 오버레이
      if (this.config.showConfidence && output.diagnostics.length > 0) {
        const positions = collectBoxPositions(box);
        const regions = buildConfidenceRegions(output.diagnostics, positions, box);
        renderer.renderConfidence(regions);
      }

      // vertical-align: baseline 정렬
      const depth = box.depth + this.padding;
      canvas.style.verticalAlign = `${-depth}px`;

      wrapper.appendChild(canvas);

      // Tooltip
      if (this.config.showTooltip && output.diagnostics.length > 0) {
        this.attachTooltip(wrapper, output.diagnostics);
      }
    } catch {
      // silent fail: 렌더링 실패 시 원본 LaTeX 표시 (C5 MUST NOT 준수)
      wrapper.textContent = output.latex;
      wrapper.className = 'fizzex-stream-failed';
      wrapper.style.display = '';
      wrapper.style.position = '';
    }

    this.container.appendChild(wrapper);
    this.nodes.push({ type: 'math', element: wrapper });
  }

  /** math_pending: dimmed 스켈레톤 */
  private updatePending(rawLatex: string): void {
    if (this.pendingNode) {
      // 기존 pending 업데이트
      this.pendingNode.element.textContent = rawLatex;
      return;
    }

    const span = document.createElement('span');
    span.className = 'fizzex-stream-pending';
    span.style.opacity = '0.5';
    span.style.fontStyle = 'italic';
    span.textContent = rawLatex;
    this.container.appendChild(span);
    this.pendingNode = { type: 'pending', element: span };
  }

  /** math_failed: 빨강 배경 span */
  private appendFailed(rawLatex: string): void {
    const span = document.createElement('span');
    span.className = 'fizzex-stream-failed';
    span.style.backgroundColor = 'rgba(220, 38, 38, 0.08)';
    span.textContent = rawLatex;
    this.container.appendChild(span);
    this.nodes.push({ type: 'failed', element: span });
  }

  /** pending 노드 제거 */
  private clearPending(): void {
    if (this.pendingNode) {
      this.pendingNode.element.remove();
      this.pendingNode = null;
    }
  }

  /** 모든 DOM 노드 제거 (tooltip 이벤트 리스너 포함) */
  private clearAllNodes(): void {
    for (const node of this.nodes) {
      const cleanup = tooltipCleanupMap.get(node.element);
      if (cleanup) {
        cleanup();
        tooltipCleanupMap.delete(node.element);
      }
      node.element.remove();
    }
    this.nodes = [];
    this.clearPending();
  }

  /** Tooltip HTML 오버레이 부착 */
  private attachTooltip(wrapper: HTMLElement, diagnostics: Diagnostic[]): void {
    const nonClean = diagnostics.filter(d => classifyConfidence(d) !== 'clean');
    if (nonClean.length === 0) return;

    const tooltip = document.createElement('div');
    tooltip.className = 'fizzex-stream-tooltip';
    tooltip.style.cssText =
      'position:absolute;display:none;bottom:100%;left:0;' +
      'padding:4px 8px;border-radius:4px;font-size:12px;' +
      'background:#333;color:#fff;white-space:pre-wrap;z-index:10;' +
      'pointer-events:none;max-width:300px;';
    tooltip.textContent = nonClean.map(d => d.message).join('\n');

    const showTooltip = () => { tooltip.style.display = 'block'; };
    const hideTooltip = () => { tooltip.style.display = 'none'; };

    // 이벤트 리스너를 추적하여 destroy 시 정리 가능하게 함
    wrapper.addEventListener('mouseenter', showTooltip);
    wrapper.addEventListener('mouseleave', hideTooltip);
    wrapper.appendChild(tooltip);

    // 이벤트 리스너 참조를 WeakMap에 저장 (destroy 시 정리용)
    tooltipCleanupMap.set(wrapper, () => {
      wrapper.removeEventListener('mouseenter', showTooltip);
      wrapper.removeEventListener('mouseleave', hideTooltip);
    });
  }

  /** BoxRenderConfig 해석 */
  private resolveConfig(): BoxRenderConfig {
    const base = resolveBoxRenderConfig(this.config, false);
    if (this.config.showConfidence) {
      return { ...base, confidence: DEFAULT_CONFIDENCE_CONFIG };
    }
    return base;
  }
}
