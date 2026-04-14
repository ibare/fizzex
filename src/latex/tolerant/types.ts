/**
 * Tolerant Parser 진단 시스템 타입
 *
 * 3축 진단: ParseStatus × SemanticSafety × NormalizationRecord
 * AST 구조와 분리된 품질/에러 정보를 관리한다.
 */

import type { MathNode, RootNode, ErrorNode, ParseStatus, SourceRange } from '../../types';

/** 축 2: 의미 보존 여부 */
export type SemanticSafety =
  | 'safe'      // 원본과 수학적 의미가 동일함이 확실
  | 'unsafe'    // 의미가 달라졌을 수 있음
  | 'unknown';  // 판단 불가 (미지 커맨드 등)

/** 축 3: 정규화 내역 */
export interface NormalizationRecord {
  type: 'backslash_norm' | 'whitespace_trim' | 'delimiter_norm' | 'unknown_command';
  originalSpan: SourceRange;    // 원본 기준 위치
  normalizedSpan: SourceRange;  // 정규화 후 위치
  description: string;          // 사람이 읽을 수 있는 설명
}

/** 진단 항목 — AST 노드 ID로 참조 */
export interface Diagnostic {
  nodeId: string;               // 관련 AST 노드 ID
  severity: 'info' | 'warning' | 'error';
  parseStatus: ParseStatus;
  semanticSafety: SemanticSafety;
  sourceRange: SourceRange;     // 원본 입력 기준 위치
  message: string;              // 사람이 읽을 수 있는 설명
  normalizations: NormalizationRecord[];
  affectsRender: boolean;       // 렌더링에 영향을 미치는지
}

/** 렌더링 모드 */
export type RenderMode = 'full' | 'partial' | 'none';

/** 렌더링 결정 — determineRenderMode의 반환 타입 */
export interface RenderDecision {
  mode: RenderMode;
  safeSpans: SourceRange[];     // 수식으로 렌더링 가능한 구간
  blockedSpans: SourceRange[];  // 원본 텍스트로 보여줄 구간
}

// ============================================================================
// Tolerant Parser 타입
// ============================================================================

/** 정규화 전후 오프셋 매핑 */
export interface OffsetMap {
  /** 정규화 후 오프셋 → 원본 오프셋 */
  toOriginal(normalizedOffset: number): number;
  /** 원본 오프셋 → 정규화 후 오프셋 */
  toNormalized(originalOffset: number): number;
}

/** 구분자 감지 수준 */
export type DelimiterDetection = 'explicit' | 'auto_safe' | 'auto_all';

/** 전처리 결과 */
export interface PreProcessResult {
  normalized: string;
  recoveries: NormalizationRecord[];
  offsetMap: OffsetMap;
}

/** 미지 커맨드 처리 정책 */
export type UnknownCommandPolicy =
  | 'strict_registry_only'       // registry에 없으면 에러
  | 'allow_unknown_leaf'         // 인자 없는 미지 커맨드만 허용 → LiteralNode
  | 'allow_unknown_with_args'    // 인자 있는 미지 커맨드도 허용 → OpaqueNode
  | 'custom';                    // 사용자 제공 resolver

/** 파서 모드 */
export type ParserMode = 'strict' | 'tolerant' | 'auto' | 'strict_fallback';

/** Tolerant 파서 옵션 */
export interface TolerantParseOptions {
  parserMode: ParserMode;
  delimiterDetection: DelimiterDetection;
  unknownCommandPolicy: UnknownCommandPolicy;
  unknownCommandResolver?: (command: string, argCount: number) => 'error' | 'literal' | 'opaque';
  backslashNormalization: boolean;    // 기본: true
  whitespaceNormalization: boolean;   // 기본: true
}

/** 에러 복구 결과 (부분 파싱) */
export interface PartialParseResult {
  parsedNodes: MathNode[];       // 에러 이전의 성공 노드
  errorSpan: SourceRange;        // 에러 구간 (원본 기준)
  errorNode: ErrorNode;          // 에러 구간을 ErrorNode로 표현
  remainingNodes: MathNode[];    // 에러 이후 재파싱 성공 노드
  diagnostics: Diagnostic[];
}

/** Tolerant 파서 통합 결과 */
export interface TolerantParseResult {
  ast: RootNode;
  diagnostics: Diagnostic[];
  renderDecision: RenderDecision;
  offsetMap?: OffsetMap;
  normalizations: NormalizationRecord[];
}
