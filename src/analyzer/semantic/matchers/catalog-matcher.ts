/**
 * 카탈로그 매처 — 유명 수식 AST 패턴 매칭
 *
 * AST에서 구조 시그니처를 추출하고, 카탈로그 인덱스와 비교하여
 * 가장 높은 점수의 매칭을 반환한다.
 *
 * **이 경로는 폴백이다.** 형식(form) 유니피케이션이 실패했을 때만 쓰이며,
 * 결과는 언제나 `approximate` 티어다 — 시각화 칩을 만들 수 없다.
 *
 * 매칭 전략:
 * 1. 사전 필터 (complexity, requiredNodeTypes, requiredVariables)
 * 2. **멀티셋** 시그니처 비교 — 중복 토큰은 다중도 요구사항이다.
 *    피타고라스의 `power.exponent:2` ×3 은 "제곱이 세 개" 를 뜻하므로
 *    `x^2` 하나로 세 점을 받으면 안 된다.
 */

import type { MathNode } from '../../../types.js';
import type { CatalogIndexEntry, CatalogMatchResult } from '../types.js';
import { getChildArrays } from '../helpers.js';

// ─── AST 시그니처 추출 ───

interface AstSignature {
  /** 구조적 특징의 **다중도**. Set 이면 중복 토큰이 공짜로 채워진다. */
  features: Map<string, number>;
  /** 모든 변수명 */
  variables: Set<string>;
  /** 모든 노드 타입 */
  nodeTypes: Set<string>;
  /** AST 전체 노드 수 */
  nodeCount: number;
}

/**
 * AST에서 구조 시그니처를 추출한다.
 * 노드 타입, 변수명, 구조적 특징(parentType.childPosition:childType) 등을 수집.
 */
function extractSignature(ast: MathNode): AstSignature {
  const features = new Map<string, number>();
  const bump = (k: string) => features.set(k, (features.get(k) ?? 0) + 1);
  const variables = new Set<string>();
  const nodeTypes = new Set<string>();
  let nodeCount = 0;

  function walk(node: MathNode, parentContext?: string): void {
    nodeCount++;
    nodeTypes.add(node.type);

    switch (node.type) {
      case 'variable':
        variables.add(node.name);
        bump(`variable:${node.name}`);
        break;
      case 'number':
        bump(`number:${node.value}`);
        break;
      case 'operator':
        bump(`operator:${node.operator}`);
        break;
      case 'func':
        bump(`func:${node.name}`);
        break;
      case 'power': {
        const exp0 = node.exponent.length === 1 ? node.exponent[0] : null;
        if (exp0?.type === 'number') {
          bump(`power.exponent:${exp0.value}`);
        } else if (exp0?.type === 'row' && exp0.children.length === 1 && exp0.children[0].type === 'number') {
          // 파서가 단일 숫자 지수를 row로 감싸는 경우 unwrap
          bump(`power.exponent:${exp0.children[0].value}`);
        } else {
          bump('power.exponent:row');
        }
        break;
      }
    }

    // 노드 타입 자체를 특징으로 추가
    if (!['root', 'row', 'number', 'variable', 'operator'].includes(node.type)) {
      bump(node.type);
    }

    // 부모 컨텍스트 + 현재 타입 조합
    if (parentContext) {
      bump(`${parentContext}:${node.type}`);
    }

    // 자식 순회 (context 전파)
    switch (node.type) {
      case 'frac':
        for (const c of node.numerator) walk(c, 'frac.numerator');
        for (const c of node.denominator) walk(c, 'frac.denominator');
        break;
      case 'power':
        for (const c of node.base) walk(c, 'power.base');
        for (const c of node.exponent) walk(c, 'power.exponent');
        break;
      case 'func':
        for (const c of node.argument) walk(c, `func.${node.name}`);
        break;
      default:
        for (const children of getChildArrays(node)) {
          for (const c of children) walk(c);
        }
    }
  }

  walk(ast);
  return { features, variables, nodeTypes, nodeCount };
}

// ─── 매칭 ───

