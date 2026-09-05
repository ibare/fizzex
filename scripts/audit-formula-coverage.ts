/**
 * 대표 수식 커버리지 감사 스크립트
 *
 * 학습 콘텐츠에 실제로 등장하는 대표 수식들이 지금 파이프라인에서 어떤
 * 대접을 받는지 실측해 `docs/formula-priority.md` 의 표를 채운다.
 *
 * 이 스크립트는 **관측만 한다.** 기대 formId·catalogId 를 적지 않고,
 * 통과/실패를 단언하지 않으며, 테스트 러너에도 연결하지 않는다. 형식 매칭의
 * 회귀 보증은 `examples`/`counterExamples` 에서 유도되는 생성 테스트의 몫이고
 * (C8), 여기서 발견한 공백을 메우는 경로도 이 목록이 아니라 형식 데이터다.
 *
 * 목록의 `value`(학습 가치)와 `freq`(등장 빈도)는 매칭 기대값이 아니라
 * 교육과정 관점의 판단이다. 근거는 문서의 "정렬 기준" 절에 적혀 있다.
 *
 * 실행: pnpm audit:formulas
 */

import { parseLatex } from '../src/latex/latex-parser.js';
import { buildSemanticMap } from '../src/analyzer/semantic/engine.js';
import { getVisualizersForForm, getCatalogDetail } from '../src/analyzer/semantic/loader.js';

// ─────────────────────────────────────────────────────────────
// 대표 수식 목록
// ─────────────────────────────────────────────────────────────

/** 학습 가치 — 값을 바꿔 보는 것이 곧 개념 이해인 정도 */
type Value = 'A' | 'B' | 'C';
/** 교육과정에서의 노출량 (실측 아님 — 문서의 "정렬 기준" 참조) */
type Freq = 'high' | 'mid' | 'low';

interface Entry {
  stage: '중' | '고' | '생활';
  subject: string;
  name: string;
  latex: string;
  value: Value;
  freq: Freq;
}

