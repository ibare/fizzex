/**
 * 스펙 기반 Visualizer 공개 진입점 (설계 §14.8).
 *
 * `createVisualizer(container, opts)`:
 *   1. opts.spec 또는 opts.registry.load(opts.id)로 raw spec 획득
 *   2. compileSpec(raw) — validate + catalog resolve
 *   3. renderer === '2d' → dynamic import mount-2d / '3d' → mount-3d
 *
 * mount-2d / mount-3d은 dynamic import로 코드 분할 — 2D-only 호스트가
 * three.js 번들을 끌어오지 않도록 한다.
 *
 * 반환 인스턴스는 2D/3D 공통 Visualizer 형태(canvas·store·scene·setter들).
 */

import type { Mount2DOptions, Visualizer2DInstance } from './mount-2d';
import type { Mount3DOptions, Visualizer3DInstance } from './mount-3d';
import { compileSpec, type CompiledVisualizer } from './compile';
import type { VisualizerRegistry, VisualizerRegistryLoadOptions } from './registry';
import type { UserBindingInputs } from './user-binding-bridge';

export {
  createVisualizerRegistry,
  type VisualizerRegistry,
  type VisualizerRegistryOptions,
  type VisualizerRegistryManifest,
  type VisualizerRegistryManifestEntry,
  type VisualizerRegistryLoadOptions,
} from './registry';
export { compileSpec, type CompiledVisualizer } from './compile';
export type { Visualizer2DInstance } from './mount-2d';
export type { Visualizer3DInstance } from './mount-3d';

/** 공통 mount 옵션 — mount-2d / mount-3d의 교집합. */
export interface CreateVisualizerBaseOptions {
  readonly width: number;
  readonly height: number;
  readonly theme?: Mount2DOptions['theme'];
  readonly locale?: string;
  readonly initialSceneId?: string;
  readonly timeScale?: number;
  /**
   * 사용자 LaTeX 식 입력 — spec.userBindings 의 각 슬롯에 매핑되는 AST(혹은
   * 즉시 number). V3 user-binding-bridge 가 outputKind 에 따라 scalar/matrix/
   * complex 채널로 분기 주입한다.
   */
  readonly userBindings?: UserBindingInputs;
}

export interface CreateVisualizerFromRegistryOptions extends CreateVisualizerBaseOptions {
  readonly registry: VisualizerRegistry;
  readonly id: string;
  readonly load?: VisualizerRegistryLoadOptions;
}

export interface CreateVisualizerFromSpecOptions extends CreateVisualizerBaseOptions {
  readonly spec: unknown;
}

export type CreateVisualizerOptions =
  | CreateVisualizerFromRegistryOptions
  | CreateVisualizerFromSpecOptions;

export type CreatedVisualizerInstance = Visualizer2DInstance | Visualizer3DInstance;

export type CreatedVisualizer = CreatedVisualizerInstance & {
  readonly compiled: CompiledVisualizer;
};

export async function createVisualizer(
  container: HTMLElement,
  opts: CreateVisualizerOptions,
): Promise<CreatedVisualizer> {
  const raw = 'spec' in opts ? opts.spec : await opts.registry.load(opts.id, opts.load);
  const compiled = compileSpec(raw);
  const renderer = compiled.spec.renderer;
  const base: CreateVisualizerBaseOptions = {
    width: opts.width,
    height: opts.height,
    theme: opts.theme,
    locale: opts.locale,
    initialSceneId: opts.initialSceneId,
    timeScale: opts.timeScale,
    userBindings: opts.userBindings,
  };

  if (renderer === '2d') {
    const { mount2d } = await import('./mount-2d');
    const instance = mount2d(container, compiled.spec, {
      ...base,
      catalogDefaults: compiled.catalogDefaults,
    } as Mount2DOptions);
    return Object.assign(instance, { compiled });
  }
  if (renderer === '3d') {
    const { mount3d } = await import('./mount-3d');
    const instance = mount3d(container, compiled.spec, {
      ...base,
      catalogDefaults: compiled.catalogDefaults,
    } as Mount3DOptions);
    return Object.assign(instance, { compiled });
  }
  const never: never = renderer;
  throw new Error(`createVisualizer: unknown renderer ${never as string}`);
}
