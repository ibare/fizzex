/**
 * AST Walker - AST 순회 유틸리티
 *
 * Fizzex AST를 순회하며 정보를 수집
 */

import type {
  MathNode,
  RootNode,
  FracNode,
  PowerNode,
  SubscriptNode,
  SqrtNode,
  ParenNode,
  AbsNode,
  FuncNode,
  IntegralNode,
  SumNode,
  LimitNode,
  ProductNode,
  OverlineNode,
  AccentNode,
  MatrixNode,
  AlignNode,
  CasesNode,
  GatherNode,
  ArrayNode,
  RowNode,
  OperatorNode,
} from '../types';
import type { ASTCollectionResult } from './types';

/** 특수 상수 목록 */
const SPECIAL_CONSTANTS = new Set([
  'pi',
  'Pi',
  'π',
  'e',
  'i', // 허수 단위
  'phi',
  'φ', // 황금비
  'inf',
  '∞',
]);

/**
 * AST를 순회하며 정보 수집
 */
export function walkAST(ast: RootNode): ASTCollectionResult {
  const result: ASTCollectionResult = {
    variables: new Set(),
    numbers: [],
    operators: new Set(),
    functions: new Map(),
    constants: new Set(),
    nodeTypeCounts: {},
    maxDepth: 0,
    totalNodes: 0,
  };

  walkNode(ast, result, 0);

  return result;
}

/**
 * 단일 노드 처리 및 자식 순회
 */
function walkNode(
  node: MathNode,
  result: ASTCollectionResult,
  depth: number
): void {
  // 깊이 및 노드 수 업데이트
  result.maxDepth = Math.max(result.maxDepth, depth);
  result.totalNodes++;

  // 노드 타입 카운트
  result.nodeTypeCounts[node.type] =
    (result.nodeTypeCounts[node.type] || 0) + 1;

  switch (node.type) {
    case 'root':
    case 'row':
      walkChildren((node as RootNode | RowNode).children, result, depth + 1);
      break;

    case 'number':
      result.numbers.push(parseFloat(node.value));
      break;

    case 'variable':
      if (SPECIAL_CONSTANTS.has(node.name)) {
        result.constants.add(node.name);
      } else {
        result.variables.add(node.name);
      }
      break;

    case 'operator':
      result.operators.add(node.operator);
      break;

    case 'frac': {
      const frac = node as FracNode;
      walkChildren(frac.numerator, result, depth + 1);
      walkChildren(frac.denominator, result, depth + 1);
      break;
    }

    case 'power': {
      const power = node as PowerNode;
      walkChildren(power.base, result, depth + 1);
      walkChildren(power.exponent, result, depth + 1);
      break;
    }

    case 'subscript': {
      const sub = node as SubscriptNode;
      walkChildren(sub.base, result, depth + 1);
      walkChildren(sub.subscript, result, depth + 1);
      break;
    }

    case 'sqrt': {
      const sqrt = node as SqrtNode;
      walkChildren(sqrt.content, result, depth + 1);
      if (sqrt.index) {
        walkChildren(sqrt.index, result, depth + 1);
      }
      break;
    }

    case 'paren': {
      const paren = node as ParenNode;
      walkChildren(paren.content, result, depth + 1);
      break;
    }

    case 'abs': {
      const abs = node as AbsNode;
      walkChildren(abs.content, result, depth + 1);
      break;
    }

    case 'func': {
      const func = node as FuncNode;
      const currentCount = result.functions.get(func.name) || 0;
      result.functions.set(func.name, currentCount + 1);
      walkChildren(func.argument, result, depth + 1);
      break;
    }

    case 'integral': {
      const integral = node as IntegralNode;
      if (integral.lower) walkChildren(integral.lower, result, depth + 1);
      if (integral.upper) walkChildren(integral.upper, result, depth + 1);
      walkChildren(integral.integrand, result, depth + 1);
      // differential 변수는 적분 변수이므로 일반 변수와 구분
      break;
    }

    case 'sum': {
      const sum = node as SumNode;
      walkChildren(sum.lower, result, depth + 1);
      walkChildren(sum.upper, result, depth + 1);
      walkChildren(sum.body, result, depth + 1);
      break;
    }

    case 'limit': {
      const limit = node as LimitNode;
      walkChildren(limit.approach, result, depth + 1);
      walkChildren(limit.body, result, depth + 1);
      // limit.variable은 극한 변수
      break;
    }

    case 'product': {
      const product = node as ProductNode;
      walkChildren(product.lower, result, depth + 1);
      walkChildren(product.upper, result, depth + 1);
      walkChildren(product.body, result, depth + 1);
      break;
    }

    case 'overline': {
      const overline = node as OverlineNode;
      walkChildren(overline.content, result, depth + 1);
      break;
    }

    case 'accent': {
      const accent = node as AccentNode;
      walkChildren(accent.content, result, depth + 1);
      break;
    }

    case 'matrix': {
      const matrix = node as MatrixNode;
      for (const row of matrix.rows) {
        walkChildren(row, result, depth + 1);
      }
      break;
    }

    case 'align': {
      const align = node as AlignNode;
      for (const row of align.rows) {
        walkChildren(row, result, depth + 1);
      }
      break;
    }

    case 'cases': {
      const cases = node as CasesNode;
      for (const row of cases.rows) {
        walkChildren(row, result, depth + 1);
      }
      break;
    }

    case 'gather': {
      const gather = node as GatherNode;
      walkChildren(gather.rows, result, depth + 1);
      break;
    }

    case 'array': {
      const arr = node as ArrayNode;
      for (const row of arr.rows) {
        walkChildren(row, result, depth + 1);
      }
      break;
    }

    case 'text':
    case 'space':
      // 텍스트와 공백은 분석에서 제외
      break;
  }
}

