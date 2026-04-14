/**
 * pdflatex 기반 코퍼스 정제
 *
 * combined-corpus.json의 모든 수식을 pdflatex로 컴파일하여
 * 유효한 LaTeX만 남긴다.
 *
 * 실행: pnpm corpus:pdflatex-filter
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { execFile } from 'child_process';
import { tmpdir } from 'os';
import { cpus } from 'os';

const BASE_DIR = dirname(new URL(import.meta.url).pathname);

// ─── 설정 ─────────────────────────────────────────────────

const CONCURRENCY = Math.max(1, cpus().length - 2);
const TIMEOUT_MS = 5000;
const PDFLATEX = '/Library/TeX/texbin/pdflatex';

const PREAMBLE = `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{amsfonts}
\\usepackage{mathtools}
\\usepackage{bm}
\\usepackage{cancel}
\\usepackage{xcolor}
\\begin{document}
`;

const POSTAMBLE = `
\\end{document}
`;

// ─── 타입 ─────────────────────────────────────────────────

interface CorpusEntry {
  id: string;
  latex: string;
  source: string;
  depth?: number;
  elements?: string[];
}

interface FilterResult {
  id: string;
  valid: boolean;
  mode: 'inline' | 'display' | null;
  error?: string;
}

// ─── pdflatex 실행 ────────────────────────────────────────

function runPdflatex(texContent: string, workDir: string, filename: string): Promise<{ success: boolean; error: string }> {
  return new Promise((res) => {
    const texPath = resolve(workDir, `${filename}.tex`);
    writeFileSync(texPath, texContent);

    const proc = execFile(
      PDFLATEX,
      ['-interaction=nonstopmode', '-halt-on-error', `-output-directory=${workDir}`, texPath],
      { timeout: TIMEOUT_MS },
      (err, stdout) => {
        if (!err) {
          res({ success: true, error: '' });
        } else {
          // pdflatex은 에러를 stdout에 출력 (! 로 시작하는 라인)
          const lines = (stdout || '').split('\n');
          const errorLine = lines.find(l => l.startsWith('!')) || '';

          // stdout에 없으면 .log 파일에서 추출
          if (!errorLine) {
            try {
              const logPath = resolve(workDir, `${filename}.log`);
              const logContent = readFileSync(logPath, 'utf-8');
              const logError = logContent.split('\n').find(l => l.startsWith('!')) || '';
              res({ success: false, error: logError || 'Unknown error' });
              return;
            } catch { /* log 파일 없음 */ }
          }

          res({ success: false, error: errorLine || 'Unknown error' });
        }
      },
    );

    proc.on('error', () => {
      res({ success: false, error: 'Process error' });
    });
  });
}

async function testFormula(latex: string, workDir: string, filename: string): Promise<{ valid: boolean; mode: 'inline' | 'display' | null; error: string }> {
  // 1차: inline math ($...$)
  const inlineTex = `${PREAMBLE}$${latex}$${POSTAMBLE}`;
  const r1 = await runPdflatex(inlineTex, workDir, filename);
  if (r1.success) return { valid: true, mode: 'inline', error: '' };

  // 2차: display math (\[...\])
  const displayTex = `${PREAMBLE}\\[${latex}\\]${POSTAMBLE}`;
  const r2 = await runPdflatex(displayTex, workDir, `${filename}_d`);
  if (r2.success) return { valid: true, mode: 'display', error: '' };

  return { valid: false, mode: null, error: r1.error };
}

// ─── 병렬 실행 ───────────────────────────────────────────

