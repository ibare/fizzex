/**
 * LRU (Least Recently Used) 캐시
 *
 * 크기 제한이 있는 캐시로, 최대 크기 초과 시 가장 오래 사용되지 않은 항목부터 제거
 */

export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private readonly maxSize: number;

  constructor(maxSize: number) {
    if (maxSize < 1) {
      throw new Error('LRU 캐시 최대 크기는 1 이상이어야 합니다.');
    }
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * 값 조회
   * - 존재하는 경우 해당 항목을 가장 최근 사용으로 갱신
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 최근 사용으로 갱신 (삭제 후 재삽입)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  /**
   * 값 설정
   * - 최대 크기 초과 시 가장 오래된 항목 제거
   */
  set(key: K, value: V): void {
    // 이미 존재하는 키면 삭제 후 재삽입 (최근 사용으로)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // 최대 크기 초과 시 가장 오래된 항목 제거
    else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, value);
  }

  /**
   * 키 존재 여부 확인 (LRU 순서 변경 없음)
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * 특정 키 삭제
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 캐시 비우기
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 현재 캐시 크기
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 최대 캐시 크기
   */
  get capacity(): number {
    return this.maxSize;
  }
}
