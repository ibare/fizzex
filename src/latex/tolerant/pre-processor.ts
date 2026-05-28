/**
 * Pre-processor — LaTeX 입력 정규화
 *
 * 단일 패스 문자 스캐너로 입력을 정규화한다.
 * 모든 변환은 의미를 보존하며, OffsetMap으로 위치 매핑을 유지한다.
 *
 * 정규화 규칙:
 * 1. 백슬래시 정규화: 커맨드 시작 위치에서 연속 백슬래시 축소
 * 2. 공백 정규화: 커맨드와 여는 중괄호 사이 공백 제거
 * 3. \text{} 내부: 정규화 건너뛰기
 */

import type { NormalizationRecord, PreProcessResult, DelimiterDetection } from './types.js';
import { createOffsetMap, identityOffsetMap } from './offset-map.js';
import type { SpanPair } from './offset-map.js';

/** 텍스트 모드 커맨드 — 내부에서 정규화를 건너뛴다 */
const TEXT_MODE_COMMANDS = new Set([
  'text', 'mathrm', 'textrm', 'textbf', 'textit', 'textsf', 'texttt',
  'mbox', 'hbox', 'fbox', 'operatorname',
]);

export interface PreProcessOptions {
  backslashNormalization?: boolean;
  whitespaceNormalization?: boolean;
  delimiterDetection?: DelimiterDetection;
}

/**
 * LaTeX 입력 문자열을 정규화한다.
 *
 * @param input 원본 LaTeX 문자열
 * @param options 정규화 옵션
 * @returns 정규화 결과 (정규화 문자열 + 변환 내역 + 위치 매핑)
 */
