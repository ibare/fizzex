/**
 * Visualization Matcher
 *
 * 수식 분석 결과를 바탕으로 적합한 시각화 유형과 파라미터 추출
 */

import type { RootNode, MathNode } from '../types';
import type {
  ExpressionAnalysis,
  VisualizationType,
  VisualizationParams,
  NumberLineParams,
  UnitCircleParams,
  PolarGraphParams,
  FunctionGraph2DParams,
} from './types';
import { astToLatex } from '../latex';

/**
 * 시각화 매칭 결과
 */
export interface VisualizationMatch {
  /** 추천 시각화 목록 (우선순위순) */
  recommended: VisualizationType[];
  /** 최적 시각화 */
  bestFit: VisualizationType;
  /** 시각화별 파라미터 */
  params: VisualizationParams;
  /** 매칭 신뢰도 (0-1) */
  confidence: number;
}

/**
 * 부등식 연산자
 */
type InequalityOperator = '<' | '>' | '≤' | '≥' | '=' | '≠';

/**
 * 수식 분석 결과와 AST를 기반으로 시각화 매칭 수행
 */
export function matchVisualization(
  analysis: ExpressionAnalysis,
  ast: RootNode
): VisualizationMatch {
  const recommended: VisualizationType[] = [];
  const params: VisualizationParams = {};
  let bestFit: VisualizationType = 'table';
  let confidence = 0.5;

  // 1. 부등식 체크 → NumberLine
  if (analysis.form === 'inequality') {
    const numberLineParams = extractNumberLineParams(ast, analysis);
    if (numberLineParams) {
      recommended.push('number-line');
      params.numberLine = numberLineParams;
      bestFit = 'number-line';
      confidence = 0.9;
    }
  }

  // 2. 절댓값 + 부등식/방정식 체크 → NumberLine
  const hasAbs = hasAbsoluteValue(ast);
  if (hasAbs && (analysis.form === 'inequality' || analysis.form === 'equation')) {
    const absParams = extractAbsoluteValueParams(ast, analysis);
    if (absParams) {
      if (!recommended.includes('number-line')) {
        recommended.push('number-line');
      }
      params.numberLine = absParams;
      bestFit = 'number-line';
      confidence = 0.85;
    }
  }

  // 3. 삼각함수 체크 → UnitCircle (변수가 1개 또는 주변수 1개)
  const hasTrig = analysis.functions.some(
    (f) => ['sin', 'cos', 'tan', 'cot', 'sec', 'csc'].includes(f.name)
  );
  const mainVariableCount = analysis.variableClassification?.mainVariables.length ?? analysis.variables.length;
  if (hasTrig && mainVariableCount <= 1) {
    const unitCircleParams = extractUnitCircleParams(ast, analysis);
    if (unitCircleParams) {
      recommended.push('unit-circle');
      params.unitCircle = unitCircleParams;
      // 삼각함수만 있고 다른 복잡한 구조가 없으면 최적
      if (
        analysis.functions.length <= 2 &&
        !analysis.features.includes('has-power') &&
        bestFit === 'table'
      ) {
        bestFit = 'unit-circle';
        confidence = 0.8;
      }
    }
  }

  // 4. 극좌표 형태 체크 (r = f(θ) 또는 θ 변수 사용)
  const hasThetaVar = analysis.variables.includes('θ') || analysis.variables.includes('theta');
  const hasRVar = analysis.variables.includes('r');
  if ((hasThetaVar || (hasRVar && hasTrig)) && analysis.form === 'equation') {
    const polarParams = extractPolarParams(ast, analysis);
    if (polarParams) {
      recommended.push('polar-graph');
      params.polar = polarParams;
      if (hasThetaVar) {
        bestFit = 'polar-graph';
        confidence = 0.85;
      }
    }
  }

  // 5. 일반 함수 그래프 → FunctionGraph 2D
  // graphable2D이거나, 주변수가 1개인 경우 (계수는 슬라이더로 조절 가능)
  const canGraph2D = analysis.visualization.graphable2D ||
    (mainVariableCount === 1 && analysis.variables.length > 0);
  if (canGraph2D) {
    const function2DParams = extractFunction2DParams(ast, analysis);
    if (function2DParams) {
      recommended.push('function-graph-2d');
      params.function2D = function2DParams;
      // 아직 bestFit이 결정되지 않았으면
      if (bestFit === 'table') {
        bestFit = 'function-graph-2d';
        confidence = 0.75;
      }
    }
  }

  // 6. 3D 그래프 가능성 (2변수 함수)
  if (analysis.visualization.graphable3D) {
    recommended.push('function-graph-3d');
  }

  // 7. 기본값 (값 표)
  if (recommended.length === 0) {
    recommended.push('table');
    bestFit = 'table';
    confidence = 0.3;
  }

  return {
    recommended,
    bestFit,
    params,
    confidence,
  };
}

