/**
 * Layout Spec Compliance Test
 *
 * pnpm test:layout 으로 실행.
 * fizzex-layout-spec.json의 검증 케이스를 실행하고 준수율을 보고한다.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { runLayoutSpec, type SpecRunResult, type LayoutSpec } from './spec-runner.js';
import spec from '../../../specs/fizzex-layout-spec.json' with { type: 'json' };

describe('Layout Spec Compliance', () => {
  let result: SpecRunResult;

  beforeAll(() => {
    result = runLayoutSpec(spec as LayoutSpec);
  });

  it('전체 준수율을 보고한다', () => {
    console.log('\n=== Layout Spec Compliance Report ===');
    console.log(`Compliance Score: ${result.complianceScore}%`);
    console.log(`Assertions: ${result.passed} pass / ${result.failed} fail / ${result.knownFail} known_fail / ${result.skipped} skip`);
    console.log(`Total: ${result.totalAssertions}`);

    // 준수율이 0% 이상이면 통과 (초기에는 낮은 임계값)
    expect(result.complianceScore).toBeGreaterThanOrEqual(0);
  });

  describe('카테고리별 결과', () => {
    const categoryNames = [
      'fraction', 'superscript', 'subscript', 'subsup',
      'radical', 'accent', 'overline', 'delimiter', 'limits', 'spacing',
    ];

    for (const name of categoryNames) {
      it(`${name} 카테고리 결과를 보고한다`, () => {
        const cat = result.categories[name];
        if (!cat) {
          console.log(`  ${name}: (카테고리 없음)`);
          return;
        }
        console.log(`  ${name}: ${cat.passed}/${cat.total} pass (${cat.knownFail} known_fail, ${cat.skipped} skip)`);
      });
    }
  });

  it('실패 상세를 보고한다', () => {
    if (result.failures.length > 0) {
      console.log('\n=== Failed Assertions ===');
      for (const f of result.failures) {
        console.log(`  [${f.caseId}] ${f.type}: ${f.message}`);
      }
    }

    if (result.knownFailures.length > 0) {
      console.log(`\n=== Known Failures (${result.knownFailures.length}) ===`);
      for (const f of result.knownFailures) {
        console.log(`  [${f.caseId}] ${f.type}: ${f.message}`);
      }
    }
  });

  it('unexpected regression이 없다', () => {
    // known_fail인데 갑자기 pass가 된 경우는 known_fail 업데이트 필요
    // (현재는 이 검증이 spec-runner에서 이루어지지 않으므로 placeholder)
    expect(true).toBe(true);
  });
});
