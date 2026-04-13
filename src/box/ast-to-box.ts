/**
 * AST → Box 변환기
 *
 * 수식 AST를 Box 트리로 변환
 */

import type { MathNode } from '../types';
import type { Box, HBox, SurdBox } from './types';
import type { CanvasFontMetrics } from './font-metrics';
import { MathConstants } from './font-metrics';
import {
  createGlyph,
  createGlyphString,
  createHBox,
  createVBox,
  createKern,
  createRule,
  createFraction,
  createPower,
  createSubscript,
  createParenthesized,
  createAbsoluteValue,
  createOperator,
  createIntegralBox,
  createSumBox,
  createLimitBox,
  createProductBox,
  createOverlineBox,
  createUnderlineBox,
  createAccentBox,
  createMatrixBox,
  createTextBox,
  createAlignBox,
  createCasesBox,
  createGatherBox,
  createArrayBox,
  createSurd,
} from './box-builder';

/** AST를 Box로 변환 */
export function astToBox(
  node: MathNode,
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  displayStyle: boolean = true
): Box {
  switch (node.type) {
    case 'root':
    case 'row':
      return convertRow(node, metrics, fontSize, displayStyle);

    case 'number':
      return convertNumber(node, metrics, fontSize);

    case 'variable':
      return convertVariable(node, metrics, fontSize);

    case 'operator':
      return convertOperatorNode(node, metrics, fontSize);

    case 'frac':
      return convertFrac(node, metrics, fontSize, displayStyle);

    case 'power':
      return convertPowerNode(node, metrics, fontSize, displayStyle);

    case 'sqrt':
      return convertSqrt(node, metrics, fontSize, displayStyle);

    case 'paren':
      return convertParen(node, metrics, fontSize, displayStyle);

    case 'subscript':
      return convertSubscriptNode(node, metrics, fontSize, displayStyle);

    case 'abs':
      return convertAbs(node, metrics, fontSize, displayStyle);

    case 'func':
      return convertFunc(node, metrics, fontSize, displayStyle);

    case 'integral':
      return convertIntegral(node, metrics, fontSize, displayStyle);

    case 'sum':
      return convertSum(node, metrics, fontSize, displayStyle);

    case 'limit':
      return convertLimit(node, metrics, fontSize, displayStyle);

    case 'product':
      return convertProduct(node, metrics, fontSize, displayStyle);

    case 'overline':
      return convertOverline(node, metrics, fontSize, displayStyle);

    case 'accent':
      return convertAccent(node, metrics, fontSize, displayStyle);

    case 'matrix':
      return convertMatrix(node, metrics, fontSize, displayStyle);

    case 'text':
      return convertText(node, metrics, fontSize);

    case 'space':
      return convertSpace(node, metrics, fontSize);

    case 'align':
      return convertAlign(node, metrics, fontSize, displayStyle);

    case 'cases':
      return convertCases(node, metrics, fontSize, displayStyle);

    case 'gather':
      return convertGather(node, metrics, fontSize, displayStyle);

    case 'array':
      return convertArray(node, metrics, fontSize, displayStyle);

    default: {
      // TypeScript exhaustive check: 모든 노드 타입이 처리되었는지 컴파일 타임에 검증
      // 새로운 노드 타입이 추가되면 여기서 컴파일 에러 발생
      const exhaustiveCheck: never = node;
      // 런타임 안전성을 위한 폴백 (타입 시스템을 우회하는 경우)
      console.warn(`[ast-to-box] 처리되지 않은 노드 타입: ${(exhaustiveCheck as MathNode).type}`);
      return createHBox([], (exhaustiveCheck as MathNode).id);
    }
  }
}

/** Row/Root 노드 변환 */
function convertRow(
  node: MathNode & { children: MathNode[] },
  metrics: CanvasFontMetrics,
  fontSize: number,
  displayStyle: boolean
): HBox {
  const children = node.children.map(child => astToBox(child, metrics, fontSize, displayStyle));
  return createHBox(children, node.id);
}

/** 숫자 노드 변환 */
function convertNumber(
  node: MathNode & { value: string },
  metrics: CanvasFontMetrics,
  fontSize: number
): HBox {
  return createGlyphString(node.value, metrics, fontSize, false, node.id);
}

/** TeX 표준에 따라 upright로 렌더링하는 문자 (대문자 그리스 + 히브리 + digamma) */
const UPRIGHT_CHARS = new Set('ΓΔΘΛΞΠΣΥΦΨΩϝℶℷℸ');

