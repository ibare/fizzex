/**
 * Layout Measurer
 *
 * LaTeX 입력 → 파싱 → Box 생성 → 레이아웃 → 구조적 측정값 추출
 * 렌더링 없이 Box model 단계까지만 실행.
 */

import { parseLatex } from '../../latex';
import { astToBox, layoutBox, collectBoxPositions } from '../../box';
import type { Box, HBox, VBox, SurdBox, RuleBox } from '../../box/types';
import { MathConstants } from '../../box/font-metrics';
import { createDeterministicMetrics } from './deterministic-metrics';

export interface LayoutMeasurement {
  latex: string;
  displayStyle: boolean;
  baseFontSize: number;
  boxTree: Box;
  /** em 단위 측정값 (actualFontSize로 나눈 값) */
  values: Record<string, number>;
  /** boolean 측정값 */
  flags: Record<string, boolean>;
}

/**
 * LaTeX를 파싱하고 Box 레이아웃을 수행하여 측정값을 추출한다.
 */
export function measureLayout(
  latex: string,
  style: 'display' | 'text',
  baseFontSize: number = 20
): LayoutMeasurement {
  const displayStyle = style === 'display';
  const metrics: any = createDeterministicMetrics(baseFontSize);
  const { ast } = parseLatex(latex);
  const box = astToBox(ast, metrics, 1.0, displayStyle);
  layoutBox(box, 0, 0);

  const actualFontSize = baseFontSize;
  const values: Record<string, number> = {};
  const flags: Record<string, boolean> = {};

  // 전체 수식 크기
  values['formula.width'] = box.width / actualFontSize;
  values['formula.height'] = box.height / actualFontSize;
  values['formula.depth'] = box.depth / actualFontSize;

  // Box tree에서 구조적 측정값 추출
  extractFractionMeasurements(box, actualFontSize, values, flags);
  extractScriptMeasurements(box, actualFontSize, values, flags);
  extractRadicalMeasurements(box, actualFontSize, values, flags);
  extractOverlineMeasurements(box, actualFontSize, values, flags);
  extractDelimiterMeasurements(box, actualFontSize, values, flags);
  extractLimitsMeasurements(box, actualFontSize, values, flags);
  extractSpacingMeasurements(box, actualFontSize, values, flags);
  extractAccentMeasurements(box, actualFontSize, values, flags);

  return { latex, displayStyle, baseFontSize, boxTree: box, values, flags };
}

/** 분수 관련 측정값 추출 */
function extractFractionMeasurements(
  box: Box, actualFontSize: number,
  values: Record<string, number>, flags: Record<string, boolean>
): void {
  const fracs = findBoxesByPattern(box, isFractionVBox);
  fracs.forEach((frac, i) => {
    const vbox = frac as VBox;
    const prefix = i === 0 ? 'fraction' : `fraction_${i}`;

    // 분수선 찾기
    const rule = vbox.children.find(c => c.type === 'rule') as RuleBox | undefined;
    if (rule) {
      values[`${prefix}.rule_thickness`] = rule.thickness / actualFontSize;
      // 분수선의 axis 위치 (VBox의 shift가 axis height)
      if (vbox.shift !== undefined) {
        values[`${prefix}.axis_shift`] = Math.abs(vbox.shift) / actualFontSize;
      }
    }

    // 분자/분모 gap 및 shift 측정
    const children = vbox.children;
    // VBox 구조: [numBox, numGapKern, rule, denGapKern, denBox]
    if (children.length >= 5) {
      const numBox = children[0];
      const numGap = children[1];
      const ruleBox = children[2] as RuleBox;
      const denGap = children[3];
      const denBox = children[4];

      if (numGap.type === 'kern') {
        values[`${prefix}.num_rule_gap`] = numGap.height / actualFontSize;
      }
      if (denGap.type === 'kern') {
        values[`${prefix}.den_rule_gap`] = denGap.depth / actualFontSize;
      }

      // shift 측정: axis에서 분��/분모 baseline까지의 거리
      if (numGap.type === 'kern' && ruleBox.type === 'rule') {
        // numShiftUp = ruleThickness/2 + numGap + numBox.depth
        values[`${prefix}.num_shift_up`] = (ruleBox.thickness / 2 + numGap.height + numBox.depth) / actualFontSize;
      }
      if (denGap.type === 'kern' && ruleBox.type === 'rule') {
        // denomShiftDown = ruleThickness/2 + denomGap + denBox.height
        values[`${prefix}.den_shift_down`] = (ruleBox.thickness / 2 + denGap.depth + denBox.height) / actualFontSize;
      }
    }
  });
}

