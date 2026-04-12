/**
 * Box 생성 헬퍼
 *
 * 다양한 Box를 쉽게 생성하기 위한 빌더 함수들
 */

import type { Box, GlyphBox, HBox, VBox, RuleBox, KernBox, SurdBox, PathBox } from './types';
import type { CanvasFontMetrics } from './font-metrics';
import { MathConstants } from './font-metrics';
import { isComplexNodeSlot } from './constants';
import { DELIMITER_PATHS } from '../fonts/delimiter-paths';

/** Glyph Box 생성 */
export function createGlyph(
  char: string,
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  italic: boolean = false,
  sourceId?: string
): GlyphBox {
  const width = metrics.measureWidth(char, fontSize, italic);
  const height = metrics.getHeight(fontSize);
  const depth = metrics.getDepth(fontSize);

  return {
    type: 'glyph',
    char,
    italic,
    fontSize,
    width,
    height,
    depth,
    x: 0,
    y: 0,
    sourceId,
  };
}

/** 문자열을 Glyph들의 HBox로 변환 */
export function createGlyphString(
  str: string,
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  italic: boolean = false,
  sourceId?: string
): HBox {
  const glyphs = str.split('').map(char =>
    createGlyph(char, metrics, fontSize, italic)
  );
  return createHBox(glyphs, sourceId);
}

/** HBox 생성 (가로 나열) */
export function createHBox(children: Box[], sourceId?: string): HBox {
  if (children.length === 0) {
    // 복합 노드 내부인 경우 최소 너비/높이 부여 (placeholder 표시용)
    const isSlot = isComplexNodeSlot(sourceId);

    const minWidth = isSlot ? 10 : 0;
    const defaultHeight = isSlot ? 15 : 0;
    const defaultDepth = isSlot ? 5 : 0;

    return {
      type: 'hbox',
      children: [],
      width: minWidth,
      height: defaultHeight,
      depth: defaultDepth,
      x: 0,
      y: 0,
      sourceId,
    };
  }

  // 전체 너비 = 자식들의 너비 합
  const width = children.reduce((sum, child) => sum + child.width, 0);

  // height/depth 계산 시 shift 고려
  // shift가 음수면 위로 이동 → height 증가
  // shift가 양수면 아래로 이동 → depth 증가
  let height = 0;
  let depth = 0;
  for (const child of children) {
    const shift = child.shift ?? 0;
    // 자식의 실제 위쪽 범위: baseline 기준 height - shift (shift가 음수면 더 위로)
    const effectiveHeight = child.height - shift;
    // 자식의 실제 아래쪽 범위: baseline 기준 depth + shift (shift가 양수면 더 아래로)
    const effectiveDepth = child.depth + shift;
    height = Math.max(height, effectiveHeight);
    depth = Math.max(depth, effectiveDepth);
  }

  return {
    type: 'hbox',
    children,
    width,
    height,
    depth,
    x: 0,
    y: 0,
    sourceId,
  };
}

/** VBox 생성 (세로 나열) */
export function createVBox(
  children: Box[],
  baselineType: 'top' | 'center' | 'bottom' | number = 'center',
  sourceId?: string
): VBox {
  if (children.length === 0) {
    return {
      type: 'vbox',
      children: [],
      baselineType,
      width: 0,
      height: 0,
      depth: 0,
      x: 0,
      y: 0,
      sourceId,
    };
  }

  // 전체 너비 = 가장 넓은 자식
  const width = Math.max(...children.map(c => c.width));

  // 전체 높이 = 모든 자식의 (height + depth) 합
  const totalHeight = children.reduce((sum, c) => sum + c.height + c.depth, 0);

  // baseline 위치 계산
  let height: number;
  let depth: number;

  if (baselineType === 'center') {
    // 중앙이 baseline
    height = totalHeight / 2;
    depth = totalHeight / 2;
  } else if (baselineType === 'top') {
    // 첫 번째 자식의 baseline
    height = children[0].height;
    depth = totalHeight - height;
  } else if (baselineType === 'bottom') {
    // 마지막 자식의 baseline
    const lastChild = children[children.length - 1];
    depth = lastChild.depth;
    height = totalHeight - depth;
  } else {
    // 특정 인덱스 자식의 baseline
    let aboveHeight = 0;
    for (let i = 0; i < baselineType; i++) {
      aboveHeight += children[i].height + children[i].depth;
    }
    aboveHeight += children[baselineType].height;
    height = aboveHeight;
    depth = totalHeight - height;
  }

  return {
    type: 'vbox',
    children,
    baselineType,
    width,
    height,
    depth,
    x: 0,
    y: 0,
    sourceId,
  };
}

/** Rule Box 생성 (선) */
export function createRule(
  width: number,
  thickness: number,
  sourceId?: string
): RuleBox {
  return {
    type: 'rule',
    width,
    height: thickness / 2,
    depth: thickness / 2,
    thickness,
    x: 0,
    y: 0,
    sourceId,
  };
}

/** 세로선 Rule Box 생성 */
export function createVerticalRule(
  lineThickness: number,
  height: number,
  depth: number,
  sourceId?: string
): RuleBox {
  return {
    type: 'rule',
    width: lineThickness,
    height,
    depth,
    thickness: height + depth,
    x: 0,
    y: 0,
    sourceId,
  };
}

/** Kern Box 생성 (간격) */
export function createKern(width: number): KernBox {
  return {
    type: 'kern',
    width,
    height: 0,
    depth: 0,
    x: 0,
    y: 0,
  };
}

/** 분수 Box 생성 */
export function createFraction(
  numerator: Box,
  denominator: Box,
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  sourceId?: string,
  displayStyle: boolean = true
): VBox {
  const actualFontSize = metrics.getActualFontSize(fontSize);
  const ruleThickness = actualFontSize * MathConstants.fractionRuleThickness;
  // inline 모드: gap을 60%로 축소
  const gap = actualFontSize * MathConstants.fractionGap * (displayStyle ? 1 : 0.6);

  // 분자와 분모 중 더 넓은 것 기준으로 분수선 너비 결정
  const ruleWidth = Math.max(numerator.width, denominator.width) + gap * 2;

  // 분자를 HBox로 감싸서 중앙 정렬 가능하게
  const numBox = createHBox([
    createKern((ruleWidth - numerator.width) / 2),
    numerator,
    createKern((ruleWidth - numerator.width) / 2),
  ]);

  // 분자 아래 간격 (분자와 분수선 사이)
  const numGapKern = createKern(0);
  numGapKern.height = gap;
  numGapKern.depth = 0;

  // 분수선
  const rule = createRule(ruleWidth, ruleThickness);

  // 분모 위 간격 (분수선과 분모 사이)
  const denGapKern = createKern(0);
  denGapKern.height = 0;
  denGapKern.depth = gap;

  // 분모를 HBox로 감싸서 중앙 정렬
  const denBox = createHBox([
    createKern((ruleWidth - denominator.width) / 2),
    denominator,
    createKern((ruleWidth - denominator.width) / 2),
  ]);

  // VBox로 조합: 분자 - 간격 - 분수선 - 간격 - 분모
  // baselineType을 2로 설정하여 분수선이 baseline이 되도록
  const vbox = createVBox([numBox, numGapKern, rule, denGapKern, denBox], 2, sourceId);

  // 분수선을 x-height 중앙으로 올리기 위해 shift 적용
  // 수학에서 분수선은 보통 baseline 위 약 0.25em에 위치
  const axisHeight = actualFontSize * 0.25;
  vbox.shift = -axisHeight;

  return vbox;
}

