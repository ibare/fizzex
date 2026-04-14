/**
 * 코퍼스 테스트 러너
 * 각 수식에 대해 파싱/라운드트립/박스 생성 검증을 수행한다.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { parseLatexWithErrors } from '../../latex/latex-parser';
import { astToLatex } from '../../latex/ast-to-latex';
import { astToBox } from '../../box/ast-to-box';
import { createDeterministicMetrics } from '../layout/deterministic-metrics';

interface CorpusEntry {
  id: string;
  latex: string;
  source: string;
  category?: string;
}

export interface TestResult {
  id: string;
  latex: string;
  source: string;
  results: {
    parseSuccess: boolean;
    parseError?: string;
    parseWarnings?: string[];
    roundTripSuccess: boolean;
    roundTripDiff?: string;
    boxSuccess: boolean;
    boxError?: string;
    boxWidth?: number;
  };
}

export interface CorpusTestReport {
  total: number;
  parseSuccess: number;
  parseFail: number;
  /** 경고 없는 완전한 파싱 성공 수 */
  parseClean: number;
  roundTripSuccess: number;
  roundTripFail: number;
  boxSuccess: number;
  boxFail: number;
  duration: number;
  bySource: Record<string, { total: number; parseSuccess: number; parseClean: number; roundTrip: number; box: number }>;
  failurePatterns: { pattern: string; count: number; severity: string; example: string }[];
  unsupportedCommands: { command: string; occurrences: number; source: string; priority: string }[];
  failures: TestResult[];
  parseRate: number;
  /** 경고 없는 파싱 성공률 */
  parseCleanRate: number;
  roundTripRate: number;
  boxRate: number;
}

