/**
 * Error Recovery — 에러 위치 기반 분할-재파싱
 *
 * strict 파서가 반환한 에러 정보를 바탕으로:
 * 1. 에러 이전의 정상 노드를 유지
 * 2. 에러 구간을 ErrorNode로 변환
 * 3. 에러 이후 구간을 재파싱
 *
 * 안전 장치:
 * - MAX_RECOVERY_ATTEMPTS = 3
 * - 전진 불변식: 매 반복에서 처리 위치가 반드시 전진
 * - 금지: 중괄호 삽입, 누락 인자 채움, 커맨드 대체
 */

import type { MathNode, RootNode, ErrorNode, SourceRange } from '../../types.js';
import type { LatexParseResult } from '../latex-parser.js';
import type { ParseError } from '../parse-errors.js';
import type { Diagnostic, PartialParseResult } from './types.js';
import { parseLatex } from '../latex-parser.js';
import { generateLatexId, resetLatexIdCounter } from '../../utils/id-generator.js';

/** 최대 복구 시도 횟수 */
const MAX_RECOVERY_ATTEMPTS = 3;

/**
 * strict 파서 결과에서 에러 복구를 시도한다.
 *
 * @param normalized 정규화된 LaTeX 문자열
 * @param strictResult strict 파서의 결과
 * @returns 에러가 없으면 null, 있으면 부분 파싱 결과
 */
export function recoverFromErrors(
  normalized: string,
  strictResult: LatexParseResult,
): PartialParseResult | null {
  if (!strictResult.hasErrors) return null;

  const errors = strictResult.errors;
  if (errors.length === 0) return null;

  const allNodes: MathNode[] = [];
  const allDiagnostics: Diagnostic[] = [];
  let remaining = normalized;
  let globalOffset = 0;
  let lastErrorEnd = -1;

  for (let attempt = 0; attempt < MAX_RECOVERY_ATTEMPTS; attempt++) {
    // 현재 remaining에 대해 파싱 시도
    const result = attempt === 0
      ? strictResult
      : parseLatex(remaining);

    if (!result.hasErrors) {
      // 재파싱 성공 → 노드 추가 후 종료
      const shifted = shiftSourceRanges(result.ast.children, globalOffset);
      allNodes.push(...shifted);
      break;
    }

    const firstError = result.errors[0];
    const errPos = firstError.position;

    // 전진 불변식: 에러 위치가 전진해야 함
    const absoluteErrPos = globalOffset + errPos;
    if (absoluteErrPos <= lastErrorEnd && lastErrorEnd >= 0) {
      // 전진하지 못함 → 나머지 전체를 ErrorNode로 처리
      const errorNode = createErrorNode(
        remaining,
        '파서가 전진하지 못하여 나머지를 에러로 처리',
        { start: globalOffset, end: globalOffset + remaining.length },
      );
      allNodes.push(errorNode);
      allDiagnostics.push(createDiagnosticFromError(
        firstError, errorNode, globalOffset,
      ));
      remaining = '';
      break;
    }

    // 에러 이전 노드 추출 (position 기반 필터링)
    const beforeNodes = extractNodesBeforePosition(result.ast.children, errPos);
    const shifted = shiftSourceRanges(beforeNodes, globalOffset);
    allNodes.push(...shifted);

    // 에러 구간 끝 결정
    const errEnd = determineErrorEnd(remaining, errPos, firstError);

    // ErrorNode 생성
    const errorRaw = remaining.slice(errPos, errEnd);
    const errorSpan: SourceRange = {
      start: globalOffset + errPos,
      end: globalOffset + errEnd,
    };
    const errorNode = createErrorNode(errorRaw, firstError.message, errorSpan, firstError.expected);
    allNodes.push(errorNode);

    allDiagnostics.push(createDiagnosticFromError(firstError, errorNode, globalOffset));

    lastErrorEnd = globalOffset + errEnd;

    // 나머지 구간 설정
    if (errEnd >= remaining.length) {
      remaining = '';
      break;
    }

    remaining = remaining.slice(errEnd);
    globalOffset += errEnd;
  }

  // 남은 부분이 있으면 마지막 시도
  if (remaining.length > 0) {
    const finalResult = parseLatex(remaining);
    if (!finalResult.hasErrors) {
      const shifted = shiftSourceRanges(finalResult.ast.children, globalOffset);
      allNodes.push(...shifted);
    } else {
      // 최종 실패 → 나머지 전체를 ErrorNode로
      const errorNode = createErrorNode(
        remaining,
        '복구 시도 한도 초과',
        { start: globalOffset, end: globalOffset + remaining.length },
      );
      allNodes.push(errorNode);
    }
  }

  // ID 재할당 (parseLatex 재호출로 인한 충돌 해소) — 새 배열 반환
  const finalNodes = reassignIds(allNodes);

  // 첫 번째 ErrorNode와 그 전후 노드 추출
  const firstErrorIdx = finalNodes.findIndex(n => n.type === 'error');
  const errorNode = (firstErrorIdx >= 0 ? finalNodes[firstErrorIdx] : finalNodes[0]) as ErrorNode;
  const parsedNodes = firstErrorIdx > 0 ? finalNodes.slice(0, firstErrorIdx) : [];
  const remainingNodes = firstErrorIdx >= 0 ? finalNodes.slice(firstErrorIdx + 1) : [];

  return {
    parsedNodes,
    errorSpan: errorNode.sourceRange ?? { start: 0, end: normalized.length },
    errorNode,
    remainingNodes,
    diagnostics: allDiagnostics,
  };
}

