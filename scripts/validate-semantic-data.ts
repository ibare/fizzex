/**
 * 의미 데이터 무결성 검증 스크립트
 *
 * 검증 항목:
 * 1. Layer 1 규칙 ID ↔ ko.json 키 일치
 * 2. Layer 2 규칙 ID ↔ ko.json 키 일치
 * 3. 카탈로그 index.json / 상세 JSON zod 스키마 + 양방향 키 일치
 *
 * 실행: pnpm semantic:validate
 */

import { readFileSync } from 'node:fs';
import {
  validateCatalogIndex,
  validateCatalogDetailFile,
  CatalogValidationError,
} from '../src/analyzer/semantic/validator/index.js';
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
      for (const issue of e.issues) error(`index.json: ${issue.path.join('.')}: ${issue.message}`);
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
        for (const issue of e.issues) error(`ko/${category}.json: ${issue.path.join('.')}: ${issue.message}`);
      } else {
        error(`카테고리 "${category}" 상세 JSON 로드 실패: ko/${category}.json`);
      }
    }
  }

  // index → 상세
  for (const { id, category } of entries) {
    const categoryData = detailCache.get(category);
    if (!categoryData) continue; // 위에서 이미 error 보고됨
    if (!categoryData[id]) error(`index ID "${id}" (${category})가 ko/${category}.json에 없음`);
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
const catalogErrors = errors - prevErrors3;

console.log('\n--- 결과 ---');
console.log(`오류: ${errors}개, 경고: ${warnings}개`);

if (errors > 0) {
  console.error('\n검증 실패');
  process.exit(1);
} else {
  console.log('\n검증 통과');
}