async function processInBatches(
  formulas: CorpusEntry[],
  concurrency: number,
): Promise<FilterResult[]> {
  const results: FilterResult[] = new Array(formulas.length);
  let nextIdx = 0;
  let completed = 0;
  const total = formulas.length;
  const startTime = Date.now();

  // 각 워커에 고유 임시 디렉터리 할당
  const workerDirs: string[] = [];
  for (let i = 0; i < concurrency; i++) {
    const dir = resolve(tmpdir(), `fizzex-pdflatex-${Date.now()}-${i}`);
    mkdirSync(dir, { recursive: true });
    workerDirs.push(dir);
  }

  async function worker(workerId: number) {
    const workDir = workerDirs[workerId];
    while (true) {
      const idx = nextIdx++;
      if (idx >= total) break;

      const formula = formulas[idx];
      const { valid, mode, error } = await testFormula(formula.latex, workDir, `f${idx}`);

      results[idx] = {
        id: formula.id,
        valid,
        mode,
        error: valid ? undefined : error,
      };

      completed++;
      if (completed % 1000 === 0 || completed === total) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = (completed / total * 100).toFixed(1);
        const validSoFar = results.filter(r => r?.valid).length;
        console.log(`  [${completed}/${total}] ${rate}% | ${elapsed}s | valid: ${validSoFar}`);
      }
    }
  }

  // 워커 병렬 실행
  await Promise.all(
    Array.from({ length: concurrency }, (_, i) => worker(i)),
  );

  // 임시 디렉터리 정리
  for (const dir of workerDirs) {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* 무시 */ }
  }

  return results;
}

// ─── 에러 패턴 분석 ──────────────────────────────────────

function analyzeErrors(results: FilterResult[], formulas: CorpusEntry[]): { pattern: string; count: number; examples: string[] }[] {
  const clusters = new Map<string, { count: number; examples: string[] }>();

  for (let i = 0; i < results.length; i++) {
    if (results[i].valid) continue;
    const raw = results[i].error || 'unknown';

    // 에러 메시지를 패턴으로 일반화
    let pattern = raw;
    if (raw.includes('Undefined control sequence')) pattern = 'Undefined control sequence';
    else if (raw.includes('Missing $ inserted')) pattern = 'Missing $ inserted';
    else if (raw.includes('Missing { inserted')) pattern = 'Missing { inserted';
    else if (raw.includes('Missing } inserted')) pattern = 'Missing } inserted';
    else if (raw.includes('Extra }')) pattern = 'Extra }';
    else if (raw.includes('Double superscript')) pattern = 'Double superscript';
    else if (raw.includes('Double subscript')) pattern = 'Double subscript';
    else if (raw.includes('Extra alignment')) pattern = 'Extra alignment tab';
    else if (raw.includes('Misplaced alignment')) pattern = 'Misplaced alignment tab';
    else if (raw.includes('Environment') && raw.includes('undefined')) pattern = 'Undefined environment';
    else if (raw.includes('Runaway argument')) pattern = 'Runaway argument';
    else if (raw.includes('Illegal unit')) pattern = 'Illegal unit of measure';
    else if (raw.includes('Process error') || raw.includes('TIMEOUT')) pattern = 'Timeout';
    else pattern = raw.substring(0, 60);

    const existing = clusters.get(pattern);
    if (existing) {
      existing.count++;
      if (existing.examples.length < 3) existing.examples.push(formulas[i].latex.substring(0, 100));
    } else {
      clusters.set(pattern, { count: 1, examples: [formulas[i].latex.substring(0, 100)] });
    }
  }

  return [...clusters.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([pattern, data]) => ({ pattern, count: data.count, examples: data.examples }));
}

// ─── 메인 ─────────────────────────────────────────────────

