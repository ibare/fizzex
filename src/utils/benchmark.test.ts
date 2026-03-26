import { describe, it, expect } from 'vitest';
import {
  benchmark,
  formatBenchmarkResult,
  compareBenchmarks,
  BenchmarkSuite,
} from './benchmark';
import { parseLatex } from '../latex/latex-parser';
import { LRUCache } from './lru-cache';
import { resetLatexIdCounter } from './id-generator';

describe('Benchmark Utility', () => {
  describe('benchmark()', () => {
    it('함수 성능을 측정한다', () => {
      const result = benchmark('simple addition', () => {
        const x = 1 + 1;
      }, { iterations: 100, warmupIterations: 10 });

      expect(result.name).toBe('simple addition');
      expect(result.iterations).toBe(100);
      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.avgTime).toBeGreaterThanOrEqual(0);
      expect(result.minTime).toBeGreaterThanOrEqual(0);
      expect(result.maxTime).toBeGreaterThanOrEqual(result.minTime);
      expect(result.opsPerSec).toBeGreaterThan(0);
    });
  });

  describe('formatBenchmarkResult()', () => {
    it('결과를 문자열로 포맷팅한다', () => {
      const result = {
        name: 'test',
        iterations: 100,
        totalTime: 10,
        avgTime: 0.1,
        minTime: 0.05,
        maxTime: 0.2,
        opsPerSec: 10000,
      };

      const formatted = formatBenchmarkResult(result);

      expect(formatted).toContain('[test]');
      expect(formatted).toContain('Iterations: 100');
      expect(formatted).toContain('Average:');
    });
  });

  describe('compareBenchmarks()', () => {
    it('여러 결과를 테이블로 비교한다', () => {
      const results = [
        { name: 'test1', iterations: 100, totalTime: 10, avgTime: 0.1, minTime: 0.05, maxTime: 0.2, opsPerSec: 10000 },
        { name: 'test2', iterations: 100, totalTime: 20, avgTime: 0.2, minTime: 0.1, maxTime: 0.4, opsPerSec: 5000 },
      ];

      const table = compareBenchmarks(results);

      expect(table).toContain('| Name |');
      expect(table).toContain('test1');
      expect(table).toContain('test2');
    });
  });

  describe('BenchmarkSuite', () => {
    it('여러 벤치마크를 실행하고 리포트를 생성한다', () => {
      const suite = new BenchmarkSuite('Test Suite');

      suite
        .add('addition', () => { const x = 1 + 1; }, { iterations: 50, warmupIterations: 5 })
        .add('multiplication', () => { const x = 2 * 3; }, { iterations: 50, warmupIterations: 5 });

      const results = suite.getResults();
      expect(results).toHaveLength(2);

      const report = suite.report();
      expect(report).toContain('Test Suite');
      expect(report).toContain('addition');
      expect(report).toContain('multiplication');
    });
  });
});

describe('Performance Benchmarks', () => {
  describe('LaTeX Parser', () => {
    it('간단한 수식 파싱 성능', () => {
      const result = benchmark('simple expression', () => {
        resetLatexIdCounter();
        parseLatex('x + y');
      }, { iterations: 500, warmupIterations: 50 });

      // 평균 1ms 이하
      expect(result.avgTime).toBeLessThan(1);
      console.log(formatBenchmarkResult(result));
    });

    it('분수 파싱 성능', () => {
      const result = benchmark('fraction', () => {
        resetLatexIdCounter();
        parseLatex('\\frac{1}{2}');
      }, { iterations: 500, warmupIterations: 50 });

      expect(result.avgTime).toBeLessThan(2);
      console.log(formatBenchmarkResult(result));
    });

    it('복잡한 수식 파싱 성능', () => {
      const complexLatex = '\\frac{\\sqrt{x^2 + y^2}}{\\sin(\\theta) + \\cos(\\phi)}';

      const result = benchmark('complex expression', () => {
        resetLatexIdCounter();
        parseLatex(complexLatex);
      }, { iterations: 200, warmupIterations: 20 });

      expect(result.avgTime).toBeLessThan(5);
      console.log(formatBenchmarkResult(result));
    });

    it('행렬 파싱 성능', () => {
      const matrixLatex = '\\begin{matrix}1 & 2 & 3\\\\4 & 5 & 6\\\\7 & 8 & 9\\end{matrix}';

      const result = benchmark('matrix', () => {
        resetLatexIdCounter();
        parseLatex(matrixLatex);
      }, { iterations: 200, warmupIterations: 20 });

      expect(result.avgTime).toBeLessThan(5);
      console.log(formatBenchmarkResult(result));
    });
  });

  describe('LRU Cache', () => {
    it('캐시 set/get 성능', () => {
      const cache = new LRUCache<string, number>(1000);

      const result = benchmark('cache operations', () => {
        for (let i = 0; i < 100; i++) {
          cache.set(`key_${i}`, i);
          cache.get(`key_${i % 50}`);
        }
      }, { iterations: 500, warmupIterations: 50 });

      // 100회 연산 평균 1ms 이하
      expect(result.avgTime).toBeLessThan(1);
      console.log(formatBenchmarkResult(result));
    });

    it('캐시 eviction 성능', () => {
      const cache = new LRUCache<string, number>(100);

      const result = benchmark('cache eviction', () => {
        for (let i = 0; i < 200; i++) {
          cache.set(`key_${i}`, i);
        }
      }, { iterations: 500, warmupIterations: 50 });

      expect(result.avgTime).toBeLessThan(2);
      console.log(formatBenchmarkResult(result));
    });
  });
});