export async function runCorpusTest(corpusPath: string): Promise<CorpusTestReport> {
  const absPath = resolve(dirname(new URL(import.meta.url).pathname), corpusPath);
  const data = JSON.parse(readFileSync(absPath, 'utf-8'));
  const formulas: CorpusEntry[] = data.formulas;

  const metrics = createDeterministicMetrics();
  const results: TestResult[] = [];
  const bySource: Record<string, { total: number; parseSuccess: number; parseClean: number; roundTrip: number; box: number }> = {};
  const errorPatterns: Record<string, { count: number; example: string; source: string }> = {};

  let parseOk = 0;
  let parseClean = 0;
  let roundTripOk = 0;
  let boxOk = 0;

  const start = Date.now();

  for (const entry of formulas) {
    const result: TestResult = {
      id: entry.id,
      latex: entry.latex,
      source: entry.source,
      results: {
        parseSuccess: false,
        roundTripSuccess: false,
        boxSuccess: false,
      },
    };

    // 소스별 통계 초기화
    if (!bySource[entry.source]) {
      bySource[entry.source] = { total: 0, parseSuccess: 0, parseClean: 0, roundTrip: 0, box: 0 };
    }
    bySource[entry.source].total++;

    // 1. 파싱 테스트 — hasErrors로 판정 (throw 안 남 ≠ 성공)
    const parseResult = parseLatexWithErrors(entry.latex);
    const ast = parseResult.ast;

    if (parseResult.hasErrors) {
      // 에러가 있으면 파싱 실패
      const firstError = parseResult.errors[0];
      result.results.parseError = firstError?.message || 'Unknown parse error';

      // 에러 패턴 수집
      const pattern = categorizeError(result.results.parseError);
      if (!errorPatterns[pattern]) {
        errorPatterns[pattern] = { count: 0, example: entry.latex, source: entry.source };
      }
      errorPatterns[pattern].count++;
    } else {
      result.results.parseSuccess = true;
      parseOk++;
      bySource[entry.source].parseSuccess++;

      // 경고가 없으면 깨끗한 파싱
      if (parseResult.warnings.length === 0) {
        parseClean++;
        bySource[entry.source].parseClean++;
      } else {
        result.results.parseWarnings = parseResult.warnings.map((w) => w.message);
      }

      // 2. 라운드트립 테스트
      try {
        const regenerated = astToLatex(ast);
        const reParsedResult = parseLatexWithErrors(regenerated);
        const reRegenerated = astToLatex(reParsedResult.ast);

        // 라운드트립 비교: 두 번째 변환이 동일한지 (정규화 후 안정성)
        if (regenerated === reRegenerated) {
          result.results.roundTripSuccess = true;
          roundTripOk++;
          bySource[entry.source].roundTrip++;
        } else {
          result.results.roundTripDiff = `"${regenerated}" → "${reRegenerated}"`;
        }
      } catch (e: any) {
        result.results.roundTripDiff = `Error: ${e.message}`;
      }

      // 3. 박스 생성 테스트 — width > 0 검증
      try {
        const box = astToBox(ast, metrics as any);
        if (box && box.width > 0) {
          result.results.boxSuccess = true;
          result.results.boxWidth = box.width;
          boxOk++;
          bySource[entry.source].box++;
        } else {
          result.results.boxError = box ? `빈 박스: width=${box.width}` : 'null 박스';
          result.results.boxWidth = box?.width ?? 0;
        }
      } catch (e: any) {
        result.results.boxError = e.message;
      }
    }

    // 실패한 것만 결과에 추가
    if (!result.results.parseSuccess || !result.results.roundTripSuccess || !result.results.boxSuccess) {
      results.push(result);
    }
  }

  const duration = Date.now() - start;
  const total = formulas.length;

  // 실패 패턴 정렬 및 변환
  const failurePatterns = Object.entries(errorPatterns)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([pattern, data]) => ({
      pattern,
      count: data.count,
      severity: data.count > 50 ? 'high' : data.count > 20 ? 'medium' : 'low',
      example: data.example.substring(0, 120),
    }));

  // 미지원 명령어 추출
  const unsupportedCommands = extractUnsupportedCommands(results);

  return {
    total,
    parseSuccess: parseOk,
    parseClean,
    parseFail: total - parseOk,
    roundTripSuccess: roundTripOk,
    roundTripFail: total - roundTripOk,
    boxSuccess: boxOk,
    boxFail: total - boxOk,
    duration,
    bySource,
    failurePatterns,
    unsupportedCommands,
    failures: results.sort((a, b) => {
      // 파싱 실패 우선, 그 다음 박스 실패
      const aScore = (a.results.parseSuccess ? 0 : 4) + (a.results.boxSuccess ? 0 : 2) + (a.results.roundTripSuccess ? 0 : 1);
      const bScore = (b.results.parseSuccess ? 0 : 4) + (b.results.boxSuccess ? 0 : 2) + (b.results.roundTripSuccess ? 0 : 1);
      return bScore - aScore;
    }),
    parseRate: total > 0 ? (parseOk / total) * 100 : 0,
    parseCleanRate: total > 0 ? (parseClean / total) * 100 : 0,
    roundTripRate: total > 0 ? (roundTripOk / total) * 100 : 0,
    boxRate: total > 0 ? (boxOk / total) * 100 : 0,
  };
}

function categorizeError(message: string): string {
  if (message.includes('Unknown command')) return 'unknown_command';
  if (message.includes('Unknown environment')) return 'unknown_environment';
  if (message.includes('Expected')) return 'syntax_error';
  if (message.includes('Missing')) return 'missing_element';
  if (message.includes('Unexpected')) return 'unexpected_token';
  if (message.includes('Cannot read') || message.includes('undefined')) return 'runtime_error';
  return 'other';
}

function extractUnsupportedCommands(results: TestResult[]): { command: string; occurrences: number; source: string; priority: string }[] {
  const cmdMap: Record<string, { count: number; source: string }> = {};

  for (const r of results) {
    if (!r.results.parseError) continue;
    const match = r.results.parseError.match(/Unknown command:\s*(\\[a-zA-Z]+)/);
    if (match) {
      const cmd = match[1];
      if (!cmdMap[cmd]) cmdMap[cmd] = { count: 0, source: r.source };
      cmdMap[cmd].count++;
    }
  }

  return Object.entries(cmdMap)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([cmd, data]) => ({
      command: cmd,
      occurrences: data.count,
      source: data.source,
      priority: data.count > 10 ? 'high' : data.count > 5 ? 'medium' : 'low',
    }));
}
