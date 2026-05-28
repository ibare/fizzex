/**
 * Fizzex Visualizer 프레임워크 — 공개 API (JSON spec 기반 런타임)
 */

export {
  createVisualizer,
  createVisualizerRegistry,
  compileSpec,
} from './runtime/public-api.js';
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
} from './runtime/public-api.js';

export type { VisualizerSpec } from './runtime/types/spec.js';
export type { SceneSpec, SceneStyle } from './runtime/types/scene.js';
export type { I18nText } from './runtime/types/i18n.js';
export { resolveI18n } from './runtime/types/i18n.js';
export type { UserBindingSpec, OutputKind } from './runtime/types/user-binding.js';
export { applyUserBindings } from './runtime/user-binding-bridge.js';
export type {
  ApplyUserBindingsResult,
  AppliedBinding,
  AppliedBindingValue,
  SkippedBinding,
  SkipReason,
  UserBindingInput,
  UserBindingInputs,
} from './runtime/user-binding-bridge.js';
