import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../latex-parser';
import { resetLatexIdCounter } from '../../utils/id-generator';
import type { AccentNode, OverlineNode, VariableNode } from '../../types';

describe('Accent Command Handlers', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('악센트 명령어', () => {
    it('\\hat{x} → accent(hat) 노드를 생성한다', () => {
      const { ast: result } = parseLatex('\\hat{x}');

      expect(result.children).toHaveLength(1);
      const accent = result.children[0] as AccentNode;
      expect(accent.type).toBe('accent');
      expect(accent.accentType).toBe('hat');
      expect(accent.content).toHaveLength(1);
      expect(accent.content[0].type).toBe('row');
      const contentChildren = (accent.content[0] as any).children;
      expect(contentChildren).toHaveLength(1);
      expect(contentChildren[0].type).toBe('variable');
      expect((contentChildren[0] as VariableNode).name).toBe('x');
    });

    it('\\vec{v} → accent(vec) 노드를 생성한다', () => {
      const { ast: result } = parseLatex('\\vec{v}');

      expect(result.children).toHaveLength(1);
      const accent = result.children[0] as AccentNode;
      expect(accent.type).toBe('accent');
      expect(accent.accentType).toBe('vec');
      const contentChildren = (accent.content[0] as any).children;
      expect(contentChildren).toHaveLength(1);
      expect((contentChildren[0] as VariableNode).name).toBe('v');
    });

    it('\\dot{x} → accent(dot) 노드를 생성한다', () => {
      const { ast: result } = parseLatex('\\dot{x}');

      expect(result.children).toHaveLength(1);
      const accent = result.children[0] as AccentNode;
      expect(accent.type).toBe('accent');
      expect(accent.accentType).toBe('dot');
      const contentChildren = (accent.content[0] as any).children;
      expect(contentChildren).toHaveLength(1);
      expect((contentChildren[0] as VariableNode).name).toBe('x');
    });

    it('\\ddot{x} → accent(ddot) 노드를 생성한다', () => {
      const { ast: result } = parseLatex('\\ddot{x}');

      expect(result.children).toHaveLength(1);
      const accent = result.children[0] as AccentNode;
      expect(accent.type).toBe('accent');
      expect(accent.accentType).toBe('ddot');
      const contentChildren = (accent.content[0] as any).children;
      expect(contentChildren).toHaveLength(1);
      expect((contentChildren[0] as VariableNode).name).toBe('x');
    });

    it('\\tilde{x} → accent(tilde) 노드를 생성한다', () => {
      const { ast: result } = parseLatex('\\tilde{x}');

      expect(result.children).toHaveLength(1);
      const accent = result.children[0] as AccentNode;
      expect(accent.type).toBe('accent');
      expect(accent.accentType).toBe('tilde');
      const contentChildren = (accent.content[0] as any).children;
      expect(contentChildren).toHaveLength(1);
      expect((contentChildren[0] as VariableNode).name).toBe('x');
    });

    it('\\bar{x} → accent(bar) 노드를 생성한다', () => {
      const { ast: result } = parseLatex('\\bar{x}');

      expect(result.children).toHaveLength(1);
      const accent = result.children[0] as AccentNode;
      expect(accent.type).toBe('accent');
      expect(accent.accentType).toBe('bar');
      const contentChildren = (accent.content[0] as any).children;
      expect(contentChildren).toHaveLength(1);
      expect((contentChildren[0] as VariableNode).name).toBe('x');
    });

    it('\\widehat{AB} → accent(widehat) 노드를 생성한다', () => {
      const { ast: result } = parseLatex('\\widehat{AB}');

      expect(result.children).toHaveLength(1);
      const accent = result.children[0] as AccentNode;
      expect(accent.type).toBe('accent');
      expect(accent.accentType).toBe('widehat');
      const contentChildren = (accent.content[0] as any).children;
      expect(contentChildren).toHaveLength(2);
      expect((contentChildren[0] as VariableNode).name).toBe('A');
      expect((contentChildren[1] as VariableNode).name).toBe('B');
    });

    it('\\breve{x} → accent(breve) 노드를 생성한다', () => {
      const { ast: result } = parseLatex('\\breve{x}');

      expect(result.children).toHaveLength(1);
      const accent = result.children[0] as AccentNode;
      expect(accent.type).toBe('accent');
      expect(accent.accentType).toBe('breve');
      const contentChildren = (accent.content[0] as any).children;
      expect(contentChildren).toHaveLength(1);
      expect((contentChildren[0] as VariableNode).name).toBe('x');
    });

    it('\\check{x} → accent(check) 노드를 생성한다', () => {
      const { ast: result } = parseLatex('\\check{x}');

      expect(result.children).toHaveLength(1);
      const accent = result.children[0] as AccentNode;
      expect(accent.type).toBe('accent');
      expect(accent.accentType).toBe('check');
      const contentChildren = (accent.content[0] as any).children;
      expect(contentChildren).toHaveLength(1);
      expect((contentChildren[0] as VariableNode).name).toBe('x');
    });
  });

  describe('overline', () => {
    it('\\overline{AB} → overline 노드를 생성한다', () => {
      const { ast: result } = parseLatex('\\overline{AB}');

      expect(result.children).toHaveLength(1);
      const overline = result.children[0] as OverlineNode;
      expect(overline.type).toBe('overline');
      expect(overline.content).toHaveLength(1);
      expect(overline.content[0].type).toBe('row');
      const contentChildren = (overline.content[0] as any).children;
      expect(contentChildren).toHaveLength(2);
      expect((contentChildren[0] as VariableNode).name).toBe('A');
      expect((contentChildren[1] as VariableNode).name).toBe('B');
    });
  });
});
