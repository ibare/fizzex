import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../latex/index.js';
import {
  MATH_CONSTANT_NAMES,
  MATH_CONSTANT_VALUES,
  isMathConstantName,
  evaluateSync,
  evaluate,
  analyzeBindings,
} from '../index.js';

describe('수학 상수', () => {
  describe('이름 집합과 값 집합의 관계', () => {
    it('값 집합의 키는 이름 집합의 부분집합이다', () => {
      for (const key of Object.keys(MATH_CONSTANT_VALUES)) {
        expect(isMathConstantName(key), `${key} 가 이름 집합에 없다`).toBe(true);
      }
    });

    it('∞ 는 값을 갖지 않는다 — 바인딩해도 divergent 로 접히기 때문', () => {
      expect(MATH_CONSTANT_NAMES.has('∞')).toBe(true);
      expect(Object.keys(MATH_CONSTANT_VALUES)).not.toContain('∞');
    });

    it('∞ 를 바인딩하면 진단이 나빠진다 — 제외 사유', () => {
      const inf = parseLatex('\\infty').ast;
      // 미바인딩: 어느 기호가 문제인지 알려준다
      const before = evaluate(inf);
      expect(before.ok).toBe(false);
      if (!before.ok) {
        expect(before.status).toBe('unbound');
        expect(before.detail).toMatchObject({ variable: '∞' });
      }
      // 바인딩: 유한성 게이트가 divergent 로 접고 기호 정보를 잃는다
      const after = evaluate(inf, { '∞': Infinity });
      expect(after.ok).toBe(false);
      if (!after.ok) {
        expect(after.status).toBe('divergent');
        expect(after.detail).not.toHaveProperty('variable');
      }
    });

    it('값이 빠진 이름은 ∞ 뿐이다', () => {
      const missing = [...MATH_CONSTANT_NAMES].filter((n) => !(n in MATH_CONSTANT_VALUES));
      expect(missing).toEqual(['∞']);
    });

    it('표준값이 정확하다', () => {
      expect(MATH_CONSTANT_VALUES.π).toBe(Math.PI);
      expect(MATH_CONSTANT_VALUES.e).toBe(Math.E);
      expect(MATH_CONSTANT_VALUES.τ).toBeCloseTo(2 * Math.PI, 15);
      // 오일러-마스케로니 상수 — 오타가 조용히 통과하지 않도록 잠근다
      expect(MATH_CONSTANT_VALUES.γ).toBeCloseTo(0.5772156649015329, 15);
      // 황금비는 두 정규형(\phi → ϕ, \varphi → φ)이 같은 값을 갖는다
      expect(MATH_CONSTANT_VALUES.φ).toBeCloseTo((1 + Math.sqrt(5)) / 2, 15);
      expect(MATH_CONSTANT_VALUES.ϕ).toBe(MATH_CONSTANT_VALUES.φ);
    });

    it('값 맵은 얼어 있다', () => {
      expect(Object.isFrozen(MATH_CONSTANT_VALUES)).toBe(true);
    });
  });

  describe('호스트 공급 계약', () => {
    const ast = () => parseLatex('\\pi \\cdot e').ast;

    it('상수를 공급하지 않으면 값이 나오지 않는다', () => {
      expect(evaluateSync(ast())).toBeUndefined();
    });

    it('evaluate 는 어느 기호가 미바인딩인지 알려준다', () => {
      const r = evaluate(ast());
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.status).toBe('unbound');
    });

    it('analyzeBindings 가 공급해야 할 상수를 알려준다', () => {
      expect(analyzeBindings(ast()).constants).toEqual(['e', 'π']);
      expect(analyzeBindings(ast()).required).toEqual([]);
    });

    it('표준값을 공급하면 평가된다', () => {
      const { constants } = analyzeBindings(ast());
      // 값이 없는 이름(∞)은 걸러야 한다 — 타입이 이를 강제한다
      const bindings: Record<string, number> = {};
      for (const name of constants) {
        const v = MATH_CONSTANT_VALUES[name];
        if (v !== undefined) bindings[name] = v;
      }
      expect(evaluateSync(ast(), bindings)).toBeCloseTo(Math.PI * Math.E, 12);
    });

    it('상수도 다른 값으로 바꿔 평가할 수 있다', () => {
      // π 를 3 으로 근사해 보는 탐색 — evaluator 가 상수를 하드코딩하지 않는 이유다
      expect(evaluateSync(parseLatex('\\pi').ast, { π: 3 })).toBe(3);
    });
  });
});