/** 거듭제곱 Box 생성 */
export function createPower(
  base: Box,
  exponent: Box,
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  sourceId?: string
): HBox {
  const actualFontSize = metrics.getActualFontSize(fontSize);
  const baseShift = actualFontSize * MathConstants.exponentShift;

  // base 높이가 기본보다 큰 경우 (예: autoSize 괄호, 분수 등) 추가 shift
  // 지수가 base의 오른쪽 위 모서리에 위치하도록 조정
  const baseDefaultHeight = metrics.getHeight(fontSize);
  const extraHeight = Math.max(0, base.height - baseDefaultHeight);
  const shift = baseShift + extraHeight * 0.6;  // base 높이 차이의 60%만큼 추가

  // 지수를 위로 이동 (shift를 음수로 설정하여 baseline을 위로)
  const shiftedExponent: Box = {
    ...exponent,
    shift: -shift,  // 음수 = 위로 이동
  };

  // HBox의 전체 height는 base와 shifted exponent를 고려
  const hbox = createHBox([base, shiftedExponent], sourceId);
  // 지수가 위로 올라간 만큼 전체 height 조정
  hbox.height = Math.max(hbox.height, exponent.height + shift);

  return hbox;
}

/** 경로 데이터로 최적 크기 변형 인덱스 선택 */
function selectPathVariant(pathChar: string, targetHeightEm: number): { variantIndex: number; pathWidth: number; pathHeight: number } {
  const entry = DELIMITER_PATHS[pathChar];
  if (!entry) return { variantIndex: -1, pathWidth: 0, pathHeight: 0 };

  // base 글리프 확인
  const baseHeight = entry.base.ascent + entry.base.descent;
  if (targetHeightEm <= baseHeight) {
    return { variantIndex: -1, pathWidth: entry.base.advanceWidth, pathHeight: baseHeight };
  }

  // 크기 변형에서 적절한 것 선택 (targetHeight 이상인 최소 변형)
  if (entry.variants) {
    for (let i = 0; i < entry.variants.length; i++) {
      const v = entry.variants[i];
      const vHeight = v.ascent + v.descent;
      if (vHeight >= targetHeightEm) {
        return { variantIndex: i, pathWidth: v.advanceWidth, pathHeight: vHeight };
      }
    }
    // 모든 변형보다 크면 마지막 변형 사용
    const last = entry.variants[entry.variants.length - 1];
    return {
      variantIndex: entry.variants.length - 1,
      pathWidth: last.advanceWidth,
      pathHeight: last.ascent + last.descent,
    };
  }

  return { variantIndex: -1, pathWidth: entry.base.advanceWidth, pathHeight: baseHeight };
}

/** PathBox 생성 */
function createPathBox(
  pathChar: string,
  variantIndex: number,
  targetWidth: number,
  height: number,
  depth: number,
): PathBox {
  return {
    type: 'path',
    pathChar,
    variantIndex,
    targetWidth,
    width: targetWidth,
    height,
    depth,
    x: 0,
    y: 0,
  };
}

/** 괄호로 감싼 Box 생성 */
export function createParenthesized(
  content: Box,
  parenType: '(' | '[' | '{',
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  sourceId?: string,
  autoSize: boolean = false
): HBox {
  const actualFontSize = metrics.getActualFontSize(fontSize);

  // 빈 content일 때 기본 높이 사용
  const contentHeight = content.height > 0 ? content.height : metrics.getHeight(fontSize);
  const contentDepth = content.depth > 0 ? content.depth : metrics.getDepth(fontSize);
  const totalHeight = contentHeight + contentDepth;

  // autoSize일 때 괄호 높이에 약간의 여유 공간 (내용물보다 살짝 크게)
  const verticalPadding = autoSize ? actualFontSize * 0.06 : 0;
  const parenHeight = contentHeight + verticalPadding;
  const parenDepth = contentDepth + verticalPadding;

  // 대응하는 닫는 괄호
  const closeParen = parenType === '(' ? ')' : parenType === '[' ? ']' : '}';

  // 경로 데이터 기반 렌더링 시도 (현재 ( ) 만 지원)
  const openPathEntry = DELIMITER_PATHS[parenType];
  const closePathEntry = DELIMITER_PATHS[closeParen];

  if (openPathEntry && closePathEntry) {
    // 정규화 높이 (em 단위 → 경로 데이터의 정규화 좌표 단위)
    const targetHeightNorm = (parenHeight + parenDepth) / actualFontSize;

    const openVariant = selectPathVariant(parenType, targetHeightNorm);
    const closeVariant = selectPathVariant(closeParen, targetHeightNorm);

    // 경로의 자연 폭을 실제 px로 변환
    const openWidth = openVariant.pathWidth * actualFontSize;
    const closeWidth = closeVariant.pathWidth * actualFontSize;

    const openBox = createPathBox(parenType, openVariant.variantIndex, openWidth, parenHeight, parenDepth);
    const closeBox = createPathBox(closeParen, closeVariant.variantIndex, closeWidth, parenHeight, parenDepth);

    const innerPadding = createKern(actualFontSize * MathConstants.parenPadding);
    const minWidthKern = content.width > 0 ? content : createKern(actualFontSize * 0.3);

    return createHBox([openBox, innerPadding, minWidthKern, innerPadding, closeBox], sourceId);
  }

  // 폴백: 기존 GlyphBox 방식 (경로 데이터가 없는 괄호)
  const heightEm = totalHeight / actualFontSize;
  const effectiveHeightEm = (parenHeight + parenDepth) / actualFontSize;

  const openGlyphInfo = metrics.getDelimiterGlyph(parenType, true, effectiveHeightEm);
  const closeGlyphInfo = metrics.getDelimiterGlyph(parenType, false, effectiveHeightEm);

  let glyphScale: number;
  if (autoSize) {
    glyphScale = Math.min(3.0, Math.max(1.0, heightEm * 1.05));
  } else {
    glyphScale = Math.min(1.2, Math.max(1.0, heightEm));
  }

  let openGlyph: GlyphBox;
  let closeGlyph: GlyphBox;

  if (openGlyphInfo.type === 'single' && closeGlyphInfo.type === 'single') {
    openGlyph = createGlyph(openGlyphInfo.char, metrics, fontSize * glyphScale, false);
    closeGlyph = createGlyph(closeGlyphInfo.char, metrics, fontSize * glyphScale, false);
  } else {
    const openChar = openGlyphInfo.type === 'single' ? openGlyphInfo.char : parenType;
    const closeChar = closeGlyphInfo.type === 'single' ? closeGlyphInfo.char : closeParen;
    openGlyph = createGlyph(openChar, metrics, fontSize * glyphScale, false);
    closeGlyph = createGlyph(closeChar, metrics, fontSize * glyphScale, false);
  }

  openGlyph.height = parenHeight;
  openGlyph.depth = parenDepth;
  closeGlyph.height = parenHeight;
  closeGlyph.depth = parenDepth;

  const innerPadding = createKern(actualFontSize * MathConstants.parenPadding);
  const minWidthKern = content.width > 0 ? content : createKern(actualFontSize * 0.3);

  return createHBox([openGlyph, innerPadding, minWidthKern, innerPadding, closeGlyph], sourceId);
}

