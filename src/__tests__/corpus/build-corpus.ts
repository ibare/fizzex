/**
 * 통합 코퍼스 빌더
 * fuzz, KaTeX, MathJax 세 소스를 합치고, 전역 중복 제거 후 ID를 재부여한다.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

interface CorpusEntry {
  id: string;
  latex: string;
  source: string;
  category?: string;
  depth?: number;
  elements?: string[];
}

interface Corpus {
  version: string;
  built_date: string;
  sources: {
    fuzz: { count: number; seed: number };
    katex: { count: number; version: string };
    mathjax: { count: number; version: string };
  };
  total: number;
  formulas: CorpusEntry[];
}

const BASE_DIR = dirname(new URL(import.meta.url).pathname);
const FUZZ_DIR = resolve(BASE_DIR, '../fuzz/generated');

function loadFuzzFormulas(): CorpusEntry[] {
  const entries: CorpusEntry[] = [];
  const files = [
    'simple-1000.json',
    'medium-2000.json',
    'complex-2000.json',
    'extreme-1000.json',
    'bigops-500.json',
    'environments-500.json',
  ];

  for (const file of files) {
    const path = resolve(FUZZ_DIR, file);
    if (!existsSync(path)) {
      console.warn(`  경고: ${file} 파일 없음 — 건너뜀`);
      continue;
    }
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const source = 'fuzz-' + file.replace(/\.json$/, '').replace(/-\d+$/, '');
    for (const f of data.formulas) {
      entries.push({
        id: f.id,
        latex: f.latex,
        source,
        depth: f.depth,
        elements: f.elements,
      });
    }
    console.log(`  ${file}: ${data.formulas.length}개`);
  }

  return entries;
}

function loadKatexFormulas(): CorpusEntry[] {
  const path = resolve(BASE_DIR, 'katex-formulas.json');
  if (!existsSync(path)) {
    console.warn('  경고: katex-formulas.json 없음');
    return [];
  }
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  console.log(`  katex-formulas.json: ${data.formulas.length}개`);
  return data.formulas.map((f: any) => ({
    id: f.id,
    latex: f.latex,
    source: 'katex',
    category: f.category,
  }));
}

function loadMathjaxFormulas(): CorpusEntry[] {
  const path = resolve(BASE_DIR, 'mathjax-formulas.json');
  if (!existsSync(path)) {
    console.warn('  경고: mathjax-formulas.json 없음');
    return [];
  }
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  console.log(`  mathjax-formulas.json: ${data.formulas.length}개`);
  return data.formulas.map((f: any) => ({
    id: f.id,
    latex: f.latex,
    source: 'mathjax',
    category: f.category,
  }));
}

function deduplicateAndReindex(entries: CorpusEntry[]): CorpusEntry[] {
  const seen = new Set<string>();
  const unique: CorpusEntry[] = [];

  for (const entry of entries) {
    const normalized = entry.latex.trim();
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push({ ...entry, latex: normalized });
  }

  // ID 재부여
  return unique.map((entry, i) => ({
    ...entry,
    id: `corpus-${String(i + 1).padStart(5, '0')}`,
  }));
}

function buildCorpus(): Corpus {
  console.log('통합 코퍼스 빌드 시작...\n');

  // fuzz 메타데이터
  let fuzzSeed = 12345;
  const metaPath = resolve(FUZZ_DIR, 'metadata.json');
  if (existsSync(metaPath)) {
    const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
    fuzzSeed = meta.base_seed;
  }

  console.log('[1/3] Fuzz 수식 로딩...');
  const fuzz = loadFuzzFormulas();

  console.log('\n[2/3] KaTeX 수식 로딩...');
  const katex = loadKatexFormulas();

  console.log('\n[3/3] MathJax 수식 로딩...');
  const mathjax = loadMathjaxFormulas();

  const all = [...fuzz, ...katex, ...mathjax];
  console.log(`\n통합 전 총 수식: ${all.length}개`);

  const deduplicated = deduplicateAndReindex(all);
  console.log(`중복 제거 후: ${deduplicated.length}개`);

  // katex/mathjax 버전 정보 읽기
  let katexVersion = 'unknown';
  let mathjaxVersion = 'unknown';
  const katexPath = resolve(BASE_DIR, 'katex-formulas.json');
  if (existsSync(katexPath)) {
    katexVersion = JSON.parse(readFileSync(katexPath, 'utf-8')).source_version || 'unknown';
  }
  const mathjaxPath = resolve(BASE_DIR, 'mathjax-formulas.json');
  if (existsSync(mathjaxPath)) {
    mathjaxVersion = JSON.parse(readFileSync(mathjaxPath, 'utf-8')).source_version || 'unknown';
  }

  const corpus: Corpus = {
    version: '1.0',
    built_date: new Date().toISOString().split('T')[0],
    sources: {
      fuzz: { count: fuzz.length, seed: fuzzSeed },
      katex: { count: katex.length, version: katexVersion },
      mathjax: { count: mathjax.length, version: mathjaxVersion },
    },
    total: deduplicated.length,
    formulas: deduplicated,
  };

  return corpus;
}

// CLI 진입점
const corpus = buildCorpus();
const outPath = resolve(BASE_DIR, 'combined-corpus.json');
writeFileSync(outPath, JSON.stringify(corpus, null, 2));
console.log(`\n저장 완료: ${outPath}`);
console.log(`총 ${corpus.total}개 수식`);
