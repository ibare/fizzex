/**
 * Tolerant Parser — 통합 파이프라인
 *
 * preProcess → parseLatex → recoverFromErrors → 진단 변환 → RenderDecision
 *
 * 4가지 모드:
 * - strict: 기존 파서만 사용
 * - tolerant: 정규화 + 에러 복구 적용
 * - strict_fallback: strict 먼저, 에러 시 tolerant 재시도
 * - auto: 입력 패턴으로 모드 자동 결정
 */

import type { RootNode, MathNode, ParseStatus, SourceRange } from '../../types';
import type {
  TolerantParseOptions,
  TolerantParseResult,
  Diagnostic,
  NormalizationRecord,
  OffsetMap,
} from './types';
import { parseLatex } from '../latex-parser';
import type { LatexParseResult } from '../latex-parser';
import type { ParseError } from '../parse-errors';
import { preProcess } from './pre-processor';
import { recoverFromErrors } from './error-recovery';
import { determineRenderMode } from './determine-render-mode';
import { identityOffsetMap } from './offset-map';

/** 기본 옵션 */
const DEFAULT_OPTIONS: TolerantParseOptions = {
  parserMode: 'strict_fallback',
  delimiterDetection: 'explicit',
  unknownCommandPolicy: 'allow_unknown_leaf',
  backslashNormalization: true,
  whitespaceNormalization: true,
};

/**
 * Tolerant LaTeX 파서 — 통합 API
 *
 * @param input 원본 LaTeX 문자열
 * @param options 파서 옵션 (부분 지정 가능, 나머지는 기본값)
 * @returns 파싱 결과 (AST + 진단 + 렌더링 결정)
 */
export function tolerantParse(
  input: string,
  options?: Partial<TolerantParseOptions>,
): TolerantParseResult {
  const opts: TolerantParseOptions = { ...DEFAULT_OPTIONS, ...options };

  switch (opts.parserMode) {
    case 'strict':
      return runStrict(input);

    case 'tolerant':
      return runTolerant(input, opts);

    case 'strict_fallback': {
      const strictResult = runStrict(input);
      if (strictResult.diagnostics.length === 0) return strictResult;
      return runTolerant(input, opts);
    }

    case 'auto': {
      if (needsTolerantParsing(input)) {
        return runTolerant(input, opts);
      }
      const strictResult = runStrict(input);
      if (strictResult.diagnostics.length === 0) return strictResult;
      return runTolerant(input, opts);
    }

    default: {
      // 타입 안전: 모든 모드를 처리했으므로 여기 도달하지 않음
      const _exhaustive: never = opts.parserMode;
      return runStrict(input);
    }
  }
}

/**
 * strict 모드: 기존 파서만 사용
 */
function runStrict(input: string): TolerantParseResult {
  const result = parseLatex(input);
  const diagnostics = convertErrorsToDiagnostics(result, identityOffsetMap());
  const renderDecision = determineRenderMode(diagnostics);

  return {
    ast: result.ast,
    diagnostics,
    renderDecision,
    normalizations: [],
  };
}

/**
 * tolerant 모드: 정규화 + 에러 복구
 */
function runTolerant(input: string, opts: TolerantParseOptions): TolerantParseResult {
  // 1. 전처리 (정규화)
  const preResult = preProcess(input, {
    backslashNormalization: opts.backslashNormalization,
    whitespaceNormalization: opts.whitespaceNormalization,
  });

  // 2. strict 파서 호출
  const strictResult = parseLatex(preResult.normalized);

  // 3. 에러 복구
  const recovered = recoverFromErrors(preResult.normalized, strictResult);

  // 4. AST 결정
  let ast: RootNode;
  let diagnostics: Diagnostic[];

  if (recovered) {
    // 에러 복구 결과로 AST 재조합
    const allChildren: MathNode[] = [
      ...recovered.parsedNodes,
      recovered.errorNode,
      ...recovered.remainingNodes,
    ];
    ast = {
      ...strictResult.ast,
      children: allChildren,
      parseStatus: 'partial' as ParseStatus,
    };
    diagnostics = [
      ...recovered.diagnostics,
      ...convertWarningsToDiagnostics(strictResult, preResult.offsetMap),
    ];
  } else {
    // 에러 없음 — strict 결과 사용
    ast = strictResult.ast;
    diagnostics = convertErrorsToDiagnostics(strictResult, preResult.offsetMap);
  }

  // 5. 정규화 진단 추가
  const normDiagnostics = preResult.recoveries.map(rec =>
    normalizationToDiagnostic(rec, preResult.offsetMap),
  );
  diagnostics = [...normDiagnostics, ...diagnostics];

  // 6. 렌더링 결정
  const renderDecision = determineRenderMode(diagnostics);

  return {
    ast,
    diagnostics,
    renderDecision,
    offsetMap: preResult.offsetMap,
    normalizations: preResult.recoveries,
  };
}

/**
 * 입력에 tolerant 파싱이 필요한 패턴이 있는지 검사한다.
 * auto 모드에서 사용하는 휴리스틱.
 */
function needsTolerantParsing(input: string): boolean {
  // 연속 백슬래시 + 알파벳 (3개 이상)
  if (/\\{3,}[a-zA-Z]/.test(input)) return true;
  // 커맨드-중괄호 간 공백
  if (/\\[a-zA-Z]+ +\{/.test(input)) return true;
  return false;
}

/**
 * ParseError[] → Diagnostic[] 변환
 */
function convertErrorsToDiagnostics(
  result: LatexParseResult,
  offsetMap: OffsetMap,
): Diagnostic[] {
  const allErrors = [...result.errors, ...result.warnings];
  return allErrors.map(error => parseErrorToDiagnostic(error, offsetMap));
}

/**
 * 경고만 Diagnostic으로 변환 (에러는 recovered.diagnostics에서 이미 처리)
 */
function convertWarningsToDiagnostics(
  result: LatexParseResult,
  offsetMap: OffsetMap,
): Diagnostic[] {
  return result.warnings.map(warning => parseErrorToDiagnostic(warning, offsetMap));
}

/**
 * 단일 ParseError → Diagnostic 변환
 */
function parseErrorToDiagnostic(error: ParseError, offsetMap: OffsetMap): Diagnostic {
  const originalPos = offsetMap.toOriginal(error.position);
  const severity = error.severity === 'error' ? 'error'
    : error.severity === 'warning' ? 'warning'
    : 'info';

  return {
    nodeId: '',
    severity: severity as 'error' | 'warning' | 'info',
    parseStatus: severity === 'error' ? 'failed' : 'parsed',
    semanticSafety: severity === 'error' ? 'unsafe' : 'unknown',
    sourceRange: {
      start: originalPos,
      end: originalPos + (error.token?.length ?? 1),
    },
    message: error.message,
    normalizations: [],
    affectsRender: severity === 'error',
  };
}

/**
 * NormalizationRecord → Diagnostic 변환
 */
function normalizationToDiagnostic(
  record: NormalizationRecord,
  offsetMap: OffsetMap,
): Diagnostic {
  return {
    nodeId: '',
    severity: 'info',
    parseStatus: 'parsed',
    semanticSafety: 'safe',
    sourceRange: record.originalSpan,
    message: record.description,
    normalizations: [record],
    affectsRender: false,
  };
}
