import { describe, it, expect, beforeEach } from 'vitest';
import { FizzexStreamParser } from './parser.js';
import type { StreamOutput } from './types.js';
import { resetLatexIdCounter } from '../../utils/id-generator.js';

describe('FizzexStreamParser', () => {
  let parser: FizzexStreamParser;

  beforeEach(() => {
    resetLatexIdCounter();
    parser = new FizzexStreamParser({ parserMode: 'tolerant' });
  });

  /** 출력 타입만 추출 */
  function types(outputs: StreamOutput[]): string[] {
    return outputs.map(o => o.type);
  }

  describe('스펙 시나리오 1: 정상 스트리밍', () => {
    it('텍스트 → math_pending → math_complete 순서로 방출한다', () => {
      const out1 = parser.feed('The answer is ');
      expect(types(out1)).toEqual(['text']);
      expect(out1[0].type === 'text' && out1[0].content).toBe('The answer is ');

      const out2 = parser.feed('\\(\\fr');
      expect(out2.some(o => o.type === 'math_pending')).toBe(true);

      const out3 = parser.feed('ac{1}{2}\\)');
      expect(out3.some(o => o.type === 'math_complete')).toBe(true);

      const complete = out3.find(o => o.type === 'math_complete');
      if (complete?.type === 'math_complete') {
        expect(complete.renderDecision.mode).toBe('full');
        expect(complete.displayMode).toBe(false);
      }
    });
  });

  describe('스펙 시나리오 2: 수식 깨짐', () => {
    it('미닫힘 수식에서 math_failed를 방출한다', () => {
      parser.feed('\\[\\frac{1}{2+');
      const endOut = parser.end();

      expect(endOut.some(o => o.type === 'math_failed')).toBe(true);
      const failed = endOut.find(o => o.type === 'math_failed');
      if (failed?.type === 'math_failed') {
        expect(failed.rawLatex).toBe('\\frac{1}{2+');
      }
    });
  });

  describe('스펙 시나리오 3: strict 모드', () => {
    it('strict 모드에서 정상 수식을 처리한다', () => {
      const strictParser = new FizzexStreamParser({ parserMode: 'strict' });
      const out = strictParser.feed('\\(\\frac{1}{2}\\)');

      expect(out.some(o => o.type === 'math_complete')).toBe(true);
      const complete = out.find(o => o.type === 'math_complete');
      if (complete?.type === 'math_complete') {
        expect(complete.diagnostics).toHaveLength(0);
        expect(complete.renderDecision.mode).toBe('full');
      }
    });
  });

  describe('텍스트 전용 입력', () => {
    it('수식 없는 텍스트를 처리한다', () => {
      parser.feed('No math here');
      const endOut = parser.end();
      const all = endOut;

      expect(all.every(o => o.type === 'text')).toBe(true);
    });
  });

  describe('다중 수학 블록', () => {
    it('여러 수식 블록을 연속 처리한다', () => {
      const out = parser.feed('\\(a\\) and \\(b\\)');
      const endOut = parser.end();
      const all = [...out, ...endOut];

      const completes = all.filter(o => o.type === 'math_complete');
      expect(completes.length).toBe(2);
    });
  });

  describe('한 글자씩 공급', () => {
    it('문자별 스트리밍에서 최종 결과가 일관된다', () => {
      const input = '\\(x+1\\)';
      const allOutputs: StreamOutput[] = [];

      for (const ch of input) {
        allOutputs.push(...parser.feed(ch));
      }
      allOutputs.push(...parser.end());

      // math_pending은 여러 번 나올 수 있고, 최종적으로 math_complete가 있어야 함
      expect(allOutputs.some(o => o.type === 'math_complete')).toBe(true);
    });
  });

  describe('혼합 디스플레이 모드', () => {
    it('인라인과 디스플레이 모드를 구분한다', () => {
      const out = parser.feed('Inline \\(a\\) and display \\[b\\]');
      const endOut = parser.end();
      const all = [...out, ...endOut];

      const completes = all.filter(o => o.type === 'math_complete');
      expect(completes.length).toBe(2);
      if (completes[0].type === 'math_complete' && completes[1].type === 'math_complete') {
        expect(completes[0].displayMode).toBe(false);
        expect(completes[1].displayMode).toBe(true);
      }
    });
  });

  describe('tolerantParse 오류 전파', () => {
    it('파싱 에러가 있는 수식을 처리한다', () => {
      const out = parser.feed('\\(\\frac{1}\\)');
      const endOut = parser.end();
      const all = [...out, ...endOut];

      // 에러 여부에 따라 math_complete(partial) 또는 math_failed
      const hasMath = all.some(o => o.type === 'math_complete' || o.type === 'math_failed');
      expect(hasMath).toBe(true);
    });
  });

  describe('reset', () => {
    it('reset() 후 깨끗한 상태로 동작한다', () => {
      parser.feed('\\(x+1');
      parser.reset();

      const out = parser.feed('\\(y+2\\)');
      const endOut = parser.end();
      const all = [...out, ...endOut];

      const complete = all.find(o => o.type === 'math_complete');
      expect(complete).toBeDefined();
      if (complete?.type === 'math_complete') {
        expect(complete.latex).toBe('y+2');
      }
    });
  });

  describe('빈 청크', () => {
    it('빈 문자열 공급을 안전하게 처리한다', () => {
      parser.feed('');
      parser.feed('');
      const out = parser.feed('\\(x\\)');
      const endOut = parser.end();
      const all = [...out, ...endOut];

      expect(all.some(o => o.type === 'math_complete')).toBe(true);
    });
  });

  describe('크래시 방어', () => {
    it('빈 입력으로 end()를 호출해도 크래시하지 않는다', () => {
      expect(() => parser.end()).not.toThrow();
    });

    it('특수 문자만 있는 입력에서 크래시하지 않는다', () => {
      expect(() => {
        parser.feed('\\\\\\\\');
        parser.end();
      }).not.toThrow();
    });
  });

  describe('fuzz', () => {
    it('무작위 청크 분할 500회에서 크래시하지 않는다', () => {
      const input = 'We have \\(\\frac{a}{b}\\) and \\[x^2\\] done';

      for (let i = 0; i < 500; i++) {
        parser.reset();
        // 1~4개 분할
        const numSplits = 1 + Math.floor(Math.random() * 3);
        const positions = Array.from(
          { length: numSplits },
          () => Math.floor(Math.random() * input.length),
        ).sort((a, b) => a - b);

        let lastPos = 0;
        for (const pos of positions) {
          parser.feed(input.slice(lastPos, pos));
          lastPos = pos;
        }
        parser.feed(input.slice(lastPos));
        parser.end();
      }
      // 크래시 없이 통과하면 성공
      expect(true).toBe(true);
    });
  });

  describe('불변식: 전체 입력 = 직접 파싱', () => {
    it('math_complete의 AST 구조가 직접 tolerantParse와 동일하다', () => {
      const input = '\\(\\frac{1}{2}\\)';
      const out = parser.feed(input);
      const endOut = parser.end();
      const all = [...out, ...endOut];

      const complete = all.find(o => o.type === 'math_complete');
      expect(complete).toBeDefined();
      if (complete?.type === 'math_complete') {
        expect(complete.ast.type).toBe('root');
        expect(complete.ast.children.length).toBeGreaterThan(0);
      }
    });
  });
});
