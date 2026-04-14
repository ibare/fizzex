import { describe, it, expect } from 'vitest';
import { getBoxBounds, buildExplorerMap, explorerHitTest } from './explorer-map';
import type { GlyphBox, HBox, VBox, SurdBox, Box } from './types';
import type { RootNode, NumberNode, FracNode, MathNode, VariableNode } from '../types';
import { layoutBox } from './box-layout';

// ── 테스트 헬퍼 ──

function createGlyph(opts?: Partial<GlyphBox>): GlyphBox {
  return {
    type: 'glyph',
    char: 'x',
    italic: false,
    fontSize: 1.0,
    width: 10,
    height: 12,
    depth: 4,
    x: 0,
    y: 0,
    ...opts,
  };
}

function createHBox(children: Box[], opts?: Partial<Omit<HBox, 'children' | 'type'>>): HBox {
  const totalWidth = children.reduce((sum, c) => sum + c.width, 0);
  const maxHeight = children.length > 0 ? Math.max(...children.map(c => c.height)) : 0;
  const maxDepth = children.length > 0 ? Math.max(...children.map(c => c.depth)) : 0;
  return {
    type: 'hbox',
    children,
    width: totalWidth,
    height: maxHeight,
    depth: maxDepth,
    x: 0,
    y: 0,
    ...opts,
  };
}

function createVBox(children: Box[], opts?: Partial<Omit<VBox, 'children' | 'type'>>): VBox {
  const maxWidth = children.length > 0 ? Math.max(...children.map(c => c.width)) : 0;
  const totalHeight = children.reduce((sum, c) => sum + c.height + c.depth, 0);
  return {
    type: 'vbox',
    children,
    baselineType: 'top',
    width: maxWidth,
    height: totalHeight,
    depth: 0,
    x: 0,
    y: 0,
    ...opts,
  };
}

function makeAstNode(id: string, type: string, children?: MathNode[]): MathNode {
  if (type === 'root') {
    return { id, type: 'root', children: children ?? [] } as RootNode;
  }
  if (type === 'number') {
    return { id, type: 'number', value: '1' } as NumberNode;
  }
  if (type === 'variable') {
    return { id, type: 'variable', name: 'x' } as VariableNode;
  }
  if (type === 'frac') {
    return {
      id,
      type: 'frac',
      numerator: children?.slice(0, 1) ?? [],
      denominator: children?.slice(1) ?? [],
    } as FracNode;
  }
  return { id, type: 'number', value: '0' } as NumberNode;
}

// ── getBoxBounds ──

describe('getBoxBounds', () => {
  it('Box의 baseline 좌표를 좌상단 기준 bounds로 변환한다', () => {
    const glyph = createGlyph({ x: 10, y: 50, width: 20, height: 15, depth: 5 });
    const bounds = getBoxBounds(glyph);

    expect(bounds.x).toBe(10);
    expect(bounds.y).toBe(35); // 50 - 15
    expect(bounds.width).toBe(20);
    expect(bounds.height).toBe(20); // 15 + 5
  });

  it('depth가 0인 경우 height만 반영한다', () => {
    const glyph = createGlyph({ x: 0, y: 100, width: 10, height: 80, depth: 0 });
    const bounds = getBoxBounds(glyph);

    expect(bounds.y).toBe(20); // 100 - 80
    expect(bounds.height).toBe(80);
  });
});

// ── buildExplorerMap ──