const ENTRIES: Entry[] = [
  // ── 중학 수학 ──
  { stage: '중', subject: '수학', name: '일차함수', latex: 'y = ax + b', value: 'A', freq: 'high' },
  { stage: '중', subject: '수학', name: '정비례', latex: 'y = ax', value: 'A', freq: 'high' },
  { stage: '중', subject: '수학', name: '반비례', latex: 'y = \\frac{a}{x}', value: 'A', freq: 'high' },
  { stage: '중', subject: '수학', name: '일차방정식', latex: 'ax + b = 0', value: 'B', freq: 'high' },
  { stage: '중', subject: '수학', name: '이차함수 기본형', latex: 'y = ax^2', value: 'A', freq: 'high' },
  { stage: '중', subject: '수학', name: '피타고라스 정리', latex: 'a^2 + b^2 = c^2', value: 'A', freq: 'high' },
  { stage: '중', subject: '수학', name: '원의 넓이', latex: 'A = \\pi r^2', value: 'A', freq: 'high' },
  { stage: '중', subject: '수학', name: '원의 둘레', latex: 'C = 2\\pi r', value: 'A', freq: 'mid' },
  { stage: '중', subject: '수학', name: '삼각형 넓이', latex: 'A = \\frac{1}{2}bh', value: 'A', freq: 'high' },
  { stage: '중', subject: '수학', name: '완전제곱식', latex: '(a + b)^2 = a^2 + 2ab + b^2', value: 'B', freq: 'high' },
  { stage: '중', subject: '수학', name: '합차공식', latex: 'a^2 - b^2 = (a + b)(a - b)', value: 'B', freq: 'mid' },
  { stage: '중', subject: '수학', name: '구의 부피', latex: 'V = \\frac{4}{3}\\pi r^3', value: 'A', freq: 'mid' },
  { stage: '중', subject: '수학', name: '원기둥 부피', latex: 'V = \\pi r^2 h', value: 'A', freq: 'mid' },

  // ── 고교 수학 ──
  { stage: '고', subject: '수학', name: '이차함수 표준형', latex: 'y = ax^2 + bx + c', value: 'A', freq: 'high' },
  { stage: '고', subject: '수학', name: '이차함수 꼭짓점형', latex: 'y = a(x - p)^2 + q', value: 'A', freq: 'high' },
  { stage: '고', subject: '수학', name: '근의 공식', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', value: 'B', freq: 'high' },
  { stage: '고', subject: '수학', name: '판별식', latex: 'D = b^2 - 4ac', value: 'A', freq: 'high' },
  { stage: '고', subject: '수학', name: '원의 방정식', latex: '(x - a)^2 + (y - b)^2 = r^2', value: 'A', freq: 'high' },
  { stage: '고', subject: '수학', name: '점-기울기 직선', latex: 'y - y_1 = m(x - x_1)', value: 'A', freq: 'high' },
  { stage: '고', subject: '수학', name: '두 점 사이 거리', latex: 'd = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}', value: 'B', freq: 'mid' },
  { stage: '고', subject: '수학', name: '삼각함수 항등식', latex: '\\sin^2\\theta + \\cos^2\\theta = 1', value: 'A', freq: 'high' },
  { stage: '고', subject: '수학', name: '사인법칙', latex: '\\frac{a}{\\sin A} = \\frac{b}{\\sin B}', value: 'B', freq: 'mid' },
  { stage: '고', subject: '수학', name: '코사인법칙', latex: 'a^2 = b^2 + c^2 - 2bc\\cos A', value: 'B', freq: 'mid' },
  { stage: '고', subject: '수학', name: '배각공식', latex: '\\sin(2\\theta) = 2\\sin\\theta\\cos\\theta', value: 'B', freq: 'mid' },
  { stage: '고', subject: '수학', name: '사인파', latex: 'y = A\\sin(\\omega x + \\phi)', value: 'A', freq: 'high' },
  { stage: '고', subject: '수학', name: '지수법칙', latex: 'a^m \\cdot a^n = a^{m+n}', value: 'C', freq: 'high' },
  { stage: '고', subject: '수학', name: '로그 정의', latex: '\\log_a b = c', value: 'B', freq: 'high' },
  { stage: '고', subject: '수학', name: '로그 성질', latex: '\\log(xy) = \\log x + \\log y', value: 'C', freq: 'mid' },
  { stage: '고', subject: '수학', name: '등차수열 일반항', latex: 'a_n = a_1 + (n - 1)d', value: 'A', freq: 'high' },
  { stage: '고', subject: '수학', name: '등비수열 일반항', latex: 'a_n = a_1 r^{n-1}', value: 'A', freq: 'high' },
  { stage: '고', subject: '수학', name: '등비수열 합', latex: 'S_n = \\frac{a(1 - r^n)}{1 - r}', value: 'B', freq: 'mid' },
  { stage: '고', subject: '수학', name: '미분계수 정의', latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}", value: 'A', freq: 'high' },
  { stage: '고', subject: '수학', name: '도함수 공식', latex: '\\frac{d}{dx} x^n = nx^{n-1}', value: 'B', freq: 'high' },
  { stage: '고', subject: '수학', name: '접선의 방정식', latex: "y - f(a) = f'(a)(x - a)", value: 'A', freq: 'mid' },
  { stage: '고', subject: '수학', name: '미적분 기본정리', latex: "\\int_a^b f'(x) \\, dx = f(b) - f(a)", value: 'B', freq: 'mid' },
  { stage: '고', subject: '수학', name: '조합', latex: '{}_nC_r = \\frac{n!}{r!(n-r)!}', value: 'C', freq: 'high' },
  { stage: '고', subject: '수학', name: '이항정리', latex: '(a + b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k', value: 'C', freq: 'mid' },
  { stage: '고', subject: '수학', name: '조건부확률', latex: 'P(A|B) = \\frac{P(A \\cap B)}{P(B)}', value: 'B', freq: 'high' },
  { stage: '고', subject: '수학', name: '정규분포', latex: 'f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}', value: 'A', freq: 'mid' },

  // ── 과학: 역학 ──
  { stage: '중', subject: '과학', name: '속력', latex: 'v = \\frac{s}{t}', value: 'A', freq: 'high' },
  { stage: '중', subject: '과학', name: '밀도', latex: '\\rho = \\frac{m}{V}', value: 'A', freq: 'high' },
  { stage: '고', subject: '과학', name: '등가속도 속도', latex: 'v = v_0 + at', value: 'A', freq: 'high' },
  { stage: '고', subject: '과학', name: '등가속도 변위', latex: 's = v_0 t + \\frac{1}{2}at^2', value: 'A', freq: 'high' },
  { stage: '고', subject: '과학', name: '뉴턴 제2법칙', latex: 'F = ma', value: 'A', freq: 'high' },
  { stage: '고', subject: '과학', name: '운동에너지', latex: 'K = \\frac{1}{2}mv^2', value: 'A', freq: 'high' },
  { stage: '고', subject: '과학', name: '위치에너지', latex: 'U = mgh', value: 'A', freq: 'high' },
  { stage: '고', subject: '과학', name: '만유인력', latex: 'F = G\\frac{m_1 m_2}{r^2}', value: 'A', freq: 'mid' },
  { stage: '고', subject: '과학', name: '케플러 제3법칙', latex: 'T^2 = \\frac{4\\pi^2}{GM}a^3', value: 'A', freq: 'low' },
  { stage: '고', subject: '과학', name: '운동량', latex: 'p = mv', value: 'B', freq: 'high' },
  { stage: '고', subject: '과학', name: '훅의 법칙', latex: 'F = -kx', value: 'A', freq: 'mid' },
  { stage: '고', subject: '과학', name: '단진동', latex: 'y = A\\sin(\\omega t + \\varphi)', value: 'A', freq: 'mid' },

  // ── 과학: 파동·전기·열 ──
  { stage: '고', subject: '과학', name: '파동 속력', latex: 'v = f\\lambda', value: 'A', freq: 'high' },
  { stage: '고', subject: '과학', name: '옴의 법칙', latex: 'V = IR', value: 'A', freq: 'high' },
  { stage: '고', subject: '과학', name: '전기 일률', latex: 'P = VI', value: 'B', freq: 'mid' },
  { stage: '고', subject: '과학', name: '보일 법칙', latex: 'P_1 V_1 = P_2 V_2', value: 'A', freq: 'mid' },
  { stage: '고', subject: '과학', name: '이상기체 상태방정식', latex: 'PV = nRT', value: 'A', freq: 'mid' },
  { stage: '고', subject: '과학', name: '질량-에너지 등가', latex: 'E = mc^2', value: 'C', freq: 'high' },
  { stage: '고', subject: '과학', name: '광전효과', latex: 'E = h\\nu', value: 'B', freq: 'mid' },

  // ── 과학: 화학·생명 ──
  { stage: '고', subject: '과학', name: '방사성 붕괴', latex: 'N = N_0 e^{-\\lambda t}', value: 'A', freq: 'mid' },
  { stage: '고', subject: '과학', name: '지수 성장', latex: 'N = N_0 e^{kt}', value: 'A', freq: 'mid' },
  { stage: '고', subject: '과학', name: '반감기', latex: 'N = N_0 \\left(\\frac{1}{2}\\right)^{t/T}', value: 'A', freq: 'mid' },
  { stage: '고', subject: '과학', name: '하디-바인베르크', latex: 'p^2 + 2pq + q^2 = 1', value: 'B', freq: 'low' },
  { stage: '고', subject: '과학', name: '몰농도', latex: 'M = \\frac{n}{V}', value: 'B', freq: 'mid' },

  // ── 실생활·금융 ──
  { stage: '생활', subject: '금융', name: '단리', latex: 'A = P(1 + rt)', value: 'A', freq: 'mid' },
  { stage: '생활', subject: '금융', name: '복리', latex: 'A = P\\left(1 + \\frac{r}{n}\\right)^{nt}', value: 'A', freq: 'mid' },
  { stage: '생활', subject: '금융', name: '연속복리', latex: 'A = Pe^{rt}', value: 'B', freq: 'low' },
  { stage: '생활', subject: '통계', name: '평균', latex: '\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i', value: 'B', freq: 'high' },
  { stage: '생활', subject: '통계', name: '표준편차', latex: '\\sigma = \\sqrt{\\frac{1}{N}\\sum_{i=1}^{N}(x_i - \\mu)^2}', value: 'A', freq: 'mid' },
  { stage: '생활', subject: '기하', name: '축척/비례', latex: '\\frac{a}{b} = \\frac{c}{d}', value: 'A', freq: 'high' },
];

// ─────────────────────────────────────────────────────────────
// 관측
// ─────────────────────────────────────────────────────────────

/** 진입점을 기준으로 본 구현 단계 */
type Status = 'done' | 'form-only' | 'unconfirmed' | 'unmatched';

interface Observed extends Entry {
  status: Status;
  tier: string;
  /** 붙은 카탈로그의 한국어 이름 — 실제 수식과 다르면 오탐이다 */
  matchedName: string;
  formId: string;
  vizCount: number;
}

const STATUS_MARK: Record<Status, string> = {
  done: '✅',
  'form-only': '🟡',
  unconfirmed: '🟠',
  unmatched: '⬜',
};

function observe(entry: Entry): Observed {
  const base = { ...entry, tier: 'none', matchedName: '—', formId: '—', vizCount: 0 };

  let ast;
  try {
    ast = parseLatex(entry.latex).ast;
  } catch {
    return { ...base, status: 'unmatched', tier: 'parse-fail' };
  }

  const root = buildSemanticMap(ast).get(ast.id);
  if (!root?.tier) return { ...base, status: 'unmatched' };

  const vizCount = root.formId ? getVisualizersForForm(root.formId).length : 0;
  const detail =
    root.catalogId && root.catalogCategory
      ? getCatalogDetail(root.catalogId, root.catalogCategory)
      : null;

  const status: Status =
    root.tier !== 'confirmed' ? 'unconfirmed' : vizCount > 0 ? 'done' : 'form-only';

  return {
    ...base,
    status,
    tier: root.tier,
    matchedName: detail?.name ?? root.catalogId ?? '—',
    formId: root.formId ?? '—',
    vizCount,
  };
}

// ─────────────────────────────────────────────────────────────
// 정렬 — 학습 가치 × 등장 빈도
// ─────────────────────────────────────────────────────────────

const VALUE_WEIGHT: Record<Value, number> = { A: 3, B: 2, C: 1 };
const FREQ_WEIGHT: Record<Freq, number> = { high: 3, mid: 2, low: 1 };
const FREQ_LABEL: Record<Freq, string> = { high: '높음', mid: '중간', low: '낮음' };
/** 같은 점수면 덜 된 것을 위로 — 다음에 손댈 것이 먼저 보이도록 */
const STATUS_ORDER: Record<Status, number> = { unmatched: 0, unconfirmed: 1, 'form-only': 2, done: 3 };

const priority = (o: Observed) => VALUE_WEIGHT[o.value] * FREQ_WEIGHT[o.freq];

function compare(a: Observed, b: Observed): number {
  return (
    priority(b) - priority(a) ||
    STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
    a.name.localeCompare(b.name, 'ko')
  );
}

// ─────────────────────────────────────────────────────────────
// 출력
// ─────────────────────────────────────────────────────────────

function main(): void {
  const rows = ENTRIES.map(observe).sort(compare);
  const count = (s: Status) => rows.filter((r) => r.status === s).length;
  const pct = (n: number) => `${((n / rows.length) * 100).toFixed(1)}%`;

  console.log(`<!-- pnpm audit:formulas 로 생성. 손으로 고치지 말 것. -->`);
  console.log(`<!-- 생성: ${new Date().toISOString().slice(0, 10)} · 대상 ${rows.length}개 -->`);
  console.log();
  console.log('## 현황');
  console.log();
  console.log('| 상태 | 개수 | 비율 |');
  console.log('|---|---:|---:|');
  console.log(`| ✅ 진입점 있음 (확정 + 시각화) | ${count('done')} | ${pct(count('done'))} |`);
  console.log(`| 🟡 형식만 (확정, 시각화 없음) | ${count('form-only')} | ${pct(count('form-only'))} |`);
  console.log(`| 🟠 미확정 (이름 확인 필요) | ${count('unconfirmed')} | ${pct(count('unconfirmed'))} |`);
  console.log(`| ⬜ 매칭 없음 | ${count('unmatched')} | ${pct(count('unmatched'))} |`);
  console.log();

  console.log('## 우선순위');
  console.log();
  console.log('| # | 수식 | 단계 | 가치 | 빈도 | 점수 | 상태 | 붙은 이름 | 형식 | viz |');
  console.log('|---:|---|:-:|:-:|:-:|---:|:-:|---|---|---:|');
  rows.forEach((r, i) => {
    console.log(
      `| ${i + 1} | ${r.name} | ${r.stage}·${r.subject} | ${r.value} | ${FREQ_LABEL[r.freq]} | ` +
        `${priority(r)} | ${STATUS_MARK[r.status]} | ${r.matchedName} | ${r.formId} | ${r.vizCount || '—'} |`,
    );
  });

  console.log();
  console.log('<!-- 미확정 항목: "붙은 이름" 이 수식과 맞으면 형식만 추가하면 되고,');
  console.log('     다르면 매처 오탐이라 counterExamples 가 필요하다. -->');
}

main();
