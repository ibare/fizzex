/**
 * Assertion Engine
 *
 * 메타 파일의 기대값과 measurer의 실측값을 비교.
 * tolerance 포함 수치 비교 및 boolean/string 비교 지원.
 */

export interface AssertionResult {
  caseId: string;
  type: string;
  status: 'pass' | 'fail' | 'known_fail' | 'skip';
  expected: number | boolean | string;
  actual: number | boolean | string | null;
  tolerance?: number;
  diff?: number;
  message: string;
}

export interface SpecAssertion {
  type: string;
  expected_param?: string;
  expected?: string | number | boolean;
  tolerance?: number | string;
  note?: string;
}

export interface SpecVerificationCase {
  id: string;
  latex: string;
  style?: 'display' | 'text' | 'script';
  known_fail?: boolean;
  known_fail_reason?: string;
  assertions: SpecAssertion[];
}

/** 파라미터 값 맵 (spec JSON의 parameters에서 추출) */
export type ParameterMap = Record<string, number>;

/**
 * 단일 assertion 평가
 */
export function evaluateAssertion(
  caseId: string,
  assertion: SpecAssertion,
  measurements: Record<string, number>,
  flags: Record<string, boolean>,
  params: ParameterMap,
  knownFail: boolean
): AssertionResult {
  const type = assertion.type;

  // 기대값 결정
  const expectedValue = resolveExpectedValue(assertion, params);
  if (expectedValue === null) {
    return {
      caseId, type, status: 'skip',
      expected: assertion.expected_param ?? assertion.expected ?? 'unknown',
      actual: null,
      message: `기대값을 결정할 수 없음: ${assertion.expected_param ?? assertion.expected}`,
    };
  }

  // tolerance 결정 (mu 단위 변환 포함)
  const tolerance = resolveTolerance(assertion);

  // 실측값 추출
  const actualValue = extractActualValue(type, measurements, flags);

  // 비교
  if (typeof expectedValue === 'boolean') {
    const passed = actualValue === expectedValue;
    return {
      caseId, type,
      status: passed ? 'pass' : (knownFail ? 'known_fail' : 'fail'),
      expected: expectedValue,
      actual: actualValue,
      message: passed
        ? `${type}: ${actualValue} (일치)`
        : `${type}: expected ${expectedValue}, got ${actualValue}`,
    };
  }

  if (typeof expectedValue === 'number' && typeof actualValue === 'number') {
    const diff = Math.abs(actualValue - expectedValue);

    // _min 접미사: TeX minimum 조건 — actual >= (expected - tolerance) 이면 통과
    // _max 접미사: TeX maximum 조건 — actual <= (expected + tolerance) 이면 통과
    let passed: boolean;
    if (type.endsWith('_min')) {
      passed = actualValue >= expectedValue - tolerance;
    } else if (type.endsWith('_max')) {
      passed = actualValue <= expectedValue + tolerance;
    } else {
      passed = diff <= tolerance;
    }

    return {
      caseId, type,
      status: passed ? 'pass' : (knownFail ? 'known_fail' : 'fail'),
      expected: expectedValue,
      actual: actualValue,
      tolerance,
      diff,
      message: passed
        ? `${type}: ${actualValue.toFixed(4)} ≈ ${expectedValue.toFixed(4)} (diff: ${diff.toFixed(4)})`
        : `${type}: expected ${expectedValue.toFixed(4)}, got ${actualValue.toFixed(4)} (diff: ${diff.toFixed(4)}, tolerance: ${tolerance})`,
    };
  }

  // 실측값 없음
  if (actualValue === null) {
    return {
      caseId, type,
      status: knownFail ? 'known_fail' : 'fail',
      expected: expectedValue,
      actual: null,
      message: `${type}: 측정값 없음 (expected ${expectedValue})`,
    };
  }

  // string 비교
  const passed = actualValue === expectedValue;
  return {
    caseId, type,
    status: passed ? 'pass' : (knownFail ? 'known_fail' : 'fail'),
    expected: expectedValue,
    actual: actualValue,
    message: passed
      ? `${type}: ${actualValue} (일치)`
      : `${type}: expected ${expectedValue}, got ${actualValue}`,
  };
}

