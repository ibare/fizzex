import { describe, it, expect, beforeEach } from 'vitest';
import { spaceHandlers } from './spaces';
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

describe('Space Command Handlers', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  it('\\, (thinspace) → 0.167em space를 생성한다', () => {
    const handler = spaceHandlers.get(',')!;
    const result = handler(createMockContext(0));

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].type).toBe('space');
    expect((result.nodes[0] as any).width).toBe(0.167);
  });

  it('\\: (medspace) → 0.222em space를 생성한다', () => {
    const handler = spaceHandlers.get(':')!;
    const result = handler(createMockContext(0));

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].type).toBe('space');
    expect((result.nodes[0] as any).width).toBe(0.222);
  });

  it('\\; (thickspace) → 0.278em space를 생성한다', () => {
    const handler = spaceHandlers.get(';')!;
    const result = handler(createMockContext(0));

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].type).toBe('space');
    expect((result.nodes[0] as any).width).toBe(0.278);
  });

  it('\\! (negthinspace) → 음수 space를 생성한다', () => {
    const handler = spaceHandlers.get('!')!;
    const result = handler(createMockContext(0));

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].type).toBe('space');
    expect((result.nodes[0] as any).width).toBe(-0.167);
  });

  it('\\quad → 1.0em space를 생성한다', () => {
    const handler = spaceHandlers.get('quad')!;
    const result = handler(createMockContext(0));

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].type).toBe('space');
    expect((result.nodes[0] as any).width).toBe(1.0);
  });

  it('\\qquad → 2.0em space를 생성한다', () => {
    const handler = spaceHandlers.get('qquad')!;
    const result = handler(createMockContext(0));

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].type).toBe('space');
    expect((result.nodes[0] as any).width).toBe(2.0);
  });

  it('\\enspace → 0.5em space를 생성한다', () => {
    const handler = spaceHandlers.get('enspace')!;
    const result = handler(createMockContext(0));

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].type).toBe('space');
    expect((result.nodes[0] as any).width).toBe(0.5);
  });

  it('등록된 공백 핸들러 수를 확인한다', () => {
    // 가변 공백 5개 + 고정 공백 4개 + 특수 공백 1개 = 10개
    expect(spaceHandlers.size).toBe(10);
  });
});
