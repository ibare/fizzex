/**
 * 3엔진 비교 테스트 러너
 *
 * Fizzex, KaTeX, MathJax를 동일 코퍼스에 돌려
 * 업계 기준 대비 Fizzex 위치를 파악한다.
 *
 * 실행: pnpm corpus:compare
 * 출력: comparison-result.json → report.html에서 시각화
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { categorizeError } from './corpus-runner';
import { fizzexEngine } from './engines/fizzex-engine';
import { katexEngine } from './engines/katex-engine';
import { mathjaxEngine } from './engines/mathjax-engine';
import type { Engine, EngineResult } from './engines/types';

const BASE_DIR = dirname(new URL(import.meta.url).pathname);

// ─── 타입 정의 ────────────────────────────────────────────

interface CorpusEntry {
  id: string;
  latex: string;
  source: string;
}

type Classification =
  | 'all-pass'
  | 'fizzex-only-fail'
  | 'fizzex-and-one'
  | 'all-fail'
  | 'fizzex-only-pass'
  | 'partial';

type Priority = 'critical' | 'high' | 'medium' | 'low' | 'none';

interface ComparisonEntry {
  id: string;
  latex: string;
  source: string;
  fizzex: EngineResult;
  katex: EngineResult;
  mathjax: EngineResult;
  classification: Classification;
  priority: Priority;
}

interface VisualSample {
  id: string;
  latex: string;
  source: string;
}

interface ErrorCluster {
  pattern: string;
  count: number;
  percent: number;
  cumulativePercent: number;
  examples: string[];
}

interface EngineSummary {
  parsePass: number;
  renderPass: number;
  parseRate: number;
  renderRate: number;
}

interface SourceEngineStats {
  total: number;
  fizzex: { parsePass: number; renderPass: number };
  katex: { parsePass: number; renderPass: number };
  mathjax: { parsePass: number; renderPass: number };
}

interface ComparisonReport {
  meta: {
    generated_at: string;
    duration_ms: number;
    corpus_version: string;
    total_formulas: number;
    engines: { name: string; version: string }[];
  };
  summary: {
    fizzex: EngineSummary;
    katex: EngineSummary;
    mathjax: EngineSummary;
  };
  bySource: Record<string, SourceEngineStats>;
  classifications: Record<Classification, number>;
  criticalClusters: ErrorCluster[];
  visualSamples: {
    allFail: VisualSample[];
    fizzexOnlyPass: VisualSample[];
    critical: VisualSample[];
  };
  entries: ComparisonEntry[];
}

// ─── 분류 로직 ────────────────────────────────────────────

function classify(f: EngineResult, k: EngineResult, m: EngineResult): { classification: Classification; priority: Priority } {
  const fPass = f.parseSuccess;
  const kPass = k.parseSuccess;
  const mPass = m.parseSuccess;

  if (fPass && kPass && mPass)   return { classification: 'all-pass', priority: 'none' };
  if (!fPass && kPass && mPass)  return { classification: 'fizzex-only-fail', priority: 'critical' };
  if (!fPass && kPass && !mPass) return { classification: 'fizzex-and-one', priority: 'high' };
  if (!fPass && !kPass && mPass) return { classification: 'fizzex-and-one', priority: 'high' };
  if (!fPass && !kPass && !mPass) return { classification: 'all-fail', priority: 'low' };
  if (fPass && !kPass && !mPass) return { classification: 'fizzex-only-pass', priority: 'none' };
  // fPass && (kPass XOR mPass)
  return { classification: 'partial', priority: 'none' };
}

// ─── CRITICAL 에러 클러스터링 ──────────────────────────────

function clusterCriticalErrors(criticals: ComparisonEntry[]): ErrorCluster[] {
  const clusters = new Map<string, { count: number; examples: string[] }>();

  for (const entry of criticals) {
    const errorMsg = entry.fizzex.parseError || entry.fizzex.renderError || 'unknown';
    const pattern = categorizeError(errorMsg);

    const existing = clusters.get(pattern);
    if (existing) {
      existing.count++;
      if (existing.examples.length < 3) {
        existing.examples.push(entry.latex.substring(0, 100));
      }
    } else {
      clusters.set(pattern, { count: 1, examples: [entry.latex.substring(0, 100)] });
    }
  }

  const sorted = [...clusters.entries()]
    .sort((a, b) => b[1].count - a[1].count);

  const total = criticals.length;
  let cumulative = 0;

  return sorted.map(([pattern, data]) => {
    cumulative += data.count;
    return {
      pattern,
      count: data.count,
      percent: total > 0 ? Math.round((data.count / total) * 1000) / 10 : 0,
      cumulativePercent: total > 0 ? Math.round((cumulative / total) * 1000) / 10 : 0,
      examples: data.examples,
    };
  });
}

// ─── 시각 검증 샘플 추출 ──────────────────────────────────

function sampleWithDiversity(entries: ComparisonEntry[], count: number): VisualSample[] {
  if (entries.length === 0) return [];

  // 짧은 수식 우선 (시각 검증에 적합), 너무 짧은 것은 제외
  const sorted = [...entries]
    .filter(e => e.latex.length >= 5 && e.latex.length <= 200)
    .sort((a, b) => a.latex.length - b.latex.length);

  if (sorted.length === 0) return entries.slice(0, count).map(e => ({ id: e.id, latex: e.latex, source: e.source }));

  // 소스별 그룹화 후 라운드 로빈
  const bySource = new Map<string, ComparisonEntry[]>();
  for (const e of sorted) {
    const arr = bySource.get(e.source) || [];
    arr.push(e);
    bySource.set(e.source, arr);
  }

  const result: VisualSample[] = [];
  const sources = [...bySource.keys()];
  let si = 0;
  while (result.length < count) {
    const src = sources[si % sources.length];
    const arr = bySource.get(src)!;
    if (arr.length > 0) {
      const e = arr.shift()!;
      result.push({ id: e.id, latex: e.latex, source: e.source });
    }
    si++;
    if ([...bySource.values()].every(a => a.length === 0)) break;
  }

  return result;
}

// ─── 메인 러너 ────────────────────────────────────────────

async function runComparisonTest(): Promise<ComparisonReport> {
  // 코퍼스 로드
  const corpusPath = resolve(BASE_DIR, 'combined-corpus.json');
  const corpus = JSON.parse(readFileSync(corpusPath, 'utf-8'));
  const formulas: CorpusEntry[] = corpus.formulas;
  const total = formulas.length;

  console.log(`코퍼스 로드 완료: ${total}개 수식`);
  console.log(`엔진: Fizzex, KaTeX, MathJax\n`);

  const engines: Engine[] = [fizzexEngine, katexEngine, mathjaxEngine];

  // 통계 초기화
  const summary = {
    fizzex: { parsePass: 0, renderPass: 0, parseRate: 0, renderRate: 0 },
    katex: { parsePass: 0, renderPass: 0, parseRate: 0, renderRate: 0 },
    mathjax: { parsePass: 0, renderPass: 0, parseRate: 0, renderRate: 0 },
  };

  const bySource: Record<string, SourceEngineStats> = {};
  const classifications: Record<Classification, number> = {
    'all-pass': 0,
    'fizzex-only-fail': 0,
    'fizzex-and-one': 0,
    'all-fail': 0,
    'fizzex-only-pass': 0,
    'partial': 0,
  };

  const entries: ComparisonEntry[] = [];
  const startTime = Date.now();

  // 수식별 테스트
  for (let i = 0; i < total; i++) {
    const formula = formulas[i];

    // 진행 표시
    if ((i + 1) % 2000 === 0 || i === total - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  [${i + 1}/${total}] ${elapsed}s 경과`);
    }

    // 3엔진 테스트
    const fResult = fizzexEngine.test(formula.latex);
    const kResult = katexEngine.test(formula.latex);
    const mResult = mathjaxEngine.test(formula.latex);

    // 분류
    const { classification, priority } = classify(fResult, kResult, mResult);
    classifications[classification]++;

    // 엔진별 통계
    if (fResult.parseSuccess) summary.fizzex.parsePass++;
    if (fResult.renderSuccess) summary.fizzex.renderPass++;
    if (kResult.parseSuccess) summary.katex.parsePass++;
    if (kResult.renderSuccess) summary.katex.renderPass++;
    if (mResult.parseSuccess) summary.mathjax.parsePass++;
    if (mResult.renderSuccess) summary.mathjax.renderPass++;

    // 소스별 통계
    const src = formula.source;
    if (!bySource[src]) {
      bySource[src] = {
        total: 0,
        fizzex: { parsePass: 0, renderPass: 0 },
        katex: { parsePass: 0, renderPass: 0 },
        mathjax: { parsePass: 0, renderPass: 0 },
      };
    }
    const ss = bySource[src];
    ss.total++;
    if (fResult.parseSuccess) ss.fizzex.parsePass++;
    if (fResult.renderSuccess) ss.fizzex.renderPass++;
    if (kResult.parseSuccess) ss.katex.parsePass++;
    if (kResult.renderSuccess) ss.katex.renderPass++;
    if (mResult.parseSuccess) ss.mathjax.parsePass++;
    if (mResult.renderSuccess) ss.mathjax.renderPass++;

    // all-pass 제외하고 저장 (파일 크기 절약)
    if (classification !== 'all-pass') {
      entries.push({
        id: formula.id,
        latex: formula.latex,
        source: formula.source,
        fizzex: fResult,
        katex: kResult,
        mathjax: mResult,
        classification,
        priority,
      });
    }
  }

  const duration = Date.now() - startTime;

  // 비율 계산
  summary.fizzex.parseRate = Math.round((summary.fizzex.parsePass / total) * 1000) / 10;
  summary.fizzex.renderRate = Math.round((summary.fizzex.renderPass / total) * 1000) / 10;
  summary.katex.parseRate = Math.round((summary.katex.parsePass / total) * 1000) / 10;
  summary.katex.renderRate = Math.round((summary.katex.renderPass / total) * 1000) / 10;
  summary.mathjax.parseRate = Math.round((summary.mathjax.parsePass / total) * 1000) / 10;
  summary.mathjax.renderRate = Math.round((summary.mathjax.renderPass / total) * 1000) / 10;

  // CRITICAL 클러스터링
  const criticals = entries.filter(e => e.classification === 'fizzex-only-fail');
  const criticalClusters = clusterCriticalErrors(criticals);

  // 시각 검증 샘플 추출 (3그룹 x 5개)
  const visualSamples = {
    allFail: sampleWithDiversity(entries.filter(e => e.classification === 'all-fail'), 5),
    fizzexOnlyPass: sampleWithDiversity(entries.filter(e => e.classification === 'fizzex-only-pass'), 5),
    critical: sampleWithDiversity(criticals, 5),
  };

  // 버전 정보
  let katexVersion = '0.16.27';
  let mathjaxVersion = '3.2.2';
  let fizzexVersion = '0.1.0';
  try {
    const pkg = JSON.parse(readFileSync(resolve(BASE_DIR, '../../../package.json'), 'utf-8'));
    fizzexVersion = pkg.version;
    katexVersion = pkg.devDependencies?.katex?.replace('^', '') || katexVersion;
    mathjaxVersion = pkg.devDependencies?.['mathjax-full']?.replace('^', '') || mathjaxVersion;
  } catch { /* 무시 */ }

  return {
    meta: {
      generated_at: new Date().toISOString(),
      duration_ms: duration,
      corpus_version: corpus.version || '2.0',
      total_formulas: total,
      engines: [
        { name: 'fizzex', version: fizzexVersion },
        { name: 'katex', version: katexVersion },
        { name: 'mathjax', version: mathjaxVersion },
      ],
    },
    summary,
    bySource,
    classifications,
    criticalClusters,
    visualSamples,
    entries,
  };
}

