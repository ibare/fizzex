/**
 * Fizzex React 컴포넌트
 */

// 새 이름 (primary)
export { EditorView } from './EditorView';
export type { EditorViewProps } from './EditorView';

export { StreamView } from './StreamView';
export type { StreamViewProps } from './StreamView';

// 하위 호환 alias (deprecated)
export { EditorView as MathCanvas } from './EditorView';
export type { EditorViewProps as MathCanvasProps } from './EditorView';

export { StreamView as StreamingMath } from './StreamView';
export type { StreamViewProps as StreamingMathProps } from './StreamView';

// 기타 컴포넌트
export { SuggestionChips } from './SuggestionChips';
export type { SuggestionChipsProps } from './SuggestionChips';

export { SuggestionPopover } from './SuggestionPopover';
export type { SuggestionPopoverProps } from './SuggestionPopover';

export { ExpressionExplorer } from './ExpressionExplorer';
export type { ExpressionExplorerProps } from './ExpressionExplorer';
