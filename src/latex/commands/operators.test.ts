import { describe, it, expect, beforeEach } from 'vitest';
import { operatorHandlers } from './operators.js';
import { resetLatexIdCounter } from '../../utils/id-generator.js';
import type { CommandContext } from './types.js';

function createMockContext(pos: number): CommandContext {
  return {
    latex: '',
    pos,
    commandName: '',
    parseExpression: () => ({ nodes: [], consumed: pos }),
    parseGroup: () => ({ nodes: [], consumed: pos }),
    parseNumber: () => ({ nodes: [], consumed: pos }),
    parseCommand: () => ({ nodes: [], consumed: pos }),
  };
}

describe('Operator Command Handlers', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('기본 연산자', () => {
    it('times → × 연산자를 생성한다', () => {
      const handler = operatorHandlers.get('times')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('operator');
      expect((result.nodes[0] as any).operator).toBe('×');
    });

    it('div → ÷ 연산자를 생성한다', () => {
      const handler = operatorHandlers.get('div')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('operator');
      expect((result.nodes[0] as any).operator).toBe('÷');
    });

    it('cdot → · 연산자를 생성한다', () => {
      const handler = operatorHandlers.get('cdot')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('operator');
      expect((result.nodes[0] as any).operator).toBe('·');
    });

    it('pm → ± 연산자를 생성한다', () => {
      const handler = operatorHandlers.get('pm')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('operator');
      expect((result.nodes[0] as any).operator).toBe('±');
    });

    it('mp → ∓ 연산자를 생성한다', () => {
      const handler = operatorHandlers.get('mp')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('operator');
      expect((result.nodes[0] as any).operator).toBe('∓');
    });
  });

  describe('관계 연산자', () => {
    it('neq → ≠ 연산자를 생성한다', () => {
      const handler = operatorHandlers.get('neq')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('operator');
      expect((result.nodes[0] as any).operator).toBe('≠');
    });

    it('leq → ≤ 연산자를 생성한다', () => {
      const handler = operatorHandlers.get('leq')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('operator');
      expect((result.nodes[0] as any).operator).toBe('≤');
    });

    it('geq → ≥ 연산자를 생성한다', () => {
      const handler = operatorHandlers.get('geq')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('operator');
      expect((result.nodes[0] as any).operator).toBe('≥');
    });

    it('approx → ≈ 연산자를 생성한다', () => {
      const handler = operatorHandlers.get('approx')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('operator');
      expect((result.nodes[0] as any).operator).toBe('≈');
    });

    it('equiv → ≡ 연산자를 생성한다', () => {
      const handler = operatorHandlers.get('equiv')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('operator');
      expect((result.nodes[0] as any).operator).toBe('≡');
    });
  });

  describe('집합 연산자', () => {
    it('in → ∈ 연산자를 생성한다', () => {
      const handler = operatorHandlers.get('in')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('operator');
      expect((result.nodes[0] as any).operator).toBe('∈');
    });

    it('subset → ⊂ 연산자를 생성한다', () => {
      const handler = operatorHandlers.get('subset')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('operator');
      expect((result.nodes[0] as any).operator).toBe('⊂');
    });

    it('cup → ∪ 연산자를 생성한다', () => {
      const handler = operatorHandlers.get('cup')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('operator');
      expect((result.nodes[0] as any).operator).toBe('∪');
    });

    it('cap → ∩ 연산자를 생성한다', () => {
      const handler = operatorHandlers.get('cap')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('operator');
      expect((result.nodes[0] as any).operator).toBe('∩');
    });
  });

  describe('논리 연산자', () => {
    it('forall → ∀ 연산자를 생성한다', () => {
      const handler = operatorHandlers.get('forall')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('operator');
      expect((result.nodes[0] as any).operator).toBe('∀');
    });

    it('exists → ∃ 연산자를 생성한다', () => {
      const handler = operatorHandlers.get('exists')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('operator');
      expect((result.nodes[0] as any).operator).toBe('∃');
    });

    it('neg → ¬ 연산자를 생성한다', () => {
      const handler = operatorHandlers.get('neg')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('operator');
      expect((result.nodes[0] as any).operator).toBe('¬');
    });
  });

  describe('화살표', () => {
    it('to/rightarrow → → 연산자를 생성한다', () => {
      const toHandler = operatorHandlers.get('to')!;
      const rightarrowHandler = operatorHandlers.get('rightarrow')!;
      const toResult = toHandler(createMockContext(0));
      const rightarrowResult = rightarrowHandler(createMockContext(0));

      expect(toResult.nodes[0].type).toBe('operator');
      expect((toResult.nodes[0] as any).operator).toBe('→');
      expect(rightarrowResult.nodes[0].type).toBe('operator');
      expect((rightarrowResult.nodes[0] as any).operator).toBe('→');
    });

    it('Rightarrow → ⇒ 연산자를 생성한다', () => {
      const handler = operatorHandlers.get('Rightarrow')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('operator');
      expect((result.nodes[0] as any).operator).toBe('⇒');
    });

    it('implies → ⟹ 연산자를 생성한다', () => {
      const handler = operatorHandlers.get('implies')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('operator');
      expect((result.nodes[0] as any).operator).toBe('⟹');
    });
  });

  describe('기타 기호', () => {
    it('infty → ∞를 생성한다', () => {
      const handler = operatorHandlers.get('infty')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('variable');
      expect((result.nodes[0] as any).name).toBe('∞');
    });

    it('partial → ∂를 생성한다', () => {
      const handler = operatorHandlers.get('partial')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('variable');
      expect((result.nodes[0] as any).name).toBe('∂');
    });

    it('nabla → ∇를 생성한다', () => {
      const handler = operatorHandlers.get('nabla')!;
      const result = handler(createMockContext(0));

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('variable');
      expect((result.nodes[0] as any).name).toBe('∇');
    });
  });
});
