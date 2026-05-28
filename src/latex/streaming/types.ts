/**
 * Streaming Parser 타입 정의
 *
 * StreamTokenizer와 FizzexStreamParser에서 사용하는 모든 타입.
 */

import type { SourceRange, RootNode } from '../../types.js';
import type {
  TolerantParseOptions,
  Diagnostic,
  RenderDecision,
  DelimiterDetection,
} from '../tolerant/types.js';

// ============================================================================
// Stream Tokenizer 타입
// ============================================================================

/** 어휘 컨텍스트 — 중첩 추적용 */
export type LexicalContext =
  | { type: 'math'; displayMode: boolean }
  | { type: 'text'; command: string }
  | { type: 'command_arg'; command: string; argIndex: number };

/** 토크나이저 상태 */
export interface TokenizerState {
  /** 현재 단계 */
  phase: 'text' | 'maybe_delimiter' | 'inline_math' | 'display_math';
  /** 중괄호 깊이 */
  braceDepth: number;
  /** 명령 버퍼 (백슬래시 뒤 문자 축적) */
  commandBuffer: string;
  /** \text{} 중첩 깊이 */
  textModeDepth: number;
  /** 다음 문자 이스케이프 여부 */
  escapeNext: boolean;
  /** 구분자 버퍼 (모호한 구분자 축적) */
  delimiterBuffer: string;
  /** 어휘 컨텍스트 스택 */
  contextStack: LexicalContext[];
  /** 현재 수학 컨텐츠 버퍼 */
  mathBuffer: string;
  /** 텍스트 버퍼 */
  textBuffer: string;
  /** 글로벌 위치 오프셋 (feed 호출 간 누적) */
  globalOffset: number;
}

/** 토크나이저 옵션 */
export interface TokenizerOptions {
  /** 구분자 감지 수준 (기본: 'explicit') */
  delimiterDetection: DelimiterDetection;
  /** 구분자 버퍼 최대 크기 — auto_safe/auto_all에서 사용 (기본: 50) */
  delimiterBufferSize: number;
}

/** 스트림 토큰 타입 */
export type StreamTokenType =
  | 'text'
  | 'math_start'
  | 'math_content'
  | 'math_end'
  | 'ambiguous';

/** 스트림 토큰 */
export interface StreamToken {
  type: StreamTokenType;
  content: string;
  displayMode?: boolean;
  isComplete: boolean;
  sourceRange: SourceRange;
}

// ============================================================================
// Stream Parser 타입
// ============================================================================

/** 스트림 파서 옵션 */
export interface StreamParserOptions extends TolerantParseOptions {
  /** 구분자 버퍼 최대 크기 (문자 수, 기본: 50) */
  delimiterBufferSize: number;
  /** 수학 블록 크기 추정 여부 (기본: false) */
  estimateSize: boolean;
}

/** 스트림 출력 — 구분 합집합 */
export type StreamOutput =
  | StreamOutputText
  | StreamOutputMathComplete
  | StreamOutputMathPending
  | StreamOutputMathFailed
  | StreamOutputAmbiguousDelimiter;

export interface StreamOutputText {
  type: 'text';
  content: string;
}

export interface StreamOutputMathComplete {
  type: 'math_complete';
  ast: RootNode;
  diagnostics: Diagnostic[];
  renderDecision: RenderDecision;
  latex: string;
  displayMode: boolean;
}

export interface StreamOutputMathPending {
  type: 'math_pending';
  rawLatex: string;
  displayMode: boolean;
  estimatedWidth?: number;
  estimatedHeight?: number;
}

export interface StreamOutputMathFailed {
  type: 'math_failed';
  rawLatex: string;
  diagnostics: Diagnostic[];
}

export interface StreamOutputAmbiguousDelimiter {
  type: 'ambiguous_delimiter';
  content: string;
  possibleMath: boolean;
}

/** 스트림 파서 내부 상태 (외부 노출용 읽기 전용) */
export interface StreamParserState {
  /** 토크나이저 상태 */
  tokenizerState: Readonly<TokenizerState>;
  /** 현재 수집 중인 수학 블록 */
  pendingMath: string | null;
  /** 수학 모드 여부 */
  inMath: boolean;
  /** 디스플레이 모드 여부 */
  displayMode: boolean;
}