/**
 * AST에서 절댓값 노드 존재 여부 확인
 */
function hasAbsoluteValue(node: MathNode): boolean {
  if (node.type === 'abs') return true;
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.some((child) => hasAbsoluteValue(child as MathNode));
  }
  if (node.type === 'frac') {
    const num = hasAbsoluteValue({ type: 'root', children: node.numerator as MathNode[], id: '' } as MathNode);
    const den = hasAbsoluteValue({ type: 'root', children: node.denominator as MathNode[], id: '' } as MathNode);
    return num || den;
  }
  if (node.type === 'power') {
    const base = hasAbsoluteValue({ type: 'root', children: node.base as MathNode[], id: '' } as MathNode);
    const exp = hasAbsoluteValue({ type: 'root', children: node.exponent as MathNode[], id: '' } as MathNode);
    return base || exp;
  }
  return false;
}

/**
 * 부등식에서 NumberLine 파라미터 추출
 */
function extractNumberLineParams(
  ast: RootNode,
  analysis: ExpressionAnalysis
): NumberLineParams | null {
  // 부등식 연산자 찾기
  const operators = findOperators(ast.children);
  const inequalityOp = operators.find((op) =>
    ['<', '>', '≤', '≥', '\\leq', '\\geq', '\\le', '\\ge'].includes(op.value)
  );

  if (!inequalityOp) return null;

  // 변수와 값 추출
  const variable = analysis.variableClassification?.mainVariables[0] || analysis.variables[0];
  if (!variable) return null;

  // 간단한 부등식 파싱 (예: x < 3, x ≥ -2)
  const parsed = parseSimpleInequality(ast.children, variable);
  if (!parsed) return null;

  const { value, operator, isVariableFirst } = parsed;

  // 구간 계산
  const points: NumberLineParams['points'] = [];
  const intervals: NumberLineParams['intervals'] = [];

  const normalizedOp = normalizeOperator(operator);
  const isInclusive = ['≤', '≥'].includes(normalizedOp);

  points.push({
    value,
    label: `${value}`,
    included: isInclusive,
  });

  // 구간 결정
  if (isVariableFirst) {
    // x < 3 → (-∞, 3)
    // x > 3 → (3, +∞)
    if (['<', '≤'].includes(normalizedOp)) {
      intervals.push({
        start: value - 10,
        end: value,
        startIncluded: true,
        endIncluded: isInclusive,
        label: `${variable} ${normalizedOp} ${value}`,
      });
    } else {
      intervals.push({
        start: value,
        end: value + 10,
        startIncluded: isInclusive,
        endIncluded: true,
        label: `${variable} ${normalizedOp} ${value}`,
      });
    }
  } else {
    // 3 < x → x > 3
    // 3 > x → x < 3
    if (['<', '≤'].includes(normalizedOp)) {
      intervals.push({
        start: value,
        end: value + 10,
        startIncluded: isInclusive,
        endIncluded: true,
        label: `${variable} ${'>' === normalizedOp ? '>' : '≥'} ${value}`,
      });
    } else {
      intervals.push({
        start: value - 10,
        end: value,
        startIncluded: true,
        endIncluded: isInclusive,
        label: `${variable} ${'<' === normalizedOp ? '<' : '≤'} ${value}`,
      });
    }
  }

  return {
    points,
    intervals,
    range: [value - 5, value + 5],
    inequality: {
      variable,
      operator: normalizedOp as InequalityOperator,
      value,
    },
  };
}

/**
 * 절댓값 부등식에서 NumberLine 파라미터 추출
 * 예: |x - 3| < 5 → -2 < x < 8
 */