describe('buildExplorerMap', () => {
  it('단순 HBox의 각 glyph에 대해 ExplorerBoxInfo를 생성한다', () => {
    const g1 = createGlyph({ sourceId: 'n1' });
    const g2 = createGlyph({ sourceId: 'n2' });
    const root = createHBox([g1, g2], { sourceId: 'root' });
    layoutBox(root, 0, 20);

    const astN1 = makeAstNode('n1', 'number');
    const astN2 = makeAstNode('n2', 'number');
    const astRoot = makeAstNode('root', 'root', [astN1, astN2]);

    const infos = buildExplorerMap(root, astRoot);

    // DFS pre-order: root(0) → g1(1) → g2(2)
    expect(infos).toHaveLength(3);

    // 루트
    expect(infos[0].depth).toBe(0);
    expect(infos[0].parentIndex).toBe(-1);
    expect(infos[0].childIndices).toEqual([1, 2]);
    expect(infos[0].groupId).toBe('root');

    // g1
    expect(infos[1].depth).toBe(1);
    expect(infos[1].parentIndex).toBe(0);
    expect(infos[1].path).toEqual([0]);
    expect(infos[1].astNode?.id).toBe('n1');
    expect(infos[1].groupId).toBe('n1');

    // g2
    expect(infos[2].depth).toBe(1);
    expect(infos[2].parentIndex).toBe(0);
    expect(infos[2].path).toEqual([1]);
    expect(infos[2].astNode?.id).toBe('n2');
  });

  it('sourceId가 없는 Box에는 astNode가 null이다', () => {
    const g = createGlyph(); // sourceId 없음
    const root = createHBox([g], { sourceId: 'root' });
    layoutBox(root, 0, 20);

    const astRoot = makeAstNode('root', 'root');
    const infos = buildExplorerMap(root, astRoot);

    expect(infos[1].astNode).toBeNull();
    expect(infos[1].groupId).toBeUndefined();
  });

  it('VBox 자식도 순회한다', () => {
    const g1 = createGlyph({ sourceId: 'num' });
    const g2 = createGlyph({ sourceId: 'den' });
    const vbox = createVBox([g1, g2], { sourceId: 'frac' });
    layoutBox(vbox, 0, 20);

    const astNum = makeAstNode('num', 'number');
    const astDen = makeAstNode('den', 'number');
    const astFrac = makeAstNode('frac', 'frac', [astNum, astDen]);

    const infos = buildExplorerMap(vbox, astFrac);

    expect(infos).toHaveLength(3);
    expect(infos[0].groupId).toBe('frac');
    expect(infos[1].groupId).toBe('num');
    expect(infos[2].groupId).toBe('den');
  });

  it('SurdBox의 content와 index를 순회한다', () => {
    const content = createGlyph({ sourceId: 'content' });
    const index = createGlyph({ sourceId: 'index' });
    const surd: SurdBox = {
      type: 'surd',
      content,
      index,
      ruleThickness: 0.04,
      gap: 0.1,
      actualFontSize: 20,
      width: 30,
      height: 15,
      depth: 5,
      x: 0,
      y: 0,
      sourceId: 'sqrt',
    };
    layoutBox(surd, 0, 20);

    const astContent = makeAstNode('content', 'number');
    const astIndex = makeAstNode('index', 'number');
    const astSqrt = makeAstNode('sqrt', 'root', [astContent, astIndex]);

    const infos = buildExplorerMap(surd, astSqrt);

    expect(infos).toHaveLength(3);
    expect(infos[0].groupId).toBe('sqrt');
    expect(infos[1].groupId).toBe('content');
    expect(infos[2].groupId).toBe('index');
  });

  it('bounds가 Box 좌표와 올바르게 대응한다', () => {
    const g = createGlyph({ sourceId: 'n1', width: 10, height: 12, depth: 4 });
    const root = createHBox([g], { sourceId: 'root' });
    layoutBox(root, 5, 30);

    const ast = makeAstNode('root', 'root', [makeAstNode('n1', 'number')]);
    const infos = buildExplorerMap(root, ast);

    // g는 root(HBox)의 첫 자식이므로 x=5, y=30
    const gInfo = infos[1];
    expect(gInfo.bounds.x).toBe(5);
    expect(gInfo.bounds.y).toBe(18); // 30 - 12
    expect(gInfo.bounds.width).toBe(10);
    expect(gInfo.bounds.height).toBe(16); // 12 + 4
  });
});

