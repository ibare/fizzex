/**
 * 코퍼스 테스트 실행 후 JSON 결과 저장
 * report.html이 이 JSON을 fetch하여 시각화한다.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { runCorpusTest } from './corpus-runner';

const BASE_DIR = dirname(new URL(import.meta.url).pathname);

async function main() {
  const corpusPath = './combined-corpus.json';
  const resultPath = resolve(BASE_DIR, 'corpus-result.json');

  console.log('코퍼스 테스트 실행 중...\n');
  const report = await runCorpusTest(corpusPath);

  // 기존 history 로드
  let history: { run: string; parseRate: number; parseCleanRate: number; roundTripRate: number; boxRate: number }[] = [];
  if (existsSync(resultPath)) {
    try {
      const prev = JSON.parse(readFileSync(resultPath, 'utf-8'));
      history = prev.history || [];
    } catch { /* 무시 */ }
  }

  // 매 실행마다 기록 추가
  const runEntry = {
    run: new Date().toISOString(),
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
      corpus_version: '1.0',
      fizzex_version: fizzexVersion,
      total_formulas: report.total,
    },
    summary: {
      parse: { pass: report.parseSuccess, fail: report.parseFail, rate: Math.round(report.parseRate * 10) / 10 },
      parseClean: { pass: report.parseClean, fail: report.total - report.parseClean, rate: Math.round(report.parseCleanRate * 10) / 10 },
      roundTrip: { pass: report.roundTripSuccess, fail: report.roundTripFail, rate: Math.round(report.roundTripRate * 10) / 10 },
      box: { pass: report.boxSuccess, fail: report.boxFail, rate: Math.round(report.boxRate * 10) / 10 },
    },
    bySource: report.bySource,
    failurePatterns: report.failurePatterns,
    unsupportedCommands: report.unsupportedCommands,
    failures: report.failures,
    history,
  };

  writeFileSync(resultPath, JSON.stringify(result, null, 2));

  // 결과 요약 출력
  console.log('=== 코퍼스 테스트 결과 ===');
  console.log(`총 수식: ${report.total}`);
  console.log(`파싱: ${report.parseRate.toFixed(1)}% (깨끗: ${report.parseCleanRate.toFixed(1)}%)`);
  console.log(`라운드트립: ${report.roundTripRate.toFixed(1)}%`);
  console.log(`박스: ${report.boxRate.toFixed(1)}%`);
  console.log(`실행 시간: ${report.duration}ms`);
  console.log(`\n결과 저장: ${resultPath}`);
  console.log('Open src/__tests__/corpus/report.html in browser.');
}

main().catch(console.error);
