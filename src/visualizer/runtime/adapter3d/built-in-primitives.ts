/**
 * 내장 3D primitive 등록.
 *
 * adapter3d/index.ts가 import 시 이 모듈의 side effect로 registry에 등록된다.
 * 제어 흐름(group/if/repeat/match)과 deferred(shaderMaterial)은 primitive가
 * 아니므로 여기 없다 — render.ts가 직접 분기한다.
 */

import type { ElementNode } from '../types/element.js';
import { registerPrimitive3D } from './primitive-registry.js';
import { buildBufferLine, buildLight, buildPoints, buildSphere } from './shape-builders.js';

type NarrowFor<K extends string> = Extract<ElementNode, { kind: K }>;

registerPrimitive3D({
  kind: 'sphere',
  build: (node, rc) => buildSphere(node as NarrowFor<'sphere'>, rc),
});
registerPrimitive3D({
  kind: 'bufferLine',
  build: (node, rc) => buildBufferLine(node as NarrowFor<'bufferLine'>, rc),
});
registerPrimitive3D({
  kind: 'points',
  build: (node, rc) => buildPoints(node as NarrowFor<'points'>, rc),
});
registerPrimitive3D({
  kind: 'light',
  build: (node, rc) => buildLight(node as NarrowFor<'light'>, rc),
});
