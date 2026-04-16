/**
 * 코퍼스 테스트 러너
 * 각 수식에 대해 파싱/라운드트립/박스 생성 검증을 수행한다.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { parseLatex } from '../../latex/latex-parser';
import { astToLatex } from '../../latex/ast-to-latex';
import { astToBox } from '../../box/ast-to-box';
import { createDeterministicMetrics } from '../layout/deterministic-metrics';
import { isStandardUnimplemented, getPackageName } from '../../latex/known-commands';

interface CorpusEntry {
  id: string;
  latex: string;
  source: string;
  category?: string;
}

/**
 * 수식 판정 등급
 *
 * A (Perfect)    : 에러 0, 경고 0, 라운드트립 OK, 박스 OK
 * B (Functional) : 에러 0, 경고 있음, 박스 OK (width > 0)
 * C (Degraded)   : 에러 있음 OR 박스 width=0
 * F (Failed)     : 예외 발생 OR 박스 생성 불가
 */
export type Grade = 'A' | 'B' | 'C' | 'F';

export interface TestResult {
  id: string;
  latex: string;
  source: string;
  grade: Grade;
  results: {
    parseSuccess: boolean;
    parseErrors?: string[];
    parseWarnings?: string[];
    roundTripSuccess: boolean;
    roundTripDiff?: string;
    boxSuccess: boolean;
    boxError?: string;
    boxWidth?: number;
  };
}

export interface GradeStats {
  A: number;
  B: number;
  C: number;
  F: number;
  rateA: number;
  rateB: number;
  rateC: number;
  rateF: number;
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
  /** 4단계 등급 통계 */
  grades: GradeStats;
  bySource: Record<string, {
    total: number;
    parseSuccess: number;
    parseClean: number;
    roundTrip: number;
    box: number;
    grades: { A: number; B: number; C: number; F: number };
  }>;
  failurePatterns: { pattern: string; count: number; severity: string; example: string }[];
  unsupportedCommands: { command: string; occurrences: number; source: string; priority: string }[];
  /** 경고 영향도 분류 */
  warningImpact: {
    critical: { command: string; count: number }[];
    extension: { command: string; count: number; pkg: string }[];
    outOfScope: { command: string; count: number }[];
    totalCritical: number;
    totalExtension: number;
    totalOutOfScope: number;
  };
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
  const bySource: Record<string, {
    total: number; parseSuccess: number; parseClean: number; roundTrip: number; box: number;
    grades: { A: number; B: number; C: number; F: number };
  }> = {};
  const errorPatterns: Record<string, { count: number; example: string; source: string }> = {};

  let parseOk = 0;
  let parseClean = 0;
  let roundTripOk = 0;
  let boxOk = 0;
  const gradeCounts = { A: 0, B: 0, C: 0, F: 0 };

  const start = Date.now();