/** 변수 노드 변환 */
function convertVariable(
  node: MathNode & { name: string },
  metrics: CanvasFontMetrics,
  fontSize: number
): HBox {
  const italic = !UPRIGHT_CHARS.has(node.name);
  return createGlyphString(node.name, metrics, fontSize, italic, node.id);
}

/** 연산자 노드 변환 */
function convertOperatorNode(
  node: MathNode & { operator: string },
  metrics: CanvasFontMetrics,
  fontSize: number
): HBox {
  return createOperator(node.operator, metrics, fontSize, node.id);
}

/** 분수 노드 변환 */
function convertFrac(
  node: MathNode & { numerator: MathNode[]; denominator: MathNode[] },
  metrics: CanvasFontMetrics,
  fontSize: number,
  displayStyle: boolean
): Box {
  // numerator[0]과 denominator[0]이 row 노드
  const numNode = node.numerator[0];
  const denNode = node.denominator[0];

  // inline 모드: 분자/분모를 0.7배 축소
  const childFontSize = displayStyle ? fontSize : fontSize * MathConstants.exponentScale;
  const numeratorBox = astToBox(numNode, metrics, childFontSize, displayStyle);
  const denominatorBox = astToBox(denNode, metrics, childFontSize, displayStyle);

  return createFraction(numeratorBox, denominatorBox, metrics, fontSize, node.id, displayStyle);
}

/** 거듭제곱 노드 변환 */
function convertPowerNode(
  node: MathNode & { base: MathNode[]; exponent: MathNode[] },
  metrics: CanvasFontMetrics,
  fontSize: number,
  displayStyle: boolean
): Box {
  // base 변환
  const baseChildren = node.base.map(child => astToBox(child, metrics, fontSize, displayStyle));
  const baseBox = createHBox(baseChildren);

  // 지수는 작은 크기로 (exponent[0]이 row 노드)
  const expFontSize = fontSize * MathConstants.exponentScale;
  const expNode = node.exponent[0];
  const exponentBox = astToBox(expNode, metrics, expFontSize, displayStyle);

  return createPower(baseBox, exponentBox, metrics, fontSize, node.id);
}

/** 아래첨자 노드 변환 */
function convertSubscriptNode(
  node: MathNode & { base: MathNode[]; subscript: MathNode[] },
  metrics: CanvasFontMetrics,
  fontSize: number,
  displayStyle: boolean
): Box {
  // base 변환
  const baseChildren = node.base.map(child => astToBox(child, metrics, fontSize, displayStyle));
  const baseBox = createHBox(baseChildren);

  // 아래첨자는 작은 크기로 (subscript[0]이 row 노드)
  const subFontSize = fontSize * MathConstants.subscriptScale;
  const subNode = node.subscript[0];
  const subscriptBox = astToBox(subNode, metrics, subFontSize, displayStyle);

  return createSubscript(baseBox, subscriptBox, metrics, fontSize, node.id);
}

/** 절댓값 노드 변환 */
function convertAbs(
  node: MathNode & { content: MathNode[] },
  metrics: CanvasFontMetrics,
  fontSize: number,
  displayStyle: boolean
): Box {
  // content[0]이 row 노드
  const contentNode = node.content[0];
  const contentBox = astToBox(contentNode, metrics, fontSize, displayStyle);

  return createAbsoluteValue(contentBox, metrics, fontSize, node.id);
}

/** 제곱근 노드 변환 */
function convertSqrt(
  node: MathNode & { content: MathNode[]; index?: MathNode[] },
  metrics: CanvasFontMetrics,
  fontSize: number,
  displayStyle: boolean
): SurdBox {
  // content[0]이 row 노드
  const contentNode = node.content[0];
  const contentBox = astToBox(contentNode, metrics, fontSize, displayStyle);

  // SurdBox 생성 (√ 기호와 vinculum을 함께 렌더링)
  return createSurd(contentBox, metrics, fontSize, node.id);
}

/** 괄호 노드 변환 */
function convertParen(
  node: MathNode & { content: MathNode[]; parenType: '(' | '[' | '{'; autoSize?: boolean },
  metrics: CanvasFontMetrics,
  fontSize: number,
  displayStyle: boolean
): Box {
  // content[0]이 row 노드
  const contentNode = node.content[0];
  const contentBox = astToBox(contentNode, metrics, fontSize, displayStyle);

  return createParenthesized(
    contentBox,
    node.parenType || '(',
    metrics,
    fontSize,
    node.id,
    node.autoSize
  );
}