/** assertion type → measurement key 매핑 */
function extractActualValue(
  type: string,
  measurements: Record<string, number>,
  flags: Record<string, boolean>
): number | boolean | null {
  const typeToMeasurement: Record<string, string> = {
    // 분수
    rule_on_axis: 'fraction.axis_shift',
    rule_thickness: 'fraction.rule_thickness',
    numerator_shift_up: 'fraction.num_shift_up',
    denominator_shift_down: 'fraction.den_shift_down',
    num_rule_clearance_min: 'fraction.num_rule_gap',
    // 위첨자
    superscript_shift_up_min: 'superscript.shift_up',
    superscript_bottom_min: 'superscript.bottom',
    superscript_font_scale: 'superscript.font_scale',
    // 아래첨자
    subscript_shift_down_min: 'subscript.shift_down',
    subscript_top_max: 'subscript.top',
    subscript_font_scale: 'subscript.font_scale',
    // 위+아래
    subsup_gap_min: 'subsup.gap',
    sup_bottom_with_sub: 'superscript.bottom',
    // 근호
    content_rule_clearance_min: 'radical.content_rule_clearance',
    radical_rule_thickness: 'radical.rule_thickness',
    // Overline
    overline_gap: 'overline.gap',
    overline_thickness: 'overline.thickness',
    // 구분자
    delimiter_covers_content: '_flag:delimiter.covers_content',
    delimiter_centered_on_axis: 'delimiter.axis_offset',
    // Limits
    upper_limit_gap_min: 'limits.upper_gap',
    lower_limit_gap_min: 'limits.lower_gap',
    limits_as_scripts: '_flag:limits.as_scripts',
    // Spacing
    space_around_rel: 'spacing.operator_spacing',
    space_around_bin: 'spacing.operator_spacing',
    space_before_ord: 'spacing.operator_spacing',
    // 스타일
    inner_frac_style: 'fraction.inner_style',
    content_style_is_cramped: '_flag:content.is_cramped',
    inner_style_is_cramped: '_flag:inner.is_cramped',
  };

  const key = typeToMeasurement[type];
  if (!key) return null;

  if (key.startsWith('_flag:')) {
    const flagKey = key.slice(6);
    return flags[flagKey] ?? null;
  }

  return measurements[key] ?? null;
}

/** 기대값 결정 (파라미터 참조 또는 수식 평가) */
function resolveExpectedValue(
  assertion: SpecAssertion,
  params: ParameterMap
): number | boolean | string | null {
  // boolean 또는 string 직접값
  if (typeof assertion.expected === 'boolean') return assertion.expected;
  if (typeof assertion.expected === 'string' && !assertion.expected.includes('*') && !assertion.expected.includes('/') && !assertion.expected.includes('mu')) {
    return assertion.expected;
  }

  // 파라미터 참조
  if (assertion.expected_param) {
    return params[assertion.expected_param] ?? null;
  }

  // 수식 평가 (예: "3 * xi8", "sigma5_xHeight / 4", "0.8 * sigma5_xHeight")
  if (typeof assertion.expected === 'string') {
    return evaluateExpression(assertion.expected, params);
  }

  if (typeof assertion.expected === 'number') return assertion.expected;

  return null;
}

/** 간단한 수식 평가기 */
function evaluateExpression(expr: string, params: ParameterMap): number | null {
  // mu 단위 처리
  const muMatch = expr.match(/^(\d+(?:\.\d+)?)\s*mu$/);
  if (muMatch) {
    return parseFloat(muMatch[1]) / 18; // 1mu = 1/18 em
  }

  // "N * param" 또는 "param / N" 또는 "N * param + M * param2"
  let result = expr;

  // 파라미터 치환
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
  }

  // 간단한 산술 평가 (안전한 범위에서)
  try {
    // 숫자, 연산자, 공백만 허용
    if (/^[\d.+\-*/() ]+$/.test(result)) {
      return Function(`"use strict"; return (${result})`)() as number;
    }
  } catch {
    // 평가 실패
  }

  return null;
}

/** tolerance 결정 (mu 단위 변환 포함) */
function resolveTolerance(assertion: SpecAssertion): number {
  if (assertion.tolerance === undefined) return 0.02; // 기본값

  if (typeof assertion.tolerance === 'number') return assertion.tolerance;

  // "0.5mu" 등의 문자열
  const muMatch = String(assertion.tolerance).match(/^(\d+(?:\.\d+)?)\s*mu$/);
  if (muMatch) {
    return parseFloat(muMatch[1]) / 18;
  }

  return 0.02;
}
