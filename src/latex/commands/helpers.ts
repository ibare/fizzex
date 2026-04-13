/**
 * 명령어 핸들러용 노드 생성 헬퍼 함수
 */

import type { MathNode, RowNode, VariableNode, OperatorNode, SumNode } from '../../types';
import { generateLatexId, deriveId } from '../../utils/id-generator';

/** ID 생성 (내부용 alias) */
export const generateId = generateLatexId;
export { deriveId };

// ============================================================================
// 기본 노드 생성
// ============================================================================

export function createVariable(name: string): VariableNode {
  return { id: generateId(), type: 'variable', name };
}

export function createOperator(op: string): OperatorNode {
  return { id: generateId(), type: 'operator', operator: op };
}

export function createSpace(width: number): MathNode {
  return { id: generateId(), type: 'space', width };
}

export function createText(content: string): MathNode {
  return { id: generateId(), type: 'text', content };
}

export function createNumber(value: string): MathNode {
  return { id: generateId(), type: 'number', value };
}

// ============================================================================
// 복합 노드 생성 (Row 래핑 포함)
// ============================================================================

export function createParen(
  content: MathNode[],
  parenType: '(' | '[' | '{',
  autoSize: boolean = false
): MathNode {
  const parenId = generateId();
  const contentRow: RowNode = { id: deriveId(parenId, '_content'), type: 'row', children: content };
  return { id: parenId, type: 'paren', content: [contentRow], parenType, autoSize };
}

export function createAbs(content: MathNode[]): MathNode {
  const absId = generateId();
  const contentRow: RowNode = { id: deriveId(absId, '_content'), type: 'row', children: content };
  return { id: absId, type: 'abs', content: [contentRow] };
}

export function createFrac(numerator: MathNode[], denominator: MathNode[]): MathNode {
  const fracId = generateId();
  const numRow: RowNode = { id: deriveId(fracId, '_num'), type: 'row', children: numerator };
  const denRow: RowNode = { id: deriveId(fracId, '_den'), type: 'row', children: denominator };
  return { id: fracId, type: 'frac', numerator: [numRow], denominator: [denRow] };
}

export function createSqrt(content: MathNode[], index?: MathNode[]): MathNode {
  const sqrtId = generateId();
  const contentRow: RowNode = { id: deriveId(sqrtId, '_content'), type: 'row', children: content };
  if (index) {
    const indexRow: RowNode = { id: deriveId(sqrtId, '_index'), type: 'row', children: index };
    return { id: sqrtId, type: 'sqrt', content: [contentRow], index: [indexRow] };
  }
  return { id: sqrtId, type: 'sqrt', content: [contentRow] };
}

export function createFunc(name: string, argument: MathNode[]): MathNode {
  return { id: generateId(), type: 'func', name, argument };
}

export function createPower(base: MathNode[], exponent: MathNode[]): MathNode {
  const powerId = generateId();
  const expRow: RowNode = { id: deriveId(powerId, '_exp'), type: 'row', children: exponent };
  return { id: powerId, type: 'power', base, exponent: [expRow] };
}

export function createSubscript(base: MathNode[], subscript: MathNode[]): MathNode {
  const subId = generateId();
  const subRow: RowNode = { id: deriveId(subId, '_sub'), type: 'row', children: subscript };
  return { id: subId, type: 'subscript', base, subscript: [subRow] };
}

export function createIntegral(
  lower: MathNode[],
  upper: MathNode[],
  integrand: MathNode[],
  differential: string,
  integralType: 'int' | 'iint' | 'iiint' | 'oint'
): MathNode {
  const integralId = generateId();
  const lowerRow: RowNode = { id: deriveId(integralId, '_lower'), type: 'row', children: lower };
  const upperRow: RowNode = { id: deriveId(integralId, '_upper'), type: 'row', children: upper };
  const integrandRow: RowNode = { id: deriveId(integralId, '_integrand'), type: 'row', children: integrand };
  return {
    id: integralId,
    type: 'integral',
    lower: [lowerRow],
    upper: [upperRow],
    integrand: [integrandRow],
    differential,
    integralType,
  };
}

export function createSum(lower: MathNode[], upper: MathNode[], body: MathNode[], symbol?: string): SumNode {
  const sumId = generateId();
  const lowerRow: RowNode = { id: deriveId(sumId, '_lower'), type: 'row', children: lower };
  const upperRow: RowNode = { id: deriveId(sumId, '_upper'), type: 'row', children: upper };
  const bodyRow: RowNode = { id: deriveId(sumId, '_body'), type: 'row', children: body };
  const node: SumNode = { id: sumId, type: 'sum', lower: [lowerRow], upper: [upperRow], body: [bodyRow] };
  if (symbol) node.symbol = symbol;
  return node;
}

export function createLimit(variable: string, approach: MathNode[], body: MathNode[]): MathNode {
  const limitId = generateId();
  const approachRow: RowNode = { id: deriveId(limitId, '_approach'), type: 'row', children: approach };
  const bodyRow: RowNode = { id: deriveId(limitId, '_body'), type: 'row', children: body };
  return { id: limitId, type: 'limit', variable, approach: [approachRow], body: [bodyRow] };
}

export function createProduct(lower: MathNode[], upper: MathNode[], body: MathNode[]): MathNode {
  const productId = generateId();
  const lowerRow: RowNode = { id: deriveId(productId, '_lower'), type: 'row', children: lower };
  const upperRow: RowNode = { id: deriveId(productId, '_upper'), type: 'row', children: upper };
  const bodyRow: RowNode = { id: deriveId(productId, '_body'), type: 'row', children: body };
  return { id: productId, type: 'product', lower: [lowerRow], upper: [upperRow], body: [bodyRow] };
}

export function createOverline(content: MathNode[]): MathNode {
  const overlineId = generateId();
  const contentRow: RowNode = { id: deriveId(overlineId, '_content'), type: 'row', children: content };
  return { id: overlineId, type: 'overline', content: [contentRow] };
}

export function createUnderline(content: MathNode[]): MathNode {
  const underlineId = generateId();
  const contentRow: RowNode = { id: deriveId(underlineId, '_content'), type: 'row', children: content };
  return { id: underlineId, type: 'overline', variant: 'underline', content: [contentRow] };
}

export function createAccent(
  content: MathNode[],
  accentType: 'hat' | 'vec' | 'dot' | 'ddot' | 'tilde' | 'bar' | 'breve' | 'check' | 'acute' | 'grave' | 'mathring'
): MathNode {
  const accentId = generateId();
  const contentRow: RowNode = { id: deriveId(accentId, '_content'), type: 'row', children: content };
  return { id: accentId, type: 'accent', content: [contentRow], accentType };
}
