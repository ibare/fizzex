/**
 * AST → Box 변환기
 *
 * 수식 AST를 Box 트리로 변환
 */

import type { MathNode } from '../types';
import type { Box, HBox, PathBox, SurdBox } from './types';
import type { CanvasFontMetrics } from './font-metrics';
import { DELIMITER_PATHS } from '../fonts/delimiter-paths';
import { MathConstants } from './font-metrics';
import {
  MathStyle,
  isDisplay,
  superscriptStyle,
  subscriptStyle,
  fracNumeratorStyle,
  fracDenominatorStyle,
  crampedStyle,
  fontSizeForStyle,
} from './math-style';
import {
  createGlyph,
  createGlyphString,
  createHBox,
  createVBox,
  createKern,
  createRule,
  createFraction,
  createBinomBox,
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
  createOversetBox,
  createBoxedBox,
  createCancelBox,
  createOverbraceBox,
  createXArrowBox,
  createSingleDelimiter,
} from './box-builder';

/** AST를 Box로 변환 (외부 API — displayStyle boolean 유지) */
export function astToBox(
  node: MathNode,
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  displayStyle: boolean = true
): Box {
  const style = displayStyle ? MathStyle.Display : MathStyle.Text;
  return astToBoxInternal(node, metrics, fontSize, style);
}

/** 내부 변환 (MathStyle 기반) */
function astToBoxInternal(
  node: MathNode,
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): Box {
  switch (node.type) {
    case 'root':
    case 'row':
      return convertRow(node, metrics, fontSize, style);

    case 'number':
      return convertNumber(node, metrics, fontSize);

    case 'variable':
      return convertVariable(node, metrics, fontSize);

    case 'operator':
      return convertOperatorNode(node, metrics, fontSize);

    case 'frac':
      return convertFrac(node, metrics, fontSize, style);

    case 'power':
      return convertPowerNode(node, metrics, fontSize, style);

    case 'sqrt':
      return convertSqrt(node, metrics, fontSize, style);

    case 'paren':
      return convertParen(node, metrics, fontSize, style);

    case 'subscript':
      return convertSubscriptNode(node, metrics, fontSize, style);

    case 'abs':
      return convertAbs(node, metrics, fontSize, style);

    case 'func':
      return convertFunc(node, metrics, fontSize, style);

    case 'integral':
      return convertIntegral(node, metrics, fontSize, style);

    case 'sum':
      return convertSum(node, metrics, fontSize, style);

    case 'limit':
      return convertLimit(node, metrics, fontSize, style);

    case 'product':
      return convertProduct(node, metrics, fontSize, style);

    case 'overline':
      return convertOverline(node, metrics, fontSize, style);

    case 'accent':
      return convertAccent(node, metrics, fontSize, style);

    case 'matrix':
      return convertMatrix(node, metrics, fontSize, style);

    case 'text':
      return convertText(node, metrics, fontSize);

    case 'space':
      return convertSpace(node, metrics, fontSize);

    case 'align':
      return convertAlign(node, metrics, fontSize, style);

    case 'cases':
      return convertCases(node, metrics, fontSize, style);

    case 'gather':
      return convertGather(node, metrics, fontSize, style);

    case 'array':
      return convertArray(node, metrics, fontSize, style);

    case 'overset':
      return convertOverset(node, metrics, fontSize, style);

    case 'cancel':
      return convertCancel(node, metrics, fontSize, style);

    case 'xarrow':
      return convertXArrow(node, metrics, fontSize, style);

    case 'literal':
    case 'error':
    case 'opaque':
      // 단계 5에서 시각적 피드백 렌더링 구현 예정
      return createHBox([], node.id);

    default: {
      const exhaustiveCheck: never = node;
      console.warn(`[ast-to-box] 처리되지 않은 노드 타입: ${(exhaustiveCheck as MathNode).type}`);
      return createHBox([], (exhaustiveCheck as MathNode).id);
    }
  }
}

/** styleHint → MathStyle 변환 */
function styleHintToMathStyle(hint: 'display' | 'text' | 'script' | 'scriptscript'): MathStyle {
  switch (hint) {
    case 'display': return MathStyle.Display;
    case 'text': return MathStyle.Text;
    case 'script': return MathStyle.Script;
    case 'scriptscript': return MathStyle.ScriptScript;
  }
}

