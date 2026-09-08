/**
 * 서브패스 격리 계약 테스트 (C6).
 *
 * `fizzex/compute` 는 DOM·프레임워크 없는 컨텍스트(Node 워커 등)를 위한 진입점이다.
 * 이 계약은 코드 한 줄로 조용히 깨질 수 있어 — 누군가 계산 모듈에서 react 를 쓰거나,
 * analyzer 배럴이 다시 semantic 카탈로그를 재수출하면 워커에서 모듈 로드가 터진다 —
 * import 그래프를 정적으로 검사해 고정한다.
 *
 * dist 가 아니라 src 를 스캔하는 이유:
 *   1. CI(.github/workflows/test.yml)가 `pnpm build` 를 돌리지 않아 dist 는 stale 일 수 있다
 *   2. dist 의 .js 는 type-only import 가 지워져 있어, `.d.ts` 가 three 같은 타입 의존을
 *      끌고 가는 회귀를 잡지 못한다
 *
 * 스캔은 정규식이 아니라 `ts.preProcessFile` 로 한다 — 정규식은 주석 안의 예제 import
 * (`analyzer/index.ts` 상단 JSDoc 의 `from 'fizzex'`)를 실제 의존으로 오탐한다.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve as resolvePath, relative } from 'node:path';
import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolvePath(here, '..');

interface Closure {
  /** src 기준 상대 경로 목록 */
  files: string[];
  /** 상대 경로가 아닌 import 지정자 (패키지 이름) */
  externals: string[];
}

/** `.js` 확장자로 쓰인 ESM 지정자를 실제 소스 파일로 되돌린다 */
function resolveSpecifier(fromFile: string, spec: string): string | null {
  const base = resolvePath(dirname(fromFile), spec);
  const candidates = [
    base.replace(/\.js$/, '.ts'),
    base.replace(/\.js$/, '.tsx'),
    base,
    `${base}.ts`,
    `${base}.tsx`,
    resolvePath(base, 'index.ts'),
  ];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

/** 진입점에서 도달 가능한 소스 파일 전체와 외부 패키지 의존을 모은다 */
function collectClosure(entry: string): Closure {
  const seen = new Set<string>();
  const externals = new Set<string>();
  const stack = [entry];

  while (stack.length > 0) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);

    const source = readFileSync(file, 'utf8');
    const { importedFiles } = ts.preProcessFile(source, true, true);
    for (const { fileName } of importedFiles) {
      if (!fileName.startsWith('.')) {
        externals.add(fileName);
        continue;
      }
      const resolved = resolveSpecifier(file, fileName);
      if (resolved === null) {
        throw new Error(`해석 실패: ${relative(srcDir, file)} → ${fileName}`);
      }
      stack.push(resolved);
    }
  }

  return {
    files: [...seen].map((f) => relative(srcDir, f)).sort(),
    externals: [...externals].sort(),
  };
}

/** compute 클로저가 머물러야 하는 범위 — utils 는 디렉터리가 아니라 파일 단위로 못박는다.
 *  `utils/benchmark.ts` 는 performance.now() 를 쓰므로 디렉터리 allowlist 는 구멍이 된다. */
const COMPUTE_ALLOWED_DIRS = ['compute/', 'latex/', 'evaluator/', 'analyzer/'];
const COMPUTE_ALLOWED_FILES = ['types.ts', 'utils/id-generator.ts'];

describe('fizzex/compute 격리 (C6)', () => {
  const closure = collectClosure(resolvePath(srcDir, 'compute/index.ts'));

  it('외부 패키지에 의존하지 않는다', () => {
    expect(closure.externals).toEqual([]);
  });

  it('계산 모듈 밖으로 나가지 않는다', () => {
    const strays = closure.files.filter(
      (f) =>
        !COMPUTE_ALLOWED_DIRS.some((d) => f.startsWith(d)) && !COMPUTE_ALLOWED_FILES.includes(f),
    );
    expect(strays).toEqual([]);
  });

  it('semantic 카탈로그를 끌어오지 않는다', () => {
    // 카탈로그 JSON 은 500KB 를 넘는다. 워커가 계산만 하려고 물 비용이 아니다.
    expect(closure.files.filter((f) => f.startsWith('analyzer/semantic'))).toEqual([]);
  });

  it('브라우저 전역을 참조하지 않는다', () => {
    const offenders = closure.files.filter((f) => {
      const source = readFileSync(resolvePath(srcDir, f), 'utf8');
      const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      return /\b(?:document|window|navigator)\s*\./.test(stripped);
    });
    expect(offenders).toEqual([]);
  });
});

