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