function extractAbsoluteValueParams(
  ast: RootNode,
  analysis: ExpressionAnalysis
): NumberLineParams | null {
  // 절댓값 노드 찾기
  const absNode = findAbsNode(ast.children);
  if (!absNode) return null;

  // 절댓값 내부 분석 (x - a 형태)
  const absContent = absNode.content;
  if (!absContent || absContent.length === 0) return null;

  // 간단한 형태: |x - c| 또는 |x + c|
  const variable = analysis.variableClassification?.mainVariables[0] || analysis.variables[0];
  if (!variable) return null;

  // center 값 추출 (x - 3 → center = 3)
  const center = extractCenterFromAbs(absContent, variable);

  // 우변 값 추출
  const rightValue = extractRightValue(ast.children, absNode);
  if (rightValue === null) return null;

  // 연산자 확인
  const operators = findOperators(ast.children);
  const inequalityOp = operators.find((op) =>
    ['<', '>', '≤', '≥', '\\leq', '\\geq'].includes(op.value)
  );
  if (!inequalityOp) return null;

  const normalizedOp = normalizeOperator(inequalityOp.value);
  const isLessThan = ['<', '≤'].includes(normalizedOp);
  const isInclusive = ['≤', '≥'].includes(normalizedOp);

  const points: NumberLineParams['points'] = [];
  const intervals: NumberLineParams['intervals'] = [];

  if (isLessThan) {
    // |x - c| < r → c - r < x < c + r
    const left = center - rightValue;
    const right = center + rightValue;

    points.push({ value: left, label: `${left}`, included: isInclusive });
    points.push({ value: center, label: '중심', included: true });
    points.push({ value: right, label: `${right}`, included: isInclusive });

    intervals.push({
      start: left,
      end: right,
      startIncluded: isInclusive,
      endIncluded: isInclusive,
      label: `|${variable} - ${center}| ${normalizedOp} ${rightValue}`,
    });

    return {
      points,
      intervals,
      range: [left - 2, right + 2],
    };
  } else {
    // |x - c| > r → x < c - r 또는 x > c + r
    const left = center - rightValue;
    const right = center + rightValue;

    points.push({ value: left, label: `${left}`, included: isInclusive });
    points.push({ value: center, label: '중심', included: true });
    points.push({ value: right, label: `${right}`, included: isInclusive });

    intervals.push({
      start: left - 5,
      end: left,
      startIncluded: true,
      endIncluded: isInclusive,
      label: `${variable} ${isInclusive ? '≤' : '<'} ${left}`,
    });
    intervals.push({
      start: right,
      end: right + 5,
      startIncluded: isInclusive,
      endIncluded: true,
      label: `${variable} ${isInclusive ? '≥' : '>'} ${right}`,
    });

    return {
      points,
      intervals,
      range: [left - 3, right + 3],
    };
  }
}

/**
 * UnitCircle 파라미터 추출
 */
function extractUnitCircleParams(
  ast: RootNode,
  analysis: ExpressionAnalysis
): UnitCircleParams | null {
  // 삼각함수 확인
  const trigFunctions = analysis.functions.filter((f) =>
    ['sin', 'cos', 'tan', 'cot', 'sec', 'csc'].includes(f.name)
  );

  if (trigFunctions.length === 0) return null;

  // 주요 함수 결정
  const primary = trigFunctions.reduce((a, b) => (a.count >= b.count ? a : b));

  return {
    initialAngle: Math.PI / 4, // 기본 45도
    highlightFunction: primary.name as 'sin' | 'cos' | 'tan',
    showSpecialAngles: true,
  };
}

/**
 * PolarGraph 파라미터 추출
 */
function extractPolarParams(
  ast: RootNode,
  analysis: ExpressionAnalysis
): PolarGraphParams | null {
  // r = f(θ) 형태 확인
  const latex = astToLatex(ast);

  // 방정식에서 우변 추출
  const parts = latex.split('=');
  if (parts.length !== 2) return null;

  const leftTrimmed = parts[0].trim().toLowerCase();
  const rightTrimmed = parts[1].trim();

  // r = ... 형태인지 확인
  if (leftTrimmed === 'r' || leftTrimmed === '\\rho') {
    return {
      expression: rightTrimmed,
      thetaRange: [0, Math.PI * 2],
      animated: false,
    };
  }

  // θ 변수가 있으면 극좌표로 추정
  if (analysis.variables.includes('θ') || analysis.variables.includes('theta')) {
    return {
      expression: latex,
      thetaRange: [0, Math.PI * 2],
      animated: false,
    };
  }

  return null;
}

