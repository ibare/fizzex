import { describe, it, expect } from 'vitest';
import { latexToNerdamer, cleanNerdamerLatex, splitEquation } from './latex-converter';

describe('LaTeX Converter', () => {
  describe('latexToNerdamer', () => {
    describe('기본 연산', () => {
      it('공백을 제거한다', () => {
        expect(latexToNerdamer('x + y')).toBe('x+y');
      });

      it('\\cdot을 *로 변환한다', () => {
        expect(latexToNerdamer('a\\cdot b')).toBe('a*b');
      });

      it('\\times를 *로 변환한다', () => {
        expect(latexToNerdamer('a\\times b')).toBe('a*b');
      });

      it('\\div를 /로 변환한다', () => {
        expect(latexToNerdamer('a\\div b')).toBe('a/b');
      });
    });

    describe('분수 변환', () => {
      it('\\frac{1}{2} → (1)/(2)', () => {
        expect(latexToNerdamer('\\frac{1}{2}')).toBe('(1)/(2)');
      });

      it('중첩된 frac을 올바르게 변환한다', () => {
        expect(latexToNerdamer('\\frac{\\frac{1}{2}}{3}')).toBe('((1)/(2))/(3)');
      });

      it('분자/분모에 변수가 있는 frac을 변환한다', () => {
        expect(latexToNerdamer('\\frac{x+1}{y-2}')).toBe('(x+1)/(y-2)');
      });
    });

    describe('거듭제곱 변환', () => {
      it('x^{2} → x^(2)', () => {
        expect(latexToNerdamer('x^{2}')).toBe('x^(2)');
      });

      it('x^{n+1} → x^(n+1)', () => {
        expect(latexToNerdamer('x^{n+1}')).toBe('x^(n+1)');
      });
    });

    describe('제곱근 변환', () => {
      it('\\sqrt{x} → sqrt(x)', () => {
        expect(latexToNerdamer('\\sqrt{x}')).toBe('sqrt(x)');
      });

      it('\\sqrt[3]{x} → (x)^(1/(3))', () => {
        expect(latexToNerdamer('\\sqrt[3]{x}')).toBe('(x)^(1/(3))');
      });
    });

    describe('함수 변환', () => {
      it('\\sin → sin', () => {
        expect(latexToNerdamer('\\sin(x)')).toBe('sin(x)');
      });

      it('\\cos → cos', () => {
        expect(latexToNerdamer('\\cos(x)')).toBe('cos(x)');
      });

      it('\\tan → tan', () => {
        expect(latexToNerdamer('\\tan(x)')).toBe('tan(x)');
      });

      it('\\ln → log', () => {
        expect(latexToNerdamer('\\ln(x)')).toBe('log(x)');
      });

      it('\\arcsin → asin', () => {
        expect(latexToNerdamer('\\arcsin(x)')).toBe('asin(x)');
      });
    });

    describe('상수 변환', () => {
      it('\\pi → pi', () => {
        expect(latexToNerdamer('\\pi')).toBe('pi');
      });

      it('\\infty → Infinity', () => {
        expect(latexToNerdamer('\\infty')).toBe('Infinity');
      });
    });

    describe('괄호 처리', () => {
      it('\\left(과 \\right)를 일반 괄호로 변환한다', () => {
        expect(latexToNerdamer('\\left(x+1\\right)')).toBe('(x+1)');
      });
    });

    describe('암묵적 곱셈', () => {
      it('2x → 2*x', () => {
        expect(latexToNerdamer('2x')).toBe('2*x');
      });

      it('xy → x*y 형태가 아닌 Nerdamer 방식으로 처리', () => {
        // addImplicitMultiplication은 문자-문자 사이에는 * 추가 안 함
        // (Nerdamer가 자체적으로 처리)
        expect(latexToNerdamer('xy')).toBe('xy');
      });

      it('닫는 괄호 뒤 여는 괄호에 * 추가', () => {
        expect(latexToNerdamer('(x)(y)')).toBe('(x)*(y)');
      });
    });

    describe('정리', () => {
      it('남은 LaTeX 명령어를 제거한다', () => {
        expect(latexToNerdamer('\\alpha+\\beta')).toBe('+');
      });

      it('중괄호를 제거한다', () => {
        expect(latexToNerdamer('{x}+{y}')).toBe('x+y');
      });
    });
  });

  describe('cleanNerdamerLatex', () => {
    it('\\cdot을 공백으로 치환한다', () => {
      expect(cleanNerdamerLatex('a\\cdot b')).toBe('a b');
    });

    it('연속 공백을 정리한다', () => {
      expect(cleanNerdamerLatex('a  +  b')).toBe('a + b');
    });
  });

  describe('splitEquation', () => {
    it('등호가 있으면 좌변과 우변을 분리한다', () => {
      const [left, right] = splitEquation('x + 1 = 2');

      expect(left).toBe('(x+1)-(2)');
      expect(right).toBe('0');
    });

    it('등호가 없으면 전체 식과 "0"을 반환한다', () => {
      const [left, right] = splitEquation('x + 1');

      expect(left).toBe('x+1');
      expect(right).toBe('0');
    });
  });
});
