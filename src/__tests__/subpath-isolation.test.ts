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
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
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

describe('fizzex 루트 격리 (C6)', () => {
  const closure = collectClosure(resolvePath(srcDir, 'index.ts'));

  it('react 와 tiptap 을 끌어오지 않는다', () => {
    // react 는 optional peer 다. 루트가 이를 물면 선언과 달리 필수가 되어,
    // react 가 없는 호스트(Node, Vue, Svelte)는 루트를 import 하는 순간 실패한다 —
    // 0.5.0 까지 실제로 그랬다. React 표면은 fizzex/react 에서만 나간다.
    const framework = closure.externals.filter(
      (e) => e === 'react' || e === 'react-dom' || e.startsWith('@tiptap/'),
    );
    expect(framework).toEqual([]);
    expect(closure.files.filter((f) => f.startsWith('react/'))).toEqual([]);
    expect(closure.files.filter((f) => f.startsWith('integrations/'))).toEqual([]);
  });

  it('JSX 파일을 끌어오지 않는다', () => {
    // 자동 JSX 런타임을 쓰는 .tsx 는 react 를 import 하지 않고도 react/jsx-runtime 에 기댄다.
    // 그 의존은 소스의 import 그래프에 드러나지 않아 위 externals 검사를 빠져나간다.
    expect(closure.files.filter((f) => f.endsWith('.tsx'))).toEqual([]);
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

describe('로케일 배럴이 언어를 끌어오지 않는다', () => {
  const closure = collectClosure(resolvePath(srcDir, 'locales/index.ts'));

  it('외부 패키지에 의존하지 않는다', () => {
    expect(closure.externals).toEqual([]);
  });

  it('react 를 끌어오지 않는다', () => {
    // react/i18n/context.tsx → locales/registry.ts 는 단방향이다. 역방향이 생기면
    // headless 와 analyzer 가 이 배럴을 통해 react 를 물게 된다.
    expect(closure.externals.filter((e) => e === 'react' || e === 'react-dom')).toEqual([]);
    expect(closure.files.filter((f) => f.startsWith('react/'))).toEqual([]);
    expect(closure.files.filter((f) => f.startsWith('i18n/'))).toEqual([]);
  });

  it('다른 배럴을 경유하지 않는다', () => {
    const barrels = [
      'index.ts',
      'compute/index.ts',
      'semantic/index.ts',
      'headless/index.ts',
      'react/index.ts',
      'analyzer/index.ts',
    ];
    expect(closure.files.filter((f) => barrels.includes(f))).toEqual([]);
  });

  /**
   * src 전체의 소스 파일.
   *
   * 클로저가 아니라 전수를 훑는 이유: "번들 0바이트" 를 깨는 가장 현실적인 경로는
   * 배럴이 아니라 **아무 파일이나** 언어를 정적으로 무는 것이다
   * (`import ko from '../locales/bundles/ko.js'` 를 headless 어딘가에 적는 식).
   * 배럴 클로저만 보면 스물한 파일밖에 못 본다.
   */
  const allSources = (): string[] => {
    const out: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const full = resolvePath(dir, name);
        if (statSync(full).isDirectory()) {
          if (name !== 'node_modules') walk(full);
        } else if (/\.tsx?$/.test(name) && !name.includes('.test.')) {
          out.push(full);
        }
      }
    };
    walk(srcDir);
    return out;
  };

  it('개별 언어를 정적으로 import 하지 않는다', () => {
    // 이것이 "번들에 언어 0바이트" 를 지키는 지점이다. 어느 파일이든 bundles/*.ts 를
    // 정적으로 물면 그 언어가 통째로 실리고, 열 개를 다 물면 5.7MB 가 된다.
    //
    // 클로저에는 bundles 파일이 **들어 있다** — `ts.preProcessFile` 이 동적 import 도
    // 함께 수집하기 때문이다. 그래서 파일 목록이 아니라 **참조 형태**를 본다.
    // `import()` 에는 `from` 이 없으므로 정적 import 만 잡히고,
    // 부수효과 import(`import './bundles/ko.js';`)는 별도 패턴으로 함께 막는다.
    const staticBundleImport =
      /(?:from\s+|^\s*import\s+)['"][^'"]*locales\/bundles\/[^'"]+['"]/m;
    const offenders = allSources()
      .filter((f) => !f.includes('locales/bundles/') && !f.endsWith('registry.ts'))
      .filter((f) => staticBundleImport.test(readFileSync(f, 'utf-8')))
      .map((f) => relative(srcDir, f));
    expect(offenders).toEqual([]);
  });

  it('언어 데이터는 로케일 번들 안에서만 import 된다', () => {
    // 로케일과 무관한 catalog/index.json·form/index.json 은 걸리지 않는다 —
    // 경로에 로케일 코드가 없다.
    const localeData =
      /['"][^'"]*data\/(?:catalog\/[a-z]{2}\/|(?:layer1|layer2|fallback|elements|form)\/[a-z]{2}\.json)/;
    const offenders = allSources()
      .filter((f) => !f.includes('locales/bundles/'))
      .filter((f) => localeData.test(readFileSync(f, 'utf-8')))
      .map((f) => relative(srcDir, f));
    expect(offenders).toEqual([]);
  });

  it('UI 문구는 영어본만 정적으로 싣는다', () => {
    // 마흔 개 남짓이라 2KB 다. 아무 언어도 내려받지 않은 호스트에서도 버튼은 나와야 한다.
    const otherUi = /['"][^'"]*data\/ui\/(?!en\.json)/;
    const offenders = allSources()
      .filter((f) => !f.includes('locales/bundles/'))
      .filter((f) => otherUi.test(readFileSync(f, 'utf-8')))
      .map((f) => relative(srcDir, f));
    expect(offenders).toEqual([]);
    expect(closure.files).toContain('locales/data/ui/en.json');
  });});

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

/**
 * `fizzex/browser` — Playwright 등 헤드리스 브라우저에 주입하는 IIFE 번들(C6).
 *
 * 이 표면은 dist 산출물이 존재해야 확인되는 부분과 소스만으로 확인되는 부분이 갈린다.
 * CI 는 `pnpm build` 를 돌리지 않으므로(.github/workflows/test.yml) dist 파일 존재는
 * 단언하지 않는다. 대신 번들이 무엇을 끌어오는지와, 배송 계약이 빌드 산출물 경로와
 * 어긋나지 않는지를 소스·설정 수준에서 고정한다.
 *
 * 실제로 한 번 어긋났던 계약이다 — 번들은 매 빌드마다 나오는데 `exports` 에 없어서
 * 호스트가 Node 캡슐화에 막혔다.
 */
describe('fizzex/browser 격리 (C6)', () => {
  const closure = collectClosure(resolvePath(srcDir, 'export/index.ts'));

  it('react 와 tiptap 을 끌어오지 않는다', () => {
    expect(
      closure.externals.filter(
        (e) => e === 'react' || e === 'react-dom' || e.startsWith('@tiptap/'),
      ),
    ).toEqual([]);
    expect(closure.files.filter((f) => f.startsWith('react/'))).toEqual([]);
    expect(closure.files.filter((f) => f.startsWith('integrations/'))).toEqual([]);
  });

  it('외부 패키지에 의존하지 않는다', () => {
    // 브라우저에 통째로 주입하는 번들이라 외부 의존이 붙으면 그대로 페이로드가 된다.
    expect(closure.externals).toEqual([]);
  });

  it('semantic 카탈로그와 visualizer 를 끌어오지 않는다', () => {
    // 설명 JSON 500KB 와 three 기반 시각화는 PNG 조판에 필요 없다.
    expect(closure.files.filter((f) => f.startsWith('analyzer/semantic'))).toEqual([]);
    expect(closure.files.filter((f) => f.startsWith('visualizer/'))).toEqual([]);
  });

  it('폰트 URL 주입 지점을 번들 표면에 내보낸다', () => {
    // 호스트가 about:blank 에 번들을 주입하면 기본값 `/fonts/...` 를 못 받는다.
    // 이 export 가 빠지면 폰트를 물릴 방법이 사라져 fallback 으로 조판된다.
    const entry = resolvePath(srcDir, 'export/index.ts');
    expect(moduleExports([entry]).get(entry)).toContain('setMathFontUrl');
  });
});

/**
 * `fizzex/svg` — Node 서버에서 도는 벡터 조판 표면(C6).
 *
 * 이 표면의 존재 이유가 "DOM 없이 돈다" 이므로, 브라우저 전역이 클로저에 하나라도
 * 들어오면 계약이 무너진다. `src/fonts/index.ts` 배럴이 `font-loader.ts` 를
 * 재수출하고 그 안에서 `document.fonts` 를 쓰기 때문에, 개별 파일 import 를
 * 유지하는지도 여기서 고정된다.
 */
describe('fizzex/svg 격리 (C6)', () => {
  const closure = collectClosure(resolvePath(srcDir, 'svg/index.ts'));

  it('외부 패키지에 의존하지 않는다', () => {
    // 폰트는 호스트가 주입한다 — opentype.js 를 물지 않는 것이 설계의 핵심이다.
    expect(closure.externals).toEqual([]);
  });

  it('브라우저 전역을 참조하지 않는다', () => {
    const offenders = closure.files.filter((f) => {
      const source = readFileSync(resolvePath(srcDir, f), 'utf8');
      const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      return /\b(?:document|window|navigator)\s*\./.test(stripped);
    });
    expect(offenders).toEqual([]);
  });

  it('react·tiptap·시각화·semantic 카탈로그를 끌어오지 않는다', () => {
    expect(
      closure.externals.filter(
        (e) => e === 'react' || e === 'react-dom' || e === 'three' || e.startsWith('@tiptap/'),
      ),
    ).toEqual([]);
    expect(closure.files.filter((f) => f.startsWith('react/'))).toEqual([]);
    expect(closure.files.filter((f) => f.startsWith('integrations/'))).toEqual([]);
    expect(closure.files.filter((f) => f.startsWith('visualizer/'))).toEqual([]);
    expect(closure.files.filter((f) => f.startsWith('analyzer/semantic'))).toEqual([]);
  });

  it('다른 subpath 배럴을 경유하지 않는다', () => {
    // 배럴을 물면 그 subpath 전체가 딸려와 독립 import 계약이 깨진다.
    const barrels = ['index.ts', 'compute/index.ts', 'semantic/index.ts', 'headless/index.ts', 'react/index.ts', 'integrations/tiptap/index.ts', 'export/index.ts', 'fonts/index.ts'];
    expect(closure.files.filter((f) => barrels.includes(f))).toEqual([]);
  });
});

describe('배송 계약이 빌드 산출물과 일치한다 (C6/C10)', () => {
  const pkg = JSON.parse(
    readFileSync(resolvePath(srcDir, '..', 'package.json'), 'utf8'),
  ) as { exports: Record<string, unknown>; scripts: Record<string, string> };

  /** 조건 객체가 몇 겹이든 끝의 파일 경로만 모은다 (import/require × types/default) */
  function collectTargets(node: unknown, out: string[] = []): string[] {
    if (typeof node === 'string') out.push(node);
    else if (node !== null && typeof node === 'object') {
      for (const value of Object.values(node)) collectTargets(value, out);
    }
    return out;
  }

  it('exports 의 모든 타깃이 dist 하위를 가리킨다', () => {
    const targets = collectTargets(pkg.exports);
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.filter((t) => !t.startsWith('./dist/'))).toEqual([]);
  });

  it('조건 객체인 subpath 는 ESM·CJS 양쪽을 모두 제공한다', () => {
    // 서버 호스트가 CommonJS 인 경우 require 조건이 없으면
    // ERR_PACKAGE_PATH_NOT_EXPORTED 로 하드 실패한다.
    // 정적 자산 매핑(./browser, ./visualizers/*, ./webfonts/*)은 문자열 직접
    // 매핑이라 조건과 무관하게 양쪽에서 해석된다 — 짝을 요구하지 않는다.
    const conditional = Object.entries(pkg.exports).filter(
      ([, value]) => typeof value !== 'string',
    );
    expect(conditional.length).toBeGreaterThan(0);

    const missing = conditional.filter(([, value]) => {
      const conditions = value as Record<string, unknown>;
      return conditions.import === undefined || conditions.require === undefined;
    });
    expect(missing.map(([key]) => key)).toEqual([]);
  });

  it('CJS 타깃은 dist/cjs 아래를 가리킨다', () => {
    // dist/cjs 에는 {"type":"commonjs"} 마커가 함께 생성된다. 이 경로를 벗어나면
    // 패키지 최상위 "type": "module" 이 적용돼 require 가 깨진다.
    for (const [key, value] of Object.entries(pkg.exports)) {
      if (typeof value === 'string') continue;
      const req = (value as Record<string, Record<string, string>>).require;
      expect(collectTargets(req).filter((t) => !t.startsWith('./dist/cjs/')), key).toEqual([]);
    }
  });

  it('build 스크립트가 CJS 산출물과 포맷 마커를 만든다', () => {
    expect(pkg.scripts.build).toContain('--module commonjs');
    expect(pkg.scripts.build).toContain('--outDir dist/cjs');
    // 마커가 없으면 최상위 "type": "module" 이 dist/cjs 에도 적용돼 require 가 깨진다.
    // 두 조건을 따로 본다 — 'commonjs' 한 단어만 찾으면 마커가 사라져도 통과한다.
    expect(pkg.scripts.build).toContain('dist/cjs/package.json');
  });

  it('./browser 가 vite 번들의 실제 출력 경로를 가리킨다', () => {
    // vite.lib.config.ts 의 outDir·fileName 이 바뀌면 exports 도 따라가야 한다.
    const viteConfig = readFileSync(resolvePath(srcDir, '..', 'vite.lib.config.ts'), 'utf8');
    const outDir = /outDir:\s*'([^']+)'/.exec(viteConfig)?.[1];
    const fileName = /fileName:\s*\(\)\s*=>\s*'([^']+)'/.exec(viteConfig)?.[1];
    expect(outDir).toBeDefined();
    expect(fileName).toBeDefined();
    expect(pkg.exports['./browser']).toBe(`./${outDir}/${fileName}`);
  });

  it('./webfonts/* 가 build 스크립트가 만드는 디렉터리를 가리킨다', () => {
    // 폰트는 tsc 산출물이 아니라 build 스크립트의 복사 단계로만 생긴다.
    expect(pkg.scripts.build).toContain('dist/webfonts');
    expect(pkg.exports['./webfonts/*']).toBe('./dist/webfonts/*');
  });
});
