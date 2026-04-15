/**
 * 의미 데이터 무결성 검증 스크립트
 *
 * 검증 항목:
 * 1. Layer 1 규칙 ID ↔ ko.json 키 일치
 * 2. Layer 2 규칙 ID ↔ ko.json 키 일치
 * 3. 카탈로그 index.json ID ↔ 상세 JSON 키 일치
 *
 * 실행: pnpm semantic:validate
 */

import { readFileSync } from 'node:fs';
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

interface CatalogIndex {
  entries: Array<{ id: string; category: string }>;
}

interface CatalogDetail {
  name: string;
  oneLiner: string;
  elementMeanings: Record<string, unknown>;
}

function validateCatalog(): void {
  console.log('\n[카탈로그] index.json ↔ 상세 JSON 키 검증');

  const catalogDir = resolve(dataDir, 'catalog');
  const index = loadJson<CatalogIndex>(resolve(catalogDir, 'index.json'));

  // 카테고리별 상세 데이터 로드
  const detailCache = new Map<string, Record<string, CatalogDetail>>();

  for (const entry of index.entries) {
    const { id, category } = entry;

    // 상세 JSON 로드 (카테고리별 캐시)
    if (!detailCache.has(category)) {
      try {
        const detail = loadJson<Record<string, CatalogDetail>>(
          resolve(catalogDir, `ko/${category}.json`),
        );
        detailCache.set(category, detail);
      } catch {
        error(`카테고리 "${category}" 상세 JSON 파일 없음: ko/${category}.json`);
        continue;
      }
    }

    const categoryData = detailCache.get(category)!;

    // index ID가 상세 JSON에 있는지
    if (!categoryData[id]) {
      error(`index ID "${id}" (${category})가 ko/${category}.json에 없음`);
      continue;
    }

    // 필수 필드 확인
    const detail = categoryData[id];
    if (!detail.name) error(`"${id}": name 필드 없음`);
    if (!detail.oneLiner) error(`"${id}": oneLiner 필드 없음`);
    if (!detail.elementMeanings || Object.keys(detail.elementMeanings).length === 0) {
      error(`"${id}": elementMeanings가 비어있음`);
    }
  }

  // 상세 JSON에 있지만 index에 없는 항목
  const indexIds = new Set(index.entries.map(e => `${e.category}:${e.id}`));
  for (const [category, data] of detailCache) {
    for (const id of Object.keys(data)) {
      if (!indexIds.has(`${category}:${id}`)) {
        warn(`ko/${category}.json의 "${id}"가 index.json에 없음 (미참조 항목)`);
      }
    }
  }

  const totalEntries = index.entries.length;
  const totalCategories = detailCache.size;
  ok(`${totalEntries}개 항목, ${totalCategories}개 분야 검증 완료`);
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
