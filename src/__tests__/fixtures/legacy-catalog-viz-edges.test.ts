/**
 * 카탈로그 → 시각화 간선 보존.
 *
 * 커밋 7·8 이전에는 `catalog/index.json` 의 항목이 `visualizers` 를 직접
 * 소유했다. 지금은 형식이 소유하고 카탈로그가 형식을 참조한다 —
 * 간선의 종점이 `catalog→viz` 에서 `catalog→form→viz` 로 바뀌었다.
 *
 * C9 MUST NOT "카탈로그 매핑을 깨뜨리지 않는다" 의 입증 책임을 이 테스트가
 * 진다. 합성이 동일한 사상을 보존하는지는 논증이 아니라 측정으로 보여야 한다 —
 * 변경 후 간선은 정적 데이터가 아니라 **유니피케이션 성공에 조건부인 파생
 * 간선**이기 때문이다.
 *
 * 이 fixture 와 테스트는 삭제 금지 대상이다.
 */
import { describe, it, expect } from 'vitest';
import fixture from './legacy-catalog-viz-edges.json' with { type: 'json' };
import { getCatalogIndex, getVisualizersForForm } from '../../analyzer/semantic/loader.js';

describe('카탈로그 → 시각화 간선 보존', () => {
  const legacy = fixture.edges as Record<string, string[]>;

  it('이전 간선을 가진 카탈로그 항목이 전부 형식을 참조한다', () => {
    const index = getCatalogIndex();
    for (const catalogId of Object.keys(legacy)) {
      const entry = index.find((e) => e.id === catalogId);
      expect(entry, `카탈로그 항목 "${catalogId}" 가 사라졌다`).toBeTruthy();
      expect(entry!.form, `"${catalogId}" 가 형식을 참조하지 않는다`).toBeTruthy();
    }
  });

  it('catalog→form→viz 합성이 동일한 viz 집합을 낸다', () => {
    const index = getCatalogIndex();
    const mismatches: string[] = [];
    for (const [catalogId, expected] of Object.entries(legacy)) {
      const entry = index.find((e) => e.id === catalogId);
      const actual = entry?.form ? getVisualizersForForm(entry.form).map((v) => v.id) : [];
      const a = [...actual].sort();
      const b = [...expected].sort();
      if (a.join(',') !== b.join(',')) {
        mismatches.push(`${catalogId}: 기대 [${b}] 실제 [${a}]`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('viz id 는 하나도 바뀌지 않는다', () => {
    const all = Object.values(legacy).flat().sort();
    const now = getCatalogIndex()
      .filter((e) => e.form)
      .flatMap((e) => getVisualizersForForm(e.form!).map((v) => v.id));
    for (const id of all) {
      expect(now, `viz id "${id}" 가 사라졌다`).toContain(id);
    }
  });
});
