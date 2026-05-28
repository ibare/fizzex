/**
 * 렌더링 모드 결정
 *
 * 진단 배열을 분석하여 수식을 어떻게 렌더링할지 결정한다.
 * - full: 모든 진단이 안전 → 전체 수식 렌더링
 * - partial: 일부 구간만 안전 → 안전 구간만 수식, 나머지는 원본 텍스트
 * - none: 치명적 에러 → 전체를 원본 텍스트로 표시
 */

import type { SourceRange } from '../../types.js';
import type { Diagnostic, RenderDecision } from './types.js';

/**
 * 진단 배열 기반으로 렌더링 모드를 결정한다.
 *
 * @param diagnostics - 진단 항목 배열
 * @returns 렌더링 결정 (모드 + 안전/차단 구간)
 */
export function determineRenderMode(diagnostics: Diagnostic[]): RenderDecision {
  // 진단이 없으면 전체 렌더링
  if (diagnostics.length === 0) {
    return { mode: 'full', safeSpans: [], blockedSpans: [] };
  }

  const allSafe = diagnostics.every(
    d => d.parseStatus === 'parsed' && d.semanticSafety === 'safe'
  );

  if (allSafe) {
    return { mode: 'full', safeSpans: [], blockedSpans: [] };
  }

  // 렌더링에 영향을 미치는 에러가 있는지 확인
  const renderAffecting = diagnostics.filter(d => d.affectsRender);
  const hasBlockingError = renderAffecting.some(
    d => d.severity === 'error' && d.parseStatus === 'failed'
  );

  // 모든 에러가 치명적이면 렌더링 불가
  if (hasBlockingError && renderAffecting.length === diagnostics.length) {
    return {
      mode: 'none',
      safeSpans: [],
      blockedSpans: getBlockedSpans(diagnostics),
    };
  }

  // 부분적 렌더링 가능
  return {
    mode: 'partial',
    safeSpans: getSafeSpans(diagnostics),
    blockedSpans: getBlockedSpans(diagnostics),
  };
}

/**
 * 안전한 구간 추출 — 렌더링에 영향 없거나 안전한 진단만 포함된 구간
 */
function getSafeSpans(diagnostics: Diagnostic[]): SourceRange[] {
  return diagnostics
    .filter(d => d.parseStatus === 'parsed' && d.semanticSafety === 'safe')
    .map(d => d.sourceRange);
}

/**
 * 차단된 구간 추출 — 렌더링에 영향을 미치는 진단의 구간
 */
function getBlockedSpans(diagnostics: Diagnostic[]): SourceRange[] {
  return diagnostics
    .filter(d => d.affectsRender)
    .map(d => d.sourceRange);
}