describe('fizzex/semantic 격리 (C6)', () => {
  const closure = collectClosure(resolvePath(srcDir, 'semantic/index.ts'));

  it('외부 패키지에 의존하지 않는다', () => {
    expect(closure.externals).toEqual([]);
  });

  it('compute 배럴을 경유하지 않는다', () => {
    // 서브패스끼리 서로를 로드하면 각각 독립적으로 import 가능하다는 계약이 무너진다.
    expect(closure.files.filter((f) => f.startsWith('compute/'))).toEqual([]);
  });
});

describe('fizzex/headless 격리 (C6)', () => {
  const closure = collectClosure(resolvePath(srcDir, 'headless/index.ts'));

  it('react 와 tiptap 을 끌어오지 않는다', () => {
    const framework = closure.externals.filter(
      (e) => e === 'react' || e === 'react-dom' || e.startsWith('@tiptap/'),
    );
    expect(framework).toEqual([]);
    expect(closure.files.filter((f) => f.startsWith('react/'))).toEqual([]);
    expect(closure.files.filter((f) => f.startsWith('integrations/'))).toEqual([]);
  });
});

/** 배럴이 실제로 내보내는 심볼 이름 — 타입 전용 export 까지 포함한다 */
function moduleExports(entries: string[]): Map<string, string[]> {
  const program = ts.createProgram(entries, {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ESNext,
    strict: true,
    noEmit: true,
  });
  const checker = program.getTypeChecker();
  const result = new Map<string, string[]>();
  for (const entry of entries) {
    const sourceFile = program.getSourceFile(entry);
    if (sourceFile === undefined) throw new Error(`소스를 찾지 못했다: ${entry}`);
    const symbol = checker.getSymbolAtLocation(sourceFile);
    if (symbol === undefined) throw new Error(`모듈 심볼이 없다: ${entry}`);
    result.set(
      entry,
      checker.getExportsOfModule(symbol).map((s) => s.getName()).sort(),
    );
  }
  return result;
}

describe('fizzex/tiptap 격리 (C6)', () => {
  const closure = collectClosure(resolvePath(srcDir, 'integrations/tiptap/index.ts'));

  it('react 를 끌어오지 않는다 (vanilla DOM NodeView)', () => {
    expect(closure.externals.filter((e) => e === 'react' || e === 'react-dom')).toEqual([]);
    expect(closure.files.filter((f) => f.startsWith('react/'))).toEqual([]);
  });
});

describe('fizzex/react 격리 (C6)', () => {
  const closure = collectClosure(resolvePath(srcDir, 'react/index.ts'));

  it('tiptap 을 끌어오지 않는다', () => {
    expect(closure.externals.filter((e) => e.startsWith('@tiptap/'))).toEqual([]);
    expect(closure.files.filter((f) => f.startsWith('integrations/'))).toEqual([]);
  });
});

describe('서브패스 표면은 루트 표면의 부분집합이다', () => {
  // 런타임 키(Object.keys)만 비교하면 타입 전용 export 가 루트에서 사라져도 통과한다.
  // 소비자의 `import type { MathNode } from 'fizzex'` 가 조용히 깨지는 구멍이라 타입까지 본다.
  it('compute 와 semantic 이 내보내는 이름이 전부 루트에서도 나간다', () => {
    const rootEntry = resolvePath(srcDir, 'index.ts');
    const computeEntry = resolvePath(srcDir, 'compute/index.ts');
    const semanticEntry = resolvePath(srcDir, 'semantic/index.ts');
    const exports = moduleExports([rootEntry, computeEntry, semanticEntry]);

    const rootNames = new Set(exports.get(rootEntry));
    const missing = [...exports.get(computeEntry)!, ...exports.get(semanticEntry)!].filter(
      (name) => !rootNames.has(name),
    );
    expect(missing).toEqual([]);
  });
});

describe('계산 결과는 워커 경계를 넘을 수 있다', () => {
  it('주요 반환값이 structuredClone 을 통과한다', async () => {
    const {
      parseLatex,
      analyzeExpression,
      analyzePolynomialProfile,
      analyzeEvaluability,
      evaluate,
    } = await import('../compute/index.js');

    // postMessage 로 넘길 수 없는 값(클래스 인스턴스·클로저)이 결과에 섞이면 여기서 걸린다.
    const parsed = parseLatex('x^2 + 3x - 1');
    for (const value of [
      parsed,
      analyzeExpression(parsed.ast),
      analyzePolynomialProfile(parsed.ast),
      analyzeEvaluability(parsed.ast),
      evaluate(parsed.ast, { x: 2 }),
    ]) {
      expect(() => structuredClone(value)).not.toThrow();
    }
  });
});
