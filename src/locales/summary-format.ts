/**
 * 분석 요약을 문장으로 조립한다.
 *
 * `generateSummary` 는 사실만 내고(변수·차수·함수·도메인) 어느 말로 부를지는
 * 여기서 정한다. 계산 계층은 로케일 데이터를 물 수 없다 — compute 격리 때문이기도 하고,
 * 애초에 "2차 다항식" 이라는 말을 알아야 할 이유가 없기 때문이기도 하다.
 *
 * 타입은 배럴이 아니라 `analyzer/types.js` 에서 직접 가져온다. 배럴을 가리키면
 * 이 모듈의 import 그래프에 analyzer 전체가 딸려온다.
 */

import type { AnalysisSummary } from '../analyzer/types.js';
import { getUiTexts, fill } from './ui.js';

/** 분석 요약을 사람이 읽는 한 줄로 만든다 */
export function formatSummary(summary: AnalysisSummary): string {
  const t = getUiTexts().summary;

  // 화학식에는 변수도 차수도 없다. 수학 어휘로 요약하면 "상수 표현식" 이 된다.
  if (summary.chemistry) {
    if (!summary.chemistry.reaction) return t.chemicalFormula;
    return summary.chemistry.reversible ? t.reversibleChemicalEquation : t.chemicalEquation;
  }

  const parts: string[] = [];
  const join = (names: string[]): string => names.join(t.listSeparator);

  parts.push(
    summary.variables.length === 0
      ? t.constantExpression
      : fill(t.variables, { names: join(summary.variables) })
  );

  if (summary.degree !== undefined) {
    parts.push(fill(t.polynomialOfDegree, { degree: summary.degree }));
  }

  if (summary.functions.length > 0) {
    parts.push(fill(t.withFunctions, { names: join(summary.functions) }));
  }

  if (summary.domains.length > 0) {
    const named = summary.domains.map((d) => t.domainNames[d] ?? d);
    parts.push(fill(t.domains, { names: join(named) }));
  }

  return parts.join(' ');
}