/**
 * 연산자 문자 매핑
 * 일반 ASCII 문자를 수학용 유니코드 문자로 변환
 */
const OPERATOR_CHAR_MAP: Record<string, string> = {
  '-': '\u2212', // MINUS SIGN (하이픈보다 길고 수학 표기에 적합)
  '*': '\u00D7', // MULTIPLICATION SIGN
};

/** 후위 연산자 (좌우 간격 없음) */
const POSTFIX_OPERATORS = new Set(['!']);

/** 연산자 Box 생성 (좌우 간격 포함, 후위 연산자는 간격 없음) */
export function createOperator(
  op: string,
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  sourceId?: string
): HBox {
  // 연산자 문자 변환 (예: '-' → '−')
  const mappedOp = OPERATOR_CHAR_MAP[op] ?? op;
  const glyph = createGlyph(mappedOp, metrics, fontSize, false, sourceId);

  // 후위 연산자 (팩토리얼 등)는 간격 없이 렌더링
  if (POSTFIX_OPERATORS.has(op)) {
    return createHBox([glyph]);
  }

  const spacing = metrics.getActualFontSize(fontSize) * MathConstants.operatorSpacing;
  return createHBox([
    createKern(spacing),
    glyph,
    createKern(spacing),
  ]);
}

/** 아래첨자 Box 생성 */
export function createSubscript(
  base: Box,
  subscript: Box,
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  sourceId?: string
): HBox {
  const actualFontSize = metrics.getActualFontSize(fontSize);
  const shift = actualFontSize * MathConstants.subscriptShift;

  // 아래첨자를 아래로 이동 (shift를 양수로 설정하여 baseline을 아래로)
  const shiftedSubscript: Box = {
    ...subscript,
    shift: shift,  // 양수 = 아래로 이동
  };

  // HBox의 전체 depth는 base와 shifted subscript를 고려
  const hbox = createHBox([base, shiftedSubscript], sourceId);
  // 아래첨자가 아래로 내려간 만큼 전체 depth 조정
  hbox.depth = Math.max(hbox.depth, subscript.depth + shift);

  return hbox;
}

/** 절댓값 Box 생성 */
export function createAbsoluteValue(
  content: Box,
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  sourceId?: string
): HBox {
  const actualFontSize = metrics.getActualFontSize(fontSize);

  // 빈 content일 때 기본 높이 사용
  const contentHeight = content.height > 0 ? content.height : metrics.getHeight(fontSize);
  const contentDepth = content.depth > 0 ? content.depth : metrics.getDepth(fontSize);
  const totalHeight = contentHeight + contentDepth;

  // 절댓값 막대 크기 계산 (최소 1.0)
  const barScale = Math.max(1.0, totalHeight / actualFontSize);
  const barFontSize = fontSize * barScale;

  const openBar = createGlyph('|', metrics, barFontSize, false);
  const closeBar = createGlyph('|', metrics, barFontSize, false);

  // 막대의 높이를 내용에 맞춤
  openBar.height = contentHeight;
  openBar.depth = contentDepth;
  closeBar.height = contentHeight;
  closeBar.depth = contentDepth;

  // 절댓값은 내부 패딩 없음 (중첩 시 기호가 붙어야 함)
  // 빈 content일 때 최소 너비 확보
  const minWidthKern = content.width > 0 ? content : createKern(actualFontSize * 0.3);

  return createHBox([openBar, minWidthKern, closeBar], sourceId);
}

/** 적분 Box 생성 */
export function createIntegralBox(
  lower: Box,
  upper: Box,
  integrand: Box,
  differential: string,
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  sourceId?: string,
  integralType: 'int' | 'iint' | 'iiint' | 'oint' = 'int',
  displayStyle: boolean = true
): HBox {
  const actualFontSize = metrics.getActualFontSize(fontSize);

  // 적분 기호 선택
  const integralSymbols: Record<string, string> = {
    'int': '∫',
    'iint': '∬',
    'iiint': '∭',
    'oint': '∮',
  };
  const integralChar = integralSymbols[integralType] || '∫';

  // display: 2.5배, inline: 1.4배
  const integralScale = displayStyle ? 2.5 : 1.4;
  const integralGlyph = createGlyph(integralChar, metrics, fontSize * integralScale, true);

  // 적분 기호의 높이/깊이 조정
  const heightFactor = displayStyle ? 1.8 : 1.0;
  const depthFactor = displayStyle ? 0.8 : 0.4;
  integralGlyph.height = actualFontSize * heightFactor;
  integralGlyph.depth = actualFontSize * depthFactor;

  // 상하한이 있는 경우에만 처리
  const hasLimits = lower.width > 0 || upper.width > 0;

  let integralWithLimits: HBox;

  if (hasLimits) {
    // 상한 (적분 기호 위쪽에) - baseline에서 위로 이동
    const shiftedUpper: Box = {
      ...upper,
      shift: -(integralGlyph.height - upper.height * 0.5),
    };

    // 하한 (적분 기호 아래쪽에) - baseline에서 아래로 이동
    const shiftedLower: Box = {
      ...lower,
      shift: integralGlyph.depth - lower.depth * 0.5,
    };

    // 상하한을 겹쳐서 배치
    const limitsWidth = Math.max(upper.width, lower.width);
    const limitsBox = createHBox([
      shiftedUpper,
      createKern(-upper.width),
      shiftedLower,
    ]);
    limitsBox.width = limitsWidth;

    integralWithLimits = createHBox([
      integralGlyph,
      createKern(actualFontSize * 0.05),
      limitsBox,
    ]);

    // 전체 높이/깊이 조정
    integralWithLimits.height = Math.max(
      integralGlyph.height,
      -shiftedUpper.shift! + upper.height
    );
    integralWithLimits.depth = Math.max(
      integralGlyph.depth,
      shiftedLower.shift! + lower.depth
    );
  } else {
    integralWithLimits = createHBox([integralGlyph]);
    integralWithLimits.height = integralGlyph.height;
    integralWithLimits.depth = integralGlyph.depth;
  }

  // 결과 Box 구성
  const children: Box[] = [integralWithLimits];

  // 간격
  const smallKern = createKern(actualFontSize * 0.15);
  children.push(smallKern);

  // 피적분함수
  if (integrand.width > 0) {
    children.push(integrand);
  }

  // differential (dx, dy 등) - differential이 있는 경우에만
  if (differential) {
    const thinKern = createKern(actualFontSize * 0.08);
    const dGlyph = createGlyph('d', metrics, fontSize, false);
    const varGlyph = createGlyph(differential, metrics, fontSize, true);
    const diffBox = createHBox([dGlyph, varGlyph]);
    children.push(thinKern, diffBox);
  }

  const result = createHBox(children, sourceId);

  // 전체 높이/깊이 조정
  result.height = Math.max(result.height, integralWithLimits.height);
  result.depth = Math.max(result.depth, integralWithLimits.depth);

  return result;
}