  for (const entry of formulas) {
    const result: TestResult = {
      id: entry.id,
      latex: entry.latex,
      source: entry.source,
      grade: 'F' as Grade,
      results: {
        parseSuccess: false,
        roundTripSuccess: false,
        boxSuccess: false,
      },
    };

    // 소스별 통계 초기화
    if (!bySource[entry.source]) {
      bySource[entry.source] = {
        total: 0, parseSuccess: 0, parseClean: 0, roundTrip: 0, box: 0,
        grades: { A: 0, B: 0, C: 0, F: 0 },
      };
    }
    bySource[entry.source].total++;

    // 1. 파싱 테스트 — hasErrors로 판정
    const parseResult = parseLatex(entry.latex);
    const ast = parseResult.ast;
    const hasErrors = parseResult.hasErrors;
    const hasWarnings = parseResult.warnings.length > 0;

    if (hasErrors) {
      result.results.parseErrors = parseResult.errors.map((e) => e.message);

      // 에러 패턴 수집
      const firstError = parseResult.errors[0];
      const pattern = categorizeError(firstError?.message || 'Unknown parse error');
      if (!errorPatterns[pattern]) {
        errorPatterns[pattern] = { count: 0, example: entry.latex, source: entry.source };
      }
      errorPatterns[pattern].count++;
    } else {
      result.results.parseSuccess = true;
      parseOk++;
      bySource[entry.source].parseSuccess++;
    }

    // 경고 수집 (에러 유무와 무관하게)
    if (hasWarnings) {
      result.results.parseWarnings = parseResult.warnings.map((w) => w.message);
    }
    if (!hasErrors && !hasWarnings) {
      parseClean++;
      bySource[entry.source].parseClean++;
    }

    // 2. 라운드트립 테스트 (파싱 에러 여부와 무관하게 AST 기반으로 시도)
    try {
      const regenerated = astToLatex(ast);
      const reParsedResult = parseLatex(regenerated);
      const reRegenerated = astToLatex(reParsedResult.ast);

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

    // 4. 등급 판정
    //   A: 에러 0, 경고 0, 라운드트립 OK, 박스 OK
    //   B: 에러 0, 경고 있음, 박스 OK (width > 0)
    //   C: 에러 있음 OR 박스 width=0
    //   F: 예외 발생 OR 박스 생성 불가
    let grade: Grade;
    if (!result.results.boxSuccess && result.results.boxError?.includes('Error')) {
      grade = 'F';
    } else if (hasErrors || (result.results.boxWidth !== undefined && result.results.boxWidth === 0)) {
      grade = 'C';
    } else if (hasWarnings) {
      grade = result.results.boxSuccess ? 'B' : 'C';
    } else {
      grade = (result.results.roundTripSuccess && result.results.boxSuccess) ? 'A' : 'B';
    }
    result.grade = grade;
    gradeCounts[grade]++;
    bySource[entry.source].grades[grade]++;

    // Grade A가 아닌 것만 결과에 추가
    if (grade !== 'A') {
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
    grades: {
      ...gradeCounts,
      rateA: total > 0 ? (gradeCounts.A / total) * 100 : 0,
      rateB: total > 0 ? (gradeCounts.B / total) * 100 : 0,
      rateC: total > 0 ? (gradeCounts.C / total) * 100 : 0,
      rateF: total > 0 ? (gradeCounts.F / total) * 100 : 0,
    },
    bySource,
    failurePatterns,
    unsupportedCommands,
    warningImpact: classifyWarningImpact(results),
    failures: results.sort((a, b) => {
      // 등급순 정렬: F > C > B
      const gradeOrder = { F: 3, C: 2, B: 1, A: 0 };
      return gradeOrder[b.grade] - gradeOrder[a.grade];
    }),
    parseRate: total > 0 ? (parseOk / total) * 100 : 0,
    parseCleanRate: total > 0 ? (parseClean / total) * 100 : 0,
    roundTripRate: total > 0 ? (roundTripOk / total) * 100 : 0,
    boxRate: total > 0 ? (boxOk / total) * 100 : 0,
  };
}

export function categorizeError(message: string): string {
  if (message.includes('매칭되지 않은 환경 종료')) return 'unmatched_end';
  if (message.includes('매칭되지 않은 \\right')) return 'unmatched_right';
  if (message.includes('미구현 표준 명령어')) return 'standard_unimplemented';
  if (message.includes('Unknown command') || message.includes('알 수 없는 명령어')) return 'unknown_command';
  if (message.includes('Unknown environment')) return 'unknown_environment';
  if (message.includes('Expected')) return 'syntax_error';
  if (message.includes('Missing')) return 'missing_element';
  if (message.includes('Unexpected')) return 'unexpected_token';
  if (message.includes('Cannot read') || message.includes('undefined')) return 'runtime_error';
  if (message.includes('내부 오류')) return 'internal_error';
  return 'other';
}

function extractUnsupportedCommands(results: TestResult[]): { command: string; occurrences: number; source: string; priority: string }[] {
  const cmdMap: Record<string, { count: number; source: string }> = {};
  const cmdPattern = /(?:알 수 없는 명령어|미구현 표준 명령어|패키지 명령어|매칭되지 않은 환경 종료|매칭되지 않은).*?\\([a-zA-Z]+)/;

  for (const r of results) {
    // 에러와 경고 모두에서 명령어 추출
    const allMessages = [
      ...(r.results.parseErrors || []),
      ...(r.results.parseWarnings || []),
    ];
    for (const msg of allMessages) {
      const match = msg.match(cmdPattern);
      if (match) {
        const cmd = '\\' + match[1];
        if (!cmdMap[cmd]) cmdMap[cmd] = { count: 0, source: r.source };
        cmdMap[cmd].count++;
      }
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

/**
 * 경고/에러에서 추출된 명령어를 영향도별로 분류
 *
 * critical   : 파서가 지원해야 하는 표준 명령어 + 환경/구분자 매칭 실패
 * extension  : 알려진 패키지 명령어 (physics, tikz 등)
 * outOfScope : 사용자 매크로, 완전히 미확인 명령어
 */
function classifyWarningImpact(results: TestResult[]): CorpusTestReport['warningImpact'] {
  const critical: Record<string, number> = {};
  const extension: Record<string, { count: number; pkg: string }> = {};
  const outOfScope: Record<string, number> = {};

  for (const r of results) {
    const allMessages = [
      ...(r.results.parseErrors || []),
      ...(r.results.parseWarnings || []),
    ];
    for (const msg of allMessages) {
      // 환경 매칭 실패
      if (msg.includes('매칭되지 않은 환경 종료')) {
        critical['\\end (unmatched)'] = (critical['\\end (unmatched)'] || 0) + 1;
        continue;
      }
      // 구분자 매칭 실패
      if (msg.includes('매칭되지 않은 \\right')) {
        critical['\\right (unmatched)'] = (critical['\\right (unmatched)'] || 0) + 1;
        continue;
      }

      // 명령어 추출
      const match = msg.match(/(?:미구현 표준 명령어|패키지 명령어|알 수 없는 명령어).*?\\([a-zA-Z]+)/);
      if (!match) continue;
      const cmdName = match[1];

      if (msg.includes('미구현 표준 명령어') || isStandardUnimplemented(cmdName)) {
        critical['\\' + cmdName] = (critical['\\' + cmdName] || 0) + 1;
      } else {
        const pkg = getPackageName(cmdName);
        if (pkg) {
          if (!extension['\\' + cmdName]) extension['\\' + cmdName] = { count: 0, pkg };
          extension['\\' + cmdName].count++;
        } else {
          outOfScope['\\' + cmdName] = (outOfScope['\\' + cmdName] || 0) + 1;
        }
      }
    }
  }

  const sortByCount = <T extends { count: number }>(arr: T[]) => arr.sort((a, b) => b.count - a.count);

  const criticalList = sortByCount(
    Object.entries(critical).map(([command, count]) => ({ command, count }))
  );
  const extensionList = sortByCount(
    Object.entries(extension).map(([command, { count, pkg }]) => ({ command, count, pkg }))
  );
  const outOfScopeList = sortByCount(
    Object.entries(outOfScope).map(([command, count]) => ({ command, count }))
  );

  return {
    critical: criticalList,
    extension: extensionList,
    outOfScope: outOfScopeList,
    totalCritical: criticalList.reduce((s, c) => s + c.count, 0),
    totalExtension: extensionList.reduce((s, c) => s + c.count, 0),
    totalOutOfScope: outOfScopeList.reduce((s, c) => s + c.count, 0),
  };
}
