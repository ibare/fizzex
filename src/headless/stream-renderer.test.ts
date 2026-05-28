import { describe, it, expect } from 'vitest';
import { classifyConfidence, buildConfidenceRegions } from './stream-renderer.js';
import type { Diagnostic } from '../latex/tolerant/types.js';
import type { Box } from '../box/types.js';

/** 테스트용 Diagnostic 생성 헬퍼 */
function makeDiag(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    nodeId: 'node_1',
    severity: 'warning',
    parseStatus: 'parsed',
    semanticSafety: 'safe',
    sourceRange: { start: 0, end: 5 },
    message: 'test diagnostic',
    normalizations: [],
    affectsRender: false,
    ...overrides,
  };
}

/** 테스트용 rootBox */
function makeRootBox(): Box {
  return {
    type: 'hbox',
    x: 0,
    y: 20,
    width: 100,
    height: 15,
    depth: 5,
    children: [],
  };
}

describe('classifyConfidence', () => {
  it('parsed + safe + 정규화 없음 → clean', () => {
    const diag = makeDiag({
      parseStatus: 'parsed',
      semanticSafety: 'safe',
      normalizations: [],
    });
    expect(classifyConfidence(diag)).toBe('clean');
  });

  it('parsed + safe + 정규화 있음 → normalized', () => {
    const diag = makeDiag({
      parseStatus: 'parsed',
      semanticSafety: 'safe',
      normalizations: [
        {
          type: 'backslash_norm',
          originalSpan: { start: 0, end: 2 },
          normalizedSpan: { start: 0, end: 1 },
          description: 'backslash normalized',
        },
      ],
    });
    expect(classifyConfidence(diag)).toBe('normalized');
  });

  it('partial parseStatus → uncertain', () => {
    const diag = makeDiag({
      parseStatus: 'partial',
      semanticSafety: 'safe',
    });
    expect(classifyConfidence(diag)).toBe('uncertain');
  });

  it('unknown semanticSafety → uncertain', () => {
    const diag = makeDiag({
      parseStatus: 'parsed',
      semanticSafety: 'unknown',
    });
    expect(classifyConfidence(diag)).toBe('uncertain');
  });

  it('failed parseStatus + unsafe → failed', () => {
    const diag = makeDiag({
      parseStatus: 'failed',
      semanticSafety: 'unsafe',
    });
    expect(classifyConfidence(diag)).toBe('failed');
  });

  it('parsed + unsafe → failed', () => {
    const diag = makeDiag({
      parseStatus: 'parsed',
      semanticSafety: 'unsafe',
      normalizations: [],
    });
    expect(classifyConfidence(diag)).toBe('failed');
  });
});

describe('buildConfidenceRegions', () => {
  it('clean diagnostic은 영역을 생성하지 않는다', () => {
    const diag = makeDiag({ parseStatus: 'parsed', semanticSafety: 'safe', normalizations: [] });
    const positions = new Map([['node_1', { x: 10, y: 20, width: 30, height: 12, depth: 4 }]]);
    const regions = buildConfidenceRegions([diag], positions, makeRootBox());
    expect(regions).toHaveLength(0);
  });

  it('nodeId가 Box 위치 맵에 있으면 해당 위치 사용', () => {
    const diag = makeDiag({
      nodeId: 'node_1',
      parseStatus: 'partial',
      semanticSafety: 'safe',
    });
    const positions = new Map([['node_1', { x: 10, y: 20, width: 30, height: 12, depth: 4 }]]);
    const regions = buildConfidenceRegions([diag], positions, makeRootBox());

    expect(regions).toHaveLength(1);
    expect(regions[0].level).toBe('uncertain');
    expect(regions[0].x).toBe(10);
    expect(regions[0].width).toBe(30);
  });

  it('nodeId 매핑 실패 시 rootBox 전체 영역으로 폴백', () => {
    const diag = makeDiag({
      nodeId: 'unknown_node',
      parseStatus: 'partial',
    });
    const positions = new Map<string, { x: number; y: number; width: number; height: number; depth: number }>();
    const rootBox = makeRootBox();
    const regions = buildConfidenceRegions([diag], positions, rootBox);

    expect(regions).toHaveLength(1);
    expect(regions[0].x).toBe(rootBox.x);
    expect(regions[0].y).toBe(rootBox.y);
    expect(regions[0].width).toBe(rootBox.width);
  });

  it('여러 diagnostic을 각각 독립 영역으로 변환한다', () => {
    const diags = [
      makeDiag({
        nodeId: 'n1',
        parseStatus: 'parsed',
        semanticSafety: 'safe',
        normalizations: [{ type: 'backslash_norm', originalSpan: { start: 0, end: 1 }, normalizedSpan: { start: 0, end: 1 }, description: 'norm' }],
      }),
      makeDiag({
        nodeId: 'n2',
        parseStatus: 'partial',
        semanticSafety: 'unknown',
      }),
    ];
    const positions = new Map([
      ['n1', { x: 0, y: 20, width: 20, height: 10, depth: 3 }],
      ['n2', { x: 20, y: 20, width: 30, height: 10, depth: 3 }],
    ]);
    const regions = buildConfidenceRegions(diags, positions, makeRootBox());

    expect(regions).toHaveLength(2);
    expect(regions[0].level).toBe('normalized');
    expect(regions[1].level).toBe('uncertain');
  });

  it('빈 diagnostic 배열에서 빈 영역 배열 반환', () => {
    const regions = buildConfidenceRegions([], new Map(), makeRootBox());
    expect(regions).toHaveLength(0);
  });
});
