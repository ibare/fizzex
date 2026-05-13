/**
 * E1 산수 평가자 — 핫패스/콜드패스 양쪽 계약 검증.
 *
 * 시퀀스 평가 (우선순위·암묵적 곱·단항 마이너스) + 분수/거듭제곱/제곱근/괄호/절댓값.
 * 도메인 위배(0 나눔, 음수 + 짝수근, 음수 밑 + 비정수 지수) 는 cold path 에서 'domain' 으로 신호.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../../latex/latex-parser';
import { resetLatexIdCounter } from '../../utils/id-generator';
import { evaluateSync, evaluate } from '..';

beforeEach(() => {
  resetLatexIdCounter();
});

function ev(src: string, bindings: Record<string, number> = {}): number | undefined {
  const { ast } = parseLatex(src);
  return evaluateSync(ast, bindings);
}

function evCold(src: string, bindings: Record<string, number> = {}): ReturnType<typeof evaluate> {
  const { ast } = parseLatex(src);
  return evaluate(ast, bindings);
}

describe('E1 — 기본 사칙연산', () => {
  it('1 + 2 → 3', () => expect(ev('1 + 2')).toBe(3));
  it('5 - 2 → 3', () => expect(ev('5 - 2')).toBe(3));
  it('2 * 3 → 6', () => expect(ev('2 * 3')).toBe(6));
  it('a \\times b → a × b', () => expect(ev('2 \\times 3')).toBe(6));
  it('a \\cdot b → a × b', () => expect(ev('4 \\cdot 5')).toBe(20));
  it('6 \\div 2 → 3', () => expect(ev('6 \\div 2')).toBe(3));
});

describe('E1 — 연산자 우선순위', () => {
  it('1 + 2 * 3 → 7', () => expect(ev('1 + 2 \\times 3')).toBe(7));
  it('1 + 6 / 2 → 4', () => expect(ev('1 + 6 \\div 2')).toBe(4));
  it('2 - 3 + 1 → 0 (좌결합)', () => expect(ev('2 - 3 + 1')).toBe(0));
  it('8 / 4 / 2 → 1 (좌결합)', () => expect(ev('8 \\div 4 \\div 2')).toBe(1));
});

describe('E1 — 단항 마이너스', () => {
  it('-3 + 5 → 2', () => expect(ev('-3 + 5')).toBe(2));
  it('3 + -2 → 1 (이항 후 단항)', () => expect(ev('3 + -2')).toBe(1));
  it('--3 → 3', () => expect(ev('--3')).toBe(3));
  it('-2 * 3 → -6 (단항이 곱보다 강결합)', () => expect(ev('-2 \\times 3')).toBe(-6));
});

describe('E1 — 암묵적 곱셈', () => {
  it('2x (x=4) → 8', () => expect(ev('2x', { x: 4 })).toBe(8));
  it('3x + 2 (x=5) → 17', () => expect(ev('3x + 2', { x: 5 })).toBe(17));
});

describe('E1 — 변수', () => {
  it('x + y (x=1, y=2) → 3', () => expect(ev('x + y', { x: 1, y: 2 })).toBe(3));
  it('미연결 변수 → undefined (hot)', () => expect(ev('x + y', { x: 1 })).toBeUndefined());
  it('미연결 변수 → unbound (cold)', () => {
    const r = evCold('x + y', { x: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unbound');
      expect(r.detail?.variable).toBe('y');
    }
  });
});

describe('E1 — 분수', () => {
  it('\\frac{1}{2} → 0.5', () => expect(ev('\\frac{1}{2}')).toBe(0.5));
  it('\\frac{10}{4} → 2.5', () => expect(ev('\\frac{10}{4}')).toBe(2.5));
  it('\\frac{x}{2} (x=10) → 5', () => expect(ev('\\frac{x}{2}', { x: 10 })).toBe(5));
  it('\\frac{1}{0} → domain (cold)', () => {
    const r = evCold('\\frac{1}{0}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('domain');
  });
  it('\\frac{1+2}{3} → 1 (분자 시퀀스 평가)', () => expect(ev('\\frac{1+2}{3}')).toBe(1));
});

describe('E1 — 거듭제곱', () => {
  it('2^3 → 8', () => expect(ev('2^3')).toBe(8));
  it('x^2 (x=5) → 25', () => expect(ev('x^2', { x: 5 })).toBe(25));
  it('2^{10} → 1024 (다자리 지수)', () => expect(ev('2^{10}')).toBe(1024));
  it('(-2)^3 → -8 (정수 지수 OK)', () => expect(ev('(-2)^3')).toBe(-8));
  it('0^0 → domain', () => {
    const r = evCold('0^0');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('domain');
  });
  it('(-4)^{0.5} → domain', () => {
    const r = evCold('(-4)^{0.5}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('domain');
  });
});

describe('E1 — 제곱근', () => {
  it('\\sqrt{4} → 2', () => expect(ev('\\sqrt{4}')).toBe(2));
  it('\\sqrt{2} ≈ 1.414', () => {
    const r = ev('\\sqrt{2}');
    expect(r).toBeCloseTo(Math.sqrt(2), 10);
  });
  it('\\sqrt[3]{8} → 2', () => expect(ev('\\sqrt[3]{8}')).toBe(2));
  it('\\sqrt[3]{-8} → -2 (홀수근의 음수)', () => {
    const r = ev('\\sqrt[3]{-8}');
    expect(r).toBeCloseTo(-2, 10);
  });
  it('\\sqrt{-1} → domain', () => {
    const r = evCold('\\sqrt{-1}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('domain');
  });
});

describe('E1 — 괄호', () => {
  it('(1 + 2) * 3 → 9', () => expect(ev('(1 + 2) \\times 3')).toBe(9));
  it('2 * (3 + 4) → 14', () => expect(ev('2 \\times (3 + 4)')).toBe(14));
  it('((1))(2) → 2 (중첩 + 암묵적 곱)', () => expect(ev('((1))(2)')).toBe(2));
});

describe('E1 — 절댓값', () => {
  it('|5| → 5', () => expect(ev('|5|')).toBe(5));
  it('|-5| → 5', () => expect(ev('|-5|')).toBe(5));
  it('|x - 1| (x=-3) → 4', () => expect(ev('|x - 1|', { x: -3 })).toBe(4));
});

describe('E1 — 조합', () => {
  it('피타고라스 \\sqrt{3^2 + 4^2} → 5', () => {
    const r = ev('\\sqrt{3^2 + 4^2}');
    expect(r).toBeCloseTo(5, 10);
  });
  it('\\frac{x^2}{2} (x=4) → 8', () => expect(ev('\\frac{x^2}{2}', { x: 4 })).toBe(8));
  it('2(x+1)^2 (x=2) → 18 (괄호 + 거듭제곱 + 암묵적 곱)', () => {
    expect(ev('2(x+1)^2', { x: 2 })).toBe(18);
  });
});

describe('E1 — 미지원 신호 (silent-drop 금지)', () => {
  it('x = 1 (등호) → unsupported (cold)', () => {
    const r = evCold('x = 1');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unsupported');
      expect(r.detail?.nodeType).toBe('operator');
    }
  });
});

describe('E1 — throw 금지 / 결정성', () => {
  it('어떤 입력에서도 throw 하지 않는다', () => {
    expect(() => ev('\\frac{1}{0}')).not.toThrow();
    expect(() => ev('\\sqrt{-1}')).not.toThrow();
    expect(() => ev('(-4)^{0.5}')).not.toThrow();
    expect(() => ev('x = 1')).not.toThrow();
  });

  it('같은 입력은 같은 결과', () => {
    expect(ev('2x + 3', { x: 5 })).toBe(ev('2x + 3', { x: 5 }));
  });
});
