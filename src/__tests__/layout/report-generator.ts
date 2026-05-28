/**
 * Report Generator
 *
 * SpecRunResult를 마크다운 형식의 리포트로 변환.
 * pnpm test:layout:report 로 실행.
 */

import { runLayoutSpec, type SpecRunResult, type LayoutSpec } from './spec-runner.js';
import spec from '../../../specs/fizzex-layout-spec.json' with { type: 'json' };
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function generateReport(result: SpecRunResult): string {
  const lines: string[] = [];
  const now = new Date().toISOString().split('T')[0];

  lines.push('# Fizzex Layout Compliance Report');
  lines.push(`Generated: ${now}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push(`- Compliance Score: **${result.complianceScore}%**`);
  lines.push(`- Passed: ${result.passed} / ${result.totalAssertions} assertions`);
  lines.push(`- Failed: ${result.failed} | Known Fail: ${result.knownFail} | Skipped: ${result.skipped}`);
  lines.push('');

  // Category Results
  lines.push('## Category Results');
  lines.push('| Category | Pass | Fail | Known Fail | Skip | Score |');
  lines.push('|----------|------|------|------------|------|-------|');

  for (const [name, cat] of Object.entries(result.categories)) {
    const testable = cat.total - cat.knownFail - cat.skipped;
    const score = testable > 0 ? Math.round((cat.passed / testable) * 100) : 0;
    lines.push(`| ${name} | ${cat.passed} | ${cat.failed} | ${cat.knownFail} | ${cat.skipped} | ${score}% |`);
  }
  lines.push('');

  // Top Issues
  if (result.failures.length > 0) {
    lines.push('## Top Issues');
    const sorted = [...result.failures].sort((a, b) => {
      const aDiff = typeof a.diff === 'number' ? a.diff : Infinity;
      const bDiff = typeof b.diff === 'number' ? b.diff : Infinity;
      return bDiff - aDiff;
    });
    for (const f of sorted.slice(0, 10)) {
      const diffStr = f.diff !== undefined ? ` (diff: ${f.diff.toFixed(4)})` : '';
      lines.push(`- **[${f.caseId}] ${f.type}**: expected ${f.expected}, got ${f.actual}${diffStr}`);
    }
    lines.push('');
  }

  // Known Failures
  if (result.knownFailures.length > 0) {
    lines.push('## Known Failures');
    lines.push(`Total: ${result.knownFailures.length} assertions`);
    lines.push('');
    for (const f of result.knownFailures) {
      lines.push(`- [${f.caseId}] ${f.type}: ${f.message}`);
    }
    lines.push('');
  }


  return lines.join('\n');
}

// CLI 실행
function main() {
  const result = runLayoutSpec(spec as LayoutSpec);
  const report = generateReport(result);

  // 마크다운 리포트 저장
  const reportPath = path.resolve(__dirname, '../../../docs/layout-compliance-report.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report, 'utf-8');

  // JSON 결과 저장 (corpus report.html에서 참조)
  const jsonResult = {
    meta: {
      generated_at: new Date().toISOString(),
    },
    complianceScore: result.complianceScore,
    totalAssertions: result.totalAssertions,
    passed: result.passed,
    failed: result.failed,
    knownFail: result.knownFail,
    skipped: result.skipped,
    categories: Object.fromEntries(
      Object.entries(result.categories).map(([name, cat]) => {
        const testable = cat.total - cat.knownFail - cat.skipped;
        const score = testable > 0 ? Math.round((cat.passed / testable) * 100) : 0;
        return [name, {
          total: cat.total,
          passed: cat.passed,
          failed: cat.failed,
          knownFail: cat.knownFail,
          skipped: cat.skipped,
          score,
        }];
      }),
    ),
    topIssues: result.failures
      .sort((a, b) => {
        const aDiff = typeof a.diff === 'number' ? a.diff : Infinity;
        const bDiff = typeof b.diff === 'number' ? b.diff : Infinity;
        return bDiff - aDiff;
      })
      .slice(0, 10)
      .map(f => ({
        caseId: f.caseId,
        type: f.type,
        expected: f.expected,
        actual: f.actual,
        diff: f.diff,
        message: f.message,
      })),
    knownFailures: result.knownFailures.map(f => ({
      caseId: f.caseId,
      type: f.type,
      message: f.message,
    })),
  };

  const jsonPath = path.resolve(__dirname, '../corpus/layout-result.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonResult, null, 2), 'utf-8');

  // 콘솔 요약
  console.log('=== 레이아웃 준수도 테스트 결과 ===');
  console.log(`준수율: ${result.complianceScore}%`);
  console.log(`Pass: ${result.passed} / ${result.totalAssertions}`);
  console.log(`Fail: ${result.failed} | Known Fail: ${result.knownFail} | Skip: ${result.skipped}`);
  console.log(`\n마크다운 저장: ${reportPath}`);
  console.log(`JSON 저장: ${jsonPath}`);
}

main();
