/**
 * Report Generator
 *
 * SpecRunResult를 마크다운 형식의 리포트로 변환.
 * pnpm test:layout:report 로 실행.
 */

import { runLayoutSpec, type SpecRunResult, type LayoutSpec } from './spec-runner';
import spec from '../../../specs/fizzex-layout-spec.json';
import * as fs from 'node:fs';
import * as path from 'node:path';

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

  const reportPath = path.resolve(__dirname, '../../../docs/layout-compliance-report.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report, 'utf-8');

  console.log(report);
  console.log(`\nReport saved to: ${reportPath}`);
}

main();