/**
 * 폴백 매칭 임계값.
 *
 * 캘리브레이션 실측 — 멀티셋 카운트에서 `CATALOG_TEST_CASES` 26건 전수 정답이
 * 유지되고 정답 최저 점수가 0.800 이다. 마진 0.05 를 빼 0.75 로 잡으면 코퍼스
 * 9,919건의 매칭률이 30.9% → 수 % 대로 떨어진다.
 *
 * precision 페널티(F1)는 넣지 않는다. signature 는 설계상 희소한 기술인데
 * precision 이 그 희소함을 벌한다 — `binomial-theorem` 은 토큰 4개로 특징
 * 25개짜리 수식을 가리켜 F1 이 0.267 까지 내려가고, 26건을 살리려 임계값을
 * 낮추면 오탐이 오히려 64.7% 로 악화된다.
 */
const APPROXIMATE_THRESHOLD = 0.75;

/** 동점 해소에 쓰는 변별 토큰 — 값이 박혀 있고 흔하지 않은 것들. */
const DISCRIMINATIVE = /^(variable:|number:|func:|power\.exponent:)/;

/**
 * AST를 카탈로그 인덱스와 매칭한다.
 *
 * @param ast - AST 루트 노드
 * @param index - 카탈로그 인덱스 항목 배열
 * @returns 가장 높은 점수의 매칭 결과 또는 null
 */
export function matchCatalog(
  ast: MathNode,
  index: CatalogIndexEntry[],
): CatalogMatchResult | null {
  const sig = extractSignature(ast);
  let bestMatch: CatalogMatchResult | null = null;
  let bestRigid = -1;

  for (const entry of index) {
    // 1. 사전 필터: complexity 범위
    if (entry.complexity) {
      const [min, max] = entry.complexity;
      if (sig.nodeCount < min || sig.nodeCount > max) continue;
    }

    // 2. 사전 필터: 필수 노드 타입
    if (entry.requiredNodeTypes) {
      let missingType = false;
      for (const nt of entry.requiredNodeTypes) {
        if (!sig.nodeTypes.has(nt)) {
          missingType = true;
          break;
        }
      }
      if (missingType) continue;
    }

    // 3. 사전 필터: 필수 변수 (exact 패턴용)
    if (entry.requiredVariables) {
      let missingVar = false;
      for (const v of entry.requiredVariables) {
        if (!sig.variables.has(v)) {
          missingVar = true;
          break;
        }
      }
      if (missingVar) continue;
    }

    // 4. 멀티셋 시그니처 비교 — 같은 토큰이 두 번 요구되면 두 번 있어야 한다.
    const remaining = new Map(sig.features);
    let matched = 0;
    let rigidMatched = 0;
    for (const feat of entry.signature) {
      const n = remaining.get(feat) ?? 0;
      if (n > 0) {
        remaining.set(feat, n - 1);
        matched++;
        // 동점 해소용 변별 토큰. `operator:` 는 제외한다 — 221개 시그니처 중
        // 149개가 `operator:=` 를 갖고 있어 변별력이 거의 없다.
        if (DISCRIMINATIVE.test(feat)) rigidMatched++;
      }
    }

    const score = entry.signature.length > 0 ? matched / entry.signature.length : 0;

    // patternType 계수(×1.2 / ×0.9)는 쓰지 않는다. 데이터와 어긋나 있었다 —
    // `exact` 인데 requiredVariables 가 없는 10건은 보너스도 감점도 받지 않아
    // structural 189건 대비 +11% 특혜를 누렸다. 변별력은 requiredVariables
    // 사전 필터가 이미 제공한다.

    // 5. 임계값 + 최고 매칭 갱신.
    // 동점 해소를 "signature 가 긴 쪽" 으로 하면 중복 토큰을 많이 넣은 항목이
    // 이기는 역인센티브가 된다. 값이 박힌 토큰 수로 가른다.
    // 동점이면 값이 박힌 토큰이 많은 쪽. 그것도 같으면 먼저 등장한 항목을
    // 유지한다 — 뒤엣것으로 갈아타면 데이터 순서에 따라 결과가 흔들린다.
    const better =
      !bestMatch ||
      score > (bestMatch.score ?? 0) ||
      (score === (bestMatch.score ?? 0) && rigidMatched > bestRigid);
    if (score >= APPROXIMATE_THRESHOLD && better) {
      bestMatch = {
        catalogId: entry.id,
        category: entry.category,
        // 폴백 경로는 확정을 만들 수 없다. 칩은 form 매칭에서만 나온다.
        tier: 'approximate',
        score,
        exhaustive: score === 1 && !entry.form,
      };
      bestRigid = rigidMatched;
    }
  }

  return bestMatch;
}
