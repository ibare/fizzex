/**
 * 2D 제어 흐름(container) 매핑. Primitive는 `primitive-registry.ts`가 담당한다.
 *
 * Container는 자식 노드를 감싸며 컨트롤(loop/branch/scope) 역할을 한다.
 * group/if/repeat/match/layout/viewport/clip 7종.
 *
 * 3D-only kind(sphere 등)는 `render.ts`에서 skip 처리한다.
 */

import type { ElementNode } from '../types/element.js';
import * as containers from './render-containers.js';
import type { RenderRootFn } from './render-containers.js';
import type { RenderContext } from './render-context.js';

export type Container2DRenderer = (
  ctx: CanvasRenderingContext2D,
  node: ElementNode,
  rc: RenderContext,
  renderRoot: RenderRootFn,
) => void;

export const CONTAINER_RENDERERS: Record<string, Container2DRenderer> = {
  group: (ctx, node, rc, rr) => containers.renderGroup(ctx, node as GroupEl, rc, rr),
  if: (ctx, node, rc, rr) => containers.renderIf(ctx, node as IfEl, rc, rr),
  repeat: (ctx, node, rc, rr) => containers.renderRepeat(ctx, node as RepeatEl, rc, rr),
  match: (ctx, node, rc, rr) => containers.renderMatch(ctx, node as MatchEl, rc, rr),
  layout: (ctx, node, rc, rr) => containers.renderLayout(ctx, node as LayoutEl, rc, rr),
  viewport: (ctx, node, rc, rr) => containers.renderViewportScope(ctx, node as ViewportScopeEl, rc, rr),
  clip: (ctx, node, rc, rr) => containers.renderClip(ctx, node as ClipEl, rc, rr),
};

type GroupEl = Extract<ElementNode, { kind: 'group' }>;
type IfEl = Extract<ElementNode, { kind: 'if' }>;
type RepeatEl = Extract<ElementNode, { kind: 'repeat' }>;
type MatchEl = Extract<ElementNode, { kind: 'match' }>;
type LayoutEl = Extract<ElementNode, { kind: 'layout' }>;
type ViewportScopeEl = Extract<ElementNode, { kind: 'viewport' }>;
type ClipEl = Extract<ElementNode, { kind: 'clip' }>;

/** 3D kind 집합 — `render.ts` 진입점에서 skip/경고용. */
export const KIND_3D: ReadonlySet<string> = new Set(['sphere', 'bufferLine', 'points', 'light', 'shaderMaterial']);