// ─── CLI 실행 ─────────────────────────────────────────────

async function main() {
  const report = await runComparisonTest();
  const resultPath = resolve(BASE_DIR, 'comparison-result.json');
  writeFileSync(resultPath, JSON.stringify(report, null, 2));

  // Fizzex 브라우저 번들 + 폰트를 corpus 디렉터리에 복사 (report.html의 시각 샘플용)
  const bundleSrc = resolve(BASE_DIR, '../../../dist/browser/fizzex-export.js');
  const bundleDst = resolve(BASE_DIR, 'fizzex-export.js');
  if (existsSync(bundleSrc)) {
    copyFileSync(bundleSrc, bundleDst);
    console.log(`Fizzex 번들 복사: ${bundleDst}`);
  }
  const fontSrc = resolve(BASE_DIR, '../../../fonts/NewCMMath-Regular.woff2');
  const fontDst = resolve(BASE_DIR, 'NewCMMath-Regular.woff2');
  if (existsSync(fontSrc)) {
    copyFileSync(fontSrc, fontDst);
    console.log(`폰트 복사: ${fontDst}`);
  }

  // 결과 요약 출력
  const { summary: s, classifications: c, meta, criticalClusters } = report;
  const total = meta.total_formulas;

  console.log(`\n${'='.repeat(60)}`);
  console.log('3-ENGINE COMPARISON REPORT');
  console.log('='.repeat(60));
  console.log(`총 수식: ${total.toLocaleString()} | 실행 시간: ${(meta.duration_ms / 1000).toFixed(1)}s\n`);

  console.log('[엔진별 파싱 성공률]');
  console.log(`  Fizzex  : ${s.fizzex.parseRate}% (${s.fizzex.parsePass.toLocaleString()}/${total.toLocaleString()})`);
  console.log(`  KaTeX   : ${s.katex.parseRate}% (${s.katex.parsePass.toLocaleString()}/${total.toLocaleString()})`);
  console.log(`  MathJax : ${s.mathjax.parseRate}% (${s.mathjax.parsePass.toLocaleString()}/${total.toLocaleString()})`);

  console.log('\n[엔진별 렌더 성공률]');
  console.log(`  Fizzex  : ${s.fizzex.renderRate}% (${s.fizzex.renderPass.toLocaleString()}/${total.toLocaleString()})`);
  console.log(`  KaTeX   : ${s.katex.renderRate}% (${s.katex.renderPass.toLocaleString()}/${total.toLocaleString()})`);
  console.log(`  MathJax : ${s.mathjax.renderRate}% (${s.mathjax.renderPass.toLocaleString()}/${total.toLocaleString()})`);

  console.log('\n[수식 분류]');
  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`;
  console.log(`  All Pass          : ${c['all-pass'].toLocaleString()} (${pct(c['all-pass'])})`);
  console.log(`  Fizzex Only Fail  : ${c['fizzex-only-fail'].toLocaleString()} (${pct(c['fizzex-only-fail'])}) ← CRITICAL`);
  console.log(`  Fizzex + One Fail : ${c['fizzex-and-one'].toLocaleString()} (${pct(c['fizzex-and-one'])}) ← HIGH`);
  console.log(`  All Fail          : ${c['all-fail'].toLocaleString()} (${pct(c['all-fail'])})`);
  console.log(`  Fizzex Only Pass  : ${c['fizzex-only-pass'].toLocaleString()} (${pct(c['fizzex-only-pass'])})`);
  console.log(`  Partial           : ${c['partial'].toLocaleString()} (${pct(c['partial'])})`);

  if (criticalClusters.length > 0) {
    console.log('\n[CRITICAL 실패 원인 Top 10]');
    criticalClusters.slice(0, 10).forEach((cl, i) => {
      console.log(`  ${i + 1}. ${cl.pattern} — ${cl.count}건 (${cl.percent}%, 누적 ${cl.cumulativePercent}%)`);
      console.log(`     예시: ${cl.examples[0]?.substring(0, 80)}`);
    });
  }

  console.log('\n[소스별 비교]');
  Object.entries(report.bySource)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([source, stats]) => {
      const fRate = stats.total > 0 ? ((stats.fizzex.parsePass / stats.total) * 100).toFixed(1) : '0';
      const kRate = stats.total > 0 ? ((stats.katex.parsePass / stats.total) * 100).toFixed(1) : '0';
      const mRate = stats.total > 0 ? ((stats.mathjax.parsePass / stats.total) * 100).toFixed(1) : '0';
      const best = Math.max(Number(kRate), Number(mRate));
      const gap = (best - Number(fRate)).toFixed(1);
      console.log(`  ${source.padEnd(18)} Fizzex ${fRate}% | KaTeX ${kRate}% | MathJax ${mRate}% | GAP ${gap}%`);
    });

  // 시각 검증 샘플 요약
  const vs = report.visualSamples;
  console.log(`\n[시각 검증 샘플]`);
  console.log(`  All Fail        : ${vs.allFail.length}개`);
  console.log(`  Fizzex Only Pass: ${vs.fizzexOnlyPass.length}개`);
  console.log(`  Critical        : ${vs.critical.length}개`);

  console.log(`\n결과 저장: ${resultPath}`);
  console.log('report.html을 브라우저에서 열어 시각화를 확인하세요.');
}

main().catch(console.error);
