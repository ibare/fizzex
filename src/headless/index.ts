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
export type { ExplorerTriggerOptions, ExplorerTriggerHandle } from './explorer-trigger.js';

// 탐색 진입 자격 판정. 호스트가 문서의 어떤 수식이 탐색 가능한지 물어볼 때 쓴다.
// 술어 `isExplorable(root)` 는 매칭 결과를 이미 손에 쥔 내부 소비자용이라
// 배럴에 싣지 않는다 — 외부는 AST 만 가지므로 judgeExplorable 로 충분하다.
export { judgeExplorable } from './explorability.js';

export { ExplorerVisualizerController } from './explorer-visualizer.js';
export { ExplorerSceneChips } from './explorer-scene-chips.js';
export type { SceneChipsConfig } from './explorer-scene-chips.js';
export { ExplorerInlineControls } from './explorer-inline-controls.js';
export type { InlineControlCallbacks } from './explorer-inline-controls.js';
export { getControlType, buildInlineControlConfig } from './inline-control-types.js';
export type { ControlType, InlineControlConfig } from './inline-control-types.js';
export { createModificationState, modifyNumberNode, resetNode, resetAll, hasModifications, cloneAst } from './ast-modifier.js';
export type { AstModificationState } from './ast-modifier.js';
