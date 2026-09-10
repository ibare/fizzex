/**
 * 코퍼스 오탐률 래칫.
 *
 * arXiv·교과서·위키백과에서 수집한 실제 수식에 배너·칩이 얼마나 붙는지를
 * 측정한다. 유명 수식은 극소수이므로 이 비율이 곧 오탐률의 상한 추정이다.
 *
 * 단조 조항 둘을 함께 건다.
 *   1. 측정값 ≤ 기준선 — 악화 금지
 *   2. 기준선 − 측정값 ≤ 0.1pp — 개선한 커밋은 **같은 커밋에서 기준선을
 *      낮춰야** 통과한다. 낡은 기준선 뒤에 숨는 경로가 막힌다.
 *
 * 기존 `corpus.test.ts` 가 기본 실행에서 제외된 이유는 두 가지다 — 박스
 * 레이아웃까지 돌려 분 단위인 것과, 입력이 .gitignore 대상이라 CI 에서 항상
 * ENOENT 인 것. 이 테스트는 추적되는 소스만 쓰고 파싱·정규화·매칭만 한다.
 */
import { describe, it, expect, beforeAll } from 'vitest';
// 추적되는 소스만 쓴다. `corpus/*.json` 은 .gitignore 대상이라 clean checkout
// 에서 해소되지 않는다 — 기존 corpus.test.ts 가 기본 실행에서 제외된 이유가
// 속도가 아니라 이것이다(ef2bac5).
import arxiv from '../../../__tests__/corpus/sources/arxiv-formulas-clean.json' with { type: 'json' };
import textbook from '../../../__tests__/corpus/sources/textbook-formulas-clean.json' with { type: 'json' };
import wikipedia from '../../../__tests__/corpus/sources/wikipedia-formulas-clean.json' with { type: 'json' };
import baseline from './precision-baseline.json' with { type: 'json' };
import { parseLatex } from '../../../latex/latex-parser.js';
import { buildSemanticMap } from '../engine.js';
import { getVisualizersForForm } from '../loader.js';
import { loadLocale, setLocale } from '../../../locales/registry.js';


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
  const formulas = [arxiv, textbook, wikipedia].flatMap(
    (d) => (d as { formulas: Array<{ latex: string }> }).formulas,
  );
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
  // 측정 전에 로케일을 받아 둬야 한다. 배너는 카탈로그 상세가 있어야 뜨는데
  // 그 데이터가 로케일 번들 안에 있다 — 안 받으면 배너가 0으로 측정되고
  // "크게 개선됐다" 는 거짓 신호가 난다.
  //
  // 기본 훅 타임아웃(10초)으로는 모자란다 — 8,209개 수식을 파싱하고 매칭한다.
  // 로컬에서는 넉넉히 들어오지만 CI 러너에서 넘겼다.
  let m: Measured;
  beforeAll(async () => {
    await loadLocale('ko');
    setLocale('ko');
    m = measure();
  }, 120_000);

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
    //
    // 화학식 정확 일치도 confirmed 를 내지만 칩이 없다. 이 코퍼스에 `\ce{` 가
    // 0건이라 지금 세어지는 confirmed 는 전부 형식 매칭이다. 화학식이 코퍼스에
    // 들어오면 이 여유(+5)를 늘릴 것이 아니라 화학 매칭을 따로 세야 한다.
    expect(m.confirmed).toBeLessThanOrEqual(m.chips + 5);
  });
});