/**
 * 에러 타입별로 에러 구간의 끝 위치를 결정한다.
 */
function determineErrorEnd(input: string, errPos: number, error: ParseError): number {
  const type = error.type;

  switch (type) {
    case 'incomplete': {
      // 매칭 닫는 구분자 찾기 또는 입력 끝
      const opener = input[errPos];
      if (opener === '{' || opener === '(' || opener === '[') {
        const closer = findMatchingClose(input, errPos);
        return closer >= 0 ? closer + 1 : input.length;
      }
      // 커맨드로 시작하는 incomplete (예: \frac{1})
      if (opener === '\\') {
        return findCommandEnd(input, errPos);
      }
      return input.length;
    }

    case 'unknown_command':
    case 'unsupported': {
      // 커맨드 끝까지
      return findCommandEnd(input, errPos);
    }

    case 'syntax':
    case 'invalid_argument': {
      // 다음 안전 토큰까지
      return findNextSafeToken(input, errPos + 1);
    }

    case 'environment': {
      // \end{...} 끝까지
      const endEnv = input.indexOf('\\end{', errPos);
      if (endEnv >= 0) {
        const closeEnd = input.indexOf('}', endEnv + 5);
        return closeEnd >= 0 ? closeEnd + 1 : input.length;
      }
      return input.length;
    }

    case 'internal':
    default:
      return input.length;
  }
}

