/**
 * 스펙 기반 Visualizer 공개 진입점 (설계 §14.8).
 *
 * `createVisualizerFromSpec(container, raw, opts)`:
 *   1. compileSpec(raw) — validate + catalog resolve
 *   2. renderer === '2d' → mount2d / '3d' → mount3d
 *
 * 반환 인스턴스는 2D/3D 공통 Visualizer 형태(canvas·store·scene·setter들).
 */

import type { Mount2DOptions, Visualizer2DInstance } from './mount-2d';
import { mount2d } from './mount-2d';
import type { Mount3DOptions, Visualizer3DInstance } from './mount-3d';
import { mount3d } from './mount-3d';
import { compileSpec, type CompiledVisualizer } from './compile';

export {
  loadVisualizerSpec,
  hasBuiltInSpec,
  listBuiltInVisualizerIds,
} from './spec-loader';
export { compileSpec, type CompiledVisualizer } from './compile';
export type { Visualizer2DInstance } from './mount-2d';
export type { Visualizer3DInstance } from './mount-3d';

export type CreateVisualizerOptions = Omit<Mount2DOptions, 'catalogDefaults'>;

export type CreatedVisualizerInstance = Visualizer2DInstance | Visualizer3DInstance;

export type CreatedVisualizer = CreatedVisualizerInstance & {
  readonly compiled: CompiledVisualizer;
};

export function createVisualizerFromSpec(
  container: HTMLElement,
  raw: unknown,
  opts: CreateVisualizerOptions,
): CreatedVisualizer {
  const compiled = compileSpec(raw);
  const renderer = compiled.spec.renderer;

  if (renderer === '2d') {
    const instance = mount2d(container, compiled.spec, {
      ...opts,
      catalogDefaults: compiled.catalogDefaults,
    });
    return Object.assign(instance, { compiled });
  }
  if (renderer === '3d') {
    const instance = mount3d(container, compiled.spec, {
      ...(opts satisfies Mount3DOptions),
      catalogDefaults: compiled.catalogDefaults,
    });
    return Object.assign(instance, { compiled });
  }
  const never: never = renderer;
  throw new Error(`createVisualizerFromSpec: unknown renderer ${never as string}`);
}
