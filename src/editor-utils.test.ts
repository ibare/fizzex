import { describe, it, expect } from 'vitest';
import type { RootNode, RowNode, NumberNode, FracNode, MathNode } from './types';
import { boundary } from './types';
import {
  findNodePath,
  findNodeByIdReadonly,
  spliceChildren,
  rebuildAstWithNewChildren,
  buildNewState,
  freezeState,
} from './editor-utils';

/** 테스트용 간단한 AST 생성 */
function createTestAst(): RootNode {
  const num1: NumberNode = { id: 'n1', type: 'number', value: '1' };
  const num2: NumberNode = { id: 'n2', type: 'number', value: '2' };
  const num3: NumberNode = { id: 'n3', type: 'number', value: '3' };
  const numRow: RowNode = { id: 'frac_num', type: 'row', children: [num1] };
  const denRow: RowNode = { id: 'frac_den', type: 'row', children: [num2] };
  const frac: FracNode = { id: 'frac1', type: 'frac', numerator: [numRow], denominator: [denRow] };
  const root: RootNode = { id: 'root', type: 'root', children: [frac, num3] };
  return root;
}

describe('spliceChildren', () => {
  it('원본 배열을 변경하지 않고 삽입', () => {
    const original: MathNode[] = [
      { id: 'a', type: 'number', value: '1' } as NumberNode,
      { id: 'b', type: 'number', value: '2' } as NumberNode,
    ];
    const newNode: NumberNode = { id: 'c', type: 'number', value: '3' };

    const result = spliceChildren(original, 1, 0, newNode);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('c');
    expect(result[2].id).toBe('b');
    // 원본 불변 확인
    expect(original).toHaveLength(2);
  });

  it('원본 배열을 변경하지 않고 삭제', () => {
    const original: MathNode[] = [
      { id: 'a', type: 'number', value: '1' } as NumberNode,
      { id: 'b', type: 'number', value: '2' } as NumberNode,
      { id: 'c', type: 'number', value: '3' } as NumberNode,
    ];

    const result = spliceChildren(original, 1, 1);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('c');
    expect(original).toHaveLength(3);
  });

  it('삭제 후 삽입 (교체)', () => {
    const original: MathNode[] = [
      { id: 'a', type: 'number', value: '1' } as NumberNode,
      { id: 'b', type: 'number', value: '2' } as NumberNode,
    ];
    const replacement: NumberNode = { id: 'x', type: 'number', value: '9' };

    const result = spliceChildren(original, 0, 1, replacement);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('x');
    expect(result[1].id).toBe('b');
    expect(original[0].id).toBe('a');
  });
});

describe('findNodePath', () => {
  it('루트 자체를 찾으면 빈 경로 반환', () => {
    const ast = createTestAst();
    const path = findNodePath(ast, 'root');
    expect(path).toHaveLength(0);
  });

  it('직접 자식 노드의 경로 반환', () => {
    const ast = createTestAst();
    const path = findNodePath(ast, 'frac1');

    expect(path).toHaveLength(1);
    expect(path[0].node.id).toBe('root');
    expect(path[0].childKey).toBe('children');
    expect(path[0].childIndex).toBe(0);
  });

  it('깊은 노드의 경로 반환 (3단계)', () => {
    const ast = createTestAst();
    const path = findNodePath(ast, 'n1');

    expect(path).toHaveLength(3);
    expect(path[0].node.id).toBe('root');
    expect(path[0].childKey).toBe('children');
    expect(path[0].childIndex).toBe(0);
    expect(path[1].node.id).toBe('frac1');
    expect(path[1].childKey).toBe('numerator');
    expect(path[1].childIndex).toBe(0);
    expect(path[2].node.id).toBe('frac_num');
    expect(path[2].childKey).toBe('children');
    expect(path[2].childIndex).toBe(0);
  });

  it('존재하지 않는 ID는 빈 경로 반환', () => {
    const ast = createTestAst();
    const path = findNodePath(ast, 'nonexistent');
    expect(path).toHaveLength(0);
  });
});

describe('findNodeByIdReadonly', () => {
  it('루트 노드 찾기', () => {
    const ast = createTestAst();
    const found = findNodeByIdReadonly(ast, 'root');
    expect(found).toBe(ast);
  });

  it('깊은 노드 찾기', () => {
    const ast = createTestAst();
    const found = findNodeByIdReadonly(ast, 'n2');
    expect(found).not.toBeNull();
    expect(found!.type).toBe('number');
    expect((found as NumberNode).value).toBe('2');
  });

  it('존재하지 않는 ID는 null 반환', () => {
    const ast = createTestAst();
    expect(findNodeByIdReadonly(ast, 'nonexistent')).toBeNull();
  });
});

