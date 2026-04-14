/**
 * OffsetMap — 정규화 전후 위치 매핑
 *
 * Pre-processor가 생성한 SpanPair 배열을 기반으로
 * 정규화 후 오프셋 ↔ 원본 오프셋 양방향 변환을 제공한다.
 */

import type { OffsetMap } from './types';

/** 원본↔정규화 구간 매핑 쌍 */
export interface SpanPair {
  origStart: number;
  origEnd: number;
  normStart: number;
  normEnd: number;
}

/** SpanPair 배열로 OffsetMap 생성 */
export function createOffsetMap(spans: SpanPair[]): OffsetMap {
  if (spans.length === 0) {
    return IDENTITY;
  }

  return {
    toOriginal(normalizedOffset: number): number {
      return mapOffset(spans, normalizedOffset, 'toOriginal');
    },
    toNormalized(originalOffset: number): number {
      return mapOffset(spans, originalOffset, 'toNormalized');
    },
  };
}

/** 정규화 없을 때 사용하는 항등 매핑 싱글톤 */
const IDENTITY: OffsetMap = {
  toOriginal(offset: number): number { return offset; },
  toNormalized(offset: number): number { return offset; },
};

export function identityOffsetMap(): OffsetMap {
  return IDENTITY;
}

/**
 * 이진 탐색 기반 오프셋 변환
 *
 * 방향에 따라 원본→정규화 또는 정규화→원본 변환 수행.
 * 변환 구간 내부 오프셋은 구간 시작점으로 클램핑.
 */
function mapOffset(
  spans: SpanPair[],
  offset: number,
  direction: 'toOriginal' | 'toNormalized',
): number {
  const srcKey = direction === 'toOriginal' ? 'normStart' : 'origStart';
  const srcEnd = direction === 'toOriginal' ? 'normEnd' : 'origEnd';
  const dstKey = direction === 'toOriginal' ? 'origStart' : 'normStart';
  const dstEnd = direction === 'toOriginal' ? 'origEnd' : 'normEnd';

  // 이진 탐색: offset이 속하는 구간 찾기
  let lo = 0;
  let hi = spans.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const span = spans[mid];

    if (offset < span[srcKey]) {
      hi = mid - 1;
    } else if (offset >= span[srcEnd]) {
      lo = mid + 1;
    } else {
      // 구간 내부: 1:1 매핑 구간이면 선형 보간, 그렇지 않으면 시작점 클램핑
      const srcLen = span[srcEnd] - span[srcKey];
      const dstLen = span[dstEnd] - span[dstKey];
      if (srcLen === dstLen) {
        // 변환 없는 구간 — 1:1 선형 매핑
        return offset - span[srcKey] + span[dstKey];
      }
      // 변환 구간 — 시작점으로 클램핑
      return span[dstKey];
    }
  }

  // 마지막 구간 이후: 마지막 구간의 끝에서 오프셋 차이를 더함
  if (spans.length > 0) {
    const last = spans[spans.length - 1];
    const overflow = offset - last[srcEnd];
    return last[dstEnd] + Math.max(0, overflow);
  }

  return offset;
}
