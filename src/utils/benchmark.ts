/**
 * 성능 벤치마크 유틸리티
 *
 * 파싱, 렌더링 등 핵심 작업의 성능을 측정하고 기록
 */

/** 벤치마크 결과 */
export interface BenchmarkResult {
  /** 테스트 이름 */
  name: string;
  /** 반복 횟수 */
  iterations: number;
  /** 총 실행 시간 (ms) */
  totalTime: number;
  /** 평균 실행 시간 (ms) */
  avgTime: number;
  /** 최소 실행 시간 (ms) */
  minTime: number;
  /** 최대 실행 시간 (ms) */
  maxTime: number;
  /** 초당 작업 수 (ops/sec) */
  opsPerSec: number;
}

/** 벤치마크 옵션 */
export interface BenchmarkOptions {
  /** 반복 횟수 (기본: 1000) */
  iterations?: number;
  /** 워밍업 횟수 (기본: 100) */
  warmupIterations?: number;
}

/**
 * 함수 성능 측정
 *
 * @example
 * const result = benchmark('parseLatex', () => {
 *   parseLatex('\\frac{1}{2}');
 * });
 * console.log(`Average: ${result.avgTime.toFixed(3)}ms`);
 */
export function benchmark(
  name: string,
  fn: () => void,
  options: BenchmarkOptions = {}
): BenchmarkResult {
  const { iterations = 1000, warmupIterations = 100 } = options;

  // 워밍업 (JIT 최적화)
  for (let i = 0; i < warmupIterations; i++) {
    fn();
  }

  // 실제 측정
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }

  const totalTime = times.reduce((a, b) => a + b, 0);
  const avgTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const opsPerSec = 1000 / avgTime;

  return {
    name,
    iterations,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    opsPerSec,
  };
}

/**
 * 비동기 함수 성능 측정
 */
export async function benchmarkAsync(
  name: string,
  fn: () => Promise<void>,
  options: BenchmarkOptions = {}
): Promise<BenchmarkResult> {
  const { iterations = 1000, warmupIterations = 100 } = options;

  // 워밍업
  for (let i = 0; i < warmupIterations; i++) {
    await fn();
  }

  // 실제 측정
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const totalTime = times.reduce((a, b) => a + b, 0);
  const avgTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const opsPerSec = 1000 / avgTime;

  return {
    name,
    iterations,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    opsPerSec,
  };
}

/**
 * 벤치마크 결과 포맷팅
 */
export function formatBenchmarkResult(result: BenchmarkResult): string {
  return [
    `[${result.name}]`,
    `  Iterations: ${result.iterations}`,
    `  Total: ${result.totalTime.toFixed(2)}ms`,
    `  Average: ${result.avgTime.toFixed(4)}ms`,
    `  Min/Max: ${result.minTime.toFixed(4)}ms / ${result.maxTime.toFixed(4)}ms`,
    `  Ops/sec: ${result.opsPerSec.toFixed(0)}`,
  ].join('\n');
}

/**
 * 여러 벤치마크 비교 출력
 */
export function compareBenchmarks(results: BenchmarkResult[]): string {
  const header = '| Name | Avg (ms) | Ops/sec | Min | Max |';
  const separator = '|------|----------|---------|-----|-----|';

  const rows = results.map((r) =>
    `| ${r.name} | ${r.avgTime.toFixed(4)} | ${r.opsPerSec.toFixed(0)} | ${r.minTime.toFixed(4)} | ${r.maxTime.toFixed(4)} |`
  );

  return [header, separator, ...rows].join('\n');
}

/**
 * 메모리 사용량 측정 (Node.js 환경)
 */
export function getMemoryUsage(): { heapUsed: number; heapTotal: number } | null {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const { heapUsed, heapTotal } = process.memoryUsage();
    return {
      heapUsed: heapUsed / 1024 / 1024, // MB
      heapTotal: heapTotal / 1024 / 1024, // MB
    };
  }
  return null;
}

/**
 * 벤치마크 스위트 실행기
 */
export class BenchmarkSuite {
  private results: BenchmarkResult[] = [];

  constructor(private name: string) {}

  /**
   * 벤치마크 추가 및 실행
   */
  add(name: string, fn: () => void, options?: BenchmarkOptions): this {
    const result = benchmark(name, fn, options);
    this.results.push(result);
    return this;
  }

  /**
   * 비동기 벤치마크 추가 및 실행
   */
  async addAsync(
    name: string,
    fn: () => Promise<void>,
    options?: BenchmarkOptions
  ): Promise<this> {
    const result = await benchmarkAsync(name, fn, options);
    this.results.push(result);
    return this;
  }

  /**
   * 결과 조회
   */
  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  /**
   * 리포트 출력
   */
  report(): string {
    const lines = [
      `=== ${this.name} ===`,
      '',
      compareBenchmarks(this.results),
      '',
    ];

    const memory = getMemoryUsage();
    if (memory) {
      lines.push(`Memory: ${memory.heapUsed.toFixed(2)}MB / ${memory.heapTotal.toFixed(2)}MB`);
    }

    return lines.join('\n');
  }

  /**
   * 초기화
   */
  clear(): void {
    this.results = [];
  }
}
