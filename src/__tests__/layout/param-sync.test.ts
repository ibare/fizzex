/**
 * Parameter Sync Test
 *
 * fizzex-layout-spec.json의 파라미터 값이 코드 상수와 일치하는지 검증한다.
 *
 * spec.json은 순수 사양 파일이므로 코드 바인딩 정보를 포함하지 않는다.
 * 이 파일의 PARAM_BINDINGS 테이블이 spec 파라미터와 코드 상수를 연결하는 유일한 장소이다.
 */

import { describe, it, expect } from 'vitest';
import { MathConstants } from '../../box/font-metrics';
import spec from '../../../specs/fizzex-layout-spec.json';

// ── 매핑 테이블 ──

interface ParamBinding {
  /** 코드 상수 값을 반환하는 함수 */
  resolve: () => number;
  /** 사람이 읽을 수 있는 코드 위치 */
  location: string;
}

/**
 * spec 파라미터 ID → 코드 상수 매핑
 *
 * null: 코드에 아직 해당 상수가 없음 (unbound)
 * ParamBinding: 코드 상수와 연결됨 — resolve()가 반환하는 값이 spec 값과 일치해야 함
 *
 * 새 파라미터를 MathConstants에 추가하면 여기에도 바인딩을 추가한다.
 */
const PARAM_BINDINGS: Record<string, ParamBinding | null> = {
  // ── 분수 ──
  sigma8_num1: {
    resolve: () => MathConstants.fracNumDisplayShift,
    location: 'MathConstants.fracNumDisplayShift',
  },
  sigma9_num2: {
    resolve: () => MathConstants.fracNumTextShift,
    location: 'MathConstants.fracNumTextShift',
  },
  sigma11_denom1: {
    resolve: () => MathConstants.fracDenomDisplayShift,
    location: 'MathConstants.fracDenomDisplayShift',
  },
  sigma12_denom2: {
    resolve: () => MathConstants.fracDenomTextShift,
    location: 'MathConstants.fracDenomTextShift',
  },
  sigma22_axisHeight: {
    resolve: () => MathConstants.axisHeight,
    location: 'MathConstants.axisHeight',
  },
  xi8_defaultRuleThickness: {
    resolve: () => MathConstants.fractionRuleThickness,
    location: 'MathConstants.fractionRuleThickness',
  },

  // ── 위첨자/아래첨자 ──
  sigma5_xHeight: {
    resolve: () => MathConstants.xHeight,
    location: 'MathConstants.xHeight',
  },
  sigma13_sup1: {
    resolve: () => MathConstants.exponentShift,
    location: 'MathConstants.exponentShift',
  },
  sigma16_sub1: {
    resolve: () => MathConstants.subscriptShift,
    location: 'MathConstants.subscriptShift',
  },
  sigma18_supDrop: {
    resolve: () => MathConstants.supDrop,
    location: 'MathConstants.supDrop',
  },
  sigma19_subDrop: {
    resolve: () => MathConstants.subDrop,
    location: 'MathConstants.subDrop',
  },
  scriptPercentScaleDown: {
    resolve: () => MathConstants.exponentScale,
    location: 'MathConstants.exponentScale',
  },

  // ── 큰 연산자 ──
  xi9_bigOpSpacing1: {
    resolve: () => MathConstants.upperLimitGap,
    location: 'MathConstants.upperLimitGap',
  },
  xi10_bigOpSpacing2: {
    resolve: () => MathConstants.lowerLimitGap,
    location: 'MathConstants.lowerLimitGap',
  },
  displayOperatorMinHeight: {
    resolve: () => MathConstants.displayOperatorMinHeight,
    location: 'MathConstants.displayOperatorMinHeight',
  },
  largeOpDisplayScale: {
    resolve: () => MathConstants.largeOpDisplayScale,
    location: 'MathConstants.largeOpDisplayScale',
  },
  largeOpInlineScale: {
    resolve: () => MathConstants.largeOpInlineScale,
    location: 'MathConstants.largeOpInlineScale',
  },
  integralDisplayScale: {
    resolve: () => MathConstants.integralDisplayScale,
    location: 'MathConstants.integralDisplayScale',
  },
  integralInlineScale: {
    resolve: () => MathConstants.integralInlineScale,
    location: 'MathConstants.integralInlineScale',
  },
  integralFallbackHeightDisplay: {
    resolve: () => MathConstants.integralFallbackHeightDisplay,
    location: 'MathConstants.integralFallbackHeightDisplay',
  },
  integralFallbackDepthDisplay: {
    resolve: () => MathConstants.integralFallbackDepthDisplay,
    location: 'MathConstants.integralFallbackDepthDisplay',
  },
  integralFallbackHeightInline: {
    resolve: () => MathConstants.integralFallbackHeightInline,
    location: 'MathConstants.integralFallbackHeightInline',
  },
  integralFallbackDepthInline: {
    resolve: () => MathConstants.integralFallbackDepthInline,
    location: 'MathConstants.integralFallbackDepthInline',
  },

  // ── 8-style 시스템 ──
  scriptScriptPercentScaleDown: {
    resolve: () => MathConstants.scriptScriptPercentScaleDown,
    location: 'MathConstants.scriptScriptPercentScaleDown',
  },
  sigma14_sup2: {
    resolve: () => MathConstants.supTextShift,
    location: 'MathConstants.supTextShift',
  },
  sigma15_sup3: {
    resolve: () => MathConstants.supCrampedShift,
    location: 'MathConstants.supCrampedShift',
  },
  sigma17_sub2: {
    resolve: () => MathConstants.subscriptShiftWithSup,
    location: 'MathConstants.subscriptShiftWithSup',
  },

  // ── 구조 명령어 (overset, boxed, cancel) ──
  oversetGap: {
    resolve: () => MathConstants.oversetGap,
    location: 'MathConstants.oversetGap',
  },
  undersetGap: {
    resolve: () => MathConstants.undersetGap,
    location: 'MathConstants.undersetGap',
  },
  oversetAnnotationScale: {
    resolve: () => MathConstants.oversetAnnotationScale,
    location: 'MathConstants.oversetAnnotationScale',
  },
  boxedPadding: {
    resolve: () => MathConstants.boxedPadding,
    location: 'MathConstants.boxedPadding',
  },
  boxedRuleThickness: {
    resolve: () => MathConstants.boxedRuleThickness,
    location: 'MathConstants.boxedRuleThickness',
  },
  cancelRuleThickness: {
    resolve: () => MathConstants.cancelRuleThickness,
    location: 'MathConstants.cancelRuleThickness',
  },

  // ── 고정 크기 구분자 ──
  bigDelimiterScale: {
    resolve: () => MathConstants.bigDelimiterScale,
    location: 'MathConstants.bigDelimiterScale',
  },
  BigDelimiterScale: {
    resolve: () => MathConstants.BigDelimiterScale,
    location: 'MathConstants.BigDelimiterScale',
  },
  biggDelimiterScale: {
    resolve: () => MathConstants.biggDelimiterScale,
    location: 'MathConstants.biggDelimiterScale',
  },
  BiggDelimiterScale: {
    resolve: () => MathConstants.BiggDelimiterScale,
    location: 'MathConstants.BiggDelimiterScale',
  },

  // ── 넓은 악센트 / 중괄호 / 확장 화살표 ──
  wideAccentMinWidth: {
    resolve: () => MathConstants.wideAccentMinWidth,
    location: 'MathConstants.wideAccentMinWidth',
  },
  overbraceGap: {
    resolve: () => MathConstants.overbraceGap,
    location: 'MathConstants.overbraceGap',
  },
  xarrowPadding: {
    resolve: () => MathConstants.xarrowPadding,
    location: 'MathConstants.xarrowPadding',
  },

  // ── smallmatrix ──
  smallMatrixScale: {
    resolve: () => MathConstants.smallMatrixScale,
    location: 'MathConstants.smallMatrixScale',
  },

  // ── 미구현 (unbound) ──
  sigma6_mathQuad: null,
  sigma10_num3: null,
  sigma20_delim1: null,
  sigma21_delim2: null,
  xi11_bigOpSpacing3: null,
  xi12_bigOpSpacing4: null,
  xi13_bigOpSpacing5: null,
  operatorSpacing_thin: null,
  operatorSpacing_medium: null,
  operatorSpacing_thick: null,
};

