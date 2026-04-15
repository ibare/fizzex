import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Projector } from './projector';
import { MockSurface } from './surface';
import type { Box, GlyphBox, HBox, VBox, RuleBox, KernBox, BoxRenderConfig } from './types';

function createMockMetrics(): any {
  return {
    measureWidth: vi.fn().mockReturnValue(10),
    measureStringWidth: vi.fn().mockReturnValue(50),
    getHeight: vi.fn().mockReturnValue(14),
    getDepth: vi.fn().mockReturnValue(4),
    getFont: vi.fn().mockReturnValue('20px serif'),
    getActualFontSize: vi.fn((fs: number) => 20 * fs),
    getDelimiterGlyph: vi.fn().mockReturnValue({ type: 'single', char: '(', heightEm: 1 }),
    getDelimiterPair: vi.fn().mockReturnValue({
      open: { sizes: [{ char: '(', heightEm: 1 }] },
      close: { sizes: [{ char: ')', heightEm: 1 }] },
    }),
  };
}

function createDefaultConfig(): BoxRenderConfig {
  return {
    baseFontSize: 20,
    fontFamily: 'serif',
    color: '#000000',
    cursorColor: '#0000ff',
  };
}

function makeGlyph(char: string, overrides?: Partial<GlyphBox>): GlyphBox {
  return {
    type: 'glyph',
    char,
    italic: false,
    fontSize: 1.0,
    width: 10,
    height: 14,
    depth: 4,
    x: 0,
    y: 20,
    ...overrides,
  };
}

function makeHBox(children: Box[], overrides?: Partial<HBox>): HBox {
  return {
    type: 'hbox',
    children,
    width: children.reduce((sum, c) => sum + c.width, 0),
    height: 14,
    depth: 4,
    x: 0,
    y: 20,
    ...overrides,
  };
}

function makeVBox(children: Box[], overrides?: Partial<VBox>): VBox {
  return {
    type: 'vbox',
    children,
    baselineType: 'center',
    width: Math.max(...children.map(c => c.width), 0),
    height: 14,
    depth: 4,
    x: 0,
    y: 20,
    ...overrides,
  };
}

function makeRule(overrides?: Partial<RuleBox>): RuleBox {
  return {
    type: 'rule',
    thickness: 1,
    width: 50,
    height: 0.5,
    depth: 0.5,
    x: 0,
    y: 20,
    ...overrides,
  };
}

function makeKern(width: number): KernBox {
  return {
    type: 'kern',
    width,
    height: 0,
    depth: 0,
    x: 0,
    y: 0,
  };
}

describe('Projector', () => {
  let backend: MockSurface;
  let metrics: any;
  let config: BoxRenderConfig;

  beforeEach(() => {
    backend = new MockSurface();
    metrics = createMockMetrics();
    config = createDefaultConfig();
  });

  describe('생성', () => {
    it('MockSurface로 생성할 수 있다', () => {
      const renderer = new Projector(backend, config, metrics);
      expect(renderer).toBeDefined();
    });
  });

  describe('render - glyph', () => {
    it('glyph Box를 렌더링한다', () => {
      const renderer = new Projector(backend, config, metrics);
      const glyph = makeGlyph('x', { x: 10, y: 25 });

      renderer.render(glyph);

      expect(backend.hasCalled('fillText')).toBe(true);
    });

    it('fillText가 호출된다', () => {
      const renderer = new Projector(backend, config, metrics);
      const glyph = makeGlyph('A', { x: 5, y: 30 });

      renderer.render(glyph);

      const args = backend.getLastCallArgs('fillText');
      expect(args).toEqual(['A', 5, 30]);
    });

    it('올바른 폰트를 설정한다', () => {
      const renderer = new Projector(backend, config, metrics);
      const glyph = makeGlyph('B', { italic: true, fontSize: 1.0 });

      renderer.render(glyph);

      expect(backend.hasCalled('setFont')).toBe(true);
      expect(metrics.getFont).toHaveBeenCalledWith(1.0, true);
    });
  });

  describe('render - hbox', () => {
    it('HBox의 자식들을 순회하며 렌더링한다', () => {
      const renderer = new Projector(backend, config, metrics);
      const child1 = makeGlyph('a', { x: 0, y: 20 });
      const child2 = makeGlyph('b', { x: 10, y: 20 });
      const hbox = makeHBox([child1, child2]);

      renderer.render(hbox);

      // Each glyph child should trigger fillText
      expect(backend.countCalls('fillText')).toBe(2);
    });
  });

  describe('render - vbox', () => {
    it('VBox의 자식들을 순회하며 렌더링한다', () => {
      const renderer = new Projector(backend, config, metrics);
      const child1 = makeGlyph('1', { x: 0, y: 10 });
      const child2 = makeGlyph('2', { x: 0, y: 30 });
      const vbox = makeVBox([child1, child2]);

      renderer.render(vbox);

      expect(backend.countCalls('fillText')).toBe(2);
    });
  });

  describe('render - rule', () => {
    it('rule Box를 fillRect로 렌더링한다', () => {
      const renderer = new Projector(backend, config, metrics);
      const rule = makeRule({ x: 5, y: 20, width: 50, height: 0.5, thickness: 1 });

      renderer.render(rule);

      expect(backend.hasCalled('fillRect')).toBe(true);
      const args = backend.getLastCallArgs('fillRect');
      expect(args).toBeDefined();
      // fillRect(x, top, width, thickness) where top = y - height
      expect(args![0]).toBe(5);      // x
      expect(args![2]).toBe(50);     // width
      expect(args![3]).toBe(1);      // thickness
    });
  });

  describe('render - kern', () => {
    it('kern Box는 렌더링을 건너뛴다', () => {
      const renderer = new Projector(backend, config, metrics);
      const kern = makeKern(10);

      renderer.render(kern);

      // kern should not produce any rendering calls
      expect(backend.hasCalled('fillText')).toBe(false);
      expect(backend.hasCalled('fillRect')).toBe(false);
      expect(backend.calls.length).toBe(0);
    });
  });

  describe('커서', () => {
    it('getCursorPosition이 좌표를 반환한다', () => {
      const renderer = new Projector(backend, config, metrics);
      const glyph = makeGlyph('x', { x: 10, y: 20 });
      const rootBox = makeHBox([glyph], { sourceId: 'root_1', x: 0, y: 20 });

      const pos = renderer.getCursorPosition(rootBox, { nodeId: 'root_1', offset: 0 });

      expect(pos).not.toBeNull();
      expect(pos).toHaveProperty('x');
      expect(pos).toHaveProperty('y');
      expect(pos).toHaveProperty('height');
      expect(typeof pos!.x).toBe('number');
      expect(typeof pos!.y).toBe('number');
      expect(pos!.height).toBeGreaterThan(0);
    });
  });
});
