/**
 * Headless adapter — DOM 환경 수식 렌더링/편집 어댑터
 */

// 새 이름 (primary)
export { DOMRendererView } from './renderer.js';
export { DOMEditorView } from './editor-view.js';
export { DOMStreamView, classifyConfidence, buildConfidenceRegions } from './stream-renderer.js';
export type { DOMStreamViewConfig } from './stream-renderer.js';

export type { FizzexConfig, FizzexSize, FizzexChangeHandler } from './types.js';

export { ExplorerOverlay } from './explorer-overlay.js';
export type { ExplorerOverlayConfig } from './explorer-overlay.js';
export type { ExplorerTriggerOptions } from './explorer-trigger.js';

export { ExplorerVisualizerController } from './explorer-visualizer.js';
export { ExplorerSceneChips } from './explorer-scene-chips.js';
export type { SceneChipsConfig } from './explorer-scene-chips.js';
export { ExplorerInlineControls } from './explorer-inline-controls.js';
export type { InlineControlCallbacks } from './explorer-inline-controls.js';
export { getControlType, buildInlineControlConfig } from './inline-control-types.js';
export type { ControlType, InlineControlConfig } from './inline-control-types.js';
export { createModificationState, modifyNumberNode, resetNode, resetAll, hasModifications, cloneAst } from './ast-modifier.js';
export type { AstModificationState } from './ast-modifier.js';
