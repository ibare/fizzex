/**
 * 의미 데이터 무결성 검증 스크립트
 *
 * 검증 항목:
 * 1. Layer 1 규칙 ID ↔ ko.json 키 일치
 * 2. Layer 2 규칙 ID ↔ ko.json 키 일치
 * 3. 카탈로그 index.json / 상세 JSON zod 스키마 + 양방향 키 일치
 * 4. 형식(form) 스키마 + 템플릿 ↔ 선언 슬롯 양방향 일치
 *
 * 실행: pnpm semantic:validate
 */

import { readFileSync } from 'node:fs';
import type { z } from 'zod';
import {
  validateCatalogIndex,
  validateCatalogDetailFile,
  validateChemicalElements,
  CatalogValidationError,
} from '../src/analyzer/semantic/validator/index.js';
import { formIndexSchema, formTextSchema } from '../src/analyzer/semantic/validator/form-schema.js';
import { parseLatex } from '../src/latex/latex-parser.js';
import { normalizeAst } from '../src/analyzer/canonical/from-ast.js';
import { childrenOfExpr, type ExprNode } from '../src/analyzer/canonical/expr.js';
import { symKey } from '../src/analyzer/canonical/polynomial.js';
import { normalizeVarName } from '../src/evaluator/normalize.js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../src/analyzer/semantic/data');

// ─── 헬퍼 ───

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

let errors = 0;
let warnings = 0;

function error(msg: string): void {
  console.error(`  ✗ ${msg}`);
  errors++;
}

function warn(msg: string): void {
  console.warn(`  ⚠ ${msg}`);
  warnings++;
}

/**
 * zod 이슈 한 줄.
 *
 * `invalid_key` 처럼 실제 사유가 `issue.issues[]` 안에 중첩되는 종류가 있다.
 * 겉의 메시지만 찍으면 "Invalid key in record" 로 끝나 무엇이 잘못됐는지 모른다.
 */
function issueLine(source: string, issue: z.core.$ZodIssue): string {
  const where = issue.path.join('.');
  const nested =
    'issues' in issue && Array.isArray(issue.issues)
      ? issue.issues.map((i) => i.message).join('; ')
      : '';
  return `${source}: ${where}: ${issue.message}${nested ? ` — ${nested}` : ''}`;
}

function ok(msg: string): void {
  console.log(`  ✓ ${msg}`);
}

// ─── Layer 1 검증 ───

function validateLayer1(): void {
  console.log('\n[Layer 1] 규칙 ID ↔ ko.json 키 검증');

  // matcher에서 규칙 ID 추출 (빌드 시점에 소스 파싱)
  const matcherSrc = readFileSync(
    resolve(__dirname, '../src/analyzer/semantic/matchers/layer1-matcher.ts'),
    'utf-8',
  );

  // LAYER1_RULE_DEFS에서 key 추출: key: 'xxx' 패턴
  const idMatches = matcherSrc.matchAll(/key:\s*'([^']+)'/g);
  const ruleIds = new Set<string>();
  for (const m of idMatches) ruleIds.add(m[1]);

  const koJson = loadJson<Record<string, unknown>>(
    resolve(dataDir, 'layer1/ko.json'),
  );
  const jsonKeys = new Set(Object.keys(koJson));

  // 규칙에 있지만 JSON에 없는 키
  for (const id of ruleIds) {
    if (!jsonKeys.has(id)) {
      error(`규칙 ID "${id}"가 layer1/ko.json에 없음`);
    }
  }

  // JSON에 있지만 규칙에 없는 키
  for (const key of jsonKeys) {
    if (!ruleIds.has(key)) {
      warn(`layer1/ko.json 키 "${key}"가 규칙에 없음 (미사용 텍스트)`);
    }
  }

  if (ruleIds.size === jsonKeys.size && errors === 0) {
    ok(`${ruleIds.size}개 규칙 ID — 모두 일치`);
  }
}

// ─── Layer 2 검증 ───