/** 시그마/합 Box 생성 */
export function createSumBox(
  lower: Box,
  upper: Box,
  body: Box,
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  sourceId?: string,
  displayStyle: boolean = true
): HBox {
  const actualFontSize = metrics.getActualFontSize(fontSize);

  if (!displayStyle) {
    // Inline style: 작은 Σ + sideset (위첨자/아래첨자)
    const sigmaScale = 1.3;
    const sigmaGlyph = createGlyph('Σ', metrics, fontSize * sigmaScale, false);

    // 상한은 위첨자, 하한은 아래첨자로 배치
    const shiftedUpper: Box = { ...upper, shift: -(sigmaGlyph.height * 0.6) };
    const shiftedLower: Box = { ...lower, shift: sigmaGlyph.depth + lower.height * 0.3 };

    const limitsWidth = Math.max(upper.width, lower.width);
    const limitsBox = createHBox([shiftedUpper, createKern(-upper.width), shiftedLower]);
    limitsBox.width = limitsWidth;

    const kern = createKern(actualFontSize * 0.1);
    const result = createHBox([sigmaGlyph, limitsBox, kern, body], sourceId);
    result.height = Math.max(result.height, sigmaGlyph.height, -(shiftedUpper.shift ?? 0) + upper.height);
    result.depth = Math.max(result.depth, sigmaGlyph.depth, (shiftedLower.shift ?? 0) + lower.depth);
    return result;
  }

  // Display style: 큰 시그마 기호 (Σ)
  const sigmaScale = 2.0;
  const sigmaGlyph = createGlyph('Σ', metrics, fontSize * sigmaScale, false);

  // 상하한 간격
  const limitGap = actualFontSize * 0.15;

  // 시그마, 상한, 하한의 너비 계산하여 중앙 정렬용
  const maxWidth = Math.max(sigmaGlyph.width, lower.width, upper.width);

  // 상한 (시그마 위에 중앙 정렬)
  const upperPadding = (maxWidth - upper.width) / 2;
  const upperWithPadding = createHBox([createKern(upperPadding), upper]);

  // 하한 (시그마 아래에 중앙 정렬)
  const lowerPadding = (maxWidth - lower.width) / 2;
  const lowerWithPadding = createHBox([createKern(lowerPadding), lower]);

  // 시그마 (중앙 정렬)
  const sigmaPadding = (maxWidth - sigmaGlyph.width) / 2;
  const sigmaWithPadding = createHBox([createKern(sigmaPadding), sigmaGlyph]);

  // VBox로 위에서 아래로 배치: 상한 → 시그마 → 하한
  const sigmaWithLimits = createVBox([
    upperWithPadding,
    createKern(limitGap),  // 상한과 시그마 사이 간격
    sigmaWithPadding,
    createKern(limitGap),  // 시그마와 하한 사이 간격
    lowerWithPadding,
  ], 2); // 시그마 (인덱스 2)를 baseline으로

  // 간격
  const kern = createKern(actualFontSize * 0.2);

  const result = createHBox([sigmaWithLimits, kern, body], sourceId);

  return result;
}

/** 극한 Box 생성 */
export function createLimitBox(
  variable: string,
  approach: Box,
  body: Box,
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  sourceId?: string,
  displayStyle: boolean = true
): HBox {
  const actualFontSize = metrics.getActualFontSize(fontSize);
  const smallFontSize = fontSize * MathConstants.subscriptScale;

  // "lim" 텍스트
  const limGlyph = createGlyphString('lim', metrics, fontSize, false);

  // 변수 → 접근값
  const varGlyph = createGlyph(variable, metrics, smallFontSize, true);
  const arrowGlyph = createGlyph('→', metrics, smallFontSize, false);
  const limitInfo = createHBox([varGlyph, arrowGlyph, approach]);

  if (!displayStyle) {
    // Inline style: "lim" + 아래첨자
    const shiftedInfo: Box = {
      ...limitInfo,
      shift: limGlyph.depth + limitInfo.height * 0.3,
    };

    const kern = createKern(actualFontSize * 0.15);
    const result = createHBox([limGlyph, shiftedInfo, kern, body], sourceId);
    result.depth = Math.max(result.depth, (shiftedInfo.shift ?? 0) + limitInfo.depth);
    return result;
  }

  // Display style: VBox (lim 위, x→0 아래)
  const maxWidth = Math.max(limGlyph.width, limitInfo.width);

  // lim을 중앙 정렬
  const limPadLeft = (maxWidth - limGlyph.width) / 2;
  const limRow = createHBox([createKern(limPadLeft), limGlyph]);
  limRow.width = maxWidth;

  // limitInfo를 중앙 정렬
  const infoPadLeft = (maxWidth - limitInfo.width) / 2;
  const infoRow = createHBox([createKern(infoPadLeft), limitInfo]);
  infoRow.width = maxWidth;

  // 간격
  const gap = createKern(0);
  gap.height = actualFontSize * 0.1;
  gap.depth = 0;

  // VBox로 조합: lim 위, x→0 아래 (baseline은 lim 기준)
  const limWithInfo = createVBox([limRow, gap, infoRow], 'top');

  // 간격
  const kern = createKern(actualFontSize * 0.2);

  const result = createHBox([limWithInfo, kern, body], sourceId);

  return result;
}

