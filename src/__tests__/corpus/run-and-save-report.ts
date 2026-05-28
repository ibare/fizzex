/**
 * 코퍼스 테스트 실행 후 JSON 결과 저장
 * report.html이 이 JSON을 fetch하여 시각화한다.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { runCorpusTest } from './corpus-runner.js';

const BASE_DIR = dirname(new URL(import.meta.url).pathname);

async function main() {
  const verifiedPath = resolve(BASE_DIR, 'combined-corpus-verified.json');
  const corpusPath = existsSync(verifiedPath) ? './combined-corpus-verified.json' : './combined-corpus.json';
  const resultPath = resolve(BASE_DIR, 'corpus-result.json');

  console.log(`코퍼스: ${corpusPath}`);
  console.log('코퍼스 테스트 실행 중...\n');
  const report = await runCorpusTest(corpusPath);

  // 기존 history 로드
  let history: { run: string; parseRate: number; parseCleanRate: number; roundTripRate: number; boxRate: number }[] = [];
  if (existsSync(resultPath)) {
    try {
      const prev = JSON.parse(readFileSync(resultPath, 'utf-8'));
      history = (prev.history || []).filter((h: any) => h.run);
    } catch { /* 무시 */ }
  }

  // 매 실행마다 기록 추가
  const runEntry = {
    run: new Date().toISOString(),
    gradeA: Math.round(report.grades.rateA * 10) / 10,
    gradeB: Math.round(report.grades.rateB * 10) / 10,
    gradeC: Math.round(report.grades.rateC * 10) / 10,
    gradeF: Math.round(report.grades.rateF * 10) / 10,
    parseRate: Math.round(report.parseRate * 10) / 10,
    parseCleanRate: Math.round(report.parseCleanRate * 10) / 10,
    roundTripRate: Math.round(report.roundTripRate * 10) / 10,
    boxRate: Math.round(report.boxRate * 10) / 10,
  };
  history.push(runEntry);

  // 최근 30회만 유지
  if (history.length > 30) history = history.slice(-30);

  // Fizzex 버전 읽기
  let fizzexVersion = '0.1.0';
  try {
    const pkg = JSON.parse(readFileSync(resolve(BASE_DIR, '../../../package.json'), 'utf-8'));
    fizzexVersion = pkg.version;
  } catch { /* 무시 */ }

  // 결과 저장
  const result = {
    meta: {
      generated_at: new Date().toISOString(),
      duration_ms: report.duration,
      corpus_version: '2.0',
      fizzex_version: fizzexVersion,
      total_formulas: report.total,
    },
    summary: {
      grades: {
        A: { count: report.grades.A, rate: Math.round(report.grades.rateA * 10) / 10, label: 'Perfect' },
        B: { count: report.grades.B, rate: Math.round(report.grades.rateB * 10) / 10, label: 'Functional' },
        C: { count: report.grades.C, rate: Math.round(report.grades.rateC * 10) / 10, label: 'Degraded' },
        F: { count: report.grades.F, rate: Math.round(report.grades.rateF * 10) / 10, label: 'Failed' },
      },
      parse: { pass: report.parseSuccess, fail: report.parseFail, rate: Math.round(report.parseRate * 10) / 10 },
      parseClean: { pass: report.parseClean, fail: report.total - report.parseClean, rate: Math.round(report.parseCleanRate * 10) / 10 },
      roundTrip: { pass: report.roundTripSuccess, fail: report.roundTripFail, rate: Math.round(report.roundTripRate * 10) / 10 },
      box: { pass: report.boxSuccess, fail: report.boxFail, rate: Math.round(report.boxRate * 10) / 10 },
    },
    bySource: report.bySource,
    failurePatterns: report.failurePatterns,
    unsupportedCommands: report.unsupportedCommands,
    warningImpact: report.warningImpact,
    failures: report.failures,
    history,
  };

  writeFileSync(resultPath, JSON.stringify(result, null, 2));

  // 결과 요약 출력
  console.log('=== 코퍼스 테스트 결과 ===');
  console.log(`총 수식: ${report.total}`);
  console.log(`\n[등급 분포]`);
  console.log(`  A (Perfect)    : ${report.grades.A.toLocaleString()} (${report.grades.rateA.toFixed(1)}%)`);
  console.log(`  B (Functional) : ${report.grades.B.toLocaleString()} (${report.grades.rateB.toFixed(1)}%)`);
  console.log(`  C (Degraded)   : ${report.grades.C.toLocaleString()} (${report.grades.rateC.toFixed(1)}%)`);
  console.log(`  F (Failed)     : ${report.grades.F.toLocaleString()} (${report.grades.rateF.toFixed(1)}%)`);
  console.log(`\n[경고 영향도]`);
  const wi = report.warningImpact;
  console.log(`  치명적 (파서 구현 필요): ${wi.totalCritical}건`);
  wi.critical.slice(0, 5).forEach(c => console.log(`    ${c.command} x${c.count}`));
  console.log(`  기능 확장 (패키지):      ${wi.totalExtension}건`);
  wi.extension.slice(0, 3).forEach(c => console.log(`    ${c.command} x${c.count} (${c.pkg})`));
  console.log(`  범위 밖 (무시 가능):     ${wi.totalOutOfScope}건`);

  console.log(`\n[상세]`);
  console.log(`  파싱 성공: ${report.parseRate.toFixed(1)}% | 깨끗: ${report.parseCleanRate.toFixed(1)}%`);
  console.log(`  라운드트립: ${report.roundTripRate.toFixed(1)}%`);
  console.log(`  박스: ${report.boxRate.toFixed(1)}%`);
  console.log(`  실행 시간: ${report.duration}ms`);
  console.log(`\n결과 저장: ${resultPath}`);
  console.log('Open src/__tests__/corpus/report.html in browser.');
}

main().catch(console.error);
