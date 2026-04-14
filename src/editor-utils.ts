/**
 * Editor Immutable Utilities
 *
 * AST를 불변적으로 업데이트하기 위한 유틸리티 함수들.
 * P4 원칙 준수: 상태 변경은 항상 새 객체를 생성하여 반환한다.
 */

import type { MathNode, RootNode, CursorPosition, EditorState } from './types';

/** AST 트리에서 루트→타겟까지의 경로 세그먼트 */
export interface NodePathSegment {
  node: MathNode;
  childKey: string;
  childIndex: number;
}

/**
 * 노드의 자식 배열 키 목록 반환
 *
 * editor.ts의 getChildKeys와 동일한 로직이지만 독립적으로 유지하여
 * editor-utils가 editor.ts에 의존하지 않도록 한다.
 */
function getChildKeys(node: MathNode): string[] {
  switch (node.type) {
    case 'root':
    case 'row':
      return ['children'];
    case 'frac':
      return ['numerator', 'denominator'];
    case 'power':
      return ['base', 'exponent'];
    case 'subscript':
      return ['base', 'subscript'];
    case 'sqrt':
      return ['content', 'index'];
    case 'paren':
    case 'abs':
    case 'overline':
    case 'accent':
    case 'cancel':
      return ['content'];
    case 'overset':
      return ['base', 'annotation'];
    case 'xarrow':
      return ['above', 'below'];
    case 'func':
      return ['argument'];
    case 'integral':
      return ['lower', 'upper', 'integrand'];
    case 'sum':
    case 'product':
      return ['lower', 'upper', 'body'];
    case 'limit':
      return ['approach', 'body'];
    case 'matrix':
    case 'align':
    case 'cases':
    case 'array':
      return ['rows'];
    case 'gather':
      return ['rows'];
    case 'number':
    case 'variable':
    case 'operator':
    case 'text':
    case 'space':
    case 'literal':
    case 'error':
    case 'opaque':
      return [];
  }
}

/** 노드에서 키로 자식 배열을 읽기 전용으로 접근 */
function getChildArray(node: MathNode, key: string): MathNode[] {
  const descriptor = Object.getOwnPropertyDescriptor(node, key);
  if (!descriptor) return [];
  return Array.isArray(descriptor.value) ? descriptor.value : [];
}

/**
 * 루트에서 타겟 노드까지의 경로를 찾는다.
 *
 * @returns 루트에서 타겟까지의 경로 세그먼트 배열. 찾지 못하면 빈 배열.
 *          마지막 세그먼트는 타겟의 부모 노드와 타겟이 위치한 childKey/childIndex.
 */
export function findNodePath(root: MathNode, targetId: string): NodePathSegment[] {
  if (root.id === targetId) return [];

  const keys = getChildKeys(root);
  for (const key of keys) {
    const children = getChildArray(root, key);
    for (let i = 0; i < children.length; i++) {
      if (children[i].id === targetId) {
        return [{ node: root, childKey: key, childIndex: i }];
      }
      const subPath = findNodePath(children[i], targetId);
      if (subPath.length > 0 || children[i].id === targetId) {
        return [{ node: root, childKey: key, childIndex: i }, ...subPath];
      }
    }
  }

  return [];
}

/**
 * ID로 노드를 찾아 반환한다 (읽기 전용).
 */
export function findNodeByIdReadonly(root: MathNode, id: string): MathNode | null {
  if (root.id === id) return root;
  const keys = getChildKeys(root);
  for (const key of keys) {
    const children = getChildArray(root, key);
    for (const child of children) {
      const found = findNodeByIdReadonly(child, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 순수 함수 splice: 원본 배열을 변경하지 않고 새 배열을 반환한다.
 */
export function spliceChildren(
  children: MathNode[],
  start: number,
  deleteCount: number,
  ...items: MathNode[]
): MathNode[] {
  return [
    ...children.slice(0, start),
    ...items,
    ...children.slice(start + deleteCount),
  ];
}

/**
 * 경로를 따라 특정 노드의 자식 배열을 교체하여 새 AST를 생성한다.
 *
 * 경로 상의 노드만 새 객체로 생성하고, 나머지 형제 노드는 참조를 공유한다.
 *
 * @param root - 현재 AST 루트
 * @param targetNodeId - 자식 배열을 교체할 노드의 ID
 * @param childKey - 교체할 자식 배열의 키 (예: 'children', 'numerator')
 * @param newChildren - 새 자식 배열
 * @returns 새 RootNode
 */
export function rebuildAstWithNewChildren(
  root: RootNode,
  targetNodeId: string,
  childKey: string,
  newChildren: MathNode[],
): RootNode {
  return rebuildNode(root, targetNodeId, childKey, newChildren) as RootNode;
}

/** 재귀적으로 노드를 재구축한다. 타겟 노드를 찾으면 해당 키의 자식을 교체. */
function rebuildNode(
  node: MathNode,
  targetId: string,
  targetChildKey: string,
  newChildren: MathNode[],
): MathNode {
  if (node.id === targetId) {
    return { ...node, [targetChildKey]: newChildren };
  }

  const keys = getChildKeys(node);
  for (const key of keys) {
    const children = getChildArray(node, key);
    for (let i = 0; i < children.length; i++) {
      if (containsId(children[i], targetId)) {
        const rebuiltChild = rebuildNode(children[i], targetId, targetChildKey, newChildren);
        const newChildArray = [
          ...children.slice(0, i),
          rebuiltChild,
          ...children.slice(i + 1),
        ];
        return { ...node, [key]: newChildArray };
      }
    }
  }

  return node;
}

/** 노드 또는 하위 트리에 특정 ID가 존재하는지 확인 */
function containsId(node: MathNode, targetId: string): boolean {
  if (node.id === targetId) return true;
  const keys = getChildKeys(node);
  for (const key of keys) {
    const children = getChildArray(node, key);
    for (const child of children) {
      if (containsId(child, targetId)) return true;
    }
  }
  return false;
}

/**
 * 새 EditorState 객체를 생성한다.
 */
export function buildNewState(
  ast: RootNode,
  cursor: CursorPosition,
  selection: EditorState['selection'] = null,
): EditorState {
  return { ast, cursor, selection };
}

/**
 * AST 노드를 재귀적으로 freeze한다 (개발 모드 전용).
 */
function deepFreezeNode(node: MathNode): void {
  Object.freeze(node);
  const keys = getChildKeys(node);
  for (const key of keys) {
    const children = getChildArray(node, key);
    Object.freeze(children);
    for (const child of children) {
      deepFreezeNode(child);
    }
  }
}

/**
 * EditorState를 freeze하여 의도치 않은 mutation을 방지한다.
 * 테스트 환경과 개발 모드에서만 활성화된다.
 */
export function freezeState(state: EditorState): EditorState {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    Object.freeze(state);
    Object.freeze(state.cursor);
    if (state.selection) {
      Object.freeze(state.selection);
      Object.freeze(state.selection.start);
      Object.freeze(state.selection.end);
    }
    deepFreezeNode(state.ast);
  }
  return state;
}
