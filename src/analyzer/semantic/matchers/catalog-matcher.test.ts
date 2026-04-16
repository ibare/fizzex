/**
 * 카탈로그 매칭 회귀 테스트
 *
 * 카탈로그에 등록된 수식의 대표 LaTeX가 올바른 catalogId로 매칭되는지 검증한다.
 * 새 카탈로그 항목 추가 시 반드시 여기에 테스트 케이스를 추가해야 한다. (C8 규칙)
 */

import { describe, test, expect } from 'vitest';
import { parseLatex } from '../../../latex';
import type { CatalogIndexEntry } from '../types';
import { matchCatalog } from './catalog-matcher';
import catalogData from '../data/catalog/index.json';

interface CatalogTestCase {
  /** 대표 LaTeX 수식 */
  latex: string;
  /** 기대하는 카탈로그 ID */
  expectedId: string;
  /** 최소 confidence (기본 0.6) */
  minConfidence?: number;
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
  { latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', expectedId: 'quadratic-formula' },
  { latex: '(a + b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k', expectedId: 'binomial-theorem' },

  // ── 천문학 ──
  { latex: 'T^2 = \\frac{4\\pi^2}{GM}a^3', expectedId: 'kepler-third' },
  { latex: 'v = \\sqrt{\\frac{2GM}{r}}', expectedId: 'escape-velocity' },

  // ── 미적분 ──
  { latex: '\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}', expectedId: 'gaussian-integral' },
  { latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}", expectedId: 'derivative-definition', minConfidence: 0.7 },

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
  // JSON import의 complexity 타입(number[])을 CatalogIndexEntry의 tuple([number, number])로 변환
  const index: CatalogIndexEntry[] = catalogData.entries.map((e) => ({
    ...e,
    category: e.category as CatalogIndexEntry['category'],
    patternType: e.patternType as CatalogIndexEntry['patternType'],
    complexity: e.complexity as [number, number] | undefined,
  }));

  test.each(CATALOG_TEST_CASES)(
    '$expectedId — 대표 수식이 올바르게 매칭된다',
    ({ latex, expectedId, minConfidence = 0.6 }) => {
      const { ast } = parseLatex(latex);
      const result = matchCatalog(ast, index);

      expect(result).not.toBeNull();
      expect(result!.catalogId).toBe(expectedId);
      expect(result!.confidence).toBeGreaterThanOrEqual(minConfidence);
    },
  );
});
