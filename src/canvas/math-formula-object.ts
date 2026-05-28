/**
 * MathFormulaObject — 수식을 씬 그래프에 편입하는 브릿지
 *
 * Box + Projector 파이프라인을 DisplayObject로 래핑하여
 * 위치, 스케일, 투명도 애니메이션이 가능한 수식 객체를 만든다.
 *
 * decompose()로 AST sub-node별로 분리하면
 * 분자/분모/지수 등을 개별적으로 이동/애니메이션할 수 있다.
 */

import type { RootNode } from '../types.js';
import type { Box, BoxRenderConfig } from '../box/types.js';
import type { CanvasFontMetrics } from '../box/font-metrics.js';
import { astToBox } from '../box/ast-to-box.js';
import { layoutBox, findBoxBySourceId } from '../box/box-layout.js';
import { Projector } from '../box/projector.js';
import { DisplayObject } from './display-object.js';
import type { SceneSurface } from './scene-surface.js';

export interface MathFormulaConfig {
  ast: RootNode;
  renderConfig: BoxRenderConfig;
  /** 특정 서브트리만 렌더할 AST 노드 ID (분해 모드용) */
  subtreeNodeId?: string;
}

export class MathFormulaObject extends DisplayObject {
  private box: Box | null = null;
  private metrics: CanvasFontMetrics | null = null;
  private readonly ast: RootNode;
  private readonly renderConfig: BoxRenderConfig;
  private readonly subtreeNodeId?: string;

  constructor(config: MathFormulaConfig) {
    super();
    this.ast = config.ast;
    this.renderConfig = config.renderConfig;
    this.subtreeNodeId = config.subtreeNodeId;
  }

  /** Box의 너비 */
  get boxWidth(): number {
    return this.box?.width ?? 0;
  }

  /** Box의 전체 높이 (height + depth) */
  get boxHeight(): number {
    return this.box ? this.box.height + this.box.depth : 0;
  }

  /**
   * Box 트리 빌드
   *
   * Canvas 크기 변경 시 CanvasFontMetrics가 리셋되므로
   * 새 metrics를 전달하여 재빌드해야 한다 (C4).
   */
  rebuild(metrics: CanvasFontMetrics): void {
    this.metrics = metrics;
    const fullBox = astToBox(this.ast, metrics, 1.0, true);
    layoutBox(fullBox, 0, 0);

    if (this.subtreeNodeId) {
      this.box = findBoxBySourceId(fullBox, this.subtreeNodeId) ?? fullBox;
    } else {
      this.box = fullBox;
    }
  }

  protected draw(surface: SceneSurface): void {
    if (!this.box || !this.metrics) return;

    const projector = new Projector(surface, this.renderConfig, this.metrics);
    projector.render(this.box);
  }

  /**
   * AST sub-node별로 개별 MathFormulaObject 배열 반환
   *
   * 각 객체는 독립적인 DisplayObject로서 위치/스케일 애니메이션 가능.
   * rebuild()는 호출자가 별도로 실행해야 한다.
   */
  static decompose(
    ast: RootNode,
    renderConfig: BoxRenderConfig,
    nodeIds: string[],
  ): MathFormulaObject[] {
    return nodeIds.map(id => new MathFormulaObject({
      ast,
      renderConfig,
      subtreeNodeId: id,
    }));
  }
}
