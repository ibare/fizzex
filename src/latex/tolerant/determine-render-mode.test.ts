import { describe, it, expect } from 'vitest';
import { determineRenderMode } from './determine-render-mode.js';
import type { Diagnostic } from './types.js';

/** 테스트용 진단 헬퍼 */
function makeDiag(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    nodeId: 'n1',
    severity: 'error',
    parseStatus: 'parsed',
    semanticSafety: 'safe',
    sourceRange: { start: 0, end: 10 },
    message: '테스트 진단',
    normalizations: [],
    affectsRender: false,
    ...overrides,
  };
}

describe('determineRenderMode', () => {
  it('진단이 없으면 full 모드를 반환한다', () => {
    const result = determineRenderMode([]);
    expect(result.mode).toBe('full');
    expect(result.safeSpans).toEqual([]);
    expect(result.blockedSpans).toEqual([]);
  });

  it('모든 진단이 parsed+safe이면 full 모드를 반환한다', () => {
    const diags: Diagnostic[] = [
      makeDiag({ nodeId: 'n1', parseStatus: 'parsed', semanticSafety: 'safe' }),
      makeDiag({ nodeId: 'n2', parseStatus: 'parsed', semanticSafety: 'safe' }),
    ];
    const result = determineRenderMode(diags);
    expect(result.mode).toBe('full');
  });

  it('안전하지 않은 진단이 있으면 partial 모드를 반환한다', () => {
    const diags: Diagnostic[] = [
      makeDiag({ nodeId: 'n1', parseStatus: 'parsed', semanticSafety: 'safe' }),
      makeDiag({
        nodeId: 'n2',
        parseStatus: 'partial',
        semanticSafety: 'unsafe',
        affectsRender: true,
        sourceRange: { start: 5, end: 10 },
      }),
    ];
    const result = determineRenderMode(diags);
    expect(result.mode).toBe('partial');
    expect(result.safeSpans).toHaveLength(1);
    expect(result.blockedSpans).toHaveLength(1);
    expect(result.blockedSpans[0]).toEqual({ start: 5, end: 10 });
  });

  it('모든 진단이 치명적 에러이면 none 모드를 반환한다', () => {
    const diags: Diagnostic[] = [
      makeDiag({
        nodeId: 'n1',
        severity: 'error',
        parseStatus: 'failed',
        semanticSafety: 'unknown',
        affectsRender: true,
        sourceRange: { start: 0, end: 20 },
      }),
    ];
    const result = determineRenderMode(diags);
    expect(result.mode).toBe('none');
    expect(result.safeSpans).toEqual([]);
    expect(result.blockedSpans).toHaveLength(1);
  });

  it('safeSpans는 parsed+safe 진단의 sourceRange를 반환한다', () => {
    const diags: Diagnostic[] = [
      makeDiag({
        nodeId: 'n1',
        parseStatus: 'parsed',
        semanticSafety: 'safe',
        sourceRange: { start: 0, end: 5 },
      }),
      makeDiag({
        nodeId: 'n2',
        parseStatus: 'failed',
        semanticSafety: 'unknown',
        affectsRender: true,
        sourceRange: { start: 5, end: 10 },
      }),
    ];
    const result = determineRenderMode(diags);
    expect(result.mode).toBe('partial');
    expect(result.safeSpans).toEqual([{ start: 0, end: 5 }]);
    expect(result.blockedSpans).toEqual([{ start: 5, end: 10 }]);
  });

  it('affectsRender가 false인 에러는 blockedSpans에 포함되지 않는다', () => {
    const diags: Diagnostic[] = [
      makeDiag({
        nodeId: 'n1',
        parseStatus: 'partial',
        semanticSafety: 'unknown',
        affectsRender: false,
        sourceRange: { start: 0, end: 5 },
      }),
    ];
    const result = determineRenderMode(diags);
    expect(result.mode).toBe('partial');
    expect(result.blockedSpans).toEqual([]);
  });

  it('severity가 warning인 진단은 none 판정에 기여하지 않는다', () => {
    const diags: Diagnostic[] = [
      makeDiag({
        nodeId: 'n1',
        severity: 'warning',
        parseStatus: 'partial',
        semanticSafety: 'unsafe',
        affectsRender: true,
        sourceRange: { start: 0, end: 10 },
      }),
    ];
    const result = determineRenderMode(diags);
    expect(result.mode).toBe('partial');
  });
});
