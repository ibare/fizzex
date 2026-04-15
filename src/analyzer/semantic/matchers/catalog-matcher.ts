/**
 * 카탈로그 매처 — 유명 수식 AST 패턴 매칭
 *
 * AST에서 구조 시그니처를 추출하고, 카탈로그 인덱스와 비교하여
 * 가장 높은 confidence의 매칭을 반환한다.
 *
 * 매칭 전략:
 * 1. 사전 필터 (complexity, requiredNodeTypes) — 저렴한 체크로 후보 축소
 * 2. 시그니처 비교 — 추출된 특징과 카탈로그 시그니처의 교집합 비율
 * 3. exact 패턴은 변수명까지 일치해야 높은 confidence
 */

import type { MathNode } from '../../../types';
import type { CatalogIndexEntry, CatalogMatchResult } from '../types';
import { getChildArrays } from '../helpers';

// ─── AST 시그니처 추출 ───

interface AstSignature {
  /** 구조적 특징 집합 */
  features: Set<string>;
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
  const features = new Set<string>();
  const variables = new Set<string>();
  const nodeTypes = new Set<string>();
  let nodeCount = 0;

  function walk(node: MathNode, parentContext?: string): void {
    nodeCount++;
    nodeTypes.add(node.type);

    switch (node.type) {
      case 'variable':
        variables.add(node.name);
        features.add(`variable:${node.name}`);
        break;
      case 'number':
        features.add(`number:${node.value}`);
        break;
      case 'operator':
        features.add(`operator:${node.operator}`);
        break;
      case 'func':
        features.add(`func:${node.name}`);
        break;
      case 'power': {
        const exp0 = node.exponent.length === 1 ? node.exponent[0] : null;
        if (exp0?.type === 'number') {
          features.add(`power.exponent:${exp0.value}`);
        } else if (exp0?.type === 'row' && exp0.children.length === 1 && exp0.children[0].type === 'number') {
          // 파서가 단일 숫자 지수를 row로 감싸는 경우 unwrap
          features.add(`power.exponent:${exp0.children[0].value}`);
        } else {
          features.add('power.exponent:row');
        }
        break;
      }
    }

    // 노드 타입 자체를 특징으로 추가
    if (!['root', 'row', 'number', 'variable', 'operator'].includes(node.type)) {
      features.add(node.type);
    }

    // 부모 컨텍스트 + 현재 타입 조합
    if (parentContext) {
      features.add(`${parentContext}:${node.type}`);
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

/** confidence 임계값 */
const CONFIDENCE_THRESHOLD = 0.5;

/**
 * AST를 카탈로그 인덱스와 매칭한다.
 *
 * @param ast - AST 루트 노드
 * @param index - 카탈로그 인덱스 항목 배열
 * @returns 가장 높은 confidence의 매칭 결과 또는 null
 */
export function matchCatalog(
  ast: MathNode,
  index: CatalogIndexEntry[],
): CatalogMatchResult | null {
  const sig = extractSignature(ast);
  let bestMatch: CatalogMatchResult | null = null;

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

    // 4. 시그니처 비교: 카탈로그 시그니처 중 AST에 있는 것의 비율
    let matched = 0;
    for (const feat of entry.signature) {
      if (sig.features.has(feat)) {
        matched++;
      }
    }

    const signatureScore = entry.signature.length > 0
      ? matched / entry.signature.length
      : 0;

    // 5. confidence 계산
    let confidence = signatureScore;

    // exact 패턴은 변수명이 모두 일치하면 보너스
    if (entry.patternType === 'exact' && entry.requiredVariables) {
      const allVarsMatch = entry.requiredVariables.every(v => sig.variables.has(v));
      if (allVarsMatch) {
        confidence = Math.min(1.0, confidence * 1.2);
      }
    }

    // structural 패턴은 약간 디스카운트
    if (entry.patternType === 'structural') {
      confidence *= 0.9;
    }

    // 6. 임계값 체크 + 최고 매칭 갱신
    if (confidence >= CONFIDENCE_THRESHOLD && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = {
        catalogId: entry.id,
        category: entry.category,
        confidence,
      };

      // 변수 매핑 (exact 패턴)
      if (entry.requiredVariables) {
        const mapping: Record<string, string> = {};
        for (const v of entry.requiredVariables) {
          mapping[v] = v; // 동일명 매핑 (향후 유연한 매핑 지원 가능)
        }
        bestMatch.variableMapping = mapping;
      }
    }
  }

  return bestMatch;
}