function validateLayer2(): void {
  console.log('\n[Layer 2] 규칙 ID ↔ ko.json 키 검증');

  const matcherSrc = readFileSync(
    resolve(__dirname, '../src/analyzer/semantic/matchers/layer2-matcher.ts'),
    'utf-8',
  );

  const idMatches = matcherSrc.matchAll(/key:\s*'([^']+)'/g);
  const ruleIds = new Set<string>();
  for (const m of idMatches) ruleIds.add(m[1]);

  const koJson = loadJson<Record<string, unknown>>(
    resolve(dataDir, 'layer2/ko.json'),
  );
  const jsonKeys = new Set(Object.keys(koJson));

  for (const id of ruleIds) {
    if (!jsonKeys.has(id)) {
      error(`규칙 ID "${id}"가 layer2/ko.json에 없음`);
    }
  }

  for (const key of jsonKeys) {
    if (!ruleIds.has(key)) {
      warn(`layer2/ko.json 키 "${key}"가 규칙에 없음 (미사용 텍스트)`);
    }
  }

  if (ruleIds.size === jsonKeys.size && errors === 0) {
    ok(`${ruleIds.size}개 규칙 ID — 모두 일치`);
  }
}

// ─── 카탈로그 검증 ───

function validateCatalog(): void {
  console.log('\n[카탈로그] zod 스키마 + index.json ↔ 상세 JSON 양방향 검증');

  const catalogDir = resolve(dataDir, 'catalog');

  let entries;
  try {
    entries = validateCatalogIndex(loadJson<unknown>(resolve(catalogDir, 'index.json')));
  } catch (e) {
    if (e instanceof CatalogValidationError) {
      for (const issue of e.issues) error(issueLine('index.json', issue));
    } else {
      error(`index.json 로드 실패: ${String(e)}`);
    }
    return;
  }

  // 카테고리별 상세 JSON 로드 + 스키마 검증
  const detailCache = new Map<string, Record<string, unknown>>();
  const categories = [...new Set(entries.map((e) => e.category))].sort();

  for (const category of categories) {
    const path = resolve(catalogDir, `ko/${category}.json`);
    try {
      detailCache.set(category, validateCatalogDetailFile(`ko/${category}.json`, loadJson<unknown>(path)));
    } catch (e) {
      if (e instanceof CatalogValidationError) {
        for (const issue of e.issues) error(issueLine(`ko/${category}.json`, issue));
      } else {
        error(`카테고리 "${category}" 상세 JSON 로드 실패: ko/${category}.json`);
      }
    }
  }

  // index → 상세
  for (const entry of entries) {
    const { id, category } = entry;
    const categoryData = detailCache.get(category);
    if (!categoryData) continue; // 위에서 이미 error 보고됨
    const detail = categoryData[id];
    if (!detail) {
      error(`index ID "${id}" (${category})가 ko/${category}.json에 없음`);
      continue;
    }

    // elementMeanings 는 수식의 기호를 가리킨다. 화학식의 기호는 변수가 아니라
    // 화학종이라 findElementKey 가 키를 만들 수 없으므로 요구하지 않는다.
    // 이 판정은 스키마가 아니라 여기에 있다 — patternType 을 아는 곳이 여기다.
    if (entry.patternType !== 'chem') {
      const meanings = (detail as { elementMeanings?: Record<string, unknown> }).elementMeanings;
      if (!meanings || Object.keys(meanings).length === 0) {
        error(`ko/${category}.json "${id}": elementMeanings가 비어 있다`);
      }
    }
  }

  // 상세 → index (미참조 항목은 매칭 풀에 들어가지 못해 영원히 노출되지 않는다 → error)
  const indexIds = new Set(entries.map((e) => `${e.category}:${e.id}`));
  for (const [category, data] of detailCache) {
    for (const id of Object.keys(data)) {
      if (!indexIds.has(`${category}:${id}`)) {
        error(`ko/${category}.json의 "${id}"가 index.json에 없음 — 매칭 대상이 되지 못한다`);
      }
    }
  }

  ok(`${entries.length}개 항목, ${detailCache.size}개 분야 검증 완료`);
}

// ─── 형식(form) 검증 ───

/** 슬롯·free 이름을 IR 심볼 키로 옮긴다. `\\omega` → `ω`, `N_0` → `N_0`. */
function declaredKey(name: string): string {
  const m = /^(.+?)_(.+)$/.exec(name);
  if (m) return symKey(normalizeVarName(m[1]), m[2]);
  return symKey(normalizeVarName(name));
}

function collectSymKeys(e: ExprNode, out: Set<string>): void {
  if (e.kind === 'sym') out.add(symKey(e.name, e.sub));
  for (const c of childrenOfExpr(e)) collectSymKeys(c, out);
}

// ─── 원소 이름표 검증 ───