/** 위첨자/아래첨자 관련 측정값 추출 */
function extractScriptMeasurements(
  box: Box, actualFontSize: number,
  values: Record<string, number>, flags: Record<string, boolean>
): void {
  visitBox(box, (b) => {
    if (b.type !== 'hbox') return;
    const hbox = b as HBox;

    hbox.children.forEach((child, idx) => {
      if (child.shift === undefined || child.shift === 0) return;

      // 위첨자: shift가 음수 (위로 이동)
      if (child.shift < 0) {
        const shiftEm = Math.abs(child.shift) / actualFontSize;
        values['superscript.shift_up'] = shiftEm;

        // 위첨자의 폰트 크기 비율 (GlyphBox인 경우)
        const glyphs = findGlyphsIn(child);
        if (glyphs.length > 0) {
          values['superscript.font_scale'] = glyphs[0].fontSize;
        }

        // 위첨자 하단 위치 (shift_up - depth)
        const bottomEm = shiftEm - child.depth / actualFontSize;
        values['superscript.bottom'] = bottomEm;
      }

      // 아래첨자: shift가 양수 (아래로 이동)
      if (child.shift > 0) {
        const shiftEm = child.shift / actualFontSize;
        values['subscript.shift_down'] = shiftEm;

        // 아래첨자의 폰트 크기 비율
        const glyphs = findGlyphsIn(child);
        if (glyphs.length > 0) {
          values['subscript.font_scale'] = glyphs[0].fontSize;
        }

        // 아래첨자 상단 위치 (height - shift_down)
        const topEm = child.height / actualFontSize - shiftEm;
        values['subscript.top'] = topEm;
      }
    });
  });
}

/** 근호 관련 측정값 추출 */
function extractRadicalMeasurements(
  box: Box, actualFontSize: number,
  values: Record<string, number>, _flags: Record<string, boolean>
): void {
  visitBox(box, (b) => {
    if (b.type !== 'surd') return;
    const surd = b as SurdBox;
    values['radical.rule_thickness'] = surd.ruleThickness / actualFontSize;
    values['radical.gap'] = surd.gap / actualFontSize;
    values['radical.content_rule_clearance'] = surd.gap / actualFontSize;
  });
}

/** Overline 관련 측정값 추출 */
function extractOverlineMeasurements(
  box: Box, actualFontSize: number,
  values: Record<string, number>, _flags: Record<string, boolean>
): void {
  visitBox(box, (b) => {
    if (b.type !== 'vbox') return;
    const vbox = b as VBox;
    // overline 패턴: [rule, kern(gap), contentBox], baselineType=2
    if (vbox.children.length === 3 &&
        vbox.children[0].type === 'rule' &&
        vbox.children[1].type === 'kern' &&
        vbox.baselineType === 2) {
      const rule = vbox.children[0] as RuleBox;
      const kern = vbox.children[1];
      // overline이 아닌 분수와 구별: 분수는 5개 children
      values['overline.thickness'] = rule.thickness / actualFontSize;
      values['overline.gap'] = kern.height / actualFontSize;
    }
  });
}

/** 구분자 관련 측정값 추출 */
function extractDelimiterMeasurements(
  box: Box, actualFontSize: number,
  values: Record<string, number>, flags: Record<string, boolean>
): void {
  // 구분자 높이 vs 내용 높이 비교
  visitBox(box, (b) => {
    if (b.type !== 'hbox') return;
    const hbox = b as HBox;
    if (hbox.sourceId && hbox.children.length >= 3) {
      // 괄호 패턴: [openDelim, ..., content, ..., closeDelim]
      const first = hbox.children[0];
      const last = hbox.children[hbox.children.length - 1];
      if (first.type === 'glyph' && last.type === 'glyph' &&
          '([{|'.includes(first.char) && ')]}|'.includes(last.char)) {
        const delimHeight = (first.height + first.depth) / actualFontSize;
        const contentHeight = (hbox.height + hbox.depth) / actualFontSize;
        values['delimiter.height'] = delimHeight;
        values['delimiter.content_height'] = contentHeight;
        flags['delimiter.covers_content'] = delimHeight >= contentHeight * 0.9;
      }
    }
  });
}