/** 함수 노드 변환 */
function convertFunc(
  node: MathNode & { name: string; argument: MathNode[] },
  metrics: CanvasFontMetrics,
  fontSize: number,
  displayStyle: boolean
): HBox {
  // 함수 이름 (정체, 이탤릭 아님)
  const nameBox = createGlyphString(node.name, metrics, fontSize, false);

  // 인자가 없으면 함수 이름만 반환
  if (node.argument.length === 0) {
    return createHBox([nameBox], node.id);
  }

  // 인자 변환 (paren 노드가 있으면 괄호 포함, 없으면 괄호 없음)
  const argChildren = node.argument.map(child => astToBox(child, metrics, fontSize, displayStyle));
  const argBox = createHBox(argChildren);

  // 함수 이름과 인자 사이에 약간의 간격
  const actualFontSize = metrics.getActualFontSize(fontSize);
  const spacing = createKern(actualFontSize * 0.1);

  return createHBox([nameBox, spacing, argBox], node.id);
}

/** 적분 노드 변환 */
function convertIntegral(
  node: MathNode & { lower?: MathNode[]; upper?: MathNode[]; integrand: MathNode[]; differential: string; integralType?: 'int' | 'iint' | 'iiint' | 'oint' },
  metrics: CanvasFontMetrics,
  fontSize: number,
  displayStyle: boolean
): Box {
  const smallFontSize = fontSize * MathConstants.subscriptScale;

  // 하한/상한 변환 (작은 폰트)
  const lowerNode = node.lower?.[0];
  const upperNode = node.upper?.[0];
  const lowerBox = lowerNode ? astToBox(lowerNode, metrics, smallFontSize, displayStyle) : createHBox([]);
  const upperBox = upperNode ? astToBox(upperNode, metrics, smallFontSize, displayStyle) : createHBox([]);

  // 피적분함수 변환
  const integrandNode = node.integrand[0];
  const integrandBox = astToBox(integrandNode, metrics, fontSize, displayStyle);

  return createIntegralBox(
    lowerBox,
    upperBox,
    integrandBox,
    node.differential,
    metrics,
    fontSize,
    node.id,
    node.integralType || 'int',
    displayStyle
  );
}

/** 시그마/합 노드 변환 */
function convertSum(
  node: MathNode & { lower: MathNode[]; upper: MathNode[]; body: MathNode[]; symbol?: string },
  metrics: CanvasFontMetrics,
  fontSize: number,
  displayStyle: boolean
): Box {
  const smallFontSize = fontSize * MathConstants.subscriptScale;

  // 하한/상한 변환 (작은 폰트)
  const lowerNode = node.lower[0];
  const upperNode = node.upper[0];
  const lowerBox = astToBox(lowerNode, metrics, smallFontSize, displayStyle);
  const upperBox = astToBox(upperNode, metrics, smallFontSize, displayStyle);

  // 본문 변환
  const bodyNode = node.body[0];
  const bodyBox = astToBox(bodyNode, metrics, fontSize, displayStyle);

  return createSumBox(lowerBox, upperBox, bodyBox, metrics, fontSize, node.id, displayStyle, node.symbol);
}

/** 극한 노드 변환 */
function convertLimit(
  node: MathNode & { variable: string; approach: MathNode[]; body: MathNode[] },
  metrics: CanvasFontMetrics,
  fontSize: number,
  displayStyle: boolean
): Box {
  const smallFontSize = fontSize * MathConstants.subscriptScale;

  // 접근값 변환 (작은 폰트)
  const approachNode = node.approach[0];
  const approachBox = astToBox(approachNode, metrics, smallFontSize, displayStyle);

  // 본문 변환
  const bodyNode = node.body[0];
  const bodyBox = astToBox(bodyNode, metrics, fontSize, displayStyle);

  return createLimitBox(node.variable, approachBox, bodyBox, metrics, fontSize, node.id, displayStyle);
}

/** 곱 노드 변환 */
function convertProduct(
  node: MathNode & { lower: MathNode[]; upper: MathNode[]; body: MathNode[] },
  metrics: CanvasFontMetrics,
  fontSize: number,
  displayStyle: boolean
): Box {
  const smallFontSize = fontSize * MathConstants.subscriptScale;

  // 하한/상한 변환 (작은 폰트)
  const lowerNode = node.lower[0];
  const upperNode = node.upper[0];
  const lowerBox = astToBox(lowerNode, metrics, smallFontSize, displayStyle);
  const upperBox = astToBox(upperNode, metrics, smallFontSize, displayStyle);

  // 본문 변환
  const bodyNode = node.body[0];
  const bodyBox = astToBox(bodyNode, metrics, fontSize, displayStyle);

  return createProductBox(lowerBox, upperBox, bodyBox, metrics, fontSize, node.id, displayStyle);
}