function validateElementNames(): void {
  console.log('\n[원소] 이름표 스키마 검증');

  const path = resolve(dataDir, 'elements/ko.json');
  try {
    const data = validateChemicalElements('elements/ko.json', loadJson<unknown>(path));
    ok(`${Object.keys(data.bySymbol).length}개 원소 검증 완료`);
  } catch (e) {
    if (e instanceof CatalogValidationError) {
      for (const issue of e.issues) error(issueLine('elements/ko.json', issue));
    } else {
      error(`elements/ko.json 로드 실패: ${String(e)}`);
    }
  }
}

function validateForms(): void {
  console.log('\n[형식] 스키마 + 템플릿 ↔ 선언 슬롯 검증');

  const formDir = resolve(dataDir, 'form');
  const indexParsed = formIndexSchema.safeParse(loadJson<unknown>(resolve(formDir, 'index.json')));
  if (!indexParsed.success) {
    for (const i of indexParsed.error.issues) error(`form/index.json: ${i.path.join('.')}: ${i.message}`);
    return;
  }
  const textParsed = formTextSchema.safeParse(loadJson<unknown>(resolve(formDir, 'ko.json')));
  if (!textParsed.success) {
    for (const i of textParsed.error.issues) error(`form/ko.json: ${i.path.join('.')}: ${i.message}`);
    return;
  }

  const forms = indexParsed.data.forms;
  const texts = textParsed.data;

  for (const form of forms) {
    // 텍스트 ↔ 구조 양방향
    const text = texts[form.id];
    if (!text) {
      error(`형식 "${form.id}" 의 ko.json 텍스트가 없다`);
    } else {
      for (const slot of form.slots) {
        if (!text.slots[slot.name]) error(`"${form.id}" 슬롯 "${slot.name}" 의 텍스트가 없다`);
      }
      for (const key of Object.keys(text.slots)) {
        if (!form.slots.some((s) => s.name === key)) {
          error(`"${form.id}" ko.json 의 고아 슬롯 텍스트 "${key}"`);
        }
      }
    }

    // 템플릿이 파싱·정규화되는가, 그리고 선언한 이름이 실제로 등장하는가.
    // 슬롯 이름은 spec.userBindings 를 따라 `\omega`/`N_0` 형태인데 IR 은
    // `ω`/`sym{N, sub:0}` 이므로, 이 대조가 없으면 이름 불일치가 매처까지 간다.
    form.shapes.forEach((shape, i) => {
      const where = `"${form.id}" shape[${i}]`;
      let normalized;
      try {
        normalized = normalizeAst(parseLatex(shape.latex).ast);
      } catch (e) {
        error(`${where} 템플릿 파싱 실패: ${String(e)}`);
        return;
      }
      if (!normalized.ok) {
        error(`${where} 템플릿이 완전히 정규화되지 않는다: ${shape.latex}`);
        return;
      }
      const present = new Set<string>();
      collectSymKeys(normalized.root, present);

      for (const name of [...shape.slots, ...shape.free]) {
        if (!present.has(declaredKey(name))) {
          error(`${where} 선언한 "${name}"(→${declaredKey(name)})이 템플릿에 없다`);
        }
      }
      const declared = new Set([...shape.slots, ...shape.free].map(declaredKey));
      for (const key of present) {
        if (!declared.has(key)) {
          warn(`${where} 템플릿의 "${key}" 가 slots/free 어디에도 없다 — 리터럴로 취급된다`);
        }
      }
    });

    // examples·counterExamples 가 파싱되는가
    for (const ex of form.examples) {
      try {
        parseLatex(ex.latex);
      } catch {
        error(`"${form.id}" example 파싱 실패: ${ex.latex}`);
      }
    }
    for (const ce of form.counterExamples) {
      try {
        parseLatex(ce);
      } catch {
        error(`"${form.id}" counterExample 파싱 실패: ${ce}`);
      }
    }
  }

  for (const id of Object.keys(texts)) {
    if (!forms.some((f) => f.id === id)) error(`ko.json 의 고아 형식 텍스트 "${id}"`);
  }

  ok(`${forms.length}개 형식 검증 완료`);
}

// ─── 메인 ───

console.log('=== 의미 데이터 무결성 검증 ===');

const prevErrors = errors;
validateLayer1();
const l1Errors = errors - prevErrors;

const prevErrors2 = errors;
validateLayer2();
const l2Errors = errors - prevErrors2;

const prevErrors3 = errors;
validateCatalog();
validateForms();
validateElementNames();
const catalogErrors = errors - prevErrors3;

console.log('\n--- 결과 ---');
console.log(`오류: ${errors}개, 경고: ${warnings}개`);

if (errors > 0) {
  console.error('\n검증 실패');
  process.exit(1);
} else {
  console.log('\n검증 통과');
}
