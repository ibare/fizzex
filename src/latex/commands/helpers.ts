/**
 * 명령어 핸들러용 노드 생성 헬퍼 함수
 */

import type { MathNode, RowNode, ScriptsNode, ChemNode, VariableNode, OperatorNode, SumNode, FracNode, ParenNode, AccentNode, OversetNode, CancelNode, XArrowNode } from '../../types.js';
import { generateLatexId, deriveId } from '../../utils/id-generator.js';

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

/** 스타일 힌트가 포함된 Row 노드 생성 (\displaystyle, \textstyle 등) */
export function createStyledRow(
  children: MathNode[],
  styleHint: 'display' | 'text' | 'script' | 'scriptscript',
): RowNode {
  return { id: generateId(), type: 'row', children, styleHint };
}

// ============================================================================
// 복합 노드 생성 (Row 래핑 포함)
// ============================================================================

export function createParen(
  content: MathNode[],
  parenType: '(' | '[' | '{',
  autoSize: boolean = false,
  delimiterSize?: 'big' | 'Big' | 'bigg' | 'Bigg'
): MathNode {
  const parenId = generateId();
  const contentRow: RowNode = { id: deriveId(parenId, '_content'), type: 'row', children: content };
  const node: ParenNode = { id: parenId, type: 'paren', content: [contentRow], parenType, autoSize };
  if (delimiterSize) node.delimiterSize = delimiterSize;
  return node;
}

/**
 * 화학식 노드 생성 (`\ce{...}`)
 *
 * 본문은 RowNode 하나로 감싼다 — 커서가 들어갈 자리를 주기 위함이고, `createParen` 과 같은 규약이다.
 */
export function createChem(content: MathNode[]): ChemNode {
  const id = generateId();
  const contentRow: RowNode = { id: deriveId(id, '_content'), type: 'row', children: content };
  return { id, type: 'chem', content: [contentRow] };
}

export function createAbs(content: MathNode[]): MathNode {
  const absId = generateId();
  const contentRow: RowNode = { id: deriveId(absId, '_content'), type: 'row', children: content };
  return { id: absId, type: 'abs', content: [contentRow] };
}

export function createFrac(
  numerator: MathNode[],
  denominator: MathNode[],
  styleOverride?: 'display' | 'text',
): MathNode {
  const fracId = generateId();
  const numRow: RowNode = { id: deriveId(fracId, '_num'), type: 'row', children: numerator };
  const denRow: RowNode = { id: deriveId(fracId, '_den'), type: 'row', children: denominator };
  const node: FracNode = { id: fracId, type: 'frac', numerator: [numRow], denominator: [denRow], styleOverride };
  return node;
}