describe('rebuildAstWithNewChildren', () => {
  it('루트의 children을 교체하면 새 루트 반환', () => {
    const ast = createTestAst();
    const newChild: NumberNode = { id: 'new1', type: 'number', value: '99' };
    const newAst = rebuildAstWithNewChildren(ast, 'root', 'children', [newChild]);

    expect(newAst).not.toBe(ast);
    expect(newAst.children).toHaveLength(1);
    expect(newAst.children[0].id).toBe('new1');
    // 원본 불변 확인
    expect(ast.children).toHaveLength(2);
  });

  it('깊은 노드의 children을 교체해도 원본 AST 불변', () => {
    const ast = createTestAst();
    const originalNum = (ast.children[0] as FracNode).numerator[0] as RowNode;
    const newChild: NumberNode = { id: 'added', type: 'number', value: '7' };
    const newChildren = [...originalNum.children, newChild];

    const newAst = rebuildAstWithNewChildren(ast, 'frac_num', 'children', newChildren);

    // 새 AST에는 추가된 노드가 있어야 함
    const newFrac = newAst.children[0] as FracNode;
    const newNumRow = newFrac.numerator[0] as RowNode;
    expect(newNumRow.children).toHaveLength(2);
    expect(newNumRow.children[1].id).toBe('added');

    // 원본 불변
    expect(originalNum.children).toHaveLength(1);

    // 경로 상의 노드는 새 객체, 형제는 공유
    expect(newAst).not.toBe(ast);
    expect(newAst.children[0]).not.toBe(ast.children[0]); // frac는 새 객체
    expect(newAst.children[1]).toBe(ast.children[1]);      // num3는 참조 공유
  });

  it('분모 교체도 올바르게 동작', () => {
    const ast = createTestAst();
    const newChild: NumberNode = { id: 'den_new', type: 'number', value: '5' };

    const newAst = rebuildAstWithNewChildren(ast, 'frac_den', 'children', [newChild]);

    const newFrac = newAst.children[0] as FracNode;
    const newDenRow = newFrac.denominator[0] as RowNode;
    expect(newDenRow.children).toHaveLength(1);
    expect(newDenRow.children[0].id).toBe('den_new');

    // 분자는 변경되지 않음 (참조 공유)
    const origFrac = ast.children[0] as FracNode;
    expect(newFrac.numerator[0]).toBe(origFrac.numerator[0]);
  });
});

describe('buildNewState', () => {
  it('새 EditorState 객체 생성', () => {
    const ast = createTestAst();
    const cursor = boundary('root', 0);

    const state = buildNewState(ast, cursor);

    expect(state.ast).toBe(ast);
    expect(state.cursor).toBe(cursor);
    expect(state.selection).toBeNull();
  });

  it('selection 포함하여 생성', () => {
    const ast = createTestAst();
    const cursor = boundary('root', 0);
    const selection = {
      start: boundary('root', 0),
      end: boundary('root', 1),
    };

    const state = buildNewState(ast, cursor, selection);

    expect(state.selection).toBe(selection);
  });
});

describe('freezeState', () => {
  it('freeze된 state의 cursor 변경 시 예외 발생', () => {
    const ast = createTestAst();
    const state = freezeState(buildNewState(ast, boundary('root', 0)));

    expect(() => {
      (state as { cursor: { index: number } }).cursor.index = 999;
    }).toThrow();
  });

  it('freeze된 state의 ast children 변경 시 예외 발생', () => {
    const ast = createTestAst();
    const state = freezeState(buildNewState(ast, boundary('root', 0)));

    expect(() => {
      (state.ast.children as MathNode[]).push({ id: 'x', type: 'number', value: '0' } as NumberNode);
    }).toThrow();
  });

  it('MathEditor에서 반환된 state가 freeze되어 있는지 확인', async () => {
    const { MathEditor } = await import('./editor');

    let capturedState: ReturnType<typeof buildNewState> | null = null;
    const editor = new MathEditor((state) => { capturedState = state; });

    editor.insertNumber('5');
    expect(capturedState).not.toBeNull();

    expect(() => {
      (capturedState!.cursor as { index: number }).index = 999;
    }).toThrow();
  });
});