/**
 * 자식 노드 배열 순회
 */
function walkChildren(
  children: MathNode[],
  result: ASTCollectionResult,
  depth: number
): void {
  for (const child of children) {
    walkNode(child, result, depth);
  }
}

/**
 * 특정 노드 타입 찾기
 */
export function findNodes<T extends MathNode>(
  ast: RootNode,
  type: T['type']
): T[] {
  const found: T[] = [];

  function search(node: MathNode): void {
    if (node.type === type) {
      found.push(node as T);
    }

    // 자식 노드 탐색
    switch (node.type) {
      case 'root':
      case 'row':
        (node as RootNode | RowNode).children.forEach(search);
        break;
      case 'frac': {
        const frac = node as FracNode;
        frac.numerator.forEach(search);
        frac.denominator.forEach(search);
        break;
      }
      case 'power': {
        const power = node as PowerNode;
        power.base.forEach(search);
        power.exponent.forEach(search);
        break;
      }
      case 'subscript': {
        const sub = node as SubscriptNode;
        sub.base.forEach(search);
        sub.subscript.forEach(search);
        break;
      }
      case 'sqrt': {
        const sqrt = node as SqrtNode;
        sqrt.content.forEach(search);
        sqrt.index?.forEach(search);
        break;
      }
      case 'paren':
        (node as ParenNode).content.forEach(search);
        break;
      case 'abs':
        (node as AbsNode).content.forEach(search);
        break;
      case 'func':
        (node as FuncNode).argument.forEach(search);
        break;
      case 'integral': {
        const integral = node as IntegralNode;
        integral.lower?.forEach(search);
        integral.upper?.forEach(search);
        integral.integrand.forEach(search);
        break;
      }
      case 'sum': {
        const sum = node as SumNode;
        sum.lower.forEach(search);
        sum.upper.forEach(search);
        sum.body.forEach(search);
        break;
      }
      case 'limit': {
        const limit = node as LimitNode;
        limit.approach.forEach(search);
        limit.body.forEach(search);
        break;
      }
      case 'product': {
        const product = node as ProductNode;
        product.lower.forEach(search);
        product.upper.forEach(search);
        product.body.forEach(search);
        break;
      }
      case 'overline':
        (node as OverlineNode).content.forEach(search);
        break;
      case 'accent':
        (node as AccentNode).content.forEach(search);
        break;
      case 'matrix': {
        const matrix = node as MatrixNode;
        matrix.rows.forEach((row) => row.forEach(search));
        break;
      }
      case 'align': {
        const align = node as AlignNode;
        align.rows.forEach((row) => row.forEach(search));
        break;
      }
      case 'cases': {
        const cases = node as CasesNode;
        cases.rows.forEach((row) => row.forEach(search));
        break;
      }
      case 'gather':
        (node as GatherNode).rows.forEach(search);
        break;
      case 'array': {
        const arr = node as ArrayNode;
        arr.rows.forEach((row) => row.forEach(search));
        break;
      }
    }
  }

  search(ast);
  return found;
}

/**
 * AST에 등호(=)가 포함되어 있는지 확인
 */
export function hasEquality(ast: RootNode): boolean {
  const operators = findNodes<OperatorNode>(ast, 'operator');
  return operators.some((op) => op.operator === '=');
}

/**
 * AST에 부등호가 포함되어 있는지 확인
 */
export function hasInequality(ast: RootNode): boolean {
  const operators = findNodes<OperatorNode>(ast, 'operator');
  return operators.some((op) =>
    ['<', '>', '≤', '≥', '≠'].includes(op.operator)
  );
}