/** 곱(∏) Box 생성 */
export function createProductBox(
  lower: Box,
  upper: Box,
  body: Box,
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  sourceId?: string,
  displayStyle: boolean = true
): HBox {
  const actualFontSize = metrics.getActualFontSize(fontSize);

  if (!displayStyle) {
    // Inline style: 작은 ∏ + sideset (위첨자/아래첨자)
    const productScale = 1.3;
    const productGlyph = createGlyph('∏', metrics, fontSize * productScale, false);

    const shiftedUpper: Box = { ...upper, shift: -(productGlyph.height * 0.6) };
    const shiftedLower: Box = { ...lower, shift: productGlyph.depth + lower.height * 0.3 };

    const limitsWidth = Math.max(upper.width, lower.width);
    const limitsBox = createHBox([shiftedUpper, createKern(-upper.width), shiftedLower]);
    limitsBox.width = limitsWidth;

    const kern = createKern(actualFontSize * 0.1);
    const result = createHBox([productGlyph, limitsBox, kern, body], sourceId);
    result.height = Math.max(result.height, productGlyph.height, -(shiftedUpper.shift ?? 0) + upper.height);
    result.depth = Math.max(result.depth, productGlyph.depth, (shiftedLower.shift ?? 0) + lower.depth);
    return result;
  }

  // Display style: 큰 곱 기호 (∏)
  const productScale = 2.0;
  const productGlyph = createGlyph('∏', metrics, fontSize * productScale, false);

  // 상하한 간격
  const limitGap = actualFontSize * 0.15;

  // 곱 기호, 상한, 하한의 너비 계산하여 중앙 정렬용
  const maxWidth = Math.max(productGlyph.width, lower.width, upper.width);

  // 상한 (곱 기호 위에 중앙 정렬)
  const upperPadding = (maxWidth - upper.width) / 2;
  const upperWithPadding = createHBox([createKern(upperPadding), upper]);

  // 하한 (곱 기호 아래에 중앙 정렬)
  const lowerPadding = (maxWidth - lower.width) / 2;
  const lowerWithPadding = createHBox([createKern(lowerPadding), lower]);

  // 곱 기호 (중앙 정렬)
  const productPadding = (maxWidth - productGlyph.width) / 2;
  const productWithPadding = createHBox([createKern(productPadding), productGlyph]);

  // VBox로 위에서 아래로 배치: 상한 → 곱기호 → 하한
  const productWithLimits = createVBox([
    upperWithPadding,
    createKern(limitGap),  // 상한과 곱기호 사이 간격
    productWithPadding,
    createKern(limitGap),  // 곱기호와 하한 사이 간격
    lowerWithPadding,
  ], 2); // 곱기호 (인덱스 2)를 baseline으로

  // 간격
  const kern = createKern(actualFontSize * 0.2);

  const result = createHBox([productWithLimits, kern, body], sourceId);

  return result;
}

/** 윗줄(Overline) Box 생성 */
export function createOverlineBox(
  content: Box,
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  sourceId?: string
): VBox {
  const actualFontSize = metrics.getActualFontSize(fontSize);
  const ruleThickness = actualFontSize * MathConstants.fractionRuleThickness;
  const gap = actualFontSize * 0.05; // 윗줄과 내용 사이 간격

  // 윗줄
  const rule = createRule(content.width + gap * 2, ruleThickness);

  // 간격
  const kern = createKern(0);
  kern.height = gap;
  kern.depth = 0;

  // 내용을 HBox로 감싸서 간격 추가
  const contentBox = createHBox([
    createKern(gap),
    content,
    createKern(gap),
  ]);

  // VBox로 조합: 윗줄 - 간격 - 내용
  // baselineType을 2로 설정하여 내용의 baseline을 사용
  const vbox = createVBox([rule, kern, contentBox], 2, sourceId);

  return vbox;
}

/**
 * 악센트 Box 생성 (hat, vec, dot, ddot, tilde 등)
 * 악센트를 내용 바로 위에 오버레이 방식으로 배치
 */
export function createAccentBox(
  content: Box,
  accentType: 'hat' | 'vec' | 'dot' | 'ddot' | 'tilde' | 'bar' | 'breve' | 'check',
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  sourceId?: string
): HBox {
  const actualFontSize = metrics.getActualFontSize(fontSize);

  // 악센트별 문자와 크기, 추가 간격 설정
  const accentConfig: Record<string, { char: string; scale: number; extraGap: number }> = {
    'hat': { char: 'ˆ', scale: 0.8, extraGap: 0.2 },
    'vec': { char: '→', scale: 0.6, extraGap: 0.3 },
    'dot': { char: '•', scale: 0.35, extraGap: 0.15 },
    'ddot': { char: '¨', scale: 0.8, extraGap: 0.2 },
    'tilde': { char: '˜', scale: 0.8, extraGap: 0.2 },
    'bar': { char: '¯', scale: 0.9, extraGap: 0.15 },
    'breve': { char: '˘', scale: 0.8, extraGap: 0.2 },
    'check': { char: 'ˇ', scale: 0.8, extraGap: 0.2 },
  };

  const config = accentConfig[accentType] || { char: 'ˆ', scale: 0.8, extraGap: 0 };

  // 악센트 글리프 생성
  const accentGlyph = createGlyph(config.char, metrics, fontSize * config.scale, false);

  // 악센트의 shift: 악센트 글리프의 높이를 빼서 실제 기호가 글자 바로 위에 오도록 함
  // 악센트 글리프의 바닥이 글자 상단에 붙도록 배치
  const smallGap = actualFontSize * (0.02 + config.extraGap);
  const accentShift = -(content.height - accentGlyph.height + smallGap);

  // 악센트를 내용 중앙에 배치
  const accentOffset = (content.width - accentGlyph.width) / 2;

  // 악센트에 shift 적용
  const shiftedAccent: Box = {
    ...accentGlyph,
    shift: accentShift,
  };

  // 악센트를 HBox로 감싸서 중앙 정렬 후 음수 너비로 오버레이
  const accentBox = createHBox([
    createKern(accentOffset > 0 ? accentOffset : 0),
    shiftedAccent,
  ]);

  // 악센트 박스의 너비를 0으로 만들어서 내용과 겹치게 함
  const overlayAccent = createHBox([accentBox, createKern(-accentBox.width)]);

  // 결과: 악센트(오버레이) + 내용
  const result = createHBox([overlayAccent, content], sourceId);

  // 높이를 악센트까지 포함하도록 조정
  result.height = Math.max(content.height, content.height - accentShift + accentGlyph.height);

  return result;
}

