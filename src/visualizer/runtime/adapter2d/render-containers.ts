/**
 * 7개 컨테이너 Element 컴파일 (설계 §5).
 *
 * 각 함수는 자식 Element를 `renderRoot`를 통해 드로잉한다.
 * 순환 import를 피하기 위해 `renderRoot` 콜백을 파라미터로 받는다.
 */

import type {
  ElementNode,
  GroupEl,
  IfEl,
  RepeatEl,
  MatchEl,
  LayoutEl,
  ViewportScopeEl,
  ClipEl,
} from '../types/element.js';
import { evalBool, evalExpr, evalNumOr, extendRenderContext, type RenderContext } from './render-context.js';

export type RenderRootFn = (ctx: CanvasRenderingContext2D, node: ElementNode, rc: RenderContext) => void;

export function renderGroup(
  ctx: CanvasRenderingContext2D,
  node: GroupEl,
  rc: RenderContext,
  renderRoot: RenderRootFn,
): void {
  for (const child of node.children) renderRoot(ctx, child, rc);
}

export function renderIf(
  ctx: CanvasRenderingContext2D,
  node: IfEl,
  rc: RenderContext,
  renderRoot: RenderRootFn,
): void {
  if (evalBool(node.cond, rc)) {
    renderRoot(ctx, node.then, rc);
  } else if (node.else) {
    renderRoot(ctx, node.else, rc);
  }
}

export function renderRepeat(
  ctx: CanvasRenderingContext2D,
  node: RepeatEl,
  rc: RenderContext,
  renderRoot: RenderRootFn,
): void {
  const iterName = node.as;

  if ('range' in node.of) {
    const [lo, hi] = node.of.range;
    const start = evalNumOr(lo, rc);
    const end = evalNumOr(hi, rc);
    const step = node.of.step === undefined ? 1 : evalNumOr(node.of.step, rc);
    if (step === 0) throw new Error('repeat: step must not be 0');
    if (step > 0) {
      for (let i = start; i < end; i += step) {
        const scoped = extendRenderContext(rc, { [iterName]: i });
        for (const child of node.children) renderRoot(ctx, child, scoped);
      }
    } else {
      for (let i = start; i > end; i += step) {
        const scoped = extendRenderContext(rc, { [iterName]: i });
        for (const child of node.children) renderRoot(ctx, child, scoped);
      }
    }
    return;
  }

  const items = evalExpr(node.of.items, rc);
  if (!Array.isArray(items)) throw new TypeError(`repeat.items must be array, got ${typeof items}`);
  for (const item of items) {
    const scoped = extendRenderContext(rc, { [iterName]: item });
    for (const child of node.children) renderRoot(ctx, child, scoped);
  }
}

export function renderMatch(
  ctx: CanvasRenderingContext2D,
  node: MatchEl,
  rc: RenderContext,
  renderRoot: RenderRootFn,
): void {
  const key = String(evalExpr(node.on, rc));
  const hit = node.cases[key] ?? node.default;
  if (hit) renderRoot(ctx, hit, rc);
}

export function renderLayout(
  ctx: CanvasRenderingContext2D,
  node: LayoutEl,
  rc: RenderContext,
  renderRoot: RenderRootFn,
): void {
  // Phase 3에선 layout의 rect 계산만 간단히 — 현재 frame을 direction 축으로 분할.
  // rect.ref 해소는 Phase 4 compile에서 구체화. 여기선 단순 ratio 균등 분할.
  // layout은 그 자체로는 그리지 않음 (viewport 참조의 기반만 제공). 자식만 렌더.
  const { width, height } = rc.frame;
  const areas = node.areas;
  const totalRatio = areas.reduce((acc, a) => acc + (a.ratio ?? 1), 0) || 1;

  if (node.direction === 'horizontal') {
    let x = 0;
    for (const area of areas) {
      const fixed = area.size !== undefined ? evalNumOr(area.size, rc) : undefined;
      const w = fixed ?? ((area.ratio ?? 1) / totalRatio) * width;
      const areaRc = extendRenderContext(rc, { __layoutArea: { x, y: 0, w, h: height } });
      for (const child of area.children) renderRoot(ctx, child, areaRc);
      x += w;
    }
    return;
  }

  let y = 0;
  for (const area of areas) {
    const fixed = area.size !== undefined ? evalNumOr(area.size, rc) : undefined;
    const h = fixed ?? ((area.ratio ?? 1) / totalRatio) * height;
    const areaRc = extendRenderContext(rc, { __layoutArea: { x: 0, y, w: width, h } });
    for (const child of area.children) renderRoot(ctx, child, areaRc);
    y += h;
  }
}

export function renderViewportScope(
  ctx: CanvasRenderingContext2D,
  node: ViewportScopeEl,
  rc: RenderContext,
  renderRoot: RenderRootFn,
): void {
  if (!rc.viewports.has(node.use)) throw new Error(`viewport: unknown id "${node.use}"`);
  const scoped: RenderContext = { ...rc, currentViewportId: node.use };
  for (const child of node.children) renderRoot(ctx, child, scoped);
}

export function renderClip(
  ctx: CanvasRenderingContext2D,
  node: ClipEl,
  rc: RenderContext,
  renderRoot: RenderRootFn,
): void {
  // shape을 경로로만 쌓고 clip 한 뒤 children 렌더.
  ctx.save();
  // shape 렌더링 대신 경로 쌓기만 필요 — renderRoot 호출은 stroke/fill까지 수행하므로
  // 임시로 fillStyle을 투명 처리하고 renderRoot 호출 후 ctx.clip(). 경로 손실을 피하려면
  // shape path를 직접 쌓는 `pathOnly` 경로가 별도로 필요하나, Phase 3에선 간이 구현.
  // 대안: shape을 stroke/fill 없이 경로만 쌓도록 임시 스타일을 비운다.
  const savedFill = ctx.fillStyle;
  const savedStroke = ctx.strokeStyle;
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.strokeStyle = 'rgba(0,0,0,0)';
  renderRoot(ctx, node.shape, rc);
  ctx.fillStyle = savedFill;
  ctx.strokeStyle = savedStroke;
  ctx.clip();
  for (const child of node.children) renderRoot(ctx, child, rc);
  ctx.restore();
}