/** Limits (큰 연산자) 관련 측정값 추출 */
function extractLimitsMeasurements(
  box: Box, actualFontSize: number,
  values: Record<string, number>, flags: Record<string, boolean>
): void {
  visitBox(box, (b) => {
    if (b.type !== 'vbox') return;
    const vbox = b as VBox;
    // limits 패턴: [upper, kern, symbol, kern, lower], baselineType=2
    if (vbox.children.length === 5 && vbox.baselineType === 2 &&
        vbox.children[1].type === 'kern' && vbox.children[3].type === 'kern') {
      // gap kern들
      const upperGapKern = vbox.children[1];
      const lowerGapKern = vbox.children[3];
      // kern의 width가 0이고 height/depth로 gap 표현
      const upperGap = upperGapKern.width / actualFontSize;
      const lowerGap = lowerGapKern.width / actualFontSize;
      values['limits.upper_gap'] = upperGap;
      values['limits.lower_gap'] = lowerGap;
      flags['limits.as_vbox'] = true;
    }
  });

  // inline 모드: sideset 패턴 (shift로 구분)
  visitBox(box, (b) => {
    if (b.type !== 'hbox') return;
    const hbox = b as HBox;
    let hasShiftUp = false;
    let hasShiftDown = false;
    hbox.children.forEach(c => {
      if (c.shift !== undefined && c.shift < 0) hasShiftUp = true;
      if (c.shift !== undefined && c.shift > 0) hasShiftDown = true;
    });
    if (hasShiftUp && hasShiftDown && !flags['limits.as_scripts']) {
      flags['limits.as_scripts'] = true;
    }
  });
}

/** Spacing 측정값 추출 */
function extractSpacingMeasurements(
  box: Box, actualFontSize: number,
  values: Record<string, number>, _flags: Record<string, boolean>
): void {
  if (box.type !== 'hbox') return;
  const hbox = box as HBox;

  // root HBox의 children에서 kern 간격 찾기
  hbox.children.forEach((child, idx) => {
    if (child.type === 'kern' && child.width > 0) {
      const spacingEm = child.width / actualFontSize;
      // 연산자 앞뒤 kern 간격
      const prev = idx > 0 ? hbox.children[idx - 1] : null;
      const next = idx < hbox.children.length - 1 ? hbox.children[idx + 1] : null;

      if (prev?.type === 'hbox' || next?.type === 'hbox') {
        // 연산자 spacing으로 추정
        if (!values['spacing.operator_spacing']) {
          values['spacing.operator_spacing'] = spacingEm;
        }
      }
    }
  });
}

/** Accent 관련 측정값 추출 */
function extractAccentMeasurements(
  box: Box, actualFontSize: number,
  values: Record<string, number>, _flags: Record<string, boolean>
): void {
  visitBox(box, (b) => {
    if (b.type !== 'hbox') return;
    const hbox = b as HBox;
    if (hbox.children.length < 2) return;

    // accent 패턴: 첫 번째 child가 overlay HBox (width ≈ 0), 두 번째가 content
    const first = hbox.children[0];
    if (first.type !== 'hbox' || first.width > 0.001 * actualFontSize) return;

    // overlay 내부에서 shifted glyph 찾기
    const overlay = first as HBox;
    let accentShiftUp = 0;
    let accentDepth = 0;
    let found = false;
    visitBox(overlay, (inner) => {
      if (found) return;
      if (inner.shift !== undefined && inner.shift < 0 && inner.type === 'glyph') {
        accentShiftUp = Math.abs(inner.shift);
        accentDepth = inner.depth;
        found = true;
      }
    });

    if (!found) return;

    // accent clearance: accent bottom 위치 (baseline 기준, em 단위)
    // accent bottom = shift_up - accent_depth
    const clearance = (accentShiftUp - accentDepth) / actualFontSize;
    values['accent.clearance'] = clearance;
  });
}

// ── 헬퍼 함수 ──

/** VBox가 분수 패턴인지 확인 (5개 children + baselineType=2 + rule 포함) */
function isFractionVBox(box: Box): boolean {
  if (box.type !== 'vbox') return false;
  const vbox = box as VBox;
  return vbox.children.length === 5 &&
    vbox.baselineType === 2 &&
    vbox.children.some(c => c.type === 'rule') &&
    vbox.shift !== undefined && vbox.shift !== 0;
}

/** 패턴에 맞는 Box들을 재귀적으로 찾기 */
function findBoxesByPattern(root: Box, predicate: (b: Box) => boolean): Box[] {
  const results: Box[] = [];
  visitBox(root, (b) => {
    if (predicate(b)) results.push(b);
  });
  return results;
}

/** Box tree 깊이 우선 순회 */
function visitBox(box: Box, visitor: (b: Box) => void): void {
  visitor(box);
  if (box.type === 'hbox' || box.type === 'vbox') {
    (box as HBox | VBox).children.forEach(c => visitBox(c, visitor));
  }
  if (box.type === 'surd') {
    visitBox((box as SurdBox).content, visitor);
    if ((box as SurdBox).index) {
      visitBox((box as SurdBox).index!, visitor);
    }
  }
}

/** Box 내부의 GlyphBox들을 찾기 */
function findGlyphsIn(box: Box): Array<{ fontSize: number; char: string }> {
  const glyphs: Array<{ fontSize: number; char: string }> = [];
  visitBox(box, (b) => {
    if (b.type === 'glyph') {
      const g = b as import('../../box/types').GlyphBox;
      glyphs.push({ fontSize: g.fontSize, char: g.char });
    }
  });
  return glyphs;
}