/** 행렬(Matrix) Box 생성 */
export function createMatrixBox(
  cells: Box[][],
  bracketType: '(' | '[' | '{' | '|' | '||' | 'none',
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  sourceId?: string
): HBox {
  const actualFontSize = metrics.getActualFontSize(fontSize);
  const cellPadding = actualFontSize * 0.2;
  const rowGap = actualFontSize * 0.15;

  if (cells.length === 0 || cells[0].length === 0) {
    return createHBox([], sourceId);
  }

  const numRows = cells.length;
  const numCols = cells[0].length;

  // 각 열의 최대 너비 계산
  const colWidths: number[] = [];
  for (let j = 0; j < numCols; j++) {
    let maxWidth = 0;
    for (let i = 0; i < numRows; i++) {
      if (cells[i][j]) {
        maxWidth = Math.max(maxWidth, cells[i][j].width);
      }
    }
    colWidths.push(maxWidth);
  }

  // 각 행을 HBox로 생성
  const rowBoxes: Box[] = [];
  for (let i = 0; i < numRows; i++) {
    const rowChildren: Box[] = [];
    for (let j = 0; j < numCols; j++) {
      const cell = cells[i][j] || createHBox([]);
      const cellWidth = colWidths[j];

      // 셀을 중앙 정렬하기 위한 패딩
      const leftPad = (cellWidth - cell.width) / 2 + cellPadding;
      const rightPad = (cellWidth - cell.width) / 2 + cellPadding;

      rowChildren.push(createKern(leftPad));
      rowChildren.push(cell);
      rowChildren.push(createKern(rightPad));
    }
    rowBoxes.push(createHBox(rowChildren));
  }

  // 행들을 VBox로 조합 (중앙 baseline)
  const matrixContent = createVBox(rowBoxes, 'center');

  // 괄호 추가
  if (bracketType === 'none') {
    const result = createHBox([matrixContent], sourceId);
    return result;
  }

  const contentHeight = matrixContent.height;
  const contentDepth = matrixContent.depth;
  const totalHeight = contentHeight + contentDepth;

  // 괄호 크기 계산
  const parenScale = Math.max(1.0, totalHeight / actualFontSize);
  const parenFontSize = fontSize * parenScale;

  let openParen: string;
  let closeParen: string;

  if (bracketType === '||') {
    // Vmatrix: 이중 세로줄
    const bar1Open = createGlyph('|', metrics, parenFontSize, false);
    const bar2Open = createGlyph('|', metrics, parenFontSize, false);
    const bar1Close = createGlyph('|', metrics, parenFontSize, false);
    const bar2Close = createGlyph('|', metrics, parenFontSize, false);

    // 원래 높이/깊이 저장 (shift 계산용)
    const origHeight = bar1Open.height;
    const origDepth = bar1Open.depth;

    // 높이 맞춤
    bar1Open.height = bar2Open.height = bar1Close.height = bar2Close.height = contentHeight;
    bar1Open.depth = bar2Open.depth = bar1Close.depth = bar2Close.depth = contentDepth;

    // 세로줄 중앙 정렬을 위한 shift 계산
    const scaleY = totalHeight / (origHeight + origDepth);
    const barCenterOffset = (origHeight * scaleY - origDepth * scaleY) / 2;

    const shiftedBar1Open: Box = { ...bar1Open, shift: barCenterOffset };
    const shiftedBar2Open: Box = { ...bar2Open, shift: barCenterOffset };
    const shiftedBar1Close: Box = { ...bar1Close, shift: barCenterOffset };
    const shiftedBar2Close: Box = { ...bar2Close, shift: barCenterOffset };

    const barGap = createKern(actualFontSize * 0.08); // 세로줄 간격
    const padding = createKern(actualFontSize * MathConstants.parenPadding);

    return createHBox([
      shiftedBar1Open, barGap, shiftedBar2Open, padding,
      matrixContent,
      padding, shiftedBar1Close, barGap, shiftedBar2Close
    ], sourceId);
  } else if (bracketType === '|') {
    openParen = '|';
    closeParen = '|';
  } else {
    openParen = bracketType;
    closeParen = bracketType === '(' ? ')' : bracketType === '[' ? ']' : '}';
  }

  const padding = createKern(actualFontSize * MathConstants.parenPadding);

  // 경로 기반 괄호 렌더링 시도 (현재 ( ) 만 지원)
  const openPathEntry = DELIMITER_PATHS[openParen];
  const closePathEntry = DELIMITER_PATHS[closeParen];

  if (openPathEntry && closePathEntry) {
    const targetHeightNorm = totalHeight / actualFontSize;
    const openVariant = selectPathVariant(openParen, targetHeightNorm);
    const closeVariant = selectPathVariant(closeParen, targetHeightNorm);

    const openWidth = openVariant.pathWidth * actualFontSize;
    const closeWidth = closeVariant.pathWidth * actualFontSize;

    // PathBox는 height/depth를 직접 지정하므로 shift 불필요
    const openBox = createPathBox(openParen, openVariant.variantIndex, openWidth, contentHeight, contentDepth);
    const closeBox = createPathBox(closeParen, closeVariant.variantIndex, closeWidth, contentHeight, contentDepth);

    return createHBox([openBox, padding, matrixContent, padding, closeBox], sourceId);
  }

  // 폴백: 기존 GlyphBox 방식 (경로 데이터가 없는 괄호)
  const openGlyph = createGlyph(openParen, metrics, parenFontSize, false);
  const closeGlyph = createGlyph(closeParen, metrics, parenFontSize, false);

  const originalHeight = openGlyph.height;
  const originalDepth = openGlyph.depth;

  openGlyph.height = contentHeight;
  openGlyph.depth = contentDepth;
  closeGlyph.height = contentHeight;
  closeGlyph.depth = contentDepth;

  const scaleY = totalHeight / (originalHeight + originalDepth);
  const scaledOriginalHeight = originalHeight * scaleY;
  const scaledOriginalDepth = originalDepth * scaleY;
  const parenCenterOffset = (scaledOriginalHeight - scaledOriginalDepth) / 2;

  const shiftedOpenGlyph: Box = { ...openGlyph, shift: parenCenterOffset };
  const shiftedCloseGlyph: Box = { ...closeGlyph, shift: parenCenterOffset };

  return createHBox([shiftedOpenGlyph, padding, matrixContent, padding, shiftedCloseGlyph], sourceId);
}

/** 텍스트(Text) Box 생성 */
export function createTextBox(
  text: string,
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  sourceId?: string
): HBox {
  // 텍스트는 정체(upright)로 렌더링
  return createGlyphString(text, metrics, fontSize, false, sourceId);
}

/**
 * align 환경 Box 생성
 *
 * 각 행의 & 기준으로 정렬:
 * - 홀수 열(0, 2, 4...): 오른쪽 정렬
 * - 짝수 열(1, 3, 5...): 왼쪽 정렬
 */
