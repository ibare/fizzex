/**
 * Layer 2 매처 — 경로 패턴 조합 매칭
 *
 * 규칙 로직 (조건 함수 + 경로 패턴)과 텍스트 데이터 (JSON)를 매핑한다.
 */

import type { MathNode } from '../../../types.js';
import type { Layer2TextEntry } from '../loader.js';
import { isInfinity, matchesPathPattern } from '../helpers.js';

// ─── 규칙 정의 (로직만, 텍스트 없음) ───

interface Layer2RuleDef {
  /** JSON 키 (pathPattern을 > 로 연결) */
  key: string;
  pathPattern: string[];
  condition?: (node: MathNode) => boolean;
}

/**
 * 15개 Layer 2 규칙의 로직 정의.
 * 텍스트는 JSON에서 가져온다.
 */
const LAYER2_RULE_DEFS: Layer2RuleDef[] = [
  { key: 'frac.denominator>power.base', pathPattern: ['frac.denominator', 'power.base'], condition: (node) => node.type === 'variable' },
  { key: 'frac.denominator>power.exponent', pathPattern: ['frac.denominator', 'power.exponent'] },
  { key: 'sum.body>frac.denominator', pathPattern: ['sum.body', 'frac.denominator'] },
  { key: 'sum.body>frac.denominator>power.exponent', pathPattern: ['sum.body', 'frac.denominator', 'power.exponent'] },
  { key: 'sum.body>frac.numerator', pathPattern: ['sum.body', 'frac.numerator'] },
  { key: 'integral.lower', pathPattern: ['integral.lower'], condition: (node) => isInfinity(node) || (node.type === 'operator' && node.operator === '-') },
  { key: 'power.exponent>frac.numerator', pathPattern: ['power.exponent', 'frac.numerator'] },
  { key: 'power.exponent>frac.denominator', pathPattern: ['power.exponent', 'frac.denominator'] },
  { key: 'frac.numerator>frac.numerator', pathPattern: ['frac.numerator', 'frac.numerator'] },
  { key: 'frac.denominator>frac.denominator', pathPattern: ['frac.denominator', 'frac.denominator'] },
  { key: 'integral.integrand>frac.numerator', pathPattern: ['integral.integrand', 'frac.numerator'] },
  { key: 'integral.integrand>frac.denominator', pathPattern: ['integral.integrand', 'frac.denominator'] },
  { key: 'limit.body>frac.numerator', pathPattern: ['limit.body', 'frac.numerator'] },
  { key: 'limit.body>frac.denominator', pathPattern: ['limit.body', 'frac.denominator'] },
];

// 긴 패턴 먼저 (사전 정렬)
const SORTED_RULES = [...LAYER2_RULE_DEFS].sort(
  (a, b) => b.pathPattern.length - a.pathPattern.length,
);

// ─── 매칭 ───

export interface Layer2MatchResult {
  key: string;
  role: string | null;
  description: string;
}

/**
 * Layer 2 매칭 — 조상 경로 패턴에서 조합 규칙 탐색.
 * @param node - 현재 노드
 * @param path - "parentType.childPosition" 문자열 배열
 * @param texts - JSON 텍스트 데이터
 * @returns 매칭 결과 또는 null
 */
export function matchLayer2(
  node: MathNode,
  path: string[],
  texts: Record<string, Layer2TextEntry>,
): Layer2MatchResult | null {
  for (const rule of SORTED_RULES) {
    if (matchesPathPattern(path, rule.pathPattern)) {
      if (!rule.condition || rule.condition(node)) {
        const text = texts[rule.key];
        if (text) {
          return { key: rule.key, role: text.role, description: text.description };
        }
      }
    }
  }
  return null;
}
