/**
 * 정적 분석 API
 *
 *   analyzeBindings(ast)   → { required, constants }
 *   analyzeEvaluability(ast) → { evaluable, unsupported }
 *
 * 호스트는 식 노드 생성 시 1회 호출하여 입력 슬롯/배지 UX 를 결정한다.
 */
import type { MathNode, MathNodeType, VariableNode } from '../types';
import { registeredTypes } from './registry';
import { installCoreHandlers } from './core';
import { normalizeVarName } from './normalize';
import { isMathConstantName } from './constants';

export interface BindingAnalysis {
  /** 호스트가 공급해야 하는 자유변수 (정규화된 이름, 정렬·중복 제거) */
  required: string[];
  /** 식에 등장하는 수학 상수 (호스트 공급 권장, 정렬·중복 제거) */
  constants: string[];
}

export interface EvaluabilityAnalysis {
  /** 모든 노드 타입이 registry 에 등록되어 있어 평가 시도 가능한 경우 true */
  evaluable: boolean;
  /** registry 미등록 노드 타입 (정렬·중복 제거) */
  unsupported: MathNodeType[];
}

/** 노드의 직계 자식 MathNode 들을 모두 수집한다 (1d / 2d array 필드 모두 지원) */
function childrenOf(node: MathNode): MathNode[] {
  const out: MathNode[] = [];
  for (const v of Object.values(node)) {
    if (!Array.isArray(v)) continue;
    for (const item of v) {
      if (Array.isArray(item)) {
        for (const sub of item) {
          if (isMathNode(sub)) out.push(sub);
        }
      } else if (isMathNode(item)) {
        out.push(item);
      }
    }
  }
  return out;
}

function isMathNode(x: unknown): x is MathNode {
  return typeof x === 'object' && x !== null && 'type' in x && typeof (x as { type: unknown }).type === 'string';
}

function walk(node: MathNode, visit: (n: MathNode) => void): void {
  visit(node);
  for (const c of childrenOf(node)) walk(c, visit);
}

export function analyzeBindings(node: MathNode): BindingAnalysis {
  const required = new Set<string>();
  const constants = new Set<string>();
  walk(node, (n) => {
    if (n.type !== 'variable') return;
    const canonical = normalizeVarName((n as VariableNode).name);
    if (isMathConstantName(canonical)) constants.add(canonical);
    else required.add(canonical);
  });
  return {
    required: [...required].sort(),
    constants: [...constants].sort(),
  };
}

export function analyzeEvaluability(node: MathNode): EvaluabilityAnalysis {
  installCoreHandlers();
  const registered = registeredTypes();
  const unsupported = new Set<MathNodeType>();
  walk(node, (n) => {
    if (!registered.has(n.type)) unsupported.add(n.type);
  });
  return {
    evaluable: unsupported.size === 0,
    unsupported: [...unsupported].sort(),
  };
}
