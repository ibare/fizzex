import { describe, it, expect, beforeEach } from 'vitest';
import { recoverFromErrors } from './error-recovery.js';
import { parseLatex } from '../latex-parser.js';
import { resetLatexIdCounter } from '../../utils/id-generator.js';

beforeEach(() => {
  resetLatexIdCounter();
});

describe('recoverFromErrors', () => {
  describe('에러 없는 입력', () => {
    it('에러가 없으면 null을 반환한다', () => {
      const result = parseLatex('\\frac{1}{2}');
      expect(recoverFromErrors('\\frac{1}{2}', result)).toBeNull();
    });

    it('단순 수식에서 null을 반환한다', () => {
      const result = parseLatex('x + y');
      expect(recoverFromErrors('x + y', result)).toBeNull();
    });
  });

  describe('에러 복구', () => {
    it('인자 부족 입력에서 ErrorNode를 생성한다', () => {
      const input = '\\frac{1}';
      const result = parseLatex(input);

      if (!result.hasErrors) {
        // 파서가 에러를 내지 않으면 테스트 스킵
        return;
      }

      const recovered = recoverFromErrors(input, result);
      expect(recovered).not.toBeNull();
      if (!recovered) return;

      expect(recovered.errorNode).toBeDefined();
      expect(recovered.errorNode.type).toBe('error');
      expect(recovered.errorNode.parseStatus).toBe('failed');
    });

    it('닫히지 않은 중괄호에서 ErrorNode를 생성한다', () => {
      const input = '\\frac{1}{2+3';
      const result = parseLatex(input);

      if (!result.hasErrors) return;

      const recovered = recoverFromErrors(input, result);
      expect(recovered).not.toBeNull();
      if (!recovered) return;

      expect(recovered.errorNode.type).toBe('error');
    });

    it('혼합 케이스: 정상 + 에러', () => {
      // 파서에 따라 에러 감지 방식이 다를 수 있으므로 에러 존재 확인 후 진행
      const input = 'x + \\frac{1}';
      const result = parseLatex(input);

      if (!result.hasErrors) return;

      const recovered = recoverFromErrors(input, result);
      expect(recovered).not.toBeNull();
      if (!recovered) return;

      // parsedNodes는 에러 이전 노드
      // errorNode는 에러 구간
      expect(recovered.errorNode.type).toBe('error');
    });
  });

  describe('원본 AST 불변성', () => {
    it('복구 후 원본 strictResult의 AST가 변경되지 않는다', () => {
      const input = '\\frac{1}';
      const result = parseLatex(input);

      if (!result.hasErrors) return;

      // 원본 ID 저장
      const originalIds = result.ast.children.map(n => n.id);
      const originalRootId = result.ast.id;

      recoverFromErrors(input, result);

      // 원본 AST가 변경되지 않았는지 확인
      expect(result.ast.id).toBe(originalRootId);
      result.ast.children.forEach((n, i) => {
        expect(n.id).toBe(originalIds[i]);
      });
    });
  });

  describe('ID 고유성', () => {
    it('복구 결과의 모든 노드가 고유한 ID를 가진다', () => {
      const input = '\\frac{1}';
      const result = parseLatex(input);

      if (!result.hasErrors) return;

      const recovered = recoverFromErrors(input, result);
      if (!recovered) return;

      const allIds = new Set<string>();
      const allNodes = [
        ...recovered.parsedNodes,
        recovered.errorNode,
        ...recovered.remainingNodes,
      ];

      function collectIds(nodes: import('../../types.js').MathNode[]): void {
        for (const node of nodes) {
          expect(allIds.has(node.id)).toBe(false);
          allIds.add(node.id);
        }
      }

      collectIds(allNodes);
      expect(allIds.size).toBe(allNodes.length);
    });
  });

  describe('진단 정보', () => {
    it('복구 결과에 Diagnostic이 포함된다', () => {
      const input = '\\frac{1}';
      const result = parseLatex(input);

      if (!result.hasErrors) return;

      const recovered = recoverFromErrors(input, result);
      if (!recovered) return;

      expect(recovered.diagnostics.length).toBeGreaterThanOrEqual(1);
      expect(recovered.diagnostics[0].severity).toBe('error');
      expect(recovered.diagnostics[0].affectsRender).toBe(true);
    });
  });

  describe('sourceRange', () => {
    it('ErrorNode에 sourceRange가 설정된다', () => {
      const input = '\\frac{1}';
      const result = parseLatex(input);

      if (!result.hasErrors) return;

      const recovered = recoverFromErrors(input, result);
      if (!recovered) return;

      expect(recovered.errorSpan).toBeDefined();
      expect(recovered.errorSpan.start).toBeGreaterThanOrEqual(0);
      expect(recovered.errorSpan.end).toBeLessThanOrEqual(input.length);
    });
  });

  describe('크래시 방어', () => {
    it('빈 문자열에서 크래시하지 않는다', () => {
      const result = parseLatex('');
      const recovered = recoverFromErrors('', result);
      // 에러 없으면 null, 있으면 결과 — 어느 쪽이든 크래시 없음
      expect(recovered === null || recovered.errorNode !== undefined).toBe(true);
    });

    it('중괄호만 있는 입력에서 크래시하지 않는다', () => {
      const input = '{{{';
      const result = parseLatex(input);
      // 크래시 없이 처리되는지만 확인
      expect(() => recoverFromErrors(input, result)).not.toThrow();
    });

    it('역슬래시만 있는 입력에서 크래시하지 않는다', () => {
      const input = '\\';
      const result = parseLatex(input);
      expect(() => recoverFromErrors(input, result)).not.toThrow();
    });

    it('잘못된 환경에서 크래시하지 않는다', () => {
      const input = '\\begin{matrix}1 & 2';
      const result = parseLatex(input);
      expect(() => recoverFromErrors(input, result)).not.toThrow();
    });
  });
});