/**
 * FunctionGraph 2D 파라미터 추출
 */
function extractFunction2DParams(
  ast: RootNode,
  analysis: ExpressionAnalysis
): FunctionGraph2DParams | null {
  const latex = astToLatex(ast);

  // y = f(x) 형태이면 우변만 사용
  const parts = latex.split('=');
  let expression = latex;
  if (parts.length === 2) {
    const left = parts[0].trim();
    if (left === 'y' || left === 'f(x)') {
      expression = parts[1].trim();
    }
  }

  const mainVariable = analysis.variableClassification?.mainVariables[0] || 'x';
  const coefficients = analysis.variableClassification?.coefficients || [];

  return {
    expression,
    mainVariable,
    coefficients,
    range: {
      xMin: -10,
      xMax: 10,
      yMin: -10,
      yMax: 10,
    },
  };
}

// ============ 헬퍼 함수들 ============

interface OperatorInfo {
  value: string;
  index: number;
}

function findOperators(children: MathNode[]): OperatorInfo[] {
  const operators: OperatorInfo[] = [];
  children.forEach((child, index) => {
    if (child.type === 'operator') {
      operators.push({ value: (child as import('../types').OperatorNode).operator, index });
    }
  });
  return operators;
}

function normalizeOperator(op: string): string {
  const mapping: Record<string, string> = {
    '\\leq': '≤',
    '\\le': '≤',
    '\\geq': '≥',
    '\\ge': '≥',
    '\\neq': '≠',
    '\\ne': '≠',
  };
  return mapping[op] || op;
}

interface SimpleInequalityResult {
  value: number;
  operator: string;
  isVariableFirst: boolean;
}

function parseSimpleInequality(
  children: MathNode[],
  variable: string
): SimpleInequalityResult | null {
  // 간단한 형태: x < 3 또는 3 > x
  let operator = '';
  let operatorIndex = -1;
  let hasVariable = false;
  let variableIndex = -1;
  let numericValue: number | null = null;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.type === 'operator') {
      const opNode = child as import('../types').OperatorNode;
      if (['<', '>', '≤', '≥'].includes(opNode.operator)) {
        operator = opNode.operator;
        operatorIndex = i;
      }
    } else if (child.type === 'variable') {
      const varNode = child as import('../types').VariableNode;
      if (varNode.name === variable) {
        hasVariable = true;
        variableIndex = i;
      }
    } else if (child.type === 'number') {
      const numNode = child as import('../types').NumberNode;
      numericValue = parseFloat(numNode.value);
    }
  }

  if (!operator || !hasVariable || numericValue === null) return null;

  return {
    value: numericValue,
    operator: normalizeOperator(operator),
    isVariableFirst: variableIndex < operatorIndex,
  };
}

interface AbsNode {
  type: 'abs';
  content: MathNode[];
  id: string;
}

function findAbsNode(children: MathNode[]): AbsNode | null {
  for (const child of children) {
    if (child.type === 'abs') {
      return child as AbsNode;
    }
  }
  return null;
}

function extractCenterFromAbs(content: MathNode[], _variable: string): number {
  // |x - 3| → 3, |x + 2| → -2
  let center = 0;
  let sign = 1;

  for (let i = 0; i < content.length; i++) {
    const node = content[i];
    if (node.type === 'operator') {
      const opNode = node as import('../types').OperatorNode;
      if (opNode.operator === '-') {
        sign = -1;
      } else if (opNode.operator === '+') {
        sign = 1;
      }
    } else if (node.type === 'number') {
      const numNode = node as import('../types').NumberNode;
      center = -sign * parseFloat(numNode.value); // 부호 반전
    }
  }

  return center;
}

function extractRightValue(children: MathNode[], absNode: AbsNode): number | null {
  // 절댓값 노드 이후의 숫자 찾기
  let foundAbs = false;
  for (const child of children) {
    if (child === absNode) {
      foundAbs = true;
      continue;
    }
    if (foundAbs && child.type === 'number') {
      const numNode = child as import('../types').NumberNode;
      return parseFloat(numNode.value);
    }
  }
  return null;
}

export default matchVisualization;