export function preProcess(input: string, options?: PreProcessOptions): PreProcessResult {
  const backslashNorm = options?.backslashNormalization ?? true;
  const whitespaceNorm = options?.whitespaceNormalization ?? true;

  // 정규화할 것이 없으면 빠른 경로
  if (!backslashNorm && !whitespaceNorm) {
    return { normalized: input, recoveries: [], offsetMap: identityOffsetMap() };
  }

  const output: string[] = [];
  const spans: SpanPair[] = [];
  const recoveries: NormalizationRecord[] = [];

  let pos = 0;
  let outPos = 0;
  let inTextMode = false;
  let textBraceDepth = 0;

  // 현재 동일 매핑 구간의 시작점 추적
  let identityOrigStart = 0;
  let identityNormStart = 0;

  /** 동일 구간을 SpanPair로 플러시 */
  function flushIdentity(): void {
    if (pos > identityOrigStart) {
      spans.push({
        origStart: identityOrigStart,
        origEnd: pos,
        normStart: identityNormStart,
        normEnd: outPos,
      });
    }
  }

  while (pos < input.length) {
    const ch = input[pos];

    // === 텍스트 모드 내부: 정규화 없이 그대로 복사 ===
    if (inTextMode) {
      if (ch === '{') textBraceDepth++;
      else if (ch === '}') {
        textBraceDepth--;
        if (textBraceDepth === 0) {
          inTextMode = false;
        }
      }
      output.push(ch);
      pos++;
      outPos++;
      continue;
    }

    // === 백슬래시 위치에서 검사 ===
    if (ch === '\\') {
      // 텍스트 모드 커맨드 진입 감지
      const textCmd = detectTextModeCommand(input, pos);
      if (textCmd) {
        // 텍스트 모드 커맨드 이름 + 여는 { 까지 복사
        const cmdEnd = pos + 1 + textCmd.length;
        for (let i = pos; i < cmdEnd; i++) {
          output.push(input[i]);
          outPos++;
        }
        pos = cmdEnd;
        // 커맨드 뒤 공백 스킵 (정규화)
        if (whitespaceNorm) {
          while (pos < input.length && input[pos] === ' ') pos++;
        }
        // 여는 { 확인
        if (pos < input.length && input[pos] === '{') {
          inTextMode = true;
          textBraceDepth = 1;
          output.push('{');
          pos++;
          outPos++;
        }
        identityOrigStart = pos;
        identityNormStart = outPos;
        continue;
      }

      // 백슬래시 정규화: 연속 백슬래시 + 알파벳
      let backslashNormalized = false;
      if (backslashNorm) {
        const slashCount = countConsecutiveBackslashes(input, pos);
        if (slashCount >= 3) {
          const afterSlashes = pos + slashCount;
          if (afterSlashes < input.length && /[a-zA-Z]/.test(input[afterSlashes])) {
            flushIdentity();
            output.push('\\');
            outPos++;
            spans.push({
              origStart: pos,
              origEnd: afterSlashes,
              normStart: outPos - 1,
              normEnd: outPos,
            });
            recoveries.push({
              type: 'backslash_norm',
              originalSpan: { start: pos, end: afterSlashes },
              normalizedSpan: { start: outPos - 1, end: outPos },
              description: `연속 백슬래시 ${slashCount}개를 1개로 축소`,
            });
            pos = afterSlashes;
            identityOrigStart = pos;
            identityNormStart = outPos;
            backslashNormalized = true;
            // 정규화 후 커맨드 이름 읽기로 진행 (continue 하지 않음)
          }
        }
      }

      // 커맨드 이름 읽기 + 공백 정규화
      // 조건: 다음 문자가 알파벳이면 커맨드로 간주
      const hasAlphaNext = backslashNormalized
        ? (pos < input.length && /[a-zA-Z]/.test(input[pos]))
        : (pos + 1 < input.length && /[a-zA-Z]/.test(input[pos + 1]));

      if (hasAlphaNext) {
        // 백슬래시가 아직 출력되지 않았으면 출력
        if (!backslashNormalized) {
          output.push('\\');
          pos++;
          outPos++;
        }
        // 커맨드 이름 복사
        while (pos < input.length && /[a-zA-Z]/.test(input[pos])) {
          output.push(input[pos]);
          pos++;
          outPos++;
        }
        // 공백 정규화: 커맨드 이름 직후 공백 + { 패턴
        if (whitespaceNorm) {
          const spaceStart = pos;
          let spaceCount = 0;
          while (pos < input.length && input[pos] === ' ') {
            spaceCount++;
            pos++;
          }
          if (spaceCount > 0 && pos < input.length && input[pos] === '{') {
            flushIdentity();
            spans.push({
              origStart: spaceStart,
              origEnd: spaceStart + spaceCount,
              normStart: outPos,
              normEnd: outPos,
            });
            recoveries.push({
              type: 'whitespace_trim',
              originalSpan: { start: spaceStart, end: spaceStart + spaceCount },
              normalizedSpan: { start: outPos, end: outPos },
              description: `커맨드-중괄호 사이 공백 ${spaceCount}자 제거`,
            });
            identityOrigStart = pos;
            identityNormStart = outPos;
          } else {
            // 공백이 없거나 { 아닌 경우 — 그대로 유지
            for (let i = 0; i < spaceCount; i++) {
              output.push(' ');
              outPos++;
            }
          }
        }
        continue;
      }

      // 백슬래시 정규화가 적용된 후 알파벳이 아닌 경우는 이미 처리됨
      if (backslashNormalized) {
        continue;
      }
    }

    // === 일반 문자: 그대로 복사 ===
    output.push(ch);
    pos++;
    outPos++;
  }

  // 마지막 동일 구간 플러시
  flushIdentity();

  const normalized = output.join('');

  // 변환이 없었으면 항등 매핑 사용
  if (recoveries.length === 0) {
    return { normalized: input, recoveries: [], offsetMap: identityOffsetMap() };
  }

  return {
    normalized,
    recoveries,
    offsetMap: createOffsetMap(spans),
  };
}

/** 연속 백슬래시 개수 세기 */
function countConsecutiveBackslashes(input: string, pos: number): number {
  let count = 0;
  while (pos + count < input.length && input[pos + count] === '\\') {
    count++;
  }
  return count;
}

/** 텍스트 모드 커맨드 감지 — 일치하면 커맨드 이름 반환 */
function detectTextModeCommand(input: string, pos: number): string | null {
  if (input[pos] !== '\\') return null;
  for (const cmd of TEXT_MODE_COMMANDS) {
    if (input.startsWith(cmd, pos + 1)) {
      const afterCmd = pos + 1 + cmd.length;
      // 커맨드 이름 뒤에 알파벳이 없어야 함 (예: \textbf와 \text 구분)
      if (afterCmd >= input.length || !/[a-zA-Z]/.test(input[afterCmd])) {
        return cmd;
      }
    }
  }
  return null;
}
