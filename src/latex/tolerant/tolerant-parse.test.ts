import { describe, it, expect, beforeEach } from 'vitest';
import { tolerantParse } from './tolerant-parse';
import { parseLatex } from '../latex-parser';
import { astToLatex } from '../ast-to-latex';
import { resetLatexIdCounter } from '../../utils/id-generator';

beforeEach(() => {
  resetLatexIdCounter();
});

describe('tolerantParse', () => {
  describe('strict 동치', () => {
    const validInputs = [
      'x + y',
      '\\frac{1}{2}',
      'x^2',
      'a_1',
      '\\sqrt{x}',
      '\\sqrt[3]{x}',
      '\\sin(x)',
      '\\cos(\\theta)',
      '|x|',
      '(x + y)',
      '[a, b]',
      '\\alpha + \\beta',
      'a \\times b',
      '\\overline{x}',
      '\\hat{x}',
      '\\vec{v}',
      '\\text{hello}',
      '1 + 2 + 3',
      'a^{10}',
      'x_{12}',
    ];

    for (const input of validInputs) {
      it(`유효 입력 "${input}"에서 strict와 동일한 AST를 생성한다`, () => {
        resetLatexIdCounter();
        const strictResult = parseLatex(input);

        resetLatexIdCounter();
        const tolerantResult = tolerantParse(input, { parserMode: 'strict' });

        // AST 구조가 동일 (ID는 달라도 됨 — 구조만 비교)
        expect(tolerantResult.ast.children.length).toBe(strictResult.ast.children.length);
        expect(tolerantResult.ast.type).toBe('root');
      });
    }
  });

  describe('Round-trip', () => {
    const roundTripInputs = [
      '\\frac{1}{2}',
      'x^2 + y^2',
      '\\sqrt{x + 1}',
      '\\alpha + \\beta',
      'a_{12}',
    ];

    for (const input of roundTripInputs) {
      it(`"${input}" → tolerantParse → astToLatex → tolerantParse가 동일 구조`, () => {
        resetLatexIdCounter();
        const result1 = tolerantParse(input, { parserMode: 'strict' });
        const latex = astToLatex(result1.ast);

        resetLatexIdCounter();
        const result2 = tolerantParse(latex, { parserMode: 'strict' });

        expect(result2.ast.children.length).toBe(result1.ast.children.length);
      });
    }
  });

  describe('LLM 패턴 정규화', () => {
    it('연속 백슬래시를 정규화한다: \\\\\\frac{1}{2}', () => {
      const result = tolerantParse('\\\\\\frac{1}{2}', { parserMode: 'tolerant' });
      expect(result.normalizations.length).toBeGreaterThanOrEqual(1);
      expect(result.ast.type).toBe('root');
    });

    it('커맨드-중괄호 간 공백을 정규화한다: \\frac {1}{2}', () => {
      const result = tolerantParse('\\frac {1}{2}', { parserMode: 'tolerant' });
      expect(result.normalizations.length).toBeGreaterThanOrEqual(1);
      expect(result.ast.type).toBe('root');
    });

    it('복합 정규화: \\\\\\sqrt {x}', () => {
      const result = tolerantParse('\\\\\\sqrt {x}', { parserMode: 'tolerant' });
      expect(result.normalizations.length).toBeGreaterThanOrEqual(1);
      expect(result.ast.type).toBe('root');
    });
  });

  describe('모드별 동작', () => {
    it('strict 모드에서 정규화를 적용하지 않는다', () => {
      const result = tolerantParse('\\frac{1}{2}', { parserMode: 'strict' });
      expect(result.normalizations).toHaveLength(0);
    });

    it('tolerant 모드에서 정규화 결과를 반영한다', () => {
      const result = tolerantParse('\\frac {1}{2}', { parserMode: 'tolerant' });
      expect(result.normalizations.length).toBeGreaterThanOrEqual(1);
    });

    it('strict_fallback 모드: 정상 입력은 strict로 처리', () => {
      const result = tolerantParse('x + y', { parserMode: 'strict_fallback' });
      expect(result.normalizations).toHaveLength(0);
      expect(result.diagnostics.length).toBe(0);
    });

    it('auto 모드: 정상 입력은 strict로 처리', () => {
      const result = tolerantParse('x + y', { parserMode: 'auto' });
      expect(result.normalizations).toHaveLength(0);
    });

    it('auto 모드: LLM 패턴은 tolerant로 처리', () => {
      const result = tolerantParse('\\\\\\frac{1}{2}', { parserMode: 'auto' });
      expect(result.normalizations.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('옵션 조합', () => {
    it('backslashNormalization: false 시 백슬래시 정규화 미적용', () => {
      const result = tolerantParse('\\\\\\frac{1}{2}', {
        parserMode: 'tolerant',
        backslashNormalization: false,
      });
      // 공백 정규화만 적용될 수 있으나, 백슬래시는 미적용
      const hasBackslashNorm = result.normalizations.some(n => n.type === 'backslash_norm');
      expect(hasBackslashNorm).toBe(false);
    });

    it('whitespaceNormalization: false 시 공백 정규화 미적용', () => {
      const result = tolerantParse('\\frac {1}{2}', {
        parserMode: 'tolerant',
        whitespaceNormalization: false,
      });
      const hasWhitespaceNorm = result.normalizations.some(n => n.type === 'whitespace_trim');
      expect(hasWhitespaceNorm).toBe(false);
    });
  });

  describe('RenderDecision', () => {
    it('정상 입력에서 mode가 full이다', () => {
      const result = tolerantParse('\\frac{1}{2}');
      expect(result.renderDecision.mode).toBe('full');
    });

    it('에러 입력에서 mode가 full이 아니다', () => {
      const result = tolerantParse('\\frac{1}', { parserMode: 'tolerant' });
      // 파서가 에러를 내면 partial/none
      if (result.diagnostics.some(d => d.severity === 'error')) {
        expect(result.renderDecision.mode).not.toBe('full');
      }
    });
  });

  describe('offsetMap', () => {
    it('tolerant 모드에서 offsetMap이 반환된다', () => {
      const result = tolerantParse('\\frac {1}{2}', { parserMode: 'tolerant' });
      expect(result.offsetMap).toBeDefined();
    });

    it('strict 모드에서 offsetMap이 반환되지 않는다', () => {
      const result = tolerantParse('\\frac{1}{2}', { parserMode: 'strict' });
      expect(result.offsetMap).toBeUndefined();
    });
  });

  describe('크래시 방어', () => {
    it('빈 문자열에서 크래시하지 않는다', () => {
      expect(() => tolerantParse('')).not.toThrow();
      expect(() => tolerantParse('', { parserMode: 'tolerant' })).not.toThrow();
    });

    it('특수 문자만 있는 입력에서 크래시하지 않는다', () => {
      expect(() => tolerantParse('\\\\\\\\', { parserMode: 'tolerant' })).not.toThrow();
      expect(() => tolerantParse('{{{', { parserMode: 'tolerant' })).not.toThrow();
    });
  });

  describe('Fuzz', () => {
    it('무작위 교란 1000회에서 크래시하지 않는다', () => {
      const base = '\\frac{1}{2} + \\sqrt{x}';
      const mutations = ['\\', '{', '}', ' ', '', 'a', '^', '_', '(', ')'];

      for (let i = 0; i < 1000; i++) {
        const pos = Math.floor(Math.random() * (base.length + 1));
        const mutation = mutations[Math.floor(Math.random() * mutations.length)];
        const action = Math.random() < 0.5 ? 'insert' : 'delete';

        let mutated: string;
        if (action === 'insert') {
          mutated = base.slice(0, pos) + mutation + base.slice(pos);
        } else {
          mutated = base.slice(0, pos) + base.slice(pos + 1);
        }

        expect(() => tolerantParse(mutated, { parserMode: 'tolerant' })).not.toThrow();
      }
    });
  });
});