export function createAlignBox(
  rows: Box[][],
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  sourceId?: string
): VBox {
  const actualFontSize = metrics.getActualFontSize(fontSize);
  const rowGap = actualFontSize * 0.4; // 행 간격
  const colGap = actualFontSize * 0.3; // 열 간격

  if (rows.length === 0) {
    return createVBox([], 'center', sourceId);
  }

  // 최대 열 수 계산
  const maxCols = Math.max(...rows.map(row => row.length));

  // 각 열의 최대 너비 계산
  const colWidths: number[] = [];
  for (let j = 0; j < maxCols; j++) {
    let maxWidth = 0;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][j]) {
        maxWidth = Math.max(maxWidth, rows[i][j].width);
      }
    }
    colWidths.push(maxWidth);
  }

  // 각 행을 HBox로 생성
  const rowBoxes: Box[] = [];
  for (let i = 0; i < rows.length; i++) {
    const rowChildren: Box[] = [];

    for (let j = 0; j < maxCols; j++) {
      const cell = rows[i][j] || createHBox([]);
      const cellWidth = colWidths[j];

      // 홀수 열(0, 2, 4...): 오른쪽 정렬
      // 짝수 열(1, 3, 5...): 왼쪽 정렬
      if (j % 2 === 0) {
        // 오른쪽 정렬: 왼쪽에 패딩
        const leftPad = cellWidth - cell.width;
        rowChildren.push(createKern(leftPad));
        rowChildren.push(cell);
      } else {
        // 왼쪽 정렬: 오른쪽에 패딩
        rowChildren.push(cell);
        const rightPad = cellWidth - cell.width;
        rowChildren.push(createKern(rightPad));
      }

      // 열 간격 추가 (마지막 열 제외)
      if (j < maxCols - 1) {
        rowChildren.push(createKern(colGap));
      }
    }

    rowBoxes.push(createHBox(rowChildren));

    // 행 간격 추가 (마지막 행 제외)
    if (i < rows.length - 1) {
      const gapKern = createKern(0);
      gapKern.height = rowGap / 2;
      gapKern.depth = rowGap / 2;
      rowBoxes.push(gapKern);
    }
  }

  // VBox로 조합 (중앙 baseline)
  return createVBox(rowBoxes, 'center', sourceId);
}

/**
 * cases 환경 Box 생성
 *
 * 왼쪽 중괄호와 함께 조건부 표시:
 * - 각 행: [값, 조건설명]
 */
export function createCasesBox(
  rows: Box[][],
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  sourceId?: string
): HBox {
  const actualFontSize = metrics.getActualFontSize(fontSize);
  const rowGap = actualFontSize * 0.3;
  const colGap = actualFontSize * 0.5; // 값과 조건 사이 간격

  if (rows.length === 0) {
    return createHBox([], sourceId);
  }

  // 첫 번째 열(값)과 두 번째 열(조건)의 최대 너비 계산
  let valueWidth = 0;
  let conditionWidth = 0;
  for (const row of rows) {
    if (row[0]) valueWidth = Math.max(valueWidth, row[0].width);
    if (row[1]) conditionWidth = Math.max(conditionWidth, row[1].width);
  }

  // 각 행을 HBox로 생성
  const rowBoxes: Box[] = [];
  for (let i = 0; i < rows.length; i++) {
    const value = rows[i][0] || createHBox([]);
    const condition = rows[i][1] || createHBox([]);

    // 값은 왼쪽 정렬
    const rowChildren: Box[] = [
      value,
      createKern(valueWidth - value.width + colGap),
    ];

    // 조건이 있으면 추가
    if (rows[i][1]) {
      rowChildren.push(condition);
      rowChildren.push(createKern(conditionWidth - condition.width));
    }

    rowBoxes.push(createHBox(rowChildren));

    // 행 간격 추가 (마지막 행 제외)
    if (i < rows.length - 1) {
      const gapKern = createKern(0);
      gapKern.height = rowGap / 2;
      gapKern.depth = rowGap / 2;
      rowBoxes.push(gapKern);
    }
  }

  // VBox로 조합
  const casesContent = createVBox(rowBoxes, 'center');

  // 왼쪽 중괄호 추가
  const contentHeight = casesContent.height;
  const contentDepth = casesContent.depth;
  const totalHeight = contentHeight + contentDepth;

  // 중괄호 크기 계산
  const braceScale = Math.max(1.0, totalHeight / actualFontSize);
  const braceFontSize = fontSize * braceScale;

  const openBrace = createGlyph('{', metrics, braceFontSize, false);
  openBrace.height = contentHeight;
  openBrace.depth = contentDepth;

  const padding = createKern(actualFontSize * 0.15);

  return createHBox([openBrace, padding, casesContent], sourceId);
}

/**
 * gather 환경 Box 생성
 *
 * 모든 행을 중앙 정렬
 */
export function createGatherBox(
  rows: Box[],
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  sourceId?: string
): VBox {
  const actualFontSize = metrics.getActualFontSize(fontSize);
  const rowGap = actualFontSize * 0.4;

  if (rows.length === 0) {
    return createVBox([], 'center', sourceId);
  }

  // 최대 너비 계산 (중앙 정렬용)
  const maxWidth = Math.max(...rows.map(row => row.width));

  // 각 행을 중앙 정렬
  const rowBoxes: Box[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const leftPad = (maxWidth - row.width) / 2;
    const rightPad = (maxWidth - row.width) / 2;

    rowBoxes.push(createHBox([
      createKern(leftPad),
      row,
      createKern(rightPad),
    ]));

    // 행 간격 추가 (마지막 행 제외)
    if (i < rows.length - 1) {
      const gapKern = createKern(0);
      gapKern.height = rowGap / 2;
      gapKern.depth = rowGap / 2;
      rowBoxes.push(gapKern);
    }
  }

  return createVBox(rowBoxes, 'center', sourceId);
}

/**
 * array 환경 Box 생성
 *
 * 각 열의 정렬 지정 가능 (l, c, r)
 * 세로선(|)과 가로선(\hline) 지원
 */
