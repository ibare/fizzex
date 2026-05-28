import { describe, it, expect } from 'vitest';
import { LRUCache } from './lru-cache.js';

describe('LRUCache', () => {
  describe('기본 동작', () => {
    it('값을 저장하고 조회할 수 있다', () => {
      const cache = new LRUCache<string, number>(10);

      cache.set('a', 1);
      cache.set('b', 2);

      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBe(2);
    });

    it('존재하지 않는 키는 undefined를 반환한다', () => {
      const cache = new LRUCache<string, number>(10);

      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('has()로 키 존재 여부를 확인할 수 있다', () => {
      const cache = new LRUCache<string, number>(10);

      cache.set('a', 1);

      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
    });

    it('delete()로 항목을 삭제할 수 있다', () => {
      const cache = new LRUCache<string, number>(10);

      cache.set('a', 1);
      expect(cache.delete('a')).toBe(true);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('clear()로 전체를 비울 수 있다', () => {
      const cache = new LRUCache<string, number>(10);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.get('a')).toBeUndefined();
    });
  });

  describe('크기 제한', () => {
    it('최대 크기를 초과하면 가장 오래된 항목을 제거한다', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4); // 'a'가 제거되어야 함

      expect(cache.size).toBe(3);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('조회 시 해당 항목이 최근 사용으로 갱신된다', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // 'a'를 조회하여 최근 사용으로 갱신
      cache.get('a');

      cache.set('d', 4); // 'b'가 제거되어야 함

      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('같은 키로 값을 업데이트하면 최근 사용으로 갱신된다', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // 'a'를 업데이트하여 최근 사용으로 갱신
      cache.set('a', 10);

      cache.set('d', 4); // 'b'가 제거되어야 함

      expect(cache.get('a')).toBe(10);
      expect(cache.get('b')).toBeUndefined();
    });
  });

  describe('속성', () => {
    it('size는 현재 캐시 크기를 반환한다', () => {
      const cache = new LRUCache<string, number>(10);

      expect(cache.size).toBe(0);

      cache.set('a', 1);
      expect(cache.size).toBe(1);

      cache.set('b', 2);
      expect(cache.size).toBe(2);
    });

    it('capacity는 최대 캐시 크기를 반환한다', () => {
      const cache = new LRUCache<string, number>(100);
      expect(cache.capacity).toBe(100);
    });
  });

  describe('에러 처리', () => {
    it('최대 크기가 1 미만이면 에러를 발생시킨다', () => {
      expect(() => new LRUCache(0)).toThrow();
      expect(() => new LRUCache(-1)).toThrow();
    });
  });
});
