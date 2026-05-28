/**
 * P6 페르소나 — 다자리 숫자 입력 플로우
 *
 * 학습자가 자연스럽게 키를 두드릴 때, 연속된 숫자/소수점이
 * 단일 NumberNode로 유지되는지 검증한다.
 * (P6 머지 분기 도입 이후 유지되어야 할 페르소나 불변.)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MathEditor } from '../../editor.js';
import { resetLatexIdCounter, resetEditorIdCounter } from '../../utils/id-generator.js';
import type { MathNode, NumberNode } from '../../types.js';

beforeEach(() => {
  resetLatexIdCounter();
  resetEditorIdCounter();
});

function createKeyEvent(key: string): KeyboardEvent {
  return {
    key,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    isComposing: false,
  } as unknown as KeyboardEvent;
}

function press(editor: MathEditor, keys: string[]): void {
  for (const k of keys) editor.handleKeyDown(createKeyEvent(k));
}

function topLevel(editor: MathEditor): MathNode[] {
  return editor.getState().ast.children;
}

describe('페르소나: 다자리 숫자 입력', () => {
  it('"1","2","3" 연속 입력은 단일 NumberNode("123")로 머지된다', () => {
    const editor = new MathEditor(() => undefined);
    press(editor, ['1', '2', '3']);
    const c = topLevel(editor);
    expect(c.length).toBe(1);
    expect((c[0] as NumberNode).value).toBe('123');
  });

  it('소수점 포함 "3",".","1","4" 입력은 단일 NumberNode("3.14")로 머지된다', () => {
    const editor = new MathEditor(() => undefined);
    press(editor, ['3', '.', '1', '4']);
    const c = topLevel(editor);
    expect(c.length).toBe(1);
    expect((c[0] as NumberNode).value).toBe('3.14');
  });

  it('숫자 뒤 연산자, 다시 숫자 — 두 NumberNode + operator로 분리된다', () => {
    const editor = new MathEditor(() => undefined);
    press(editor, ['1', '2', '+', '3', '4']);
    const c = topLevel(editor);
    expect(c.length).toBe(3);
    expect((c[0] as NumberNode).value).toBe('12');
    expect(c[1].type).toBe('operator');
    expect((c[2] as NumberNode).value).toBe('34');
  });

  it('변수 사이 숫자는 변수와 머지되지 않는다', () => {
    const editor = new MathEditor(() => undefined);
    press(editor, ['x', '5', 'y']);
    const c = topLevel(editor);
    expect(c.length).toBe(3);
    expect(c[0].type).toBe('variable');
    expect((c[1] as NumberNode).value).toBe('5');
    expect(c[2].type).toBe('variable');
  });
});
