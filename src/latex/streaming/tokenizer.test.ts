import { describe, it, expect, beforeEach } from 'vitest';
import { StreamTokenizer } from './tokenizer.js';
import type { StreamToken } from './types.js';

describe('StreamTokenizer', () => {
  let tokenizer: StreamTokenizer;

  beforeEach(() => {
    tokenizer = new StreamTokenizer();
  });

  /** 토큰 타입만 추출하는 헬퍼 */
  function types(tokens: StreamToken[]): string[] {
    return tokens.map(t => t.type);
  }

  /** 토큰 내용만 추출하는 헬퍼 */
  function contents(tokens: StreamToken[]): string[] {
    return tokens.map(t => t.content);
  }

  describe('기본 텍스트', () => {
    it('일반 텍스트를 text 토큰으로 반환한다', () => {
      const tokens = tokenizer.feed('Hello world');
      // feed 중에는 버퍼에 축적되므로 end()에서 플러시
      const endTokens = tokenizer.end();
      const all = [...tokens, ...endTokens];
      expect(all.some(t => t.type === 'text' && t.content.includes('Hello world'))).toBe(true);
    });

    it('빈 문자열에서 토큰을 생성하지 않는다', () => {
      const tokens = tokenizer.feed('');
      const endTokens = tokenizer.end();
      expect([...tokens, ...endTokens]).toHaveLength(0);
    });
  });

  describe('explicit inline math (\\( ... \\))', () => {
    it('인라인 수식을 정확히 분할한다', () => {
      const tokens = tokenizer.feed('text \\(x+1\\) more');
      const endTokens = tokenizer.end();
      const all = [...tokens, ...endTokens];

      expect(types(all)).toEqual(['text', 'math_start', 'math_content', 'math_end', 'text']);
      expect(all[0].content).toBe('text ');
      expect(all[2].content).toBe('x+1');
      expect(all[4].content).toBe(' more');
    });

    it('math_start에 displayMode: false를 설정한다', () => {
      const tokens = tokenizer.feed('\\(x\\)');
      const all = [...tokens, ...tokenizer.end()];
      const start = all.find(t => t.type === 'math_start');
      expect(start?.displayMode).toBe(false);
    });
  });

  describe('explicit display math (\\[ ... \\])', () => {
    it('디스플레이 수식을 정확히 분할한다', () => {
      const tokens = tokenizer.feed('\\[x^2\\]');
      const endTokens = tokenizer.end();
      const all = [...tokens, ...endTokens];

      expect(types(all)).toEqual(['math_start', 'math_content', 'math_end']);
      expect(all[1].content).toBe('x^2');
    });

    it('math_start에 displayMode: true를 설정한다', () => {
      const tokens = tokenizer.feed('\\[x\\]');
      const all = [...tokens, ...tokenizer.end()];
      const start = all.find(t => t.type === 'math_start');
      expect(start?.displayMode).toBe(true);
    });
  });

  describe('청크 경계 처리', () => {
    it('백슬래시로 청크가 끝나는 경우를 처리한다', () => {
      const t1 = tokenizer.feed('text \\');
      const t2 = tokenizer.feed('(x\\)');
      const tEnd = tokenizer.end();
      const all = [...t1, ...t2, ...tEnd];

      const mathContent = all.find(t => t.type === 'math_content');
      expect(mathContent?.content).toBe('x');
    });

    it('수학 내용이 여러 청크에 걸쳐 축적된다', () => {
      tokenizer.feed('\\(\\fr');
      const t2 = tokenizer.feed('ac{1}{2}\\)');
      const all = [...t2, ...tokenizer.end()];

      const content = all.find(t => t.type === 'math_content');
      expect(content?.content).toBe('\\frac{1}{2}');
    });

    it('한 글자씩 공급해도 정상 동작한다', () => {
      const input = '\\(x+1\\)';
      const allTokens: StreamToken[] = [];
      for (const ch of input) {
        allTokens.push(...tokenizer.feed(ch));
      }
      allTokens.push(...tokenizer.end());

      expect(types(allTokens)).toEqual(['math_start', 'math_content', 'math_end']);
      expect(allTokens.find(t => t.type === 'math_content')?.content).toBe('x+1');
    });
  });

  describe('중첩 중괄호', () => {
    it('수학 내에서 중첩 중괄호를 정상 추적한다', () => {
      const all = [...tokenizer.feed('\\(\\frac{1+{2}}{3}\\)'), ...tokenizer.end()];
      const content = all.find(t => t.type === 'math_content');
      expect(content?.content).toBe('\\frac{1+{2}}{3}');
    });
  });

  describe('텍스트 모드 내부', () => {
    it('\\text{} 내부의 \\)를 구분자로 해석하지 않는다', () => {
      const all = [...tokenizer.feed('\\(x + \\text{where \\) appears}\\)'), ...tokenizer.end()];
      const content = all.find(t => t.type === 'math_content');
      expect(content?.content).toBe('x + \\text{where \\) appears}');
    });

    it('\\mathrm{} 내부를 보존한다', () => {
      const all = [...tokenizer.feed('\\(\\mathrm{abc}\\)'), ...tokenizer.end()];
      const content = all.find(t => t.type === 'math_content');
      expect(content?.content).toBe('\\mathrm{abc}');
    });
  });

  describe('미닫힘 수학', () => {
    it('end()에서 미닫힘 수학을 isComplete: false로 방출한다', () => {
      tokenizer.feed('\\(x+1');
      const endTokens = tokenizer.end();

      const content = endTokens.find(t => t.type === 'math_content');
      expect(content).toBeDefined();
      expect(content?.isComplete).toBe(false);
    });
  });

  describe('빈 수학', () => {
    it('빈 수식 \\(\\)을 처리한다', () => {
      const all = [...tokenizer.feed('\\(\\)'), ...tokenizer.end()];
      expect(types(all)).toEqual(['math_start', 'math_end']);
    });
  });

  describe('다중 수학 블록', () => {
    it('인라인 + 디스플레이 수학을 연속 처리한다', () => {
      const all = [...tokenizer.feed('\\(a\\) then \\[b\\]'), ...tokenizer.end()];

      const starts = all.filter(t => t.type === 'math_start');
      expect(starts).toHaveLength(2);
      expect(starts[0].displayMode).toBe(false);
      expect(starts[1].displayMode).toBe(true);
    });
  });

  describe('reset', () => {
    it('reset() 후 깨끗한 상태로 동작한다', () => {
      tokenizer.feed('\\(x+1');
      tokenizer.reset();

      const all = [...tokenizer.feed('\\(y\\)'), ...tokenizer.end()];
      const content = all.find(t => t.type === 'math_content');
      expect(content?.content).toBe('y');
    });
  });

  describe('sourceRange', () => {
    it('토큰에 정확한 sourceRange를 설정한다', () => {
      const all = [...tokenizer.feed('ab\\(cd\\)ef'), ...tokenizer.end()];
      const textBefore = all.find(t => t.type === 'text' && t.content === 'ab');
      expect(textBefore?.sourceRange).toEqual({ start: 0, end: 2 });

      const mathStart = all.find(t => t.type === 'math_start');
      expect(mathStart?.sourceRange).toEqual({ start: 2, end: 4 });
    });
  });

  describe('크래시 방어', () => {
    it('역슬래시만 있는 입력에서 크래시하지 않는다', () => {
      expect(() => {
        tokenizer.feed('\\');
        tokenizer.end();
      }).not.toThrow();
    });

    it('불완전한 구분자에서 크래시하지 않는다', () => {
      expect(() => {
        tokenizer.feed('\\(\\');
        tokenizer.end();
      }).not.toThrow();
    });
  });

  describe('fuzz', () => {
    it('무작위 청크 분할 1000회에서 크래시하지 않는다', () => {
      const input = 'Hello \\(\\frac{1}{2}\\) and \\[x^2 + y^2\\] end';

      for (let i = 0; i < 1000; i++) {
        tokenizer.reset();
        // 무작위 위치에서 분할
        const splitPos = Math.floor(Math.random() * (input.length + 1));
        const chunk1 = input.slice(0, splitPos);
        const chunk2 = input.slice(splitPos);

        expect(() => {
          tokenizer.feed(chunk1);
          tokenizer.feed(chunk2);
          tokenizer.end();
        }).not.toThrow();
      }
    });
  });
});
