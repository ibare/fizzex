import { describe, it, expect } from 'vitest';
import { layoutBox, collectBoxPositions, hitTest, findBoxBySourceId, getCursorXPosition } from './box-layout';
import type { GlyphBox, HBox, VBox, RuleBox, KernBox, Box } from './types';

function createTestGlyph(opts?: Partial<GlyphBox>): GlyphBox {
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

function createTestHBox(children: Box[], opts?: Partial<Omit<HBox, 'children' | 'type'>>): HBox {
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

function createTestVBox(children: Box[], opts?: Partial<Omit<VBox, 'children' | 'type'>>): VBox {
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

describe('Box Layout', () => {
  describe('layoutBox - 기본', () => {
    it('glyph Box에 x, y를 설정한다', () => {
      const glyph = createTestGlyph();
      layoutBox(glyph, 50, 100);

      expect(glyph.x).toBe(50);
      expect(glyph.y).toBe(100);
    });

    it('rule Box에 x, y를 설정한다', () => {
      const rule: RuleBox = {
        type: 'rule',
        thickness: 1,
        width: 100,
        height: 0.5,
        depth: 0.5,
        x: 0,
        y: 0,
      };
      layoutBox(rule, 10, 20);

      expect(rule.x).toBe(10);
      expect(rule.y).toBe(20);
    });

    it('kern Box에 x, y를 설정한다', () => {
      const kern: KernBox = {
        type: 'kern',
        width: 5,
        height: 0,
        depth: 0,
        x: 0,
        y: 0,
      };
      layoutBox(kern, 30, 40);

      expect(kern.x).toBe(30);
      expect(kern.y).toBe(40);
    });
  });

  describe('layoutBox - HBox', () => {
    it('자식들을 가로로 나열한다', () => {
      const child1 = createTestGlyph({ width: 10 });
      const child2 = createTestGlyph({ width: 15 });
      const child3 = createTestGlyph({ width: 20 });
      const hbox = createTestHBox([child1, child2, child3]);

      layoutBox(hbox, 0, 100);

      expect(child1.x).toBe(0);
      expect(child2.x).toBe(10);
      expect(child3.x).toBe(25);
    });

    it('자식들의 y를 부모 baseline에 맞춘다', () => {
      const child1 = createTestGlyph();
      const child2 = createTestGlyph();
      const hbox = createTestHBox([child1, child2]);

      layoutBox(hbox, 0, 50);

      expect(child1.y).toBe(50);
      expect(child2.y).toBe(50);
    });

    it('shift가 있는 자식의 y를 조정한다', () => {
      const normal = createTestGlyph();
      const shifted = createTestGlyph({ shift: -5 });
      const hbox = createTestHBox([normal, shifted]);

      layoutBox(hbox, 0, 100);

      expect(normal.y).toBe(100);
      expect(shifted.y).toBe(95); // 100 + (-5)
    });

    it('빈 HBox를 올바르게 처리한다', () => {
      const hbox = createTestHBox([]);

      layoutBox(hbox, 10, 20);

      expect(hbox.x).toBe(10);
      expect(hbox.y).toBe(20);
    });

    it('중첩된 HBox를 올바르게 레이아웃한다', () => {
      const innerChild1 = createTestGlyph({ width: 8 });
      const innerChild2 = createTestGlyph({ width: 12 });
      const innerHBox = createTestHBox([innerChild1, innerChild2]);
      const outerChild = createTestGlyph({ width: 10 });
      const outerHBox = createTestHBox([outerChild, innerHBox]);

      layoutBox(outerHBox, 0, 50);

      expect(outerChild.x).toBe(0);
      expect(innerHBox.x).toBe(10);
      expect(innerChild1.x).toBe(10);
      expect(innerChild2.x).toBe(18);
    });
  });

  describe('layoutBox - VBox', () => {
    it('자식들을 세로로 나열한다', () => {
      const child1 = createTestGlyph({ height: 12, depth: 4, width: 10 });
      const child2 = createTestGlyph({ height: 12, depth: 4, width: 10 });
      const totalH = (12 + 4) * 2; // 32
      const vbox = createTestVBox([child1, child2], { height: totalH, depth: 0 });

      layoutBox(vbox, 0, 100);

      // currentY starts at vbox.y - vbox.height = 100 - 32 = 68
      // child1 baseline = 68 + 12 = 80, then currentY += 12+4 = 84
      // child2 baseline = 84 + 12 = 96
      expect(child1.y).toBe(80);
      expect(child2.y).toBe(96);
    });

    it('자식을 가로 중앙 정렬한다', () => {
      const narrowChild = createTestGlyph({ width: 10 });
      const vbox = createTestVBox([narrowChild], {
        width: 40,
        height: 16,
        depth: 0,
      });

      layoutBox(vbox, 0, 50);

      // childX = 0 + (40 - 10) / 2 = 15
      expect(narrowChild.x).toBe(15);
    });

    it('shift가 있는 자식은 다르게 배치한다', () => {
      const normalChild = createTestGlyph({ height: 12, depth: 4, width: 10 });
      const shiftedChild = createTestGlyph({ height: 12, depth: 4, width: 10, shift: -10 });
      const vbox = createTestVBox([normalChild, shiftedChild], {
        height: 32,
        depth: 0,
        width: 10,
      });

      layoutBox(vbox, 0, 100);

      // normalChild: currentY = 100 - 32 = 68, baseline = 68 + 12 = 80
      expect(normalChild.y).toBe(80);
      // shiftedChild has shift=-10: baseline = vbox.y + shift = 100 + (-10) = 90
      expect(shiftedChild.y).toBe(90);
    });
  });

  describe('collectBoxPositions', () => {
    it('sourceId가 있는 Box들의 위치를 수집한다', () => {
      const glyph = createTestGlyph({ sourceId: 'node_1' });
      layoutBox(glyph, 10, 20);

      const positions = collectBoxPositions(glyph);

      expect(positions.size).toBe(1);
      expect(positions.get('node_1')).toEqual({
        x: 10,
        y: 20,
        width: 10,
        height: 12,
        depth: 4,
      });
    });

    it('sourceId가 없는 Box는 제외한다', () => {
      const glyph = createTestGlyph(); // no sourceId
      layoutBox(glyph, 0, 0);

      const positions = collectBoxPositions(glyph);

      expect(positions.size).toBe(0);
    });

    it('중첩된 Box 내부도 수집한다', () => {
      const child1 = createTestGlyph({ sourceId: 'c1', width: 10 });
      const child2 = createTestGlyph({ sourceId: 'c2', width: 15 });
      const hbox = createTestHBox([child1, child2], { sourceId: 'parent' });

      layoutBox(hbox, 0, 50);

      const positions = collectBoxPositions(hbox);

      expect(positions.size).toBe(3);
      expect(positions.has('parent')).toBe(true);
      expect(positions.has('c1')).toBe(true);
      expect(positions.has('c2')).toBe(true);
    });

    it('빈 트리는 빈 Map을 반환한다', () => {
      const hbox = createTestHBox([]);
      layoutBox(hbox, 0, 0);

      const positions = collectBoxPositions(hbox);

      expect(positions.size).toBe(0);
    });
  });

  describe('hitTest', () => {
    it('Box 영역 내 좌표에서 sourceId를 반환한다', () => {
      const glyph = createTestGlyph({ sourceId: 'hit_me' });
      layoutBox(glyph, 10, 20);
      // 영역: x=10~20, y=(20-12)~(20+4) = 8~24

      const result = hitTest(glyph, 15, 15);

      expect(result).not.toBeNull();
      expect(result!.sourceId).toBe('hit_me');
    });

    it('Box 영역 밖에서 null을 반환한다', () => {
      const glyph = createTestGlyph({ sourceId: 'miss_me' });
      layoutBox(glyph, 10, 20);

      const result = hitTest(glyph, 100, 100);

      expect(result).toBeNull();
    });

    it('중첩된 Box에서 가장 깊은 Box를 반환한다', () => {
      const child = createTestGlyph({ sourceId: 'deep', width: 10 });
      const hbox = createTestHBox([child], { sourceId: 'shallow' });

      layoutBox(hbox, 0, 20);

      const result = hitTest(hbox, 5, 15);

      expect(result).not.toBeNull();
      expect(result!.sourceId).toBe('deep');
    });

    it('HBox 자식 중 해당 좌표의 Box를 찾는다', () => {
      const child1 = createTestGlyph({ sourceId: 'left', width: 10 });
      const child2 = createTestGlyph({ sourceId: 'right', width: 10 });
      const hbox = createTestHBox([child1, child2]);

      layoutBox(hbox, 0, 20);

      const leftHit = hitTest(hbox, 5, 15);
      const rightHit = hitTest(hbox, 15, 15);

      expect(leftHit!.sourceId).toBe('left');
      expect(rightHit!.sourceId).toBe('right');
    });

    it('sourceId가 없는 Box는 건너뛴다', () => {
      const child = createTestGlyph({ width: 10 }); // no sourceId
      const hbox = createTestHBox([child], { sourceId: 'parent' });

      layoutBox(hbox, 0, 20);

      // child has no sourceId, so hitTest should return parent
      const result = hitTest(hbox, 5, 15);

      expect(result).not.toBeNull();
      expect(result!.sourceId).toBe('parent');
    });
  });

  describe('findBoxBySourceId', () => {
    it('루트 Box의 sourceId를 찾는다', () => {
      const glyph = createTestGlyph({ sourceId: 'root' });

      const found = findBoxBySourceId(glyph, 'root');

      expect(found).toBe(glyph);
    });

    it('HBox 자식에서 sourceId를 찾는다', () => {
      const child1 = createTestGlyph({ sourceId: 'a' });
      const child2 = createTestGlyph({ sourceId: 'b' });
      const hbox = createTestHBox([child1, child2]);

      const found = findBoxBySourceId(hbox, 'b');

      expect(found).toBe(child2);
    });

    it('깊게 중첩된 Box에서 찾는다', () => {
      const deepChild = createTestGlyph({ sourceId: 'deep' });
      const innerHBox = createTestHBox([deepChild]);
      const outerHBox = createTestHBox([innerHBox]);

      const found = findBoxBySourceId(outerHBox, 'deep');

      expect(found).toBe(deepChild);
    });

    it('존재하지 않는 sourceId는 null을 반환한다', () => {
      const glyph = createTestGlyph({ sourceId: 'exists' });

      const found = findBoxBySourceId(glyph, 'nonexistent');

      expect(found).toBeNull();
    });
  });

  describe('getCursorXPosition', () => {
    it('offset 0이면 HBox.x를 반환한다', () => {
      const child1 = createTestGlyph({ width: 10 });
      const child2 = createTestGlyph({ width: 15 });
      const hbox = createTestHBox([child1, child2]);

      layoutBox(hbox, 20, 50);

      expect(getCursorXPosition(hbox, 0)).toBe(20);
    });

    it('중간 offset에서 해당 위치 x를 반환한다', () => {
      const child1 = createTestGlyph({ width: 10 });
      const child2 = createTestGlyph({ width: 15 });
      const child3 = createTestGlyph({ width: 20 });
      const hbox = createTestHBox([child1, child2, child3]);

      layoutBox(hbox, 5, 50);

      // offset 1: x = 5 + 10 = 15
      expect(getCursorXPosition(hbox, 1)).toBe(15);
      // offset 2: x = 5 + 10 + 15 = 30
      expect(getCursorXPosition(hbox, 2)).toBe(30);
    });

    it('offset이 자식 수와 같으면 전체 너비까지 계산한다', () => {
      const child1 = createTestGlyph({ width: 10 });
      const child2 = createTestGlyph({ width: 15 });
      const hbox = createTestHBox([child1, child2]);

      layoutBox(hbox, 5, 50);

      // offset 2 (= children.length): x = 5 + 10 + 15 = 30
      expect(getCursorXPosition(hbox, 2)).toBe(30);
    });
  });
});
