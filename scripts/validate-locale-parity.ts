/**
 * 로케일 데이터 정합성 검사
 *
 * 번역본은 **원본과 키 구조가 같아야 한다**. 번역기가 키까지 옮기거나 항목을
 * 빠뜨리면 그 자리의 설명이 조용히 사라지는데, 타입체크도 테스트도 신호를 주지 않는다.
 * 여기서 원본(ko)과 대조해 막는다.
 *
 * 값도 전부 자유롭지는 않다. LaTeX 토큰·수치·열거값은 언어와 무관한 **식별자**이므로
 * 번역되면 안 된다 — `\pi` 가 `\원주율` 이 되면 매칭이 끊긴다.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DATA = 'src/analyzer/semantic/data';
const SOURCE_LOCALE = 'ko';

// 지원 언어의 단일 진실은 src 에 있다 — 여기 다시 적으면 갈린다
export { LOCALES } from '../src/locales/types.js';
import { LOCALES } from '../src/locales/types.js';

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

interface Problem {
  file: string;
  path: string;
  kind: 'missing' | 'extra' | 'type' | 'value' | 'untranslated';
  detail: string;
}

/** 언어와 무관하게 원본과 같아야 하는 값인가 */
function isIdentifierValue(value: Json, path: string): boolean {
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return true;
  if (typeof value !== 'string') return false;
  // 마지막 경로 조각이 식별자 필드인 경우.
  // 배열 원소는 경로가 `relatedFormulas[0]` 이라 인덱스를 떼고 봐야 한다 —
  // 떼지 않으면 배열에 담긴 식별자가 통째로 검사망을 빠져나간다.
  const leaf = (path.split('.').pop() ?? '').replace(/\[\d+\]$/, '');
  const IDENTIFIER_FIELDS = [
    // 노드·항목을 가리키는 이름
    'kind', 'id', 'category', 'form', 'type', 'viz', 'symbol', 'latex',
    // 다른 카탈로그 항목을 가리키는 참조
    'relatedFormulas',
    // 언어와 무관한 표기·설정
    'unit', 'expression', 'sourceParam', 'sourceParams', 'severity', 'format', 'scale', 'emoji',
  ];
  if (IDENTIFIER_FIELDS.includes(leaf)) return true;
  // 값 자체가 LaTeX 토큰이거나 수식 조각
  if (/^[\\$]/.test(value)) return true;
  return false;
}

function walk(
  source: Json,
  target: Json | undefined,
  path: string,
  file: string,
  out: Problem[],
): void {
  if (target === undefined) {
    out.push({ file, path, kind: 'missing', detail: '원본에 있는 키가 번역본에 없다' });
    return;
  }
  if (Array.isArray(source)) {
    if (!Array.isArray(target)) {
      out.push({ file, path, kind: 'type', detail: `배열이어야 하는데 ${typeof target} 이다` });
      return;
    }
    if (source.length !== target.length) {
      out.push({
        file,
        path,
        kind: 'type',
        detail: `배열 길이가 다르다 (원본 ${source.length}, 번역 ${target.length})`,
      });
      return;
    }
    source.forEach((v, i) => walk(v, target[i], `${path}[${i}]`, file, out));
    return;
  }
  if (source !== null && typeof source === 'object') {
    if (target === null || typeof target !== 'object' || Array.isArray(target)) {
      out.push({ file, path, kind: 'type', detail: '객체여야 한다' });
      return;
    }
    const s = source as Record<string, Json>;
    const t = target as Record<string, Json>;
    for (const k of Object.keys(s)) walk(s[k], t[k], path ? `${path}.${k}` : k, file, out);
    for (const k of Object.keys(t)) {
      if (!(k in s))
        out.push({
          file,
          path: path ? `${path}.${k}` : k,
          kind: 'extra',
          detail: '원본에 없는 키가 번역본에 있다 — 키가 번역된 것으로 보인다',
        });
    }
    return;
  }
  // 리프
  if (isIdentifierValue(source, path)) {
    if (source !== target)
      out.push({
        file,
        path,
        kind: 'value',
        detail: `언어 무관 값이 바뀌었다: ${JSON.stringify(source)} → ${JSON.stringify(target)}`,
      });
    return;
  }
  if (typeof target !== 'string') {
    out.push({ file, path, kind: 'type', detail: '문자열이어야 한다' });
    return;
  }
  if (target.trim() === '') {
    out.push({ file, path, kind: 'missing', detail: '빈 문자열' });
  }
}