async function main() {
  // 코퍼스 로드
  const corpusPath = resolve(BASE_DIR, 'combined-corpus.json');
  const corpus = JSON.parse(readFileSync(corpusPath, 'utf-8'));
  const formulas: CorpusEntry[] = corpus.formulas;
  const total = formulas.length;

  console.log(`=== pdflatex 코퍼스 필터 ===`);
  console.log(`총 수식: ${total.toLocaleString()}`);
  console.log(`병렬 워커: ${CONCURRENCY}`);
  console.log(`타임아웃: ${TIMEOUT_MS}ms\n`);

  // pdflatex 검증
  const startTime = Date.now();
  const results = await processInBatches(formulas, CONCURRENCY);
  const duration = Date.now() - startTime;

  // 결과 분류
  const validFormulas: CorpusEntry[] = [];
  const invalidFormulas: { entry: CorpusEntry; error?: string; mode?: string | null }[] = [];

  for (let i = 0; i < total; i++) {
    if (results[i].valid) {
      validFormulas.push(formulas[i]);
    } else {
      invalidFormulas.push({
        entry: formulas[i],
        error: results[i].error,
      });
    }
  }

  // 소스별 통계
  const bySource: Record<string, { total: number; valid: number; invalid: number }> = {};
  for (let i = 0; i < total; i++) {
    const src = formulas[i].source;
    if (!bySource[src]) bySource[src] = { total: 0, valid: 0, invalid: 0 };
    bySource[src].total++;
    if (results[i].valid) bySource[src].valid++;
    else bySource[src].invalid++;
  }

  // 에러 패턴 분석
  const errorPatterns = analyzeErrors(results, formulas);

  // ── 파일 출력 ──

  // 1. 정제된 코퍼스
  const verifiedCorpus = {
    ...corpus,
    total: validFormulas.length,
    formulas: validFormulas,
    filtered: {
      original_total: total,
      removed: invalidFormulas.length,
      filter: 'pdflatex',
      filtered_at: new Date().toISOString(),
    },
  };
  const verifiedPath = resolve(BASE_DIR, 'combined-corpus-verified.json');
  writeFileSync(verifiedPath, JSON.stringify(verifiedCorpus, null, 2));

  // 2. 제거된 수식
  const rejectedPath = resolve(BASE_DIR, 'rejected-by-pdflatex.json');
  writeFileSync(rejectedPath, JSON.stringify({
    total: invalidFormulas.length,
    entries: invalidFormulas.map(({ entry, error }) => ({
      id: entry.id,
      latex: entry.latex,
      source: entry.source,
      error,
    })),
  }, null, 2));

  // 3. 필터링 리포트
  const report = {
    total_tested: total,
    valid: validFormulas.length,
    invalid: invalidFormulas.length,
    valid_rate: Math.round((validFormulas.length / total) * 1000) / 10,
    duration_ms: duration,
    concurrency: CONCURRENCY,
    bySource: Object.fromEntries(
      Object.entries(bySource)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([k, v]) => [k, { ...v, valid_rate: Math.round((v.valid / v.total) * 1000) / 10 }]),
    ),
    top_invalid_reasons: errorPatterns.slice(0, 20),
  };
  const reportPath = resolve(BASE_DIR, 'pdflatex-filter-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // ── 콘솔 요약 ──
  console.log(`\n${'='.repeat(50)}`);
  console.log('pdflatex Filter Report');
  console.log('='.repeat(50));
  console.log(`Total: ${total.toLocaleString()}`);
  console.log(`Valid: ${validFormulas.length.toLocaleString()} (${report.valid_rate}%)`);
  console.log(`Invalid: ${invalidFormulas.length.toLocaleString()} (${(100 - report.valid_rate).toFixed(1)}%) — removed`);
  console.log(`Duration: ${(duration / 1000).toFixed(1)}s\n`);

  console.log('By source:');
  Object.entries(report.bySource)
    .forEach(([src, s]) => {
      const removedPct = s.total > 0 ? ((s.invalid / s.total) * 100).toFixed(1) : '0';
      console.log(`  ${src.padEnd(20)} ${s.valid}/${s.total} valid (${s.valid_rate}%) — ${removedPct}% removed`);
    });

  console.log('\nTop rejection reasons:');
  errorPatterns.slice(0, 10).forEach(p => {
    console.log(`  ${p.pattern}: ${p.count}`);
    console.log(`    ex: ${p.examples[0]?.substring(0, 70)}`);
  });

  console.log(`\n출력 파일:`);
  console.log(`  정제 코퍼스: ${verifiedPath}`);
  console.log(`  제거 목록:   ${rejectedPath}`);
  console.log(`  리포트:      ${reportPath}`);
}

main().catch(console.error);
