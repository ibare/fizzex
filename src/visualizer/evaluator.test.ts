/**
 * evaluator 테스트 — 좌변 풀이 (analyzeLhsInversion) 중심.
 *
 * 발견적 학습 원칙: 좌변 number 노드 변경(예: T²의 2 → 3)이
 * derivedValue.compute 가 받는 ctx.equationValue 에 반영되는지 검증.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../latex/latex-parser';
import { resetLatexIdCounter } from '../utils/id-generator';
import { evaluateEquation } from './evaluator';

describe('evaluateEquation', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('등호 없는 식 — 기존 동작', () => {
    it('전체 식을 평가한다', () => {
      const { ast } = parseLatex('2 + 3');
      const { equationValue } = evaluateEquation(ast, {});
      expect(equationValue).toBe(5);
    });

    it('변수 포함 식을 평가한다', () => {
      const { ast } = parseLatex('a + b');
      const { equationValue } = evaluateEquation(ast, { a: 4, b: 6 });
      expect(equationValue).toBe(10);
    });
  });

  describe('등호 있는 식 — LHS 풀이', () => {
    it('단일 변수 LHS 는 RHS 그대로 반환 (T = expr)', () => {
      const { ast } = parseLatex('T = 4 + 2');
      const { equationValue } = evaluateEquation(ast, {});
      expect(equationValue).toBe(6);
    });

    it('T^2 = 4 → 2 (sqrt 적용)', () => {
      const { ast } = parseLatex('T^2 = 4');
      const { equationValue } = evaluateEquation(ast, {});
      expect(equationValue).toBeCloseTo(2);
    });

    it('T^3 = 8 → 2 (cbrt 적용)', () => {
      const { ast } = parseLatex('T^3 = 8');
      const { equationValue } = evaluateEquation(ast, {});
      expect(equationValue).toBeCloseTo(2);
    });

    it('T^2 = 9 → 3', () => {
      const { ast } = parseLatex('T^2 = 9');
      const { equationValue } = evaluateEquation(ast, {});
      expect(equationValue).toBeCloseTo(3);
    });

    it('좌변 지수 변경 시 결과가 달라진다 (발견적 학습)', () => {
      // 같은 RHS = R 에 대해 좌변 지수가 다르면 풀린 값도 달라야 함.
      // 변수 R 로 주입 — LaTeX parser 가 multi-digit number 를 자릿수별 노드로 쪼개는 한계 회피.
      const { ast: ast2 } = parseLatex('T^2 = R');
      const { ast: ast3 } = parseLatex('T^3 = R');
      const { ast: ast6 } = parseLatex('T^6 = R');
      expect(evaluateEquation(ast2, { R: 64 }).equationValue).toBeCloseTo(8);  // sqrt(64)
      expect(evaluateEquation(ast3, { R: 64 }).equationValue).toBeCloseTo(4);  // cbrt(64)
      expect(evaluateEquation(ast6, { R: 64 }).equationValue).toBeCloseTo(2);  // 64^(1/6)
    });
  });

  describe('풀이 불가 LHS — RHS 그대로', () => {
    it('LHS 가 다항식이면 invert 적용하지 않는다', () => {
      // T + a = 5 → LHS 패턴 매칭 실패 → RHS 그대로 (= 5)
      const { ast } = parseLatex('T + a = 5');
      const { equationValue } = evaluateEquation(ast, {});
      expect(equationValue).toBe(5);
    });

    it('LHS power 의 base 가 단일 변수가 아니면 풀이 불가', () => {
      // (T+1)^2 = 9 → base 가 paren 노드 → null → RHS 그대로 (= 9)
      const { ast } = parseLatex('(T+1)^2 = 9');
      const { equationValue } = evaluateEquation(ast, {});
      expect(equationValue).toBe(9);
    });

    it('LHS power 의 지수가 0 이면 invert 불가 → RHS 그대로', () => {
      // T^0 = 5 → 1/0 = Infinity, 풀이 불가 처리
      const { ast } = parseLatex('T^0 = 5');
      const { equationValue } = evaluateEquation(ast, {});
      expect(equationValue).toBe(5);
    });
  });

  describe('케플러 시나리오 — 좌변/우변 number 변경', () => {
    // 단순화 — GM 대신 1, 4π² 대신 4 로 두고 기본 식 형태 검증
    // T^2 = 4 * a^3, a=1 → RHS=4, T = sqrt(4) = 2

    it('표준 케플러: T^2 = 4 a^3, a=1 → T = 2', () => {
      const { ast } = parseLatex('T^2 = 4 a^3');
      const { equationValue } = evaluateEquation(ast, { a: 1 });
      expect(equationValue).toBeCloseTo(2);
    });

    it('좌변 변형: T^3 = 4 a^3, a=1 → T = cbrt(4) ≈ 1.587', () => {
      const { ast } = parseLatex('T^3 = 4 a^3');
      const { equationValue } = evaluateEquation(ast, { a: 1 });
      expect(equationValue).toBeCloseTo(Math.cbrt(4));
    });

    it('우변 변형: T^2 = 4 a^4, a=2 → RHS=64, T = 8', () => {
      const { ast } = parseLatex('T^2 = 4 a^4');
      const { equationValue } = evaluateEquation(ast, { a: 2 });
      expect(equationValue).toBeCloseTo(8);
    });
  });
});
