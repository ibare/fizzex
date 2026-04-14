import { describe, it, expect, beforeAll } from 'vitest';
import { runCorpusTest, type CorpusTestReport } from './corpus-runner';

describe('Corpus Test Suite', () => {
  let report: CorpusTestReport;

  beforeAll(async () => {
    report = await runCorpusTest('./combined-corpus.json');
  }, 120000);

  it('전체 성공률 보고', () => {
    console.log(`\n=== Corpus Test Report ===`);
    console.log(`총 수식: ${report.total}`);
    console.log(`파싱 성공률: ${report.parseRate.toFixed(1)}% (${report.parseSuccess}/${report.total})`);
    console.log(`라운드트립 성공률: ${report.roundTripRate.toFixed(1)}% (${report.roundTripSuccess}/${report.total})`);
    console.log(`박스 생성 성공률: ${report.boxRate.toFixed(1)}% (${report.boxSuccess}/${report.total})`);
    console.log(`실행 시간: ${report.duration}ms`);
  });

  it('파싱 성공률 임계값 초과', () => {
    expect(report.parseRate).toBeGreaterThan(80);
  });

  it('라운드트립 성공률 임계값 초과', () => {
    // 초기 임계값 — 라운드트립은 공백/정규화 차이 포함, 점진적으로 올림
    expect(report.roundTripRate).toBeGreaterThan(20);
  });

  it('퍼즈 입력에서 크래시 없음', () => {
    const fuzzCrashes = report.failures.filter(
      (f) => f.source.startsWith('fuzz-') && f.results.parseError?.includes('crash')
    );
    expect(fuzzCrashes).toHaveLength(0);
  });

  it('소스별 통계 보고', () => {
    console.log('\n=== 소스별 통계 ===');
    Object.entries(report.bySource).forEach(([source, stats]) => {
      const parseRate = stats.total > 0 ? ((stats.parseSuccess / stats.total) * 100).toFixed(1) : '0.0';
      const rtRate = stats.total > 0 ? ((stats.roundTrip / stats.total) * 100).toFixed(1) : '0.0';
      const boxRate = stats.total > 0 ? ((stats.box / stats.total) * 100).toFixed(1) : '0.0';
      console.log(`  ${source}: 파싱 ${parseRate}%, 라운드트립 ${rtRate}%, 박스 ${boxRate}% (${stats.total}개)`);
    });
  });

  it('실패 패턴 보고', () => {
    if (report.failurePatterns.length === 0) {
      console.log('\n=== 파싱 실패 패턴: 없음 ===');
      return;
    }
    console.log('\n=== 상위 실패 패턴 ===');
    report.failurePatterns.slice(0, 10).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.pattern} (${p.count}건, ${p.severity})`);
      console.log(`     예시: ${p.example.substring(0, 80)}`);
    });
  });

  it('미지원 명령어 보고', () => {
    if (report.unsupportedCommands.length === 0) {
      console.log('\n=== 미지원 명령어: 없음 ===');
      return;
    }
    console.log('\n=== 미지원 명령어 ===');
    report.unsupportedCommands.slice(0, 15).forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.command} — ${c.occurrences}건 (${c.source}, ${c.priority})`);
    });
  });

  it('상위 20 실패 보고', () => {
    console.log('\n=== 상위 20 실패 ===');
    report.failures.slice(0, 20).forEach((f, i) => {
      console.log(`  ${i + 1}. [${f.source}] ${f.latex.substring(0, 60)}${f.latex.length > 60 ? '...' : ''}`);
      console.log(`     파싱: ${f.results.parseSuccess ? 'O' : 'X'}, 라운드트립: ${f.results.roundTripSuccess ? 'O' : 'X'}, 박스: ${f.results.boxSuccess ? 'O' : 'X'}`);
      if (f.results.parseError) console.log(`     에러: ${f.results.parseError.substring(0, 80)}`);
    });
  });
});
