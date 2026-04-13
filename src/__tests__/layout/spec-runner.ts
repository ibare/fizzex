/**
 * Spec Runner
 *
 * fizzex-layout-spec.json을 읽어서 전체 검증을 수행하고 결과를 집계한다.
 */

import { measureLayout } from './measurer';
import {
  evaluateAssertion,
  type AssertionResult,
  type SpecVerificationCase,
  type ParameterMap,
} from './assertions';

export interface CategoryResult {
  name: string;
  total: number;
  passed: number;
  failed: number;
  knownFail: number;
  skipped: number;
  basicPassed: boolean;
  results: AssertionResult[];
}

export interface SpecRunResult {
  totalCases: number;
  totalAssertions: number;
  passed: number;
  failed: number;
  knownFail: number;
  skipped: number;
  categories: Record<string, CategoryResult>;
  failures: AssertionResult[];
  knownFailures: AssertionResult[];
  complianceScore: number;
}

export interface LayoutSpec {
  version: string;
  parameters: Record<string, {
    value: number;
    [key: string]: unknown;
  }>;
  layout_algorithms: Record<string, {
    verification_cases: SpecVerificationCase[];
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * spec JSON으로부터 전체 검증 실행
 */
export function runLayoutSpec(spec: LayoutSpec): SpecRunResult {
  // 파라미터 맵 구성 (parameter id → value)
  const params = buildParameterMap(spec.parameters);

  const categories: Record<string, CategoryResult> = {};
  const allResults: AssertionResult[] = [];

  // 각 layout_algorithm 카테고리 실행
  for (const [categoryName, algorithm] of Object.entries(spec.layout_algorithms)) {
    const cases = algorithm.verification_cases ?? [];
    const categoryResult: CategoryResult = {
      name: categoryName,
      total: 0,
      passed: 0,
      failed: 0,
      knownFail: 0,
      skipped: 0,
      basicPassed: true,
      results: [],
    };

    for (const testCase of cases) {
      const results = runVerificationCase(testCase, params);
      categoryResult.total += results.length;
      categoryResult.results.push(...results);
      allResults.push(...results);

      for (const r of results) {
        switch (r.status) {
          case 'pass': categoryResult.passed++; break;
          case 'fail': categoryResult.failed++; break;
          case 'known_fail': categoryResult.knownFail++; break;
          case 'skip': categoryResult.skipped++; break;
        }
      }

      // "basic" 케이스가 fail이면 basicPassed = false
      if (testCase.id.includes('basic') || testCase.id.includes('display') || testCase.id.includes('text')) {
        if (results.some(r => r.status === 'fail')) {
          categoryResult.basicPassed = false;
        }
      }
    }

    categories[categoryName] = categoryResult;
  }

  // 집계
  const totalAssertions = allResults.length;
  const passed = allResults.filter(r => r.status === 'pass').length;
  const failed = allResults.filter(r => r.status === 'fail').length;
  const knownFail = allResults.filter(r => r.status === 'known_fail').length;
  const skipped = allResults.filter(r => r.status === 'skip').length;
  const failures = allResults.filter(r => r.status === 'fail');
  const knownFailures = allResults.filter(r => r.status === 'known_fail');

  // 준수율: passed / (total - knownFail - skipped)
  const testable = totalAssertions - knownFail - skipped;
  const complianceScore = testable > 0 ? Math.round((passed / testable) * 100) : 0;

  return {
    totalCases: Object.values(categories).reduce((sum, c) => sum + c.results.length, 0),
    totalAssertions,
    passed,
    failed,
    knownFail,
    skipped,
    categories,
    failures,
    knownFailures,
    complianceScore,
  };
}

/** 단일 검증 케이스 실행 */
function runVerificationCase(
  testCase: SpecVerificationCase,
  params: ParameterMap
): AssertionResult[] {
  const style = testCase.style ?? 'display';

  // script style은 현재 measurer가 지원하지 않으므로 display로 처리
  const measureStyle = (style === 'script') ? 'text' : style as 'display' | 'text';

  let measurement;
  try {
    measurement = measureLayout(testCase.latex, measureStyle);
  } catch (err) {
    return testCase.assertions.map(a => ({
      caseId: testCase.id,
      type: a.type,
      status: (testCase.known_fail ? 'known_fail' : 'fail') as 'fail' | 'known_fail',
      expected: a.expected_param ?? a.expected ?? 'unknown',
      actual: null,
      message: `파싱/레이아웃 오류: ${err instanceof Error ? err.message : String(err)}`,
    }));
  }

  return testCase.assertions.map(assertion =>
    evaluateAssertion(
      testCase.id,
      assertion,
      measurement.values,
      measurement.flags,
      params,
      testCase.known_fail ?? false
    )
  );
}

/** spec의 parameters에서 파라미터 맵 구성 */
function buildParameterMap(parameters: LayoutSpec['parameters']): ParameterMap {
  const map: ParameterMap = {};
  for (const [key, param] of Object.entries(parameters)) {
    map[key] = param.value;
  }
  return map;
}