// ── 테스트 ──

describe('Parameter Sync: spec.json ↔ MathConstants', () => {
  const specParams = (spec as any).parameters as Record<string, { value: number }>;
  const allParamIds = Object.keys(specParams);
  const boundEntries = Object.entries(PARAM_BINDINGS).filter(
    (entry): entry is [string, ParamBinding] => entry[1] !== null
  );
  const unboundIds = Object.entries(PARAM_BINDINGS)
    .filter(([, v]) => v === null)
    .map(([k]) => k);

  // spec에 있는데 매핑 테이블에 없는 파라미터 검출
  const unmappedIds = allParamIds.filter(id => !(id in PARAM_BINDINGS));

  it('매핑 테이블이 spec의 모든 파라미터를 포함한다', () => {
    if (unmappedIds.length > 0) {
      console.log('\n=== 매핑 누락 파라미터 ===');
      unmappedIds.forEach(id => console.log(`  ${id}`));
    }
    expect(unmappedIds).toEqual([]);
  });

  describe('바인딩된 파라미터 값 일치', () => {
    for (const [paramId, binding] of boundEntries) {
      it(`${paramId} → ${binding.location}`, () => {
        const specValue = specParams[paramId]?.value;
        expect(specValue).toBeDefined();
        const codeValue = binding.resolve();
        expect(codeValue).toBeCloseTo(specValue, 6);
      });
    }
  });

  it('동기화 현황을 보고한다', () => {
    const total = allParamIds.length;
    const bound = boundEntries.length;
    const unbound = unboundIds.length;
    const unmapped = unmappedIds.length;

    // 바인딩된 항목 중 실제 일치 수 계산
    let matched = 0;
    let mismatched = 0;
    const mismatches: string[] = [];
    for (const [paramId, binding] of boundEntries) {
      const specValue = specParams[paramId]?.value;
      const codeValue = binding.resolve();
      if (Math.abs(codeValue - specValue) < 1e-6) {
        matched++;
      } else {
        mismatched++;
        mismatches.push(`  ${paramId}: spec=${specValue}, code=${codeValue} (${binding.location})`);
      }
    }

    console.log('\n=== Parameter Sync Report ===');
    console.log(`Total: ${total} | Bound: ${bound} (match: ${matched}, mismatch: ${mismatched}) | Unbound: ${unbound} | Unmapped: ${unmapped}`);
    if (mismatches.length > 0) {
      console.log('\nMismatches:');
      mismatches.forEach(m => console.log(m));
    }
    if (unboundIds.length > 0) {
      console.log('\nUnbound (코드에 상수 없음):');
      unboundIds.forEach(id => console.log(`  ${id} (spec: ${specParams[id]?.value})`));
    }

    expect(total).toBeGreaterThan(0);
  });
});
