import { describe, it, expect, beforeEach } from 'vitest';
import {
  simplify,
  expand,
  factor,
  solve,
  diff,
  integrate,
  evaluate,
  performOperation,
} from './cas-service';
import { parseLatex } from '../latex';

describe('CAS Service', () => {
  describe('simplify', () => {
    it('x + x를 단순화한다', async () => {
      const result = await simplify('x + x');
      expect(result.success).toBe(true);
      expect(result.resultLatex).toBeDefined();
    });

    it('결과에 success가 true이다', async () => {
      const result = await simplify('2x + 3x');
      expect(result.success).toBe(true);
    });

    it('결과에 resultLatex가 포함된다', async () => {
      const result = await simplify('x + x');
      expect(result.resultLatex).toBeDefined();
      expect(typeof result.resultLatex).toBe('string');
    });

    it('결과에 operation이 simplify이다', async () => {
      const result = await simplify('x + x');
      expect(result.operation).toBe('simplify');
    });

    it('inputLatex가 원본 입력을 보존한다', async () => {
      const input = 'x + x';
      const result = await simplify(input);
      expect(result.inputLatex).toBe(input);
    });
  });

  describe('expand', () => {
    it('(x+1)^2를 전개한다', async () => {
      const result = await expand('(x+1)^{2}');
      expect(result.success).toBe(true);
      expect(result.resultLatex).toBeDefined();
    });

    it('결과에 resultLatex가 포함된다', async () => {
      const result = await expand('(x+1)(x-1)');
      expect(result.success).toBe(true);
      expect(result.resultLatex).toBeDefined();
      expect(typeof result.resultLatex).toBe('string');
    });

    it('operation이 expand이다', async () => {
      const result = await expand('(x+1)^{2}');
      expect(result.operation).toBe('expand');
    });
  });

  describe('factor', () => {
    it('x^2 - 1을 인수분해한다', async () => {
      const result = await factor('x^{2} - 1');
      expect(result.success).toBe(true);
      expect(result.resultLatex).toBeDefined();
    });

    it('operation이 factor이다', async () => {
      const result = await factor('x^{2} - 1');
      expect(result.operation).toBe('factor');
    });
  });

  describe('solve', () => {
    it('x^2 - 4 = 0의 해를 구한다', async () => {
      const result = await solve('x^{2} - 4 = 0');
      expect(result.success).toBe(true);
      expect(result.resultLatex).toBeDefined();
    });

    it('solutions 배열에 해가 포함된다', async () => {
      const result = await solve('x^{2} - 4 = 0');
      expect(result.success).toBe(true);
      expect(result.solutions).toBeDefined();
      expect(Array.isArray(result.solutions)).toBe(true);
      expect(result.solutions!.length).toBeGreaterThan(0);
    });

    it('variable 옵션으로 변수를 지정할 수 있다', async () => {
      const result = await solve('y^{2} - 9 = 0', { variable: 'y' });
      expect(result.success).toBe(true);
      expect(result.solutions).toBeDefined();
      expect(result.solutions!.length).toBeGreaterThan(0);
    });

    it('operation이 solve이다', async () => {
      const result = await solve('x - 1 = 0');
      expect(result.operation).toBe('solve');
    });
  });

  describe('diff', () => {
    it('x^2을 미분하면 결과를 반환한다', async () => {
      const result = await diff('x^{2}');
      expect(result.success).toBe(true);
      expect(result.resultLatex).toBeDefined();
    });

    it('변수를 지정할 수 있다', async () => {
      const result = await diff('y^{3}', { variable: 'y' });
      expect(result.success).toBe(true);
      expect(result.resultLatex).toBeDefined();
    });

    it('미분 횟수를 지정할 수 있다', async () => {
      const result = await diff('x^{3}', { times: 2 });
      expect(result.success).toBe(true);
      expect(result.resultLatex).toBeDefined();
    });

    it('operation이 diff이다', async () => {
      const result = await diff('x^{2}');
      expect(result.operation).toBe('diff');
    });
  });

  describe('integrate', () => {
    it('부정적분 결과를 반환한다', async () => {
      const result = await integrate('2*x');
      expect(result.success).toBe(true);
      expect(result.resultLatex).toBeDefined();
    });

    it('변수를 지정할 수 있다', async () => {
      const result = await integrate('2*y', { variable: 'y' });
      expect(result.success).toBe(true);
      expect(result.resultLatex).toBeDefined();
    });

    it('정적분을 계산할 수 있다', async () => {
      const result = await integrate('x', { from: 0, to: 1 });
      expect(result.success).toBe(true);
      expect(result.resultLatex).toBeDefined();
    });

    it('operation이 integrate이다', async () => {
      const result = await integrate('x');
      expect(result.operation).toBe('integrate');
    });
  });

  describe('evaluate', () => {
    it('변수 값을 대입하여 계산한다', async () => {
      const result = await evaluate('x^{2} + 1', { x: 3 });
      expect(result.success).toBe(true);
      expect(result.resultLatex).toBeDefined();
    });

    it('여러 변수를 대입할 수 있다', async () => {
      const result = await evaluate('x + y', { x: 2, y: 3 });
      expect(result.success).toBe(true);
      expect(result.resultLatex).toBeDefined();
    });

    it('변수 없이 수식을 계산할 수 있다', async () => {
      const result = await evaluate('2 + 3');
      expect(result.success).toBe(true);
      expect(result.resultLatex).toBeDefined();
    });

    it('operation이 evaluate이다', async () => {
      const result = await evaluate('x', { x: 1 });
      expect(result.operation).toBe('evaluate');
    });
  });

  describe('performOperation', () => {
    it('AST와 operation을 받아 결과를 반환한다', async () => {
      const { ast } = parseLatex('x + x');
      const result = await performOperation(ast, 'simplify');
      expect(result.success).toBe(true);
      expect(result.operation).toBe('simplify');
      expect(result.resultLatex).toBeDefined();
    });

    it('expand operation으로 AST를 전개한다', async () => {
      const { ast } = parseLatex('(x+1)^{2}');
      const result = await performOperation(ast, 'expand');
      expect(result.success).toBe(true);
      expect(result.operation).toBe('expand');
    });

    it('diff operation으로 AST를 미분한다', async () => {
      const { ast } = parseLatex('x^{2}');
      const result = await performOperation(ast, 'diff', { variable: 'x' });
      expect(result.success).toBe(true);
      expect(result.operation).toBe('diff');
    });

    it('지원하지 않는 operation에 에러를 반환한다', async () => {
      const { ast } = parseLatex('x');
      const result = await performOperation(
        ast,
        'unknown_op' as 'simplify',
      );
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('에러 처리', () => {
    it('잘못된 입력에 success: false를 반환한다', async () => {
      const result = await simplify(')))(((');
      expect(result.success).toBe(false);
    });

    it('error 메시지가 포함된다', async () => {
      const result = await simplify(')))(((');
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });

    it('실패 시에도 operation과 inputLatex가 유지된다', async () => {
      const input = ')))(((';
      const result = await simplify(input);
      expect(result.operation).toBe('simplify');
      expect(result.inputLatex).toBe(input);
    });
  });
});