/** Row/Root 노드 변환 */
function convertRow(
  node: MathNode & { children: MathNode[]; styleHint?: 'display' | 'text' | 'script' | 'scriptscript' },
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): HBox {
  // styleHint가 있으면 해당 스타일로 전환 (\displaystyle 등)
  const effectiveStyle = node.styleHint ? styleHintToMathStyle(node.styleHint) : style;
  const effectiveFontSize = node.styleHint ? fontSizeForStyle(fontSize, effectiveStyle) : fontSize;
  const children = node.children.map(child => astToBoxInternal(child, metrics, effectiveFontSize, effectiveStyle));
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

/** TeX 표준에 따라 upright로 렌더링하는 문자 (대문자 그리스 + 히브리 + 수학 기호) */
const UPRIGHT_CHARS = new Set('ΓΔΘΛΞΠΣΥΦΨΩϝℶℷℸ∞∂∇′∅∠∡∖ℵ℘ℜℑ♣♢♡♠△□\u{1D6A4}\u{1D6A5}\uE000');

/** 변수 노드 변환 */
function convertVariable(
  node: MathNode & { name: string },
  metrics: CanvasFontMetrics,
  fontSize: number
): Box {
  // path 기반 글리프 오버라이드 (폰트 cv01 대체 글리프 등)
  const pathEntry = DELIMITER_PATHS[node.name];
  if (pathEntry && !('variants' in pathEntry && pathEntry.variants!.length > 0)) {
    const actualFontSize = metrics.getActualFontSize(fontSize);
    const base = pathEntry.base;
    const width = base.advanceWidth * actualFontSize;
    const height = base.ascent * actualFontSize;
    const depth = base.descent * actualFontSize;
    const pathBox: PathBox = {
      type: 'path', pathChar: node.name, variantIndex: -1,
      targetWidth: width, width, height, depth,
      x: 0, y: 0, sourceId: node.id,
    };
    return pathBox;
  }
  const italic = !UPRIGHT_CHARS.has(node.name);
  return createGlyphString(node.name, metrics, fontSize, italic, node.id);
}

/** 연산자 노드 변환 */
function convertOperatorNode(
  node: MathNode & { operator: string; delimiterSize?: 'big' | 'Big' | 'bigg' | 'Bigg' },
  metrics: CanvasFontMetrics,
  fontSize: number
): HBox {
  // \big( 등 고정 크기 단일 구분자
  if (node.delimiterSize) {
    return createSingleDelimiter(node.operator, node.delimiterSize, metrics, fontSize, node.id);
  }
  return createOperator(node.operator, metrics, fontSize, node.id);
}

/** 분수 노드 변환 */
function convertFrac(
  node: MathNode & { numerator: MathNode[]; denominator: MathNode[]; variant?: 'binom'; styleOverride?: 'display' | 'text' },
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): Box {
  // numerator[0]과 denominator[0]이 row 노드
  const numNode = node.numerator[0];
  const denNode = node.denominator[0];

  // styleOverride가 있으면 스타일 강제 (dfrac → Display, tfrac/cfrac → Text)
  let effectiveStyle = style;
  if (node.styleOverride === 'display') effectiveStyle = MathStyle.Display;
  else if (node.styleOverride === 'text') effectiveStyle = MathStyle.Text;

  // TeX 스타일 전환: D→T, T→S, S→SS (분모는 항상 cramped)
  const numStyle = fracNumeratorStyle(effectiveStyle);
  const denStyle = fracDenominatorStyle(effectiveStyle);
  const numFontSize = fontSizeForStyle(fontSize, numStyle);
  const denFontSize = fontSizeForStyle(fontSize, denStyle);
  const numeratorBox = astToBoxInternal(numNode, metrics, numFontSize, numStyle);
  const denominatorBox = astToBoxInternal(denNode, metrics, denFontSize, denStyle);

  if (node.variant === 'binom') {
    return createBinomBox(numeratorBox, denominatorBox, metrics, fontSize, node.id, effectiveStyle);
  }

  return createFraction(numeratorBox, denominatorBox, metrics, fontSize, node.id, effectiveStyle);
}

/** 거듭제곱 노드 변환 */
function convertPowerNode(
  node: MathNode & { base: MathNode[]; exponent: MathNode[] },
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): Box {
  // overbrace annotation 감지: \overbrace{...}^{n}
  const baseNode = node.base.length === 1 ? node.base[0] : null;
  if (baseNode && baseNode.type === 'overline' && 'variant' in baseNode && baseNode.variant === 'overbrace') {
    const contentBox = convertOverline(baseNode as MathNode & { content: MathNode[]; variant?: 'underline' | 'boxed' | 'overbrace' | 'underbrace' }, metrics, fontSize, style);
    const annotStyle = superscriptStyle(style);
    const annotFontSize = fontSizeForStyle(fontSize, annotStyle);
    const annotBox = astToBoxInternal(node.exponent[0], metrics, annotFontSize, annotStyle);
    // contentBox는 이미 overbrace 렌더링 — annotation 포함 재생성
    const innerContent = (baseNode as MathNode & { content: MathNode[] }).content;
    const innerBox = astToBoxInternal(innerContent[0], metrics, fontSize, style);
    return createOverbraceBox(innerBox, 'overbrace', metrics, fontSize, node.id, annotBox);
  }

  // base 변환
  const baseChildren = node.base.map(child => astToBoxInternal(child, metrics, fontSize, style));
  const baseBox = createHBox(baseChildren);

  // 지수: superscriptStyle로 스타일 전환 (D→S, T→S, S→SS)
  const expStyle = superscriptStyle(style);
  const expFontSize = fontSizeForStyle(fontSize, expStyle);
  const expNode = node.exponent[0];
  const exponentBox = astToBoxInternal(expNode, metrics, expFontSize, expStyle);

  return createPower(baseBox, exponentBox, metrics, fontSize, node.id, style);
}

/** 아래첨자 노드 변환 */
function convertSubscriptNode(
  node: MathNode & { base: MathNode[]; subscript: MathNode[] },
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): Box {
  // underbrace annotation 감지: \underbrace{...}_{n}
  const baseNode = node.base.length === 1 ? node.base[0] : null;
  if (baseNode && baseNode.type === 'overline' && 'variant' in baseNode && baseNode.variant === 'underbrace') {
    const annotStyle = subscriptStyle(style);
    const annotFontSize = fontSizeForStyle(fontSize, annotStyle);
    const annotBox = astToBoxInternal(node.subscript[0], metrics, annotFontSize, annotStyle);
    const innerContent = (baseNode as MathNode & { content: MathNode[] }).content;
    const innerBox = astToBoxInternal(innerContent[0], metrics, fontSize, style);
    return createOverbraceBox(innerBox, 'underbrace', metrics, fontSize, node.id, annotBox);
  }

  // base 변환
  const baseChildren = node.base.map(child => astToBoxInternal(child, metrics, fontSize, style));
  const baseBox = createHBox(baseChildren);

  // 아래첨자: subscriptStyle로 스타일 전환 (항상 cramped: D→S', T→S', S→SS')
  const subStyle = subscriptStyle(style);
  const subFontSize = fontSizeForStyle(fontSize, subStyle);
  const subNode = node.subscript[0];
  const subscriptBox = astToBoxInternal(subNode, metrics, subFontSize, subStyle);

  return createSubscript(baseBox, subscriptBox, metrics, fontSize, node.id);
}

/** 절댓값 노드 변환 */
function convertAbs(
  node: MathNode & { content: MathNode[] },
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): Box {
  // content[0]이 row 노드
  const contentNode = node.content[0];
  const contentBox = astToBoxInternal(contentNode, metrics, fontSize, style);

  return createAbsoluteValue(contentBox, metrics, fontSize, node.id);
}

/** 제곱근 노드 변환 */
function convertSqrt(
  node: MathNode & { content: MathNode[]; index?: MathNode[] },
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): SurdBox {
  // 근호 내부: cramped 스타일 적용 (TeX Rule 11)
  const contentNode = node.content[0];
  const contentBox = astToBoxInternal(contentNode, metrics, fontSize, crampedStyle(style));

  // 인덱스: scriptscript cramped 스타일 (TeX 표준)
  let indexBox: Box | undefined;
  if (node.index && node.index.length > 0) {
    const indexStyle = MathStyle.ScriptScriptCramped;
    const indexFontSize = fontSizeForStyle(fontSize, indexStyle);
    const indexNode = node.index[0];
    indexBox = astToBoxInternal(indexNode, metrics, indexFontSize, indexStyle);
  }

  // SurdBox 생성 (√ 기호와 vinculum을 함께 렌더링)
  return createSurd(contentBox, metrics, fontSize, node.id, indexBox);
}

/** 괄호 노드 변환 */
function convertParen(
  node: MathNode & { content: MathNode[]; parenType: '(' | '[' | '{'; autoSize?: boolean; delimiterSize?: 'big' | 'Big' | 'bigg' | 'Bigg' },
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): Box {
  // content[0]이 row 노드
  const contentNode = node.content[0];
  const contentBox = astToBoxInternal(contentNode, metrics, fontSize, style);

  return createParenthesized(
    contentBox,
    node.parenType || '(',
    metrics,
    fontSize,
    node.id,
    node.autoSize,
    node.delimiterSize
  );
}

/** 함수 노드 변환 */
function convertFunc(
  node: MathNode & { name: string; argument: MathNode[] },
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): HBox {
  // 함수 이름 (정체, 이탤릭 아님)
  const nameBox = createGlyphString(node.name, metrics, fontSize, false);

  // 인자가 없으면 함수 이름만 반환
  if (node.argument.length === 0) {
    return createHBox([nameBox], node.id);
  }

  // 인자 변환 (paren 노드가 있으면 괄호 포함, 없으면 괄호 없음)
  const argChildren = node.argument.map(child => astToBoxInternal(child, metrics, fontSize, style));
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
  style: MathStyle
): Box {
  // 상하한: subscriptStyle로 스타일 전환
  const limStyle = subscriptStyle(style);
  const smallFontSize = fontSizeForStyle(fontSize, limStyle);

  // 하한/상한 변환 (작은 폰트)
  const lowerNode = node.lower?.[0];
  const upperNode = node.upper?.[0];
  const lowerBox = lowerNode ? astToBoxInternal(lowerNode, metrics, smallFontSize, limStyle) : createHBox([]);
  const upperBox = upperNode ? astToBoxInternal(upperNode, metrics, smallFontSize, limStyle) : createHBox([]);

  // 피적분함수 변환
  const integrandNode = node.integrand[0];
  const integrandBox = astToBoxInternal(integrandNode, metrics, fontSize, style);

  return createIntegralBox(
    lowerBox,
    upperBox,
    integrandBox,
    node.differential,
    metrics,
    fontSize,
    node.id,
    node.integralType || 'int',
    style
  );
}

/** 시그마/합 노드 변환 */
function convertSum(
  node: MathNode & { lower: MathNode[]; upper: MathNode[]; body: MathNode[]; symbol?: string },
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): Box {
  // 상하한: subscriptStyle로 스타일 전환
  const limStyle = subscriptStyle(style);
  const smallFontSize = fontSizeForStyle(fontSize, limStyle);

  // 하한/상한 변환 (작은 폰트)
  const lowerNode = node.lower[0];
  const upperNode = node.upper[0];
  const lowerBox = astToBoxInternal(lowerNode, metrics, smallFontSize, limStyle);
  const upperBox = astToBoxInternal(upperNode, metrics, smallFontSize, limStyle);

  // 본문 변환
  const bodyNode = node.body[0];
  const bodyBox = astToBoxInternal(bodyNode, metrics, fontSize, style);

  return createSumBox(lowerBox, upperBox, bodyBox, metrics, fontSize, node.id, style, node.symbol);
}

/** 극한 노드 변환 */
function convertLimit(
  node: MathNode & { variable: string; approach: MathNode[]; body: MathNode[] },
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): Box {
  // 접근값: subscriptStyle로 스타일 전환
  const limStyle = subscriptStyle(style);
  const smallFontSize = fontSizeForStyle(fontSize, limStyle);

  // 접근값 변환 (작은 폰트)
  const approachNode = node.approach[0];
  const approachBox = astToBoxInternal(approachNode, metrics, smallFontSize, limStyle);

  // 본문 변환
  const bodyNode = node.body[0];
  const bodyBox = astToBoxInternal(bodyNode, metrics, fontSize, style);

  return createLimitBox(node.variable, approachBox, bodyBox, metrics, fontSize, node.id, style);
}

/** 곱 노드 변환 */
function convertProduct(
  node: MathNode & { lower: MathNode[]; upper: MathNode[]; body: MathNode[] },
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): Box {
  // 상하한: subscriptStyle로 스타일 전환
  const limStyle = subscriptStyle(style);
  const smallFontSize = fontSizeForStyle(fontSize, limStyle);

  // 하한/상한 변환 (작은 폰트)
  const lowerNode = node.lower[0];
  const upperNode = node.upper[0];
  const lowerBox = astToBoxInternal(lowerNode, metrics, smallFontSize, limStyle);
  const upperBox = astToBoxInternal(upperNode, metrics, smallFontSize, limStyle);

  // 본문 변환
  const bodyNode = node.body[0];
  const bodyBox = astToBoxInternal(bodyNode, metrics, fontSize, style);

  return createProductBox(lowerBox, upperBox, bodyBox, metrics, fontSize, node.id, style);
}

/** 윗줄/밑줄 노드 변환 */
function convertOverline(
  node: MathNode & { content: MathNode[]; variant?: 'underline' | 'boxed' | 'overbrace' | 'underbrace' },
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): Box {
  // content[0]이 row 노드
  const contentNode = node.content[0];
  const contentBox = astToBoxInternal(contentNode, metrics, fontSize, style);

  if (node.variant === 'underline') {
    return createUnderlineBox(contentBox, metrics, fontSize, node.id);
  }
  if (node.variant === 'boxed') {
    return createBoxedBox(contentBox, metrics, fontSize, node.id);
  }
  if (node.variant === 'overbrace' || node.variant === 'underbrace') {
    return createOverbraceBox(contentBox, node.variant, metrics, fontSize, node.id);
  }
  return createOverlineBox(contentBox, metrics, fontSize, node.id);
}

/** 악센트 노드 변환 */
function convertAccent(
  node: MathNode & { content: MathNode[]; accentType: import('../types').AccentNode['accentType'] },
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): Box {
  // content[0]이 row 노드
  const contentNode = node.content[0];
  const contentBox = astToBoxInternal(contentNode, metrics, fontSize, style);

  return createAccentBox(contentBox, node.accentType, metrics, fontSize, node.id);
}

/** 확장 화살표 노드 변환 */
function convertXArrow(
  node: MathNode & { above: MathNode[]; below?: MathNode[]; direction: 'left' | 'right' | 'both' },
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): Box {
  const aboveNode = node.above[0];
  const aboveBox = astToBoxInternal(aboveNode, metrics, fontSize * MathConstants.exponentScale, style);

  let belowBox: Box | undefined;
  if (node.below && node.below.length > 0) {
    const belowNode = node.below[0];
    belowBox = astToBoxInternal(belowNode, metrics, fontSize * MathConstants.exponentScale, style);
  }

  return createXArrowBox(aboveBox, belowBox, node.direction, metrics, fontSize, node.id);
}

/** 행렬 노드 변환 */
function convertMatrix(
  node: MathNode & { rows: MathNode[][]; bracketType: '(' | '[' | '{' | '|' | '‖' | 'none'; small?: boolean },
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): Box {
  // smallmatrix 환경이면 축소 스케일 적용
  const effectiveFontSize = node.small ? fontSize * MathConstants.smallMatrixScale : fontSize;

  // 각 셀을 Box로 변환
  const cellBoxes: Box[][] = node.rows.map(row =>
    row.map(cell => astToBoxInternal(cell, metrics, effectiveFontSize, style))
  );

  return createMatrixBox(cellBoxes, node.bracketType, metrics, effectiveFontSize, node.id);
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
  style: MathStyle
): Box {
  // 각 셀을 Box로 변환
  const cellBoxes: Box[][] = node.rows.map(row =>
    row.map(cell => astToBoxInternal(cell, metrics, fontSize, style))
  );

  return createAlignBox(cellBoxes, metrics, fontSize, node.id);
}

/** cases 환경 노드 변환 */
function convertCases(
  node: MathNode & { rows: MathNode[][] },
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): Box {
  // 각 셀을 Box로 변환
  const cellBoxes: Box[][] = node.rows.map(row =>
    row.map(cell => astToBoxInternal(cell, metrics, fontSize, style))
  );

  return createCasesBox(cellBoxes, metrics, fontSize, node.id);
}

/** gather 환경 노드 변환 */
function convertGather(
  node: MathNode & { rows: MathNode[]; starred: boolean; isInline: boolean },
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): Box {
  // 각 행을 Box로 변환
  const rowBoxes: Box[] = node.rows.map(row => astToBoxInternal(row, metrics, fontSize, style));

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
  style: MathStyle
): Box {
  // 각 셀을 Box로 변환
  const cellBoxes: Box[][] = node.rows.map(row =>
    row.map(cell => astToBoxInternal(cell, metrics, fontSize, style))
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

/** Overset/Underset 노드 변환 */
function convertOverset(
  node: MathNode & { base: MathNode[]; annotation: MathNode[]; position: 'above' | 'below' },
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): Box {
  const baseNode = node.base[0];
  const annoNode = node.annotation[0];

  const baseBox = astToBoxInternal(baseNode, metrics, fontSize, style);
  // annotation은 축소 크기로 렌더링
  const annoFontSize = fontSize * MathConstants.oversetAnnotationScale;
  const annoBox = astToBoxInternal(annoNode, metrics, annoFontSize, style);

  return createOversetBox(baseBox, annoBox, node.position, metrics, fontSize, node.id);
}

/** Cancel 노드 변환 */
function convertCancel(
  node: MathNode & { content: MathNode[]; cancelType: 'cancel' | 'bcancel' | 'xcancel' },
  metrics: CanvasFontMetrics,
  fontSize: number,
  style: MathStyle
): Box {
  const contentNode = node.content[0];
  const contentBox = astToBoxInternal(contentNode, metrics, fontSize, style);
  return createCancelBox(contentBox, node.cancelType, metrics, fontSize, node.id);
}
