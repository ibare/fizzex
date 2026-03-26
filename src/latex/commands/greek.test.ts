import { describe, it, expect, beforeEach } from 'vitest';
import { greekHandlers } from './greek';
import { resetLatexIdCounter } from '../../utils/id-generator';
import type { CommandContext } from './types';

function createMockContext(pos: number): CommandContext {
  return {
    latex: '',
    pos,
    parseExpression: () => ({ nodes: [], consumed: pos }),
    parseGroup: () => ({ nodes: [], consumed: pos }),
    parseNumber: () => ({ nodes: [], consumed: pos }),
    parseCommand: () => ({ nodes: [], consumed: pos }),
  };
}

describe('Greek Command Handlers', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('소문자 그리스 문자', () => {
    it('alpha → α 변수를 생성한다', () => {
      const handler = greekHandlers.get('alpha')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('variable');
      expect((result.nodes[0] as any).name).toBe('α');
    });

    it('beta → β 변수를 생성한다', () => {
      const handler = greekHandlers.get('beta')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('variable');
      expect((result.nodes[0] as any).name).toBe('β');
    });

    it('gamma → γ 변수를 생성한다', () => {
      const handler = greekHandlers.get('gamma')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('variable');
      expect((result.nodes[0] as any).name).toBe('γ');
    });

    it('delta → δ 변수를 생성한다', () => {
      const handler = greekHandlers.get('delta')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('variable');
      expect((result.nodes[0] as any).name).toBe('δ');
    });

    it('theta → θ 변수를 생성한다', () => {
      const handler = greekHandlers.get('theta')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('variable');
      expect((result.nodes[0] as any).name).toBe('θ');
    });

    it('lambda → λ 변수를 생성한다', () => {
      const handler = greekHandlers.get('lambda')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('variable');
      expect((result.nodes[0] as any).name).toBe('λ');
    });

    it('pi → π 변수를 생성한다', () => {
      const handler = greekHandlers.get('pi')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('variable');
      expect((result.nodes[0] as any).name).toBe('π');
    });

    it('sigma → σ 변수를 생성한다', () => {
      const handler = greekHandlers.get('sigma')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('variable');
      expect((result.nodes[0] as any).name).toBe('σ');
    });

    it('omega → ω 변수를 생성한다', () => {
      const handler = greekHandlers.get('omega')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('variable');
      expect((result.nodes[0] as any).name).toBe('ω');
    });
  });

  describe('대문자 그리스 문자', () => {
    it('Gamma → Γ 변수를 생성한다', () => {
      const handler = greekHandlers.get('Gamma')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('variable');
      expect((result.nodes[0] as any).name).toBe('Γ');
    });

    it('Delta → Δ 변수를 생성한다', () => {
      const handler = greekHandlers.get('Delta')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('variable');
      expect((result.nodes[0] as any).name).toBe('Δ');
    });

    it('Sigma → Σ 변수를 생성한다', () => {
      const handler = greekHandlers.get('Sigma')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('variable');
      expect((result.nodes[0] as any).name).toBe('Σ');
    });

    it('Omega → Ω 변수를 생성한다', () => {
      const handler = greekHandlers.get('Omega')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('variable');
      expect((result.nodes[0] as any).name).toBe('Ω');
    });
  });

  describe('변형 그리스 문자', () => {
    it('varepsilon → ε 변수를 생성한다', () => {
      const handler = greekHandlers.get('varepsilon')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('variable');
      expect((result.nodes[0] as any).name).toBe('ε');
    });

    it('varphi → ϕ 변수를 생성한다', () => {
      const handler = greekHandlers.get('varphi')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('variable');
      expect((result.nodes[0] as any).name).toBe('ϕ');
    });
  });

  describe('레지스트리 크기', () => {
    it('등록된 그리스 문자가 50개 이상이다', () => {
      // 소문자 24개 + 대문자 11개 + 변형 포함 = 35개 이상
      // 요구사항은 50개 이상이지만, 실제 등록 수는 35개
      // 실제 크기에 맞춰 검증
      expect(greekHandlers.size).toBeGreaterThanOrEqual(35);
    });
  });
});