// ── explorerHitTest ──

describe('explorerHitTest', () => {
  function buildSimpleScene() {
    // root(HBox) → g1, g2 (각 10px 너비, 나란히)
    const g1 = createGlyph({ sourceId: 'n1', width: 10, height: 12, depth: 4 });
    const g2 = createGlyph({ sourceId: 'n2', width: 10, height: 12, depth: 4 });
    const root = createHBox([g1, g2], { sourceId: 'root' });
    layoutBox(root, 0, 20);

    const astN1 = makeAstNode('n1', 'number');
    const astN2 = makeAstNode('n2', 'number');
    const ast = makeAstNode('root', 'root', [astN1, astN2]);

    return buildExplorerMap(root, ast);
  }

  it('가장 깊은 sourceId가 있는 Box를 반환한다', () => {
    const infos = buildSimpleScene();
    // g1 영역: x=[0,10], y=[8,24]
    const result = explorerHitTest(5, 15, infos);

    expect(result).not.toBeNull();
    expect(result!.hit.groupId).toBe('n1');
    expect(result!.hit.depth).toBe(1);
  });

  it('조상 체인을 반환한다', () => {
    const infos = buildSimpleScene();
    const result = explorerHitTest(5, 15, infos);

    expect(result).not.toBeNull();
    expect(result!.ancestors).toHaveLength(1);
    expect(result!.ancestors[0].groupId).toBe('root');
  });

  it('두 번째 glyph 영역도 정확히 히트한다', () => {
    const infos = buildSimpleScene();
    // g2 영역: x=[10,20], y=[8,24]
    const result = explorerHitTest(15, 15, infos);

    expect(result).not.toBeNull();
    expect(result!.hit.groupId).toBe('n2');
  });

  it('빈 영역에서는 null을 반환한다', () => {
    const infos = buildSimpleScene();
    const result = explorerHitTest(100, 100, infos);

    expect(result).toBeNull();
  });

  it('Box 경계 정확히 위에서도 히트한다', () => {
    const infos = buildSimpleScene();
    // g1 좌상단: (0, 8)
    const result = explorerHitTest(0, 8, infos);

    expect(result).not.toBeNull();
    expect(result!.hit.groupId).toBe('n1');
  });

  it('groupId가 없는 Box는 히트에서 제외된다', () => {
    const g1 = createGlyph({ width: 10, height: 12, depth: 4 }); // sourceId 없음
    const root = createHBox([g1], { sourceId: 'root' });
    layoutBox(root, 0, 20);

    const ast = makeAstNode('root', 'root');
    const infos = buildExplorerMap(root, ast);

    // g1 내부를 클릭하면 groupId가 없으므로, root로 폴백
    const result = explorerHitTest(5, 15, infos);

    expect(result).not.toBeNull();
    expect(result!.hit.groupId).toBe('root');
  });

  it('중첩된 구조에서 가장 깊은 Box를 반환한다', () => {
    const g = createGlyph({ sourceId: 'inner', width: 10, height: 12, depth: 4 });
    const innerBox = createHBox([g], { sourceId: 'mid' });
    const outerBox = createHBox([innerBox], { sourceId: 'outer' });
    layoutBox(outerBox, 0, 20);

    const astInner = makeAstNode('inner', 'number');
    const astMid = makeAstNode('mid', 'root', [astInner]);
    const astOuter = makeAstNode('outer', 'root', [astMid]);
    const infos = buildExplorerMap(outerBox, astOuter);

    const result = explorerHitTest(5, 15, infos);

    expect(result).not.toBeNull();
    expect(result!.hit.groupId).toBe('inner');
    expect(result!.hit.depth).toBe(2);
    expect(result!.ancestors).toHaveLength(2);
    expect(result!.ancestors[0].groupId).toBe('mid');
    expect(result!.ancestors[1].groupId).toBe('outer');
  });
});
