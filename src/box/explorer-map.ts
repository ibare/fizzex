/**
 * Expression Explorer 매핑 유틸리티
 *
 * Box 트리와 AST로부터 확장 정보(ExplorerBoxInfo)를 빌드하고,
 * 향상된 히트 테스트(조상 체인 포함)를 제공한다.
 *
 * React/DOM 의존 없는 순수 유틸리티.
 */

import type { Box } from './types.js';
import type { MathNode } from '../types.js';

/** Box 좌표를 화면 좌표계 사각형으로 변환한 결과 */
export interface BoxBounds {
  /** 좌상단 x (= box.x) */
  x: number;
  /** 좌상단 y (= box.y - box.height, baseline 위 높이만큼 위) */
  y: number;
  /** box.width */
  width: number;
  /** box.height + box.depth (baseline 위 + 아래) */
  height: number;
}

/** Explorer에서 사용하는 확장 Box 정보 */
export interface ExplorerBoxInfo {
  /** 원본 Box 참조 */
  box: Box;
  /** 화면 좌표계 bounds */
  bounds: BoxBounds;
  /** sourceId로 연결된 AST 노드 (없으면 null) */
  astNode: MathNode | null;
  /** 루트에서의 자식 인덱스 경로 */
  path: number[];
  /** 부모의 flat array 인덱스 (-1 = 루트) */
  parentIndex: number;
  /** 자식들의 flat array 인덱스 */
  childIndices: number[];
  /** 트리 깊이 (루트 = 0) */
  depth: number;
  /** 그룹 ID: 같은 AST 노드에 속하는 Box를 묶는 키 (= sourceId) */
  groupId: string | undefined;
}

/** 향상된 히트 테스트 결과 */
export interface ExplorerHitResult {
  /** 가장 깊은 매칭 Box */
  hit: ExplorerBoxInfo;
  /** 루트까지의 조상 체인 (가까운 조상 → 먼 조상 순) */
  ancestors: ExplorerBoxInfo[];
}

/**
 * Box 좌표에서 화면 좌표 bounds 계산
 *
 * Box.y는 baseline 위치이므로, 좌상단 y = box.y - box.height
 */
export function getBoxBounds(box: Box): BoxBounds {
  return {
    x: box.x,
    y: box.y - box.height,
    width: box.width,
    height: box.height + box.depth,
  };
}

/**
 * AST를 DFS 순회하여 id → MathNode 매핑을 구축한다.
 */
function collectAstNodes(node: MathNode): Map<string, MathNode> {
  const map = new Map<string, MathNode>();

  function walk(n: MathNode): void {
    map.set(n.id, n);

    switch (n.type) {
      // 자식이 children 배열인 노드
      case 'root':
      case 'row':
        for (const child of n.children) walk(child);
        break;

      // 명명된 자식 배열이 있는 노드
      case 'frac':
        for (const c of n.numerator) walk(c);
        for (const c of n.denominator) walk(c);
        break;
      case 'power':
        for (const c of n.base) walk(c);
        for (const c of n.exponent) walk(c);
        break;
      case 'subscript':
        for (const c of n.base) walk(c);
        for (const c of n.subscript) walk(c);
        break;
      case 'sqrt':
        for (const c of n.content) walk(c);
        if (n.index) for (const c of n.index) walk(c);
        break;
      case 'paren':
      case 'abs':
      case 'overline':
      case 'accent':
      case 'cancel':
        for (const c of n.content) walk(c);
        break;
      case 'func':
        for (const c of n.argument) walk(c);
        break;
      case 'integral':
        if (n.lower) for (const c of n.lower) walk(c);
        if (n.upper) for (const c of n.upper) walk(c);
        for (const c of n.integrand) walk(c);
        break;
      case 'sum':
      case 'product':
        for (const c of n.lower) walk(c);
        for (const c of n.upper) walk(c);
        for (const c of n.body) walk(c);
        break;
      case 'limit':
        for (const c of n.approach) walk(c);
        for (const c of n.body) walk(c);
        break;
      case 'overset':
        for (const c of n.base) walk(c);
        for (const c of n.annotation) walk(c);
        break;
      case 'xarrow':
        for (const c of n.above) walk(c);
        if (n.below) for (const c of n.below) walk(c);
        break;
      case 'matrix':
      case 'align':
      case 'cases':
      case 'array':
        for (const row of n.rows) {
          for (const cell of row) walk(cell);
        }
        break;
      case 'gather':
        for (const row of n.rows) walk(row);
        break;
      case 'opaque':
        for (const argGroup of n.args) {
          for (const c of argGroup) walk(c);
        }
        break;

      // 리프 노드: number, variable, operator, text, space, literal, error
      default:
        break;
    }
  }

  walk(node);
  return map;
}

