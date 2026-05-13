/**
 * Fizzex Visualizer 프레임워크 — 공개 API (JSON spec 기반 런타임)
 */

export {
  createVisualizer,
  createVisualizerRegistry,
  compileSpec,
} from './runtime/public-api';
export type {
  CreateVisualizerOptions,
  CreateVisualizerBaseOptions,
  CreateVisualizerFromRegistryOptions,
  CreateVisualizerFromSpecOptions,
  CreatedVisualizer,
  CreatedVisualizerInstance,
  CompiledVisualizer,
  Visualizer2DInstance,
  Visualizer3DInstance,
  VisualizerRegistry,
  VisualizerRegistryOptions,
  VisualizerRegistryManifest,
  VisualizerRegistryManifestEntry,
  VisualizerRegistryLoadOptions,
} from './runtime/public-api';

export type { VisualizerSpec } from './runtime/types/spec';
export type { SceneSpec, SceneStyle } from './runtime/types/scene';
export type { I18nText } from './runtime/types/i18n';
export { resolveI18n } from './runtime/types/i18n';
export type { UserBindingSpec, OutputKind } from './runtime/types/user-binding';
export { applyUserBindings } from './runtime/user-binding-bridge';
export type {
  ApplyUserBindingsResult,
  AppliedBinding,
  SkippedBinding,
  SkipReason,
} from './runtime/user-binding-bridge';