/** 윗줄/밑줄 노드 변환 */
function convertOverline(
  node: MathNode & { content: MathNode[]; variant?: 'underline' },
  metrics: CanvasFontMetrics,
  fontSize: number,
  displayStyle: boolean
): Box {
  // content[0]이 row 노드
  const contentNode = node.content[0];
  const contentBox = astToBox(contentNode, metrics, fontSize, displayStyle);

  if (node.variant === 'underline') {
    return createUnderlineBox(contentBox, metrics, fontSize, node.id);
  }
  return createOverlineBox(contentBox, metrics, fontSize, node.id);
}

/** 악센트 노드 변환 */
function convertAccent(
  node: MathNode & { content: MathNode[]; accentType: 'hat' | 'vec' | 'dot' | 'ddot' | 'tilde' | 'bar' | 'breve' | 'check' | 'acute' | 'grave' | 'mathring' },
  metrics: CanvasFontMetrics,
  fontSize: number,
  displayStyle: boolean
): Box {
  // content[0]이 row 노드
  const contentNode = node.content[0];
  const contentBox = astToBox(contentNode, metrics, fontSize, displayStyle);

  return createAccentBox(contentBox, node.accentType, metrics, fontSize, node.id);
}

/** 행렬 노드 변환 */
function convertMatrix(
  node: MathNode & { rows: MathNode[][]; bracketType: '(' | '[' | '{' | '|' | '||' | 'none' },
  metrics: CanvasFontMetrics,
  fontSize: number,
  displayStyle: boolean
): Box {
  // 각 셀을 Box로 변환
  const cellBoxes: Box[][] = node.rows.map(row =>
    row.map(cell => astToBox(cell, metrics, fontSize, displayStyle))
  );

  return createMatrixBox(cellBoxes, node.bracketType, metrics, fontSize, node.id);
}

/** 텍스트 노드 변환 */
function convertText(
  node: MathNode & { content: string },
  metrics: CanvasFontMetrics,
  fontSize: number
): Box {
  return createTextBox(node.content, metrics, fontSize, node.id);
}

/** 수식 공백 노드 변환 */
function convertSpace(
  node: MathNode & { width: number },
  metrics: CanvasFontMetrics,
  fontSize: number
): Box {
  const actualFontSize = metrics.getActualFontSize(fontSize);
  // width는 em 단위이므로 폰트 크기로 변환
  const spaceWidth = actualFontSize * node.width;
  const kern = createKern(spaceWidth);
  // kern에 sourceId 추가
  return { ...kern, sourceId: node.id };
}

/** align 환경 노드 변환 */
function convertAlign(
  node: MathNode & { rows: MathNode[][]; starred: boolean; isInline: boolean },
  metrics: CanvasFontMetrics,
  fontSize: number,
  displayStyle: boolean
): Box {
  // 각 셀을 Box로 변환
  const cellBoxes: Box[][] = node.rows.map(row =>
    row.map(cell => astToBox(cell, metrics, fontSize, displayStyle))
  );

  return createAlignBox(cellBoxes, metrics, fontSize, node.id);
}

/** cases 환경 노드 변환 */
function convertCases(
  node: MathNode & { rows: MathNode[][] },
  metrics: CanvasFontMetrics,
  fontSize: number,
  displayStyle: boolean
): Box {
  // 각 셀을 Box로 변환
  const cellBoxes: Box[][] = node.rows.map(row =>
    row.map(cell => astToBox(cell, metrics, fontSize, displayStyle))
  );

  return createCasesBox(cellBoxes, metrics, fontSize, node.id);
}

/** gather 환경 노드 변환 */
function convertGather(
  node: MathNode & { rows: MathNode[]; starred: boolean; isInline: boolean },
  metrics: CanvasFontMetrics,
  fontSize: number,
  displayStyle: boolean
): Box {
  // 각 행을 Box로 변환
  const rowBoxes: Box[] = node.rows.map(row => astToBox(row, metrics, fontSize, displayStyle));

  return createGatherBox(rowBoxes, metrics, fontSize, node.id);
}

/** array 환경 노드 변환 */
function convertArray(
  node: MathNode & {
    rows: MathNode[][];
    colAlign: ('l' | 'c' | 'r')[];
    colLines: boolean[];
    rowLines: boolean[];
  },
  metrics: CanvasFontMetrics,
  fontSize: number,
  displayStyle: boolean
): Box {
  // 각 셀을 Box로 변환
  const cellBoxes: Box[][] = node.rows.map(row =>
    row.map(cell => astToBox(cell, metrics, fontSize, displayStyle))
  );

  return createArrayBox(
    cellBoxes,
    node.colAlign,
    node.colLines,
    node.rowLines,
    metrics,
    fontSize,
    node.id
  );
}
