/**
 * AST 수정 모듈
 *
 * 스테퍼 컨트롤이 숫자 노드를 변경할 때 사용한다.
 * 원본 AST를 보존하고 작업 사본을 별도로 관리한다.
 */

import type { MathNode, RootNode } from '../types.js';

// ─── 타입 ───

/** AST 수정 상태 */
export interface AstModificationState {
  /** 원본 AST deep copy (불변) */
  readonly originalAst: RootNode;
  /** 현재 작업 AST */
  workingAst: RootNode;
  /** nodeId → { 원래 값, 현재 값 } */
  modifications: Map<string, { originalValue: string; currentValue: string }>;
}

// ─── 공개 API ───

/** AST 수정 상태 초기화 */
export function createModificationState(ast: RootNode): AstModificationState {
  return {
    originalAst: cloneAst(ast) as RootNode,
    workingAst: cloneAst(ast) as RootNode,
    modifications: new Map(),
  };
}

/** number 노드의 값을 변경하고 새로 재구성된 workingAst를 반환 */
export function modifyNumberNode(
  state: AstModificationState,
  nodeId: string,
  newValue: number,
): RootNode {
  const origNode = findNodeById(state.originalAst, nodeId);
  if (!origNode || origNode.type !== 'number') return state.workingAst;

  const newValueStr = formatNumber(newValue);
  const existing = state.modifications.get(nodeId);
  if (existing) {
    existing.currentValue = newValueStr;
  } else {
    state.modifications.set(nodeId, {
      originalValue: origNode.value,
      currentValue: newValueStr,
    });
  }

  state.workingAst = rebuildWorking(state.originalAst, state.modifications);
  return state.workingAst;
}

/** 특정 노드를 원래 값으로 복원 */
export function resetNode(
  state: AstModificationState,
  nodeId: string,
): RootNode {
  if (!state.modifications.has(nodeId)) return state.workingAst;
  state.modifications.delete(nodeId);
  state.workingAst = rebuildWorking(state.originalAst, state.modifications);
  return state.workingAst;
}

/** 모든 수정을 원래대로 복원 */
export function resetAll(state: AstModificationState): RootNode {
  state.modifications.clear();
  state.workingAst = rebuildWorking(state.originalAst, state.modifications);
  return state.workingAst;
}

/** original 의 새 deep clone 위에 modifications 의 currentValue 만 적용한다. */
function rebuildWorking(
  original: RootNode,
  modifications: AstModificationState['modifications'],
): RootNode {
  const clone = cloneAst(original) as RootNode;
  if (modifications.size === 0) return clone;
  for (const [nodeId, mod] of modifications) {
    const target = findNodeById(clone, nodeId);
    if (target && target.type === 'number') {
      target.value = mod.currentValue;
    }
  }
  return clone;
}

/** 수정이 있는지 확인 */
export function hasModifications(state: AstModificationState): boolean {
  return state.modifications.size > 0;
}

// ─── AST deep clone ───