export function createArrayBox(
  cells: Box[][],
  colAlign: ('l' | 'c' | 'r')[],
  colLines: boolean[],
  rowLines: boolean[],
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  sourceId?: string
): VBox {
  const actualFontSize = metrics.getActualFontSize(fontSize);
  const cellPadding = actualFontSize * 0.2;
  const rowGap = actualFontSize * 0.15;
  const lineThickness = actualFontSize * 0.04;
  const linePadding = actualFontSize * 0.1; // 선 주변 간격

  if (cells.length === 0 || cells[0].length === 0) {
    return createVBox([], 'center', sourceId);
  }

  const numRows = cells.length;
  const numCols = cells[0].length;

  // 각 열의 최대 너비 계산
  const colWidths: number[] = [];
  for (let j = 0; j < numCols; j++) {
    let maxWidth = 0;
    for (let i = 0; i < numRows; i++) {
      if (cells[i][j]) {
        maxWidth = Math.max(maxWidth, cells[i][j].width);
      }
    }
    colWidths.push(maxWidth);
  }

  // 각 행의 최대 높이/깊이 계산 (세로선 높이 계산용)
  const rowHeights: number[] = [];
  const rowDepths: number[] = [];
  for (let i = 0; i < numRows; i++) {
    let maxHeight = actualFontSize * 0.7; // 기본 높이
    let maxDepth = actualFontSize * 0.3; // 기본 깊이
    for (let j = 0; j < numCols; j++) {
      if (cells[i][j]) {
        maxHeight = Math.max(maxHeight, cells[i][j].height);
        maxDepth = Math.max(maxDepth, cells[i][j].depth);
      }
    }
    rowHeights.push(maxHeight);
    rowDepths.push(maxDepth);
  }

  // 전체 높이 계산 (세로선용)
  let totalHeight = 0;
  for (let i = 0; i < numRows; i++) {
    totalHeight += rowHeights[i] + rowDepths[i];
    if (i < numRows - 1) {
      totalHeight += rowGap;
      // 가로선이 있으면 추가 공간
      if (rowLines[i + 1]) {
        totalHeight += linePadding * 2 + lineThickness;
      }
    }
  }
  // 첫 번째/마지막 가로선 공간
  if (rowLines[0]) totalHeight += linePadding + lineThickness;
  if (rowLines[numRows]) totalHeight += linePadding + lineThickness;

  // 각 행을 HBox로 생성
  const rowBoxes: Box[] = [];

  // 첫 번째 가로선 (위쪽)
  if (rowLines[0]) {
    // 전체 너비 계산
    let totalWidth = 0;
    for (let j = 0; j < numCols; j++) {
      totalWidth += colWidths[j] + cellPadding * 2;
      if (colLines[j]) totalWidth += linePadding * 2 + lineThickness;
    }
    if (colLines[numCols]) totalWidth += linePadding * 2 + lineThickness;

    const hlineRule = createRule(totalWidth, lineThickness);
    rowBoxes.push(createHBox([hlineRule]));
    const gapKern = createKern(0);
    gapKern.height = linePadding;
    gapKern.depth = 0;
    rowBoxes.push(gapKern);
  }

  for (let i = 0; i < numRows; i++) {
    const rowChildren: Box[] = [];

    // 이 행 아래의 간격 계산 (세로선 연결용)
    let gapBelow = 0;
    if (i < numRows - 1) {
      if (rowLines[i + 1]) {
        // 가로선이 있는 경우: linePadding + lineThickness + linePadding
        gapBelow = linePadding * 2 + lineThickness;
      } else {
        // 일반 행 간격
        gapBelow = rowGap;
      }
    }

    for (let j = 0; j < numCols; j++) {
      // 열 앞의 세로선
      if (colLines[j]) {
        rowChildren.push(createKern(linePadding));
        // 세로선은 행 높이 + 아래 간격까지 확장하여 연결
        const vlineRule = createVerticalRule(lineThickness, rowHeights[i], rowDepths[i] + gapBelow);
        rowChildren.push(vlineRule);
        rowChildren.push(createKern(linePadding));
      }

      const cell = cells[i][j] || createHBox([]);
      const cellWidth = colWidths[j];
      const align = colAlign[j] || 'c'; // 기본값: 중앙 정렬

      let leftPad: number;
      let rightPad: number;

      switch (align) {
        case 'l': // 왼쪽 정렬
          leftPad = cellPadding;
          rightPad = cellWidth - cell.width + cellPadding;
          break;
        case 'r': // 오른쪽 정렬
          leftPad = cellWidth - cell.width + cellPadding;
          rightPad = cellPadding;
          break;
        case 'c': // 중앙 정렬
        default:
          leftPad = (cellWidth - cell.width) / 2 + cellPadding;
          rightPad = (cellWidth - cell.width) / 2 + cellPadding;
          break;
      }

      rowChildren.push(createKern(leftPad));
      rowChildren.push(cell);
      rowChildren.push(createKern(rightPad));
    }

    // 마지막 열 뒤의 세로선
    if (colLines[numCols]) {
      rowChildren.push(createKern(linePadding));
      // 세로선은 행 높이 + 아래 간격까지 확장하여 연결
      const vlineRule = createVerticalRule(lineThickness, rowHeights[i], rowDepths[i] + gapBelow);
      rowChildren.push(vlineRule);
      rowChildren.push(createKern(linePadding));
    }

    rowBoxes.push(createHBox(rowChildren));

    // 행 간격 또는 가로선 추가 (마지막 행 제외)
    if (i < numRows - 1) {
      if (rowLines[i + 1]) {
        // 가로선이 있는 경우
        const gapKern1 = createKern(0);
        gapKern1.height = linePadding;
        gapKern1.depth = 0;
        rowBoxes.push(gapKern1);

        // 전체 너비 계산
        let totalWidth = 0;
        for (let j = 0; j < numCols; j++) {
          totalWidth += colWidths[j] + cellPadding * 2;
          if (colLines[j]) totalWidth += linePadding * 2 + lineThickness;
        }
        if (colLines[numCols]) totalWidth += linePadding * 2 + lineThickness;

        const hlineRule = createRule(totalWidth, lineThickness);
        rowBoxes.push(createHBox([hlineRule]));

        const gapKern2 = createKern(0);
        gapKern2.height = linePadding;
        gapKern2.depth = 0;
        rowBoxes.push(gapKern2);
      } else {
        // 일반 행 간격
        const gapKern = createKern(0);
        gapKern.height = rowGap;
        gapKern.depth = 0;
        rowBoxes.push(gapKern);
      }
    }
  }

  // 마지막 가로선 (아래쪽)
  if (rowLines[numRows]) {
    const gapKern = createKern(0);
    gapKern.height = linePadding;
    gapKern.depth = 0;
    rowBoxes.push(gapKern);

    // 전체 너비 계산
    let totalWidth = 0;
    for (let j = 0; j < numCols; j++) {
      totalWidth += colWidths[j] + cellPadding * 2;
      if (colLines[j]) totalWidth += linePadding * 2 + lineThickness;
    }
    if (colLines[numCols]) totalWidth += linePadding * 2 + lineThickness;

    const hlineRule = createRule(totalWidth, lineThickness);
    rowBoxes.push(createHBox([hlineRule]));
  }

  // VBox로 조합 (중앙 baseline)
  return createVBox(rowBoxes, 'center', sourceId);
}

/** Surd(제곱근) Box 생성 */
export function createSurd(
  content: Box,
  metrics: CanvasFontMetrics,
  fontSize: number = 1.0,
  sourceId?: string
): SurdBox {
  const actualFontSize = metrics.getActualFontSize(fontSize);
  const ruleThickness = actualFontSize * MathConstants.fractionRuleThickness * 1.5;
  const gap = actualFontSize * 0.08; // vinculum과 content 사이 간격

  // √ 기호의 폭 (대략적으로 계산)
  const sqrtWidth = actualFontSize * 0.6;

  // 전체 크기 계산
  const totalWidth = sqrtWidth + content.width + gap;
  const totalHeight = content.height + gap + ruleThickness;

  return {
    type: 'surd',
    content,
    ruleThickness,
    gap,
    width: totalWidth,
    height: totalHeight,
    depth: content.depth,
    x: 0,
    y: 0,
    sourceId,
  };
}
