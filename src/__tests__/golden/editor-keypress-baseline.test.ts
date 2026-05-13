/**
 * P0 골든 마스터 — 편집기 키 시퀀스 현재 동작 스냅샷
 *
 * 키 입력 → AST 변환의 현 동작을 캡처.
 * [BUG] 표시는 P2~P4에서 의도적으로 변경될 동작.
 * [OK]  표시는 전 구간 유지되어야 하는 불변.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MathEditor } from '../../editor';
import { resetLatexIdCounter, resetEditorIdCounter } from '../../utils/id-generator';
import type { MathNode } from '../../types';

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

describe('P0 골든 — 편집기 키 입력: 숫자', () => {
  it('[BUG] "1","0" 연속 입력이 NumberNode 두 개 (P3 이후: 단일 NumberNode("10"))', () => {
    const editor = new MathEditor(() => undefined);
    press(editor, ['1', '0']);
    const c = topLevel(editor);
    expect(c.length).toBe(2);
    expect(c[0].type).toBe('number');
    expect((c[0] as MathNode & { value: string }).value).toBe('1');
    expect((c[1] as MathNode & { value: string }).value).toBe('0');
  });

  it('[BUG] "3",".","1","4" 입력이 4개 노드 (P3 이후: 단일 NumberNode("3.14"))', () => {
    const editor = new MathEditor(() => undefined);
    press(editor, ['3', '.', '1', '4']);
    expect(topLevel(editor).length).toBe(4);
  });
});

describe('P0 골든 — 편집기 키 입력: ASCII * 매핑 (전 구간 유지되어야 함)', () => {
  it('[OK] "a","*","b" → [var a, ×, var b]', () => {
    const editor = new MathEditor(() => undefined);
    press(editor, ['a', '*', 'b']);
    const c = topLevel(editor);
    expect(c.length).toBe(3);
    expect((c[1] as MathNode & { operator: string }).operator).toBe('×');
  });
});

describe('P0 골든 — 편집기 키 입력: 기본 연산자/구조 (전 구간 OK)', () => {
  it('[OK] "x","+","y" → [var x, +, var y]', () => {
    const editor = new MathEditor(() => undefined);
    press(editor, ['x', '+', 'y']);
    const c = topLevel(editor);
    expect(c.length).toBe(3);
    expect((c[0] as MathNode & { name: string }).name).toBe('x');
    expect((c[1] as MathNode & { operator: string }).operator).toBe('+');
    expect((c[2] as MathNode & { name: string }).name).toBe('y');
  });

  it('[OK] "x","=","2" → variable, =, number', () => {
    const editor = new MathEditor(() => undefined);
    press(editor, ['x', '=', '2']);
    const c = topLevel(editor);
    expect(c.length).toBe(3);
    expect(c[0].type).toBe('variable');
    expect(c[1].type).toBe('operator');
    expect(c[2].type).toBe('number');
  });
});
