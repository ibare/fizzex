/**
 * 2D 어댑터 진입점 (설계 §5·§9).
 *
 * `renderRoot(ctx, node, rc)`:
 *   1. visibility 체크 (false면 no-op)
 *   2. `let` 바인딩 스코프 적용
 *   3. viewport 필드가 있으면 currentViewportId 교체
 *   4. ctx.save() → opacity · transform · style 적용 → dispatch → ctx.restore()
 *
 * 3D Element를 만나면 현재는 skip (Phase 6 어댑터 도입 전).
 */

import type { ElementNode } from '../types/element';
import { applyStyle, applyTransform } from './style-apply';
import {
  evalBool,
  evalExpr,
  evalNumOr,
  extendRenderContext,
  type RenderContext,
} from './render-context';
import { SHAPE_RENDERERS, CONTAINER_RENDERERS, KIND_3D } from './dispatch';

export function renderRoot(ctx: CanvasRenderingContext2D, node: ElementNode, rc: RenderContext): void {
  if (node.visible !== undefined && !evalBool(node.visible, rc)) return;

  let active: RenderContext = rc;

  if (node.let) {
    const scope: Record<string, unknown> = {};
    for (const [k, expr] of Object.entries(node.let)) {
      scope[k] = evalExpr(expr, active);
    }
    active = extendRenderContext(active, scope);
  }

  if (node.viewport) {
    if (!active.viewports.has(node.viewport)) {
      throw new Error(`render: unknown viewport "${node.viewport}"`);
    }
    active = { ...active, currentViewportId: node.viewport };
  }

  ctx.save();
  try {
    if (node.opacity !== undefined) {
      ctx.globalAlpha *= evalNumOr(node.opacity, active);
    }
    applyTransform(ctx, node.transform, active);
    applyStyle(ctx, node.style, active);

    const shape = SHAPE_RENDERERS[node.kind];
    if (shape) {
      shape(ctx, node, active);
      return;
    }
    const container = CONTAINER_RENDERERS[node.kind];
    if (container) {
      container(ctx, node, active, renderRoot);
      return;
    }
    if (KIND_3D.has(node.kind)) return;
    throw new Error(`render: unknown element kind "${node.kind}"`);
  } finally {
    ctx.restore();
  }
}