export function createBinom(
  numerator: MathNode[],
  denominator: MathNode[],
  styleOverride?: 'display' | 'text',
): MathNode {
  const fracId = generateId();
  const numRow: RowNode = { id: deriveId(fracId, '_num'), type: 'row', children: numerator };
  const denRow: RowNode = { id: deriveId(fracId, '_den'), type: 'row', children: denominator };
  const node: FracNode = { id: fracId, type: 'frac', variant: 'binom', numerator: [numRow], denominator: [denRow], styleOverride };
  return node;
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

/** 첨자 노드 생성. 붙일 슬롯만 넘긴다. */
export function createScripts(
  base: MathNode[],
  slots: {
    superscript?: MathNode[];
    subscript?: MathNode[];
    leftSuperscript?: MathNode[];
    leftSubscript?: MathNode[];
  }
): MathNode {
  const id = generateId();
  const node: ScriptsNode = { id, type: 'scripts', base };
  if (slots.superscript) {
    node.superscript = [{ id: deriveId(id, '_sup'), type: 'row', children: slots.superscript }];
  }
  if (slots.subscript) {
    node.subscript = [{ id: deriveId(id, '_sub'), type: 'row', children: slots.subscript }];
  }
  if (slots.leftSuperscript) {
    node.leftSuperscript = [{ id: deriveId(id, '_leftsup'), type: 'row', children: slots.leftSuperscript }];
  }
  if (slots.leftSubscript) {
    node.leftSubscript = [{ id: deriveId(id, '_leftsub'), type: 'row', children: slots.leftSubscript }];
  }
  return node;
}

/** 첨자 슬롯의 row id 접미사 */
const SCRIPT_SLOT_SUFFIX = {
  superscript: '_sup',
  subscript: '_sub',
  leftSuperscript: '_leftsup',
  leftSubscript: '_leftsub',
} as const;

/**
 * 이미 있는 첨자 노드의 빈 슬롯을 채운다 (불변 — 새 객체를 반환).
 *
 * x^2 뒤에 _3 이 오면 새 노드를 만들지 않고 같은 노드의 아래첨자 자리를 채운다.
 * 이렇게 해야 x_i^2 가 중첩이 아니라 하나의 첨자 노드가 된다 (TeX Rule 18e).
 */
export function attachScript(
  node: ScriptsNode,
  slot: keyof typeof SCRIPT_SLOT_SUFFIX,
  content: MathNode[]
): ScriptsNode {
  const row: RowNode = {
    id: deriveId(node.id, SCRIPT_SLOT_SUFFIX[slot]),
    type: 'row',
    children: content,
  };
  return { ...node, [slot]: [row] };
}

/** 첨자를 붙인다 — 직전 노드가 빈 슬롯을 가진 첨자 노드면 그 자리를 채운다. */
export function appendScript(
  nodes: MathNode[],
  slot: 'superscript' | 'subscript',
  content: MathNode[]
): void {
  const prev = nodes.length > 0 ? nodes[nodes.length - 1] : undefined;
  if (prev?.type === 'scripts' && prev.base.length > 0 && prev[slot] === undefined) {
    nodes[nodes.length - 1] = attachScript(prev, slot, content);
    return;
  }
  const base = nodes.length > 0 ? [nodes.pop()!] : [];
  nodes.push(createScripts(base, { [slot]: content }));
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

// ============================================================================
// 수학 폰트 유니코드 매핑
// ============================================================================

/** 수학 폰트 스타일 */
export type MathFontStyle = 'mathbb' | 'mathcal' | 'mathfrak' | 'mathbf' | 'mathsf' | 'mathtt' | 'mathit';

// Double-Struck (mathbb): 일부 대문자는 별도 코드포인트
const MATHBB_SPECIAL: Record<string, number> = {
  C: 0x2102, H: 0x210D, N: 0x2115, P: 0x2119, Q: 0x211A, R: 0x211D, Z: 0x2124,
};

// Script (mathcal): 일부 대문자는 별도 코드포인트
const MATHCAL_SPECIAL: Record<string, number> = {
  B: 0x212C, E: 0x2130, F: 0x2131, H: 0x210B, I: 0x2110, L: 0x2112, M: 0x2133, R: 0x211B,
};

// Fraktur (mathfrak): 일부 대문자는 별도 코드포인트
const MATHFRAK_SPECIAL: Record<string, number> = {
  C: 0x212D, H: 0x210C, I: 0x2111, R: 0x211C, Z: 0x2128,
};

// Script (mathcal) 소문자: 일부는 별도 코드포인트
const MATHCAL_SPECIAL_LOWER: Record<string, number> = {
  e: 0x212F, g: 0x210A, o: 0x2134,
};

// Italic (mathit): h는 별도 코드포인트 (Planck constant)
const MATHIT_SPECIAL: Record<string, number> = {
  h: 0x210E,
};

/** 단일 문자를 수학 폰트 유니코드로 변환 */
function mapCharToMathFont(char: string, style: MathFontStyle): string {
  const code = char.codePointAt(0)!;
  const isUpper = code >= 0x41 && code <= 0x5A;
  const isLower = code >= 0x61 && code <= 0x7A;
  const isDigit = code >= 0x30 && code <= 0x39;

  switch (style) {
    case 'mathbb':
      if (isUpper && MATHBB_SPECIAL[char]) return String.fromCodePoint(MATHBB_SPECIAL[char]);
      if (isUpper) return String.fromCodePoint(0x1D538 + (code - 0x41));
      if (isLower) return String.fromCodePoint(0x1D552 + (code - 0x61));
      if (isDigit) return String.fromCodePoint(0x1D7D8 + (code - 0x30));
      return char;

    case 'mathcal':
      if (isUpper && MATHCAL_SPECIAL[char]) return String.fromCodePoint(MATHCAL_SPECIAL[char]);
      if (isUpper) return String.fromCodePoint(0x1D49C + (code - 0x41));
      if (isLower && MATHCAL_SPECIAL_LOWER[char]) return String.fromCodePoint(MATHCAL_SPECIAL_LOWER[char]);
      if (isLower) return String.fromCodePoint(0x1D4B6 + (code - 0x61));
      return char;

    case 'mathfrak':
      if (isUpper && MATHFRAK_SPECIAL[char]) return String.fromCodePoint(MATHFRAK_SPECIAL[char]);
      if (isUpper) return String.fromCodePoint(0x1D504 + (code - 0x41));
      if (isLower) return String.fromCodePoint(0x1D51E + (code - 0x61));
      return char;

    case 'mathbf':
      if (isUpper) return String.fromCodePoint(0x1D400 + (code - 0x41));
      if (isLower) return String.fromCodePoint(0x1D41A + (code - 0x61));
      if (isDigit) return String.fromCodePoint(0x1D7CE + (code - 0x30));
      return char;

    case 'mathsf':
      if (isUpper) return String.fromCodePoint(0x1D5A0 + (code - 0x41));
      if (isLower) return String.fromCodePoint(0x1D5BA + (code - 0x61));
      if (isDigit) return String.fromCodePoint(0x1D7E2 + (code - 0x30));
      return char;

    case 'mathtt':
      if (isUpper) return String.fromCodePoint(0x1D670 + (code - 0x41));
      if (isLower) return String.fromCodePoint(0x1D68A + (code - 0x61));
      if (isDigit) return String.fromCodePoint(0x1D7F6 + (code - 0x30));
      return char;

    case 'mathit':
      if (isUpper) return String.fromCodePoint(0x1D434 + (code - 0x41));
      if (isLower && MATHIT_SPECIAL[char]) return String.fromCodePoint(MATHIT_SPECIAL[char]);
      if (isLower) return String.fromCodePoint(0x1D44E + (code - 0x61));
      return char;
  }
}

/** 문자열의 각 문자를 수학 폰트 유니코드로 매핑 */
export function mapMathFont(text: string, style: MathFontStyle): string {
  return [...text].map(ch => mapCharToMathFont(ch, style)).join('');
}

export function createOverset(base: MathNode[], annotation: MathNode[]): OversetNode {
  const id = generateId();
  const baseRow: RowNode = { id: deriveId(id, '_base'), type: 'row', children: base };
  const annoRow: RowNode = { id: deriveId(id, '_anno'), type: 'row', children: annotation };
  return { id, type: 'overset', base: [baseRow], annotation: [annoRow], position: 'above' };
}

export function createUnderset(base: MathNode[], annotation: MathNode[]): OversetNode {
  const id = generateId();
  const baseRow: RowNode = { id: deriveId(id, '_base'), type: 'row', children: base };
  const annoRow: RowNode = { id: deriveId(id, '_anno'), type: 'row', children: annotation };
  return { id, type: 'overset', base: [baseRow], annotation: [annoRow], position: 'below' };
}

export function createBoxed(content: MathNode[]): MathNode {
  const id = generateId();
  const contentRow: RowNode = { id: deriveId(id, '_content'), type: 'row', children: content };
  return { id, type: 'overline', variant: 'boxed', content: [contentRow] };
}

export function createCancel(
  content: MathNode[],
  cancelType: 'cancel' | 'bcancel' | 'xcancel',
): CancelNode {
  const id = generateId();
  const contentRow: RowNode = { id: deriveId(id, '_content'), type: 'row', children: content };
  return { id, type: 'cancel', content: [contentRow], cancelType };
}

export function createAccent(
  content: MathNode[],
  accentType: AccentNode['accentType']
): MathNode {
  const accentId = generateId();
  const contentRow: RowNode = { id: deriveId(accentId, '_content'), type: 'row', children: content };
  return { id: accentId, type: 'accent', content: [contentRow], accentType };
}

export function createXArrow(
  above: MathNode[],
  below: MathNode[] | undefined,
  direction: XArrowNode['direction']
): MathNode {
  const id = generateId();
  const aboveRow: RowNode = { id: deriveId(id, '_above'), type: 'row', children: above };
  const node: XArrowNode = { id, type: 'xarrow', above: [aboveRow], direction };
  if (below && below.length > 0) {
    const belowRow: RowNode = { id: deriveId(id, '_below'), type: 'row', children: below };
    node.below = [belowRow];
  }
  return node;
}

export function createOverbrace(
  content: MathNode[],
  variant: 'overbrace' | 'underbrace'
): MathNode {
  const id = generateId();
  const contentRow: RowNode = { id: deriveId(id, '_content'), type: 'row', children: content };
  return { id, type: 'overline', variant, content: [contentRow] };
}
