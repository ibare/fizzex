/**
 * LaTeX 파싱 에러 타입 정의
 */

import type { MathNode } from '../types.js';

/** 에러 심각도 */
export type ParseErrorSeverity = 'error' | 'warning' | 'info';

/** 에러 타입 */
export type ParseErrorType =
  | 'syntax'           // 문법 오류
  | 'unsupported'      // 지원하지 않는 명령어
  | 'incomplete'       // 불완전한 입력 (예: 닫히지 않은 괄호)
  | 'invalid_argument' // 잘못된 인자
  | 'unknown_command'  // 알 수 없는 명령어
  | 'environment'      // 환경 관련 오류
  | 'internal';        // 내부 오류

/** 파싱 에러 */
export interface ParseError {
  /** 에러 타입 */
  type: ParseErrorType;
  /** 심각도 */
  severity: ParseErrorSeverity;
  /** 에러 메시지 */
  message: string;
  /** 에러 발생 위치 (LaTeX 문자열 내 인덱스) */
  position: number;
  /** 에러 발생 위치 주변 컨텍스트 */
  context: string;
  /** 문제가 된 명령어 또는 토큰 */
  token?: string;
  /** 에러 시점에 파서가 기대한 토큰 목록 */
  expected?: string[];
  /** 에러 이전까지 파싱된 부분 AST (tolerant parser에서 활용) */
  partialAST?: MathNode;
}

/** 에러 수집기 */
export class ParseErrorCollector {
  private errors: ParseError[] = [];

  /** 에러 추가 */
  addError(
    type: ParseErrorType,
    message: string,
    position: number,
    latex: string,
    token?: string,
    expected?: string[],
  ): void {
    const error: ParseError = {
      type,
      severity: 'error',
      message,
      position,
      context: this.extractContext(latex, position),
    };
    if (token) error.token = token;
    if (expected) error.expected = expected;
    this.errors.push(error);
  }

  /** 경고 추가 */
  addWarning(
    type: ParseErrorType,
    message: string,
    position: number,
    latex: string,
    token?: string,
    expected?: string[],
  ): void {
    const warning: ParseError = {
      type,
      severity: 'warning',
      message,
      position,
      context: this.extractContext(latex, position),
    };
    if (token) warning.token = token;
    if (expected) warning.expected = expected;
    this.errors.push(warning);
  }

  /** 정보 추가 */
  addInfo(
    type: ParseErrorType,
    message: string,
    position: number,
    latex: string,
    token?: string,
    expected?: string[],
  ): void {
    const info: ParseError = {
      type,
      severity: 'info',
      message,
      position,
      context: this.extractContext(latex, position),
    };
    if (token) info.token = token;
    if (expected) info.expected = expected;
    this.errors.push(info);
  }

  /** 에러 목록 조회 */
  getErrors(): ParseError[] {
    return this.errors.filter(e => e.severity === 'error');
  }

  /** 경고 목록 조회 */
  getWarnings(): ParseError[] {
    return this.errors.filter(e => e.severity === 'warning');
  }

  /** 전체 목록 조회 */
  getAll(): ParseError[] {
    return [...this.errors];
  }

  /** 에러 존재 여부 */
  hasErrors(): boolean {
    return this.errors.some(e => e.severity === 'error');
  }

  /** 초기화 */
  clear(): void {
    this.errors = [];
  }

  /** 위치 주변 컨텍스트 추출 */
  private extractContext(latex: string, position: number, contextLength: number = 20): string {
    const start = Math.max(0, position - contextLength);
    const end = Math.min(latex.length, position + contextLength);
    let context = latex.substring(start, end);

    if (start > 0) context = '...' + context;
    if (end < latex.length) context = context + '...';

    // 현재 위치 표시
    const markerPos = position - start + (start > 0 ? 3 : 0);
    return context + '\n' + ' '.repeat(markerPos) + '^';
  }
}

/** 전역 에러 수집기 인스턴스 */
let globalErrorCollector: ParseErrorCollector | null = null;

/** 파싱 시작 시 에러 수집기 생성 */
export function createErrorCollector(): ParseErrorCollector {
  globalErrorCollector = new ParseErrorCollector();
  return globalErrorCollector;
}

/** 현재 에러 수집기 조회 */
export function getErrorCollector(): ParseErrorCollector | null {
  return globalErrorCollector;
}

/** 에러 수집기 정리 */
export function clearErrorCollector(): void {
  globalErrorCollector = null;
}

/** 편의 함수: 에러 추가 */
export function reportError(
  type: ParseErrorType,
  message: string,
  position: number,
  latex: string,
  token?: string,
  expected?: string[],
): void {
  globalErrorCollector?.addError(type, message, position, latex, token, expected);
}

/** 편의 함수: 경고 추가 */
export function reportWarning(
  type: ParseErrorType,
  message: string,
  position: number,
  latex: string,
  token?: string,
  expected?: string[],
): void {
  globalErrorCollector?.addWarning(type, message, position, latex, token, expected);
}