/** ID를 보존하는 AST deep clone */
export function cloneAst(node: MathNode): MathNode {
  switch (node.type) {
    case 'number':
      return { ...node };
    case 'variable':
      return { ...node };
    case 'operator':
      return { ...node };
    case 'text':
      return { ...node };
    case 'space':
      return { ...node };
    case 'literal':
      return { ...node };
    case 'error':
      return { ...node, errorInfo: { ...node.errorInfo } };

    case 'root':
      return { ...node, children: node.children.map(cloneAst) };
    case 'row':
      return { ...node, children: node.children.map(cloneAst) };

    case 'frac':
      return {
        ...node,
        numerator: node.numerator.map(cloneAst),
        denominator: node.denominator.map(cloneAst),
      };
    case 'power':
      return {
        ...node,
        base: node.base.map(cloneAst),
        exponent: node.exponent.map(cloneAst),
      };
    case 'subscript':
      return {
        ...node,
        base: node.base.map(cloneAst),
        subscript: node.subscript.map(cloneAst),
      };
    case 'sqrt':
      return {
        ...node,
        content: node.content.map(cloneAst),
        index: node.index?.map(cloneAst),
      };
    case 'paren':
      return { ...node, content: node.content.map(cloneAst) };
    case 'abs':
      return { ...node, content: node.content.map(cloneAst) };
    case 'func':
      return { ...node, argument: node.argument.map(cloneAst) };
    case 'overline':
      return { ...node, content: node.content.map(cloneAst) };
    case 'accent':
      return { ...node, content: node.content.map(cloneAst) };
    case 'cancel':
      return { ...node, content: node.content.map(cloneAst) };

    case 'integral':
      return {
        ...node,
        lower: node.lower?.map(cloneAst),
        upper: node.upper?.map(cloneAst),
        integrand: node.integrand.map(cloneAst),
      };
    case 'sum':
      return {
        ...node,
        lower: node.lower.map(cloneAst),
        upper: node.upper.map(cloneAst),
        body: node.body.map(cloneAst),
      };
    case 'limit':
      return {
        ...node,
        approach: node.approach.map(cloneAst),
        body: node.body.map(cloneAst),
      };
    case 'product':
      return {
        ...node,
        lower: node.lower.map(cloneAst),
        upper: node.upper.map(cloneAst),
        body: node.body.map(cloneAst),
      };
    case 'overset':
      return {
        ...node,
        base: node.base.map(cloneAst),
        annotation: node.annotation.map(cloneAst),
      };
    case 'xarrow':
      return {
        ...node,
        above: node.above.map(cloneAst),
        below: node.below?.map(cloneAst),
      };

    case 'matrix':
      return { ...node, rows: node.rows.map((row) => row.map(cloneAst)) };
    case 'align':
      return { ...node, rows: node.rows.map((row) => row.map(cloneAst)) };
    case 'cases':
      return { ...node, rows: node.rows.map((row) => row.map(cloneAst)) };
    case 'gather':
      return { ...node, rows: node.rows.map(cloneAst) };
    case 'array':
      return {
        ...node,
        rows: node.rows.map((row) => row.map(cloneAst)),
        colAlign: [...node.colAlign],
        colLines: [...node.colLines],
        rowLines: [...node.rowLines],
      };

    case 'opaque':
      return { ...node, args: node.args.map((a) => a.map(cloneAst)) };

    default:
      // leaf 노드 — shallow copy로 충분
      return Object.assign({}, node);
  }
}

// ─── 내부 헬퍼 ───

/** AST에서 특정 ID의 노드를 찾는다 */
function findNodeById(root: MathNode, targetId: string): MathNode | null {
  if (root.id === targetId) return root;

  for (const child of getChildren(root)) {
    const found = findNodeById(child, targetId);
    if (found) return found;
  }

  return null;
}

/** 노드의 모든 자식을 flat하게 반환 */
function getChildren(node: MathNode): MathNode[] {
  switch (node.type) {
    case 'root': case 'row':
      return node.children;
    case 'frac':
      return [...node.numerator, ...node.denominator];
    case 'power':
      return [...node.base, ...node.exponent];
    case 'subscript':
      return [...node.base, ...node.subscript];
    case 'sqrt':
      return [...node.content, ...(node.index ?? [])];
    case 'paren': case 'abs': case 'overline': case 'accent': case 'cancel':
      return node.content;
    case 'func':
      return node.argument;
    case 'integral':
      return [...(node.lower ?? []), ...(node.upper ?? []), ...node.integrand];
    case 'sum': case 'product':
      return [...node.lower, ...node.upper, ...node.body];
    case 'limit':
      return [...node.approach, ...node.body];
    case 'overset':
      return [...node.base, ...node.annotation];
    case 'xarrow':
      return [...node.above, ...(node.below ?? [])];
    case 'matrix': case 'align': case 'cases': case 'array':
      return node.rows.flat();
    case 'gather':
      return node.rows;
    case 'opaque':
      return node.args.flat();
    default:
      return [];
  }
}

/** 숫자를 깔끔한 문자열로 포맷 */
function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  // 소수점 이하 불필요한 0 제거
  return parseFloat(value.toFixed(6)).toString();
}
