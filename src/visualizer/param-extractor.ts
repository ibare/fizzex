/**
 * 파라미터 추출기
 *
 * AST + 카탈로그 데이터에서 조절 가능한 파라미터를 추출한다.
 * 카탈로그에 parameterConfig가 있으면 사용, 없으면 AST에서 자동 추출.
 */

import type { MathNode } from '../types';
import type { CatalogDetail } from '../analyzer/semantic/types';
import type { ParameterConfig } from './types';

/**
 * 카탈로그 상세에서 ParameterConfig를 추출하거나,
 * 없으면 AST에서 변수를 찾아 기본 파라미터를 생성한다.
 */
export function extractParameters(
  ast: MathNode[],
  catalogDetail?: CatalogDetail | null,
): ParameterConfig[] {
  // 카탈로그에 parameterConfig가 있으면 그대로 변환
  if (catalogDetail?.parameterConfig && catalogDetail.parameterConfig.length > 0) {
    return catalogDetail.parameterConfig.map((cp) => ({
      id: cp.id,
      name: cp.name,
      role: cp.role,
      min: cp.min,
      max: cp.max,
      default: cp.default,
      step: cp.step,
      unit: cp.unit,
      scale: (cp.scale === 'log' ? 'log' : 'linear') as 'linear' | 'log',
      effects: cp.effects?.map((e) => ({
        range: [e.range[0], e.range[1]] as [number, number],
        description: e.description,
      })),
    }));
  }

  // 카탈로그에 없으면 AST에서 변수 자동 추출
  const variables = new Set<string>();
  walkForVariables(ast, variables);

  // 잘 알려진 상수는 파라미터에서 제외
  const excludeSet = new Set(['π', 'pi', 'e', 'i']);

  return Array.from(variables)
    .filter((v) => !excludeSet.has(v))
    .map((v) => {
      const role = catalogDetail?.elementMeanings?.[v]?.role ?? v;
      return {
        id: v,
        name: v,
        role,
        min: -10,
        max: 10,
        default: 1,
        step: 0.1,
      };
    });
}

function walkForVariables(nodes: MathNode[], out: Set<string>): void {
  for (const node of nodes) {
    if (node.type === 'variable') {
      out.add(node.name);
    }
    // 재귀적으로 자식 순회
    for (const children of getChildArrays(node)) {
      walkForVariables(children, out);
    }
  }
}

function getChildArrays(node: MathNode): MathNode[][] {
  const arrays: MathNode[][] = [];
  switch (node.type) {
    case 'root': arrays.push(node.children); break;
    case 'row': arrays.push(node.children); break;
    case 'frac': arrays.push(node.numerator, node.denominator); break;
    case 'power': arrays.push(node.base, node.exponent); break;
    case 'paren': arrays.push(node.content); break;
    case 'abs': arrays.push(node.content); break;
    case 'func': arrays.push(node.argument); break;
    case 'sqrt': {
      arrays.push(node.content);
      if (node.index) arrays.push(node.index);
      break;
    }
    case 'subscript': {
      arrays.push(node.base, node.subscript);
      break;
    }
    case 'sum': arrays.push(node.lower, node.upper, node.body); break;
    case 'integral': {
      arrays.push(node.integrand);
      if (node.lower) arrays.push(node.lower);
      if (node.upper) arrays.push(node.upper);
      break;
    }
    case 'overline': arrays.push(node.content); break;
    case 'accent': arrays.push(node.content); break;
  }
  return arrays;
}