/** 번역본에 한글이 남아 있는가 (ko 자신은 제외) */
function findUntranslated(target: Json, path: string, file: string, out: Problem[]): void {
  if (typeof target === 'string') {
    if (/[가-힣]/.test(target))
      out.push({ file, path, kind: 'untranslated', detail: `한국어가 남아 있다: ${target.slice(0, 40)}` });
    return;
  }
  if (Array.isArray(target)) {
    target.forEach((v, i) => findUntranslated(v, `${path}[${i}]`, file, out));
    return;
  }
  if (target !== null && typeof target === 'object') {
    for (const [k, v] of Object.entries(target as Record<string, Json>))
      findUntranslated(v, path ? `${path}.${k}` : k, file, out);
  }
}

function read(path: string): Json | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8')) as Json;
}

/** 원본 로케일이 가진 파일 목록 (로케일 자리를 <locale> 로 둔 상대 경로) */
function sourceFiles(): string[] {
  const flat = ['layer1', 'layer2', 'fallback', 'elements', 'form'].map(
    (g) => `${g}/<locale>.json`,
  );
  const catalog = readdirSync(join(DATA, 'catalog', SOURCE_LOCALE))
    .filter((f) => f.endsWith('.json'))
    .map((f) => `catalog/<locale>/${f}`);
  return [...flat, ...catalog];
}

export function validateLocale(locale: string): Problem[] {
  const problems: Problem[] = [];
  for (const template of sourceFiles()) {
    const srcPath = join(DATA, template.replace('<locale>', SOURCE_LOCALE));
    const tgtPath = join(DATA, template.replace('<locale>', locale));
    const source = read(srcPath);
    const target = read(tgtPath);
    if (source === null) continue;
    if (target === null) {
      problems.push({ file: tgtPath, path: '', kind: 'missing', detail: '파일이 없다' });
      continue;
    }
    walk(source, target, '', tgtPath, problems);
    if (locale !== SOURCE_LOCALE) findUntranslated(target, '', tgtPath, problems);
  }
  return problems;
}

function main(): void {
  const args = process.argv.slice(2);
  const filterAt = args.indexOf('--filter');
  const filter = filterAt >= 0 ? args[filterAt + 1] : undefined;
  const only = args.find((a) => !a.startsWith('--') && a !== filter);
  const targets = only ? [only] : LOCALES.filter((l) => l !== SOURCE_LOCALE);
  let total = 0;
  for (const locale of targets) {
    const problems = validateLocale(locale).filter(
      (p) => filter === undefined || p.file.includes(filter),
    );
    total += problems.length;
    if (problems.length === 0) {
      console.log(`✓ ${locale}`);
      continue;
    }
    console.log(`✗ ${locale} — ${problems.length}건`);
    const byKind = new Map<string, number>();
    for (const p of problems) byKind.set(p.kind, (byKind.get(p.kind) ?? 0) + 1);
    for (const [k, n] of byKind) console.log(`    ${k}: ${n}`);
    for (const p of problems.slice(0, 40)) console.log(`    ${p.file} @ ${p.path} — ${p.detail}`);
    if (problems.length > 40) console.log(`    … 그리고 ${problems.length - 40}건 더`);
  }
  if (total > 0) process.exit(1);
  console.log(`\n로케일 ${targets.length}개 정합성 확인 완료`);
}

if (process.argv[1]?.endsWith('validate-locale-parity.ts')) main();
