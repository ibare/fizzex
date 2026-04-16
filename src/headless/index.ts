/**
 * Headless adapter — DOM 환경 수식 렌더링/편집 어댑터
 */

// 새 이름 (primary)
export { DOMRendererView } from './renderer';
export { DOMEditorView } from './editor-view';
export { DOMStreamView, classifyConfidence, buildConfidenceRegions } from './stream-renderer';
export type { DOMStreamViewConfig } from './stream-renderer';

// 하위 호환 alias (deprecated)
export { DOMRendererView as FizzexRenderer } from './renderer';
export { DOMEditorView as FizzexEditor } from './editor-view';
export { DOMStreamView as FizzexStreamRenderer } from './stream-renderer';
export type { DOMStreamViewConfig as StreamRendererConfig } from './stream-renderer';

export type { FizzexConfig, FizzexSize, FizzexChangeHandler } from './types';

export { ExplorerOverlay } from './explorer-overlay';
export type { ExplorerOverlayConfig } from './explorer-overlay';
export type { ExplorerTriggerOptions } from './explorer-trigger';

export { ExplorerVisualizerController } from './explorer-visualizer';
export { ExplorerPresetsBar } from './explorer-presets-bar';
export { ExplorerInlineControls } from './explorer-inline-controls';
export type { InlineControlCallbacks } from './explorer-inline-controls';
export { getControlType, buildInlineControlConfig } from './inline-control-types';
export type { ControlType, InlineControlConfig } from './inline-control-types';
export { createModificationState, modifyNumberNode, resetNode, resetAll, hasModifications, cloneAst } from './ast-modifier';
export type { AstModificationState } from './ast-modifier';
