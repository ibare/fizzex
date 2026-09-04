/**
 * 코퍼스 오탐률 래칫.
 *
 * 실제 수식 9,919건(대부분 fuzz 생성 난수식)에 대해 배너·칩이 얼마나 붙는지를
 * 측정한다. 유명 수식은 극소수이므로 이 비율이 곧 오탐률의 상한 추정이다.
 *
 * 단조 조항 둘을 함께 건다.
 *   1. 측정값 ≤ 기준선 — 악화 금지
 *   2. 기준선 − 측정값 ≤ 0.1pp — 개선한 커밋은 **같은 커밋에서 기준선을
 *      낮춰야** 통과한다. 낡은 기준선 뒤에 숨는 경로가 막힌다.
 *
 * 기존 `corpus.test.ts` 는 박스 레이아웃까지 돌려 분 단위라 기본 실행에서
 * 제외돼 있다. 이 테스트는 파싱 + 정규화 + 매칭만 하므로 0.5초면 끝난다.
 */
import { describe, it, expect } from 'vitest';
import corpusData from '../../../__tests__/corpus/combined-corpus-verified.json' with { type: 'json' };
import baseline from './precision-baseline.json' with { type: 'json' };
import { parseLatex } from '../../../latex/latex-parser.js';
import { buildSemanticMap } from '../engine.js';
import { getVisualizersForForm } from '../loader.js';

interface Measured {
  parsed: number;
  parseFailures: number;
  banner: number;
  confirmed: number;
  chips: number;
  topCount: number;
  topId: string;
}

function measure(): Measured {
  const formulas = (corpusData as { formulas: Array<{ latex: string }> }).formulas;
  const byId = new Map<string, number>();
  let parsed = 0;
  let parseFailures = 0;
  let banner = 0;
  let confirmed = 0;
  let chips = 0;

  for (const f of formulas) {
    let ast;
    try {
      ast = parseLatex(f.latex).ast;
      parsed++;
    } catch {
      parseFailures++;
      continue;
    }
    let root;
    try {
      root = buildSemanticMap(ast).get(ast.id);
    } catch {
      continue;
    }
    if (!root?.catalogId) continue;
    banner++;
    byId.set(root.catalogId, (byId.get(root.catalogId) ?? 0) + 1);
    if (root.tier === 'confirmed') {
      confirmed++;
      if (root.formId && getVisualizersForForm(root.formId).length > 0) chips++;
    }
  }

  let topId = '';
  let top = 0;
  for (const [id, n] of byId) if (n > top) ((top = n), (topId = id));
  return { parsed, parseFailures, banner, confirmed, chips, topCount: top, topId };
}

describe('코퍼스 오탐률 래칫', () => {
  const m = measure();

  it('파싱 실패가 없다', () => {
    expect(m.parseFailures).toBe(0);
    expect(m.parsed).toBe(baseline.totalFormulas);
  });

  it('배너 노출이 기준선을 넘지 않는다', () => {
    expect(m.banner, `배너 ${m.banner}/${m.parsed}`).toBeLessThanOrEqual(baseline.banner);
  });

  it('시각화 칩 노출이 기준선을 넘지 않는다', () => {
    expect(m.chips, `칩 ${m.chips}/${m.parsed}`).toBeLessThanOrEqual(baseline.chips);
  });

  it('개선했다면 기준선도 함께 낮춰야 한다', () => {
    // 낡은 기준선 뒤에 숨지 못하게 한다. 개선한 커밋은 이 파일도 같이 고쳐야
    // 통과한다.
    expect(baseline.banner - m.banner, '배너 기준선이 실측보다 느슨하다').toBeLessThanOrEqual(10);
    expect(baseline.chips - m.chips, '칩 기준선이 실측보다 느슨하다').toBeLessThanOrEqual(2);
  });

  it('한 항목이 코퍼스를 독식하지 않는다', () => {
    // 재설계 이전에는 boyle-law 하나가 910건(9.2%)을 흡수했다.
    expect(m.topCount, `최다 흡수: ${m.topId}`).toBeLessThanOrEqual(baseline.maxSingleIdCount);
  });

  it('확정 티어는 형식 매칭에서만 나온다', () => {
    // 폴백 스코어러가 confirmed 를 만들면 칩 게이트가 무의미해진다.
    expect(m.confirmed).toBeLessThanOrEqual(m.chips + 5);
  });
});
