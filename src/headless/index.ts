/**
 * Headless adapter - framework-agnostic math rendering and editing
 */

export { FizzexRenderer } from './renderer';
export { FizzexEditor } from './editor-view';
export { FizzexStreamRenderer, classifyConfidence, buildConfidenceRegions } from './stream-renderer';
export type { StreamRendererConfig } from './stream-renderer';
export type { FizzexConfig, FizzexSize, FizzexChangeHandler } from './types';