/** 매칭되는 닫는 구분자 찾기 */
function findMatchingClose(input: string, pos: number): number {
  const openers: Record<string, string> = { '{': '}', '(': ')', '[': ']' };
  const opener = input[pos];
  const closer = openers[opener];
  if (!closer) return -1;

  let depth = 1;
  for (let i = pos + 1; i < input.length; i++) {
    if (input[i] === '\\') { i++; continue; } // 이스케이프 건너뛰기
    if (input[i] === opener) depth++;
    else if (input[i] === closer) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** 커맨드 끝 위치 찾기: \command{args...} 전체 */
function findCommandEnd(input: string, pos: number): number {
  if (pos >= input.length || input[pos] !== '\\') return Math.min(pos + 1, input.length);

  let i = pos + 1;
  // 커맨드 이름 건너뛰기
  while (i < input.length && /[a-zA-Z]/.test(input[i])) i++;

  // 인자 블록들 건너뛰기
  while (i < input.length && input[i] === '{') {
    const close = findMatchingClose(input, i);
    if (close < 0) return input.length; // 닫히지 않음
    i = close + 1;
  }

  return i;
}

/** 다음 안전 토큰(}, ), ], \\, $) 위치 찾기 */
function findNextSafeToken(input: string, fromPos: number): number {
  const safeTokens = ['}', ')', ']', '$'];
  for (let i = fromPos; i < input.length; i++) {
    if (safeTokens.includes(input[i])) return i;
    // \\ (줄바꿈)
    if (input[i] === '\\' && i + 1 < input.length && input[i + 1] === '\\') return i;
    // 다음 커맨드 시작
    if (input[i] === '\\' && i + 1 < input.length && /[a-zA-Z]/.test(input[i + 1])) return i;
  }
  return input.length;
}

/** ErrorNode 생성 */
function createErrorNode(
  raw: string,
  message: string,
  sourceRange: SourceRange,
  expected?: string[],
): ErrorNode {
  return {
    id: generateLatexId(),
    type: 'error',
    raw,
    errorInfo: { message, expected },
    sourceRange,
    parseStatus: 'failed',
  };
}

/** ParseError → Diagnostic 변환 */
function createDiagnosticFromError(
  error: ParseError,
  errorNode: ErrorNode,
  globalOffset: number,
): Diagnostic {
  return {
    nodeId: errorNode.id,
    severity: error.severity === 'error' ? 'error' : error.severity === 'warning' ? 'warning' : 'info',
    parseStatus: 'failed',
    semanticSafety: 'unsafe',
    sourceRange: errorNode.sourceRange ?? { start: globalOffset + error.position, end: globalOffset + error.position + 1 },
    message: error.message,
    normalizations: [],
    affectsRender: true,
  };
}

/**
 * 에러 position 이전에 있는 노드들을 추출한다.
 * sourceRange가 에러 위치 이전에 완전히 포함되는 노드만 추출.
 */
function extractNodesBeforePosition(nodes: MathNode[], position: number): MathNode[] {
  const result: MathNode[] = [];
  for (const node of nodes) {
    const range = node.sourceRange;
    if (range && range.end <= position) {
      result.push(node);
    } else if (!range) {
      // sourceRange 없는 노드는 위치 추정 불가 → 포함하지 않음
      continue;
    } else {
      // 에러 위치에 걸치거나 이후 → 중단
      break;
    }
  }
  return result;
}

/**
 * 노드들의 sourceRange를 offset만큼 이동한다.
 * 분할 재파싱 시 부분 문자열 기준 위치를 전체 문자열 기준으로 변환.
 */
function shiftSourceRanges(nodes: MathNode[], offset: number): MathNode[] {
  if (offset === 0) return nodes.map(node => cloneNode(node));
  return nodes.map(node => shiftNodeRange(node, offset));
}

/** 단일 노드와 자식들의 sourceRange를 재귀적으로 이동 (새 객체 반환) */
function shiftNodeRange(node: MathNode, offset: number): MathNode {
  const shifted = { ...node } as MathNode;
  if (shifted.sourceRange) {
    shifted.sourceRange = {
      start: shifted.sourceRange.start + offset,
      end: shifted.sourceRange.end + offset,
    };
  }

  // 자식 노드들도 재귀적으로 이동 (새 배열/객체 생성)
  shiftChildRanges(shifted, offset);

  return shifted;
}

/** 노드의 얕은 복사 (자식 배열도 새로 생성) */
function cloneNode(node: MathNode): MathNode {
  return shiftNodeRange(node, 0);
}

/** 자식 노드들의 sourceRange를 재귀적으로 이동 */
function shiftChildRanges(node: MathNode, offset: number): void {
  switch (node.type) {
    case 'root':
      (node as RootNode).children = shiftSourceRanges((node as RootNode).children, offset);
      break;
    case 'frac':
      node.numerator = shiftSourceRanges(node.numerator, offset);
      node.denominator = shiftSourceRanges(node.denominator, offset);
      break;
    case 'power':
      node.base = shiftSourceRanges(node.base, offset);
      node.exponent = shiftSourceRanges(node.exponent, offset);
      break;
    case 'subscript':
      node.base = shiftSourceRanges(node.base, offset);
      node.subscript = shiftSourceRanges(node.subscript, offset);
      break;
    case 'sqrt':
      node.content = shiftSourceRanges(node.content, offset);
      if (node.index) node.index = shiftSourceRanges(node.index, offset);
      break;
    case 'paren':
    case 'abs':
      node.content = shiftSourceRanges(node.content, offset);
      break;
    case 'func':
      node.argument = shiftSourceRanges(node.argument, offset);
      break;
    case 'integral':
      node.integrand = shiftSourceRanges(node.integrand, offset);
      if (node.lower) node.lower = shiftSourceRanges(node.lower, offset);
      if (node.upper) node.upper = shiftSourceRanges(node.upper, offset);
      break;
    case 'sum':
      node.body = shiftSourceRanges(node.body, offset);
      node.lower = shiftSourceRanges(node.lower, offset);
      node.upper = shiftSourceRanges(node.upper, offset);
      break;
    case 'product':
      node.body = shiftSourceRanges(node.body, offset);
      node.lower = shiftSourceRanges(node.lower, offset);
      node.upper = shiftSourceRanges(node.upper, offset);
      break;
    case 'limit':
      node.body = shiftSourceRanges(node.body, offset);
      node.approach = shiftSourceRanges(node.approach, offset);
      break;
    case 'overline':
      node.content = shiftSourceRanges(node.content, offset);
      break;
    case 'accent':
      node.content = shiftSourceRanges(node.content, offset);
      break;
    case 'overset':
      node.base = shiftSourceRanges(node.base, offset);
      node.annotation = shiftSourceRanges(node.annotation, offset);
      break;
    case 'cancel':
      node.content = shiftSourceRanges(node.content, offset);
      break;
    case 'xarrow':
      node.above = shiftSourceRanges(node.above, offset);
      if (node.below) node.below = shiftSourceRanges(node.below, offset);
      break;
    case 'matrix':
      node.rows = node.rows.map(row => shiftSourceRanges(row, offset));
      break;
    case 'align':
    case 'cases':
    case 'array':
      node.rows = node.rows.map(row => shiftSourceRanges(row, offset));
      break;
    case 'gather':
      node.rows = node.rows.map(n => shiftNodeRange(n, offset));
      break;
    case 'row':
      node.children = shiftSourceRanges(node.children, offset);
      break;
    case 'opaque':
      node.args = node.args.map(arg => shiftSourceRanges(arg, offset));
      break;
    // 리프 노드: number, variable, operator, text, space, literal, error
    default:
      break;
  }
}

/**
 * 트리 전체의 ID를 재할당한다 (불변 — 새 노드 배열 반환).
 * parseLatex 재호출로 인한 ID 충돌을 해소.
 */
function reassignIds(nodes: MathNode[]): MathNode[] {
  resetLatexIdCounter();
  return nodes.map(reassignNodeId);
}

/** 단일 노드와 자식들의 ID를 재귀적으로 재할당 (새 노드 반환) */
function reassignNodeId(node: MathNode): MathNode {
  const cloned = { ...node, id: generateLatexId() } as MathNode;

  switch (cloned.type) {
    case 'root':
      (cloned as RootNode).children = (cloned as RootNode).children.map(reassignNodeId);
      break;
    case 'frac':
      cloned.numerator = cloned.numerator.map(reassignNodeId);
      cloned.denominator = cloned.denominator.map(reassignNodeId);
      break;
    case 'power':
      cloned.base = cloned.base.map(reassignNodeId);
      cloned.exponent = cloned.exponent.map(reassignNodeId);
      break;
    case 'subscript':
      cloned.base = cloned.base.map(reassignNodeId);
      cloned.subscript = cloned.subscript.map(reassignNodeId);
      break;
    case 'sqrt':
      cloned.content = cloned.content.map(reassignNodeId);
      if (cloned.index) cloned.index = cloned.index.map(reassignNodeId);
      break;
    case 'paren':
    case 'abs':
      cloned.content = cloned.content.map(reassignNodeId);
      break;
    case 'func':
      cloned.argument = cloned.argument.map(reassignNodeId);
      break;
    case 'integral':
      cloned.integrand = cloned.integrand.map(reassignNodeId);
      if (cloned.lower) cloned.lower = cloned.lower.map(reassignNodeId);
      if (cloned.upper) cloned.upper = cloned.upper.map(reassignNodeId);
      break;
    case 'sum':
      cloned.body = cloned.body.map(reassignNodeId);
      cloned.lower = cloned.lower.map(reassignNodeId);
      cloned.upper = cloned.upper.map(reassignNodeId);
      break;
    case 'product':
      cloned.body = cloned.body.map(reassignNodeId);
      cloned.lower = cloned.lower.map(reassignNodeId);
      cloned.upper = cloned.upper.map(reassignNodeId);
      break;
    case 'limit':
      cloned.body = cloned.body.map(reassignNodeId);
      cloned.approach = cloned.approach.map(reassignNodeId);
      break;
    case 'overline':
      cloned.content = cloned.content.map(reassignNodeId);
      break;
    case 'accent':
      cloned.content = cloned.content.map(reassignNodeId);
      break;
    case 'overset':
      cloned.base = cloned.base.map(reassignNodeId);
      cloned.annotation = cloned.annotation.map(reassignNodeId);
      break;
    case 'cancel':
      cloned.content = cloned.content.map(reassignNodeId);
      break;
    case 'xarrow':
      cloned.above = cloned.above.map(reassignNodeId);
      if (cloned.below) cloned.below = cloned.below.map(reassignNodeId);
      break;
    case 'matrix':
      cloned.rows = cloned.rows.map(row => row.map(reassignNodeId));
      break;
    case 'align':
    case 'cases':
    case 'array':
      cloned.rows = cloned.rows.map(row => row.map(reassignNodeId));
      break;
    case 'gather':
      cloned.rows = cloned.rows.map(reassignNodeId);
      break;
    case 'row':
      cloned.children = cloned.children.map(reassignNodeId);
      break;
    case 'opaque':
      cloned.args = cloned.args.map(arg => arg.map(reassignNodeId));
      break;
    // 리프 노드: number, variable, operator, text, space, literal, error
    default:
      break;
  }

  return cloned;
}
