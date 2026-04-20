/**
 * spec-loader 계약 테스트.
 *
 * 모든 빌트인 visualizerId에 대해 loadVisualizerSpec이 성공하고
 * compileSpec까지 통과함을 확인해 "정적 스펙 자산 건전성" 회귀를 막는다.
 */

import { describe, it, expect } from 'vitest';
import { loadVisualizerSpec, hasBuiltInSpec, listBuiltInVisualizerIds } from './spec-loader';
import { compileSpec } from './compile';

describe('spec-loader', () => {
  it('listBuiltInVisualizerIds 반환 목록 비어있지 않음', () => {
    const ids = listBuiltInVisualizerIds();
    expect(ids.length).toBeGreaterThan(0);
  });

  it('hasBuiltInSpec — 존재하는 id true, 아닌 id false', () => {
    expect(hasBuiltInSpec('sine-wave-2d')).toBe(true);
    expect(hasBuiltInSpec('does-not-exist')).toBe(false);
  });

  it('알 수 없는 id → throw', async () => {
    await expect(loadVisualizerSpec('does-not-exist')).rejects.toThrow(/unknown/);
  });

  it.each(listBuiltInVisualizerIds())(
    '%s 스펙 load + compile 성공',
    async (id) => {
      const raw = await loadVisualizerSpec(id);
      const compiled = compileSpec(raw);
      expect(compiled.spec.id).toBe(id);
    },
  );
});
