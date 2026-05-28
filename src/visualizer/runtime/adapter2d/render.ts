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

import type { ElementNode } from '../types/element.js';
import { applyStyle, applyTransform } from './style-apply.js';
import {
  evalBool,
  evalExpr,
  evalNumOr,
  extendRenderContext,
  type RenderContext,
} from './render-context.js';
import { CONTAINER_RENDERERS, KIND_3D } from './dispatch.js';
import { lookupPrimitive2D } from './primitive-registry.js';
import './built-in-primitives.js';

export function renderRoot(ctx: CanvasRenderingContext2D, node: ElementNode, rc: RenderContext): void {
  if (node.visible !== undefined && !evalBool(node.visible, rc)) return;

  let active: RenderContext = rc;

  if (node.let) {
    for (const [k, expr] of Object.entries(node.let)) {
      const value = typeof expr === 'string' ? evalExpr(expr, active) : expr;
      active = extendRenderContext(active, { [k]: value });
    }
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

    const primitive = lookupPrimitive2D(node.kind);
    if (primitive) {
      primitive.draw(ctx, node, active);
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
