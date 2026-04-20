/**
 * Fizzex Visualizer 프레임워크 — 공개 API (JSON spec 기반 런타임)
 */

export {
  createVisualizerFromSpec,
  loadVisualizerSpec,
  hasBuiltInSpec,
  listBuiltInVisualizerIds,
  compileSpec,
} from './runtime/public-api';
export type {
  CreateVisualizerOptions,
  CreatedVisualizer,
  CreatedVisualizerInstance,
  CompiledVisualizer,
  Visualizer2DInstance,
  Visualizer3DInstance,
} from './runtime/public-api';

export type { VisualizerSpec } from './runtime/types/spec';
export type { SceneSpec, SceneStyle } from './runtime/types/scene';
export type { I18nText } from './runtime/types/i18n';
export { resolveI18n } from './runtime/types/i18n';
