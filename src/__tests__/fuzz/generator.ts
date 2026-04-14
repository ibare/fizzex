/**
 * 문법 기반 LaTeX 수식 퍼즈 생성기
 *
 * 문법 규칙을 재귀적으로 확장하여 유효한 LaTeX 수식을 자동 생성한다.
 * 시드 기반 결정론적 난수로 재현 가능.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { GRAMMAR, TERMINALS, RECURSIVE_RULES, isInFizzex } from './grammar';

// --- 시드 기반 PRNG (Mulberry32) ---

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- 타입 ---

export interface GeneratorOptions {
  maxDepth: number;
  maxWidth: number;
  seed: number;
  count: number;
  includeSpacing: boolean;
  includeFonts: boolean;
  includeBigOps: boolean;
  includeEnvironments: boolean;
}

interface FormulaEntry {
  id: string;
  latex: string;
  depth: number;
  elements: string[];
  fizzexCoverage: 'full' | 'mixed' | 'unknown';
  unknownCommands: string[];
}

interface GeneratedCorpus {
  generator: string;
  seed: number;
  generated_date: string;
  options: Omit<GeneratorOptions, 'seed' | 'count'>;
  formulas: FormulaEntry[];
}

// --- 커버리지 분석 ---

// 파서 레벨에서 직접 처리되는 명령어 (command registry에 없지만 지원됨)
const PARSER_BUILTINS = new Set([
  '\\left', '\\right', '\\begin', '\\end', '\\text',
  '\\limits', '\\nolimits', '\\middle',
]);

function analyzeCoverage(latex: string): { coverage: 'full' | 'mixed' | 'unknown'; unknownCommands: string[] } {
  // 수식에서 백슬래시 명령어 추출
  const cmdRegex = /\\([a-zA-Z]+)/g;
  let match;
  const found = new Set<string>();
  const unknown: string[] = [];

  while ((match = cmdRegex.exec(latex)) !== null) {
    const cmd = '\\' + match[1];
    if (found.has(cmd)) continue;
    found.add(cmd);
    if (!isInFizzex(cmd) && !PARSER_BUILTINS.has(cmd)) {
      unknown.push(cmd);
    }
  }

  if (found.size === 0) return { coverage: 'full', unknownCommands: [] };
  const unknownRatio = unknown.length / found.size;

  let coverage: 'full' | 'mixed' | 'unknown';
  if (unknown.length === 0) coverage = 'full';
  else if (unknownRatio >= 0.7) coverage = 'unknown';
  else coverage = 'mixed';

  return { coverage, unknownCommands: unknown };
}

// --- 생성기 ---

class FormulaGenerator {
  private rand: () => number;
  private maxDepth: number;
  private maxWidth: number;
  private includeSpacing: boolean;
  private includeFonts: boolean;
  private includeBigOps: boolean;
  private includeEnvironments: boolean;
  private elements: Set<string> = new Set();
  private currentDepth = 0;

  constructor(options: GeneratorOptions) {
    this.rand = mulberry32(options.seed);
    this.maxDepth = options.maxDepth;
    this.maxWidth = options.maxWidth;
    this.includeSpacing = options.includeSpacing;
    this.includeFonts = options.includeFonts;
    this.includeBigOps = options.includeBigOps;
    this.includeEnvironments = options.includeEnvironments;
  }

  private pick<T>(arr: T[]): T {
    return arr[Math.floor(this.rand() * arr.length)];
  }

  private expand(rule: string): string {
    // 깊이 초과 시 atom으로 종료
    if (this.currentDepth >= this.maxDepth && RECURSIVE_RULES.has(rule)) {
      return this.expand('atom');
    }

    // 문법에 없는 심볼이면 리터럴로 반환
    const productions = GRAMMAR[rule];
    if (!productions) {
      return rule;
    }

    // 필터: 옵션에 따라 특정 프로덕션 제외
    let filtered = productions;
    if (!this.includeBigOps && rule === 'expr') {
      filtered = filtered.filter((p) => !p.includes('bigop'));
    }
    if (!this.includeFonts && rule === 'expr') {
      filtered = filtered.filter((p) => !p.includes('font_wrap'));
    }
    if (!this.includeEnvironments && rule === 'expr') {
      filtered = filtered.filter((p) => !p.includes('environment'));
    }
    if (filtered.length === 0) filtered = productions;

    // 터미널: 바로 반환
    if (TERMINALS.has(rule)) {
      const value = this.pick(filtered);
      this.elements.add(rule);
      return value;
    }

    // 비터미널: 재귀 확장
    this.currentDepth++;
    const production = this.pick(filtered);
    this.elements.add(rule);

    // 프로덕션 내의 토큰을 순회하며 확장
    const result = this.expandProduction(production);
    this.currentDepth--;

    return result;
  }

  private expandProduction(production: string): string {
    // 프로덕션 문자열을 파싱하여 토큰별로 확장
    const tokens = this.tokenize(production);
    return tokens.map((token) => this.expandToken(token)).join('');
  }

  private tokenize(production: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    while (i < production.length) {
      // 공백 건너뛰기
      if (production[i] === ' ') {
        tokens.push(' ');
        i++;
        continue;
      }

      // \begin{...} ... \end{...} 패턴
      if (production.startsWith('\\begin{', i)) {
        const endOfBegin = production.indexOf('}', i + 7);
        tokens.push(production.substring(i, endOfBegin + 1));
        i = endOfBegin + 1;
        continue;
      }
      if (production.startsWith('\\end{', i)) {
        const endOfEnd = production.indexOf('}', i + 5);
        tokens.push(production.substring(i, endOfEnd + 1));
        i = endOfEnd + 1;
        continue;
      }

      // \text{...} 패턴은 short_text 사이에 구분
      if (production.startsWith('\\text{', i)) {
        tokens.push('\\text{');
        i += 6;
        continue;
      }

      // 백슬래시 명령어
      if (production[i] === '\\') {
        let j = i + 1;
        // \\\\는 줄바꿈 (리터럴)
        if (j < production.length && production[j] === '\\') {
          // 연속된 백슬래시 처리
          let count = 0;
          while (j < production.length && production[j] === '\\') {
            count++;
            j++;
          }
          tokens.push('\\'.repeat(count + 1));
          i = j;
          continue;
        }
        // \{ \} \. 등 이스케이프
        if (j < production.length && /[{}.|]/.test(production[j])) {
          tokens.push(production.substring(i, j + 1));
          i = j + 1;
          continue;
        }
        // 일반 명령어
        while (j < production.length && /[a-zA-Z]/.test(production[j])) {
          j++;
        }
        tokens.push(production.substring(i, j));
        i = j;
        continue;
      }

      // {expr} 패턴
      if (production[i] === '{') {
        tokens.push('{');
        i++;
        continue;
      }
      if (production[i] === '}') {
        tokens.push('}');
        i++;
        continue;
      }

      // ^, _ 같은 특수 문자
      if (production[i] === '^' || production[i] === '_') {
        tokens.push(production[i]);
        i++;
        continue;
      }

      // & 리터럴
      if (production[i] === '&') {
        tokens.push('&');
        i++;
        continue;
      }

      // 콤마
      if (production[i] === ',') {
        tokens.push(',');
        i++;
        continue;
      }

      // 알파벳/숫자 연속 → 문법 규칙 이름일 수 있음
      if (/[a-zA-Z_]/.test(production[i])) {
        let j = i;
        while (j < production.length && /[a-zA-Z_]/.test(production[j])) {
          j++;
        }
        tokens.push(production.substring(i, j));
        i = j;
        continue;
      }

      // 그 외 리터럴
      tokens.push(production[i]);
      i++;
    }

    return tokens;
  }

  private expandToken(token: string): string {
    // 리터럴 토큰
    if (token === ' ') return ' ';
    if (token === '{') return '{';
    if (token === '}') return '}';
    if (token === '^') return '^';
    if (token === '_') return '_';
    if (token === '&') return ' & ';
    if (token === ',') return ',';
    if (token.startsWith('\\begin{') || token.startsWith('\\end{')) return token;
    if (token.startsWith('\\text{')) return '\\text{';
    if (token.startsWith('\\') && token.length > 1 && /[{}.|]/.test(token[1])) return token;
    if (/^\\{2,}$/.test(token)) return ' \\\\ ';

    // 백슬래시 명령어는 리터럴
    if (token.startsWith('\\') && token.length > 1) return token;

    // 문법 규칙 이름이면 확장
    if (GRAMMAR[token]) {
      return this.expand(token);
    }

    // 그 외 리터럴
    return token;
  }

  generate(): { latex: string; depth: number; elements: string[] } {
    this.elements = new Set();
    this.currentDepth = 0;

    let latex = this.expand('formula');

    // 간격 명령어 삽입 (옵션) — 공백 위치에만 삽입하여 명령어 파손 방지
    if (this.includeSpacing && this.rand() < 0.3) {
      const spacingCmd = this.expand('spacing');
      const spacePositions: number[] = [];
      for (let i = 0; i < latex.length; i++) {
        if (latex[i] === ' ') spacePositions.push(i);
      }
      if (spacePositions.length > 0) {
        const pos = this.pick(spacePositions);
        latex = latex.substring(0, pos) + ' ' + spacingCmd + latex.substring(pos);
      }
    }

    // 후처리: 불필요한 다중 공백 정리
    latex = latex.replace(/\s{2,}/g, ' ').trim();

    return {
      latex,
      depth: this.maxDepth,
      elements: Array.from(this.elements),
    };
  }
}

// --- 복잡도 프리셋 ---

export function generateSimple(count: number, seed: number = 12345): FormulaEntry[] {
  return generateBatch({
    maxDepth: 2, maxWidth: 2, seed, count,
    includeSpacing: false, includeFonts: false,
    includeBigOps: false, includeEnvironments: false,
  }, 'fuzz-simple');
}

export function generateMedium(count: number, seed: number = 23456): FormulaEntry[] {
  return generateBatch({
    maxDepth: 3, maxWidth: 3, seed, count,
    includeSpacing: true, includeFonts: false,
    includeBigOps: true, includeEnvironments: false,
  }, 'fuzz-medium');
}

export function generateComplex(count: number, seed: number = 34567): FormulaEntry[] {
  return generateBatch({
    maxDepth: 4, maxWidth: 3, seed, count,
    includeSpacing: true, includeFonts: true,
    includeBigOps: true, includeEnvironments: false,
  }, 'fuzz-complex');
}

export function generateExtreme(count: number, seed: number = 45678): FormulaEntry[] {
  return generateBatch({
    maxDepth: 5, maxWidth: 4, seed, count,
    includeSpacing: true, includeFonts: true,
    includeBigOps: true, includeEnvironments: true,
  }, 'fuzz-extreme');
}

export function generateBigOps(count: number, seed: number = 56789): FormulaEntry[] {
  // bigop에 특화된 생성: formula를 bigop expr로 강제
  const gen = new FormulaGenerator({
    maxDepth: 3, maxWidth: 3, seed, count,
    includeSpacing: true, includeFonts: false,
    includeBigOps: true, includeEnvironments: false,
  });

  const formulas: FormulaEntry[] = [];
  const seen = new Set<string>();

  for (let i = 0; formulas.length < count; i++) {
    const result = gen.generate();
    // bigop가 포함되지 않았으면 재생성
    if (!result.elements.includes('bigop') && i < count * 3) continue;
    if (seen.has(result.latex)) continue;
    seen.add(result.latex);
    const { coverage, unknownCommands } = analyzeCoverage(result.latex);
    formulas.push({
      id: `fuzz-bigops-${String(formulas.length + 1).padStart(4, '0')}`,
      latex: result.latex,
      depth: result.depth,
      elements: result.elements,
      fizzexCoverage: coverage,
      unknownCommands,
    });
  }
  return formulas;
}

export function generateEnvironments(count: number, seed: number = 67890): FormulaEntry[] {
  const gen = new FormulaGenerator({
    maxDepth: 3, maxWidth: 3, seed, count,
    includeSpacing: false, includeFonts: false,
    includeBigOps: false, includeEnvironments: true,
  });

  const formulas: FormulaEntry[] = [];
  const seen = new Set<string>();

  for (let i = 0; formulas.length < count; i++) {
    const result = gen.generate();
    if (!result.elements.includes('environment') && i < count * 3) continue;
    if (seen.has(result.latex)) continue;
    seen.add(result.latex);
    const { coverage: envCoverage, unknownCommands: envUnknown } = analyzeCoverage(result.latex);
    formulas.push({
      id: `fuzz-env-${String(formulas.length + 1).padStart(4, '0')}`,
      latex: result.latex,
      depth: result.depth,
      elements: result.elements,
      fizzexCoverage: envCoverage,
      unknownCommands: envUnknown,
    });
  }
  return formulas;
}

function generateBatch(options: GeneratorOptions, prefix: string): FormulaEntry[] {
  const gen = new FormulaGenerator(options);
  const formulas: FormulaEntry[] = [];
  const seen = new Set<string>();

  for (let i = 0; formulas.length < options.count; i++) {
    const result = gen.generate();
    if (seen.has(result.latex)) continue;
    seen.add(result.latex);
    const { coverage, unknownCommands } = analyzeCoverage(result.latex);
    formulas.push({
      id: `${prefix}-${String(formulas.length + 1).padStart(4, '0')}`,
      latex: result.latex,
      depth: result.depth,
      elements: result.elements,
      fizzexCoverage: coverage,
      unknownCommands,
    });
    // 안전장치: 무한루프 방지
    if (i > options.count * 5) break;
  }

  return formulas;
}

function saveCorpus(filename: string, formulas: FormulaEntry[], options: GeneratorOptions): void {
  const corpus: GeneratedCorpus = {
    generator: 'fizzex-fuzz-v1',
    seed: options.seed,
    generated_date: new Date().toISOString().split('T')[0],
    options: {
      maxDepth: options.maxDepth,
      maxWidth: options.maxWidth,
      includeSpacing: options.includeSpacing,
      includeFonts: options.includeFonts,
      includeBigOps: options.includeBigOps,
      includeEnvironments: options.includeEnvironments,
    },
    formulas,
  };

  const outPath = resolve(dirname(new URL(import.meta.url).pathname), 'generated', filename);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(corpus, null, 2));
  console.log(`  ${filename}: ${formulas.length} formulas`);
}

// --- CLI 진입점 ---

function main() {
  const args = process.argv.slice(2);
  const useRandomSeed = args.includes('--seed') && args[args.indexOf('--seed') + 1] === 'random';

  const baseSeed = useRandomSeed ? Math.floor(Math.random() * 1000000) : 12345;

  console.log(`Generating fuzz corpus (seed base: ${baseSeed})...`);

  const simple = generateSimple(1000, baseSeed);
  saveCorpus('simple-1000.json', simple, {
    maxDepth: 2, maxWidth: 2, seed: baseSeed, count: 1000,
    includeSpacing: false, includeFonts: false,
    includeBigOps: false, includeEnvironments: false,
  });

  const medium = generateMedium(2000, baseSeed + 1);
  saveCorpus('medium-2000.json', medium, {
    maxDepth: 3, maxWidth: 3, seed: baseSeed + 1, count: 2000,
    includeSpacing: true, includeFonts: false,
    includeBigOps: true, includeEnvironments: false,
  });

  const complex = generateComplex(2000, baseSeed + 2);
  saveCorpus('complex-2000.json', complex, {
    maxDepth: 4, maxWidth: 3, seed: baseSeed + 2, count: 2000,
    includeSpacing: true, includeFonts: true,
    includeBigOps: true, includeEnvironments: false,
  });

  const extreme = generateExtreme(1000, baseSeed + 3);
  saveCorpus('extreme-1000.json', extreme, {
    maxDepth: 5, maxWidth: 4, seed: baseSeed + 3, count: 1000,
    includeSpacing: true, includeFonts: true,
    includeBigOps: true, includeEnvironments: true,
  });

  const bigops = generateBigOps(500, baseSeed + 4);
  saveCorpus('bigops-500.json', bigops, {
    maxDepth: 3, maxWidth: 3, seed: baseSeed + 4, count: 500,
    includeSpacing: true, includeFonts: false,
    includeBigOps: true, includeEnvironments: false,
  });

  const envs = generateEnvironments(500, baseSeed + 5);
  saveCorpus('environments-500.json', envs, {
    maxDepth: 3, maxWidth: 3, seed: baseSeed + 5, count: 500,
    includeSpacing: false, includeFonts: false,
    includeBigOps: false, includeEnvironments: true,
  });

  // 메타데이터 저장
  const metadata = {
    generator: 'fizzex-fuzz-v1',
    base_seed: baseSeed,
    random_seed: useRandomSeed,
    generated_date: new Date().toISOString(),
    files: {
      'simple-1000.json': simple.length,
      'medium-2000.json': medium.length,
      'complex-2000.json': complex.length,
      'extreme-1000.json': extreme.length,
      'bigops-500.json': bigops.length,
      'environments-500.json': envs.length,
    },
    total: simple.length + medium.length + complex.length + extreme.length + bigops.length + envs.length,
  };

  const metaPath = resolve(dirname(new URL(import.meta.url).pathname), 'generated', 'metadata.json');
  writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

  console.log(`\nTotal: ${metadata.total} formulas generated.`);

  // 커버리지 요약
  const allFormulas = [...simple, ...medium, ...complex, ...extreme, ...bigops, ...envs];
  const fullCount = allFormulas.filter(f => f.fizzexCoverage === 'full').length;
  const mixedCount = allFormulas.filter(f => f.fizzexCoverage === 'mixed').length;
  const unknownCount = allFormulas.filter(f => f.fizzexCoverage === 'unknown').length;

  console.log(`\n=== Fuzz Generation Summary ===`);
  console.log(`Total formulas: ${allFormulas.length}`);
  console.log(`  full (Fizzex-known only): ${fullCount} (${((fullCount / allFormulas.length) * 100).toFixed(0)}%)`);
  console.log(`  mixed (some unknown): ${mixedCount} (${((mixedCount / allFormulas.length) * 100).toFixed(0)}%)`);
  console.log(`  unknown (mostly unknown): ${unknownCount} (${((unknownCount / allFormulas.length) * 100).toFixed(0)}%)`);

  // 미지원 명령어 빈도
  const cmdFreq: Record<string, number> = {};
  for (const f of allFormulas) {
    for (const cmd of f.unknownCommands) {
      cmdFreq[cmd] = (cmdFreq[cmd] || 0) + 1;
    }
  }
  const topMissing = Object.entries(cmdFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15);

  if (topMissing.length > 0) {
    console.log(`\nTop missing commands by frequency:`);
    for (const [cmd, count] of topMissing) {
      console.log(`  ${cmd}: ${count} occurrences`);
    }
  }

  console.log(`\nMetadata saved to generated/metadata.json`);
}

main();