/** Box의 자식 Box 배열을 반환한다. */
function getBoxChildren(box: Box): Box[] {
  switch (box.type) {
    case 'hbox':
    case 'vbox':
      return box.children;
    case 'surd': {
      const children: Box[] = [box.content];
      if (box.index) children.push(box.index);
      return children;
    }
    default:
      return [];
  }
}

/**
 * Box 트리와 AST로부터 ExplorerBoxInfo 맵을 빌드한다.
 *
 * DFS pre-order로 Box 트리를 순회하며 각 Box에 대한 ExplorerBoxInfo를 생성.
 * sourceId가 있는 Box는 AST nodeMap에서 대응 노드를 찾아 연결한다.
 *
 * @param rootBox - layoutBox() 호출이 완료된 루트 Box
 * @param ast - 원본 AST 노드 (RootNode)
 * @returns ExplorerBoxInfo 배열 (DFS pre-order)
 */
export function buildExplorerMap(
  rootBox: Box,
  ast: MathNode,
): ExplorerBoxInfo[] {
  const astMap = collectAstNodes(ast);
  const infos: ExplorerBoxInfo[] = [];

  function walk(box: Box, parentIdx: number, path: number[], depth: number): void {
    const idx = infos.length;
    const info: ExplorerBoxInfo = {
      box,
      bounds: getBoxBounds(box),
      astNode: box.sourceId ? (astMap.get(box.sourceId) ?? null) : null,
      path: [...path],
      parentIndex: parentIdx,
      childIndices: [],
      depth,
      groupId: box.sourceId,
    };
    infos.push(info);

    // 부모의 childIndices에 자신을 등록
    if (parentIdx >= 0) {
      infos[parentIdx].childIndices.push(idx);
    }

    // 자식 순회
    const children = getBoxChildren(box);
    for (let i = 0; i < children.length; i++) {
      walk(children[i], idx, [...path, i], depth + 1);
    }
  }

  walk(rootBox, -1, [], 0);
  return infos;
}

/**
 * 향상된 히트 테스트: 가장 깊은 groupId가 있는 Box + 조상 체인을 반환한다.
 *
 * @param x - Box 좌표계 x
 * @param y - Box 좌표계 y
 * @param infos - buildExplorerMap 결과
 * @returns 히트 결과, 또는 null
 */
export function explorerHitTest(
  x: number,
  y: number,
  infos: ExplorerBoxInfo[],
): ExplorerHitResult | null {
  let bestInfo: ExplorerBoxInfo | null = null;
  let bestDepth = -1;

  for (const info of infos) {
    const b = info.bounds;
    if (
      info.groupId &&
      x >= b.x &&
      x <= b.x + b.width &&
      y >= b.y &&
      y <= b.y + b.height &&
      info.depth > bestDepth
    ) {
      bestInfo = info;
      bestDepth = info.depth;
    }
  }

  if (!bestInfo) return null;

  // 조상 체인 구축 (가까운 조상 → 먼 조상 순)
  const ancestors: ExplorerBoxInfo[] = [];
  let current = bestInfo.parentIndex;
  while (current >= 0) {
    const ancestor = infos[current];
    if (ancestor.groupId) {
      ancestors.push(ancestor);
    }
    current = ancestor.parentIndex;
  }

  return { hit: bestInfo, ancestors };
}
