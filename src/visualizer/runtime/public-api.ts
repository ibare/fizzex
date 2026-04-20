/**
 * 스펙 기반 Visualizer 공개 진입점 (설계 §14.8).
 *
 * `createVisualizerFromSpec(container, raw, opts)`:
 *   1. compileSpec(raw) — validate + catalog resolve
 *   2. mount2d(container, compiled.spec, { catalogDefaults, ...opts })
 *
 * 3D renderer는 Phase 6에서 `mount3d` 브랜치가 추가되면 여기서 분기한다.
 * 현재는 `renderer: "2d"`만 허용.
 */

import type { Mount2DOptions, Visualizer2DInstance } from './mount-2d';
import { mount2d } from './mount-2d';
import { compileSpec, type CompiledVisualizer } from './compile';

export type CreateVisualizerOptions = Omit<Mount2DOptions, 'catalogDefaults'>;

export interface CreatedVisualizer extends Visualizer2DInstance {
  readonly compiled: CompiledVisualizer;
}

export function createVisualizerFromSpec(
  container: HTMLElement,
  raw: unknown,
  opts: CreateVisualizerOptions,
): CreatedVisualizer {
  const compiled = compileSpec(raw);
  if (compiled.spec.renderer !== '2d') {
    throw new Error(
      `createVisualizerFromSpec: renderer "${compiled.spec.renderer}" is not supported yet (Phase 6).`,
    );
  }

  const instance = mount2d(container, compiled.spec, {
    ...opts,
    catalogDefaults: compiled.catalogDefaults,
  });
  return Object.assign(instance, { compiled });
}
