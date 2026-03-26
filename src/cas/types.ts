/**
 * Fizzex CAS (Computer Algebra System) 타입 정의
 */

import type { RootNode } from '../types';

/**
 * CAS 연산 종류
 */
export type CASOperation =
  | 'simplify' // 단순화
  | 'expand' // 전개
  | 'factor' // 인수분해
  | 'solve' // 방정식 풀이
  | 'diff' // 미분
  | 'integrate' // 적분
  | 'evaluate'; // 수치 계산

/**
 * CAS 연산 결과
 */
export interface CASResult {
  /** 성공 여부 */
  success: boolean;

  /** 수행된 연산 */
  operation: CASOperation;

  /** 입력 LaTeX */
  inputLatex: string;

  /** 결과 LaTeX */
  resultLatex?: string;

  /** 결과 AST (파싱 성공 시) */
  resultAst?: RootNode;

  /** 다중 결과 (solve의 경우 여러 해) */
  solutions?: string[];

  /** 오류 메시지 */
  error?: string;
}

/**
 * 미분 옵션
 */
export interface DiffOptions {
  /** 미분 변수 (기본: 자동 감지) */
  variable?: string;
  /** 미분 횟수 (기본: 1) */
  times?: number;
}

/**
 * 적분 옵션
 */
export interface IntegrateOptions {
  /** 적분 변수 (기본: 자동 감지) */
  variable?: string;
  /** 정적분 하한 */
  from?: number;
  /** 정적분 상한 */
  to?: number;
}

/**
 * 방정식 풀이 옵션
 */
export interface SolveOptions {
  /** 풀이 대상 변수 (기본: 자동 감지) */
  variable?: string;
}

/**
 * CAS 서비스 인터페이스
 */
export interface CASService {
  /** 단순화 */
  simplify(latex: string): CASResult;

  /** 전개 */
  expand(latex: string): CASResult;

  /** 인수분해 */
  factor(latex: string): CASResult;

  /** 방정식 풀이 */
  solve(latex: string, options?: SolveOptions): CASResult;

  /** 미분 */
  diff(latex: string, options?: DiffOptions): CASResult;

  /** 적분 */
  integrate(latex: string, options?: IntegrateOptions): CASResult;

  /** 수치 계산 */
  evaluate(latex: string, variables?: Record<string, number>): CASResult;
}
