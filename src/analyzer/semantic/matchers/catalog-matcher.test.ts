/**
 * 카탈로그 매칭 회귀 테스트
 *
 * 카탈로그에 등록된 수식의 대표 LaTeX가 올바른 catalogId로 매칭되는지 검증한다.
 * 새 카탈로그 항목 추가 시 반드시 여기에 테스트 케이스를 추가해야 한다. (C8 규칙)
 */

import { describe, it, test, expect } from 'vitest';
import { parseLatex } from '../../../latex/index.js';
import { matchCatalog } from './catalog-matcher.js';
import { matchExpression } from '../engine.js';
import { getCatalogIndex } from '../loader.js';

interface CatalogTestCase {
  /** 대표 LaTeX 수식 */
  latex: string;
  /** 기대하는 카탈로그 ID */
  expectedId: string;
  /** 최소 점수 (기본 0.6) */
  minScore?: number;
}

/**
 * 카탈로그 매칭 테스트 케이스.
 *
 * 새 카탈로그 항목을 추가할 때 이 배열에 대표 LaTeX → expectedId 케이스를 추가한다.
 * LaTeX는 실제 사용자가 입력할 법한 형태여야 한다.
 */
const CATALOG_TEST_CASES: CatalogTestCase[] = [
  // ── 대수학 ──
  { latex: 'e^{i\\pi} + 1 = 0', expectedId: 'euler-identity' },
  { latex: 'z = a + bi', expectedId: 'complex-plane' },
  {
    latex: 'M = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
    expectedId: 'linear-transform-2x2',
  },
  { latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', expectedId: 'quadratic-formula' },
  { latex: '(a + b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k', expectedId: 'binomial-theorem' },

  // ── 천문학 ──
  { latex: 'T^2 = \\frac{4\\pi^2}{GM}a^3', expectedId: 'kepler-third' },
  { latex: 'v = \\sqrt{\\frac{2GM}{r}}', expectedId: 'escape-velocity' },

  // ── 미적분 ──
  { latex: '\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}', expectedId: 'gaussian-integral' },
  { latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}", expectedId: 'derivative-definition', minScore: 0.7 },
  { latex: "y - f(a) = f'(a)(x - a)", expectedId: 'tangent', minScore: 0.6 },

  // ── 기하학 ──
  { latex: 'A = \\sqrt{s(s-a)(s-b)(s-c)}', expectedId: 'heron-formula' },
  { latex: 'A = \\pi r^2', expectedId: 'circle-area-elem' },
  { latex: 'C = 2\\pi r', expectedId: 'circle-circumference' },
  { latex: 'a^2 + b^2 = c^2', expectedId: 'pythagorean-theorem' },

  // ── 물리학 ──
  { latex: 'E = mc^2', expectedId: 'mass-energy' },
  { latex: 'F = ma', expectedId: 'newton-second' },
  { latex: 'PV = nRT', expectedId: 'ideal-gas-law' },
  { latex: 'v = f\\lambda', expectedId: 'wave-speed' },
  { latex: '\\sigma = \\frac{F}{A}', expectedId: 'stress' },

  // ── 전기 ──
  { latex: 'V = IR', expectedId: 'ohm-law' },
  { latex: 'P = IV', expectedId: 'electric-power' },

  // ── Visualizer 연동 대상 ──
  { latex: 'y = ax^2 + bx + c', expectedId: 'quadratic-standard' },
  { latex: 's = v_0 t + \\frac{1}{2}gt^2', expectedId: 'kinematic-displacement' },
  { latex: 'y = A\\sin(\\omega t + \\varphi)', expectedId: 'simple-harmonic' },
  { latex: 'N = N_0 e^{-\\lambda t}', expectedId: 'exponential-growth' },
  { latex: 'A = P\\left(1 + \\frac{r}{n}\\right)^{nt}', expectedId: 'compound-interest' },
];

describe('카탈로그 매칭', () => {
  // 로더가 내는 것을 그대로 쓴다. 테스트가 JSON 을 따로 변환하면 로더의 변환과
  // 어긋날 수 있고, 어긋난 쪽이 통과하는 것이 더 나쁘다.
  const index = getCatalogIndex();

  test.each(CATALOG_TEST_CASES)(
    '$expectedId — 대표 수식이 올바르게 매칭된다',
    ({ latex, expectedId, minScore = 0.6 }) => {
      const { ast } = parseLatex(latex);
      const result = matchCatalog(ast, index);

      expect(result).not.toBeNull();
      expect(result!.catalogId).toBe(expectedId);
      expect(result!.score).toBeGreaterThanOrEqual(minScore);
      // 폴백 경로는 구조적으로 확정을 만들 수 없다 — 칩은 형식 매칭에서만 나온다.
      expect(result!.tier).toBe('approximate');
    },
  );
});

/**
 * 화학식 카탈로그 케이스.
 *
 * 화학식 항목은 시그니처 점수가 아니라 표기 정확 일치로 매칭되므로
 * `matchCatalog` 가 아니라 실사용 경로인 `matchExpression` 으로 검증한다.
 * 위의 CATALOG_TEST_CASES 와 같은 계약이다 — 항목 하나당 대표 LaTeX 하나.
 */
const CHEM_TEST_CASES: Array<{ latex: string; expectedId: string }> = [
  // ── 반응식 ──
  { latex: '\\ce{2H2 + O2 -> 2H2O}', expectedId: 'water-synthesis' },
  { latex: '\\ce{CH4 + 2O2 -> CO2 + 2H2O}', expectedId: 'methane-combustion' },
  { latex: '\\ce{6CO2 + 6H2O -> C6H12O6 + 6O2}', expectedId: 'photosynthesis' },
  { latex: '\\ce{C6H12O6 + 6O2 -> 6CO2 + 6H2O}', expectedId: 'cellular-respiration' },
  { latex: '\\ce{HCl + NaOH -> NaCl + H2O}', expectedId: 'neutralization-hcl-naoh' },
  { latex: '\\ce{N2 + 3H2 <=>[Fe] 2NH3}', expectedId: 'haber-process' },
  { latex: '\\ce{CO2 + H2O <=> H2CO3}', expectedId: 'carbonic-acid-equilibrium' },
  {
    latex: '\\ce{BaCl2 + Na2SO4 -> BaSO4 v + 2NaCl}',
    expectedId: 'barium-sulfate-precipitation',
  },

  // ── 화합물·이온 ──
  { latex: '\\ce{H2O}', expectedId: 'water-molecule' },
  { latex: '\\ce{CO2}', expectedId: 'carbon-dioxide' },
  { latex: '\\ce{SO4^2-}', expectedId: 'sulfate-ion' },
  { latex: '\\ce{Ca(OH)2}', expectedId: 'calcium-hydroxide' },
  { latex: '\\ce{CuSO4 * 5H2O}', expectedId: 'copper-sulfate-pentahydrate' },
  { latex: '\\ce{^{227}_{90}Th}', expectedId: 'thorium-227' },
];

describe('화학식 카탈로그 매칭', () => {
  test.each(CHEM_TEST_CASES)(
    '$expectedId — 대표 화학식이 올바르게 매칭된다',
    ({ latex, expectedId }) => {
      const { ast } = parseLatex(latex);
      const result = matchExpression(ast);

      expect(result).not.toBeNull();
      expect(result!.catalogId).toBe(expectedId);
      // 표기가 정확히 같으므로 점수를 매길 것이 없다
      expect(result!.tier).toBe('confirmed');
      expect(result!.score).toBeUndefined();
    },
  );

  it('표기가 달라도 정규형이 같으면 같은 항목에 닿는다', () => {
    expect(matchExpression(parseLatex('\\ce{H_2O}').ast)?.catalogId).toBe('water-molecule');
    expect(matchExpression(parseLatex('\\ce{2H2+O2->2H2O}').ast)?.catalogId).toBe(
      'water-synthesis',
    );
  });

  it('구조가 같은 다른 반응식을 오탐하지 않는다', () => {
    // `2A + B -> 2C` 라는 구조는 같지만 다른 반응이다
    expect(matchExpression(parseLatex('\\ce{2H2 + Cl2 -> 2HCl}').ast)).toBeNull();
    expect(matchExpression(parseLatex('\\ce{NaCl}').ast)).toBeNull();
  });

  it('시그니처 매처는 화학식 항목을 아예 보지 않는다', () => {
    // signature 가 없는 항목이라 점수 계산에 들어가면 안 된다
    const index = getCatalogIndex();
    expect(index.some((e) => e.patternType === 'chem')).toBe(true);
    expect(matchCatalog(parseLatex('\\ce{H2O}').ast, index)).toBeNull();
  });
});
