/**
 * Fizzex 렌더링 검증 페이지
 *
 * Fizzex 렌더링 결과와 KaTeX, MathJax 렌더링 결과를 나란히 비교하여
 * LaTeX 수식 렌더링의 정합성을 검증합니다.
 */

import { useState, useEffect, useMemo, useRef } from 'react';

// MathJax 전역 타입 선언
declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
    };
  }
}
import { EditorView } from 'fizzex/react';
import { parseLatex } from 'fizzex';
import type { EditorState } from 'fizzex';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// ============================================================
// 테스트 케이스 정의
// ============================================================

interface TestCase {
  id: string;
  latex: string;
  description: string;
}

interface TestCategory {
  name: string;
  description: string;
  cases: TestCase[];
}

const testCategories: TestCategory[] = [
  // 1. 기본 숫자와 변수
  {
    name: '기본 숫자와 변수',
    description: '단일 숫자, 변수, 기본 표현',
    cases: [
      { id: 'num-1', latex: '0', description: '숫자 0' },
      { id: 'num-2', latex: '1', description: '숫자 1' },
      { id: 'num-3', latex: '123', description: '여러 자리 숫자' },
      { id: 'num-4', latex: '3.14', description: '소수점 숫자' },
      { id: 'num-5', latex: '-5', description: '음수' },
      { id: 'var-1', latex: 'x', description: '변수 x' },
      { id: 'var-2', latex: 'y', description: '변수 y' },
      { id: 'var-3', latex: 'abc', description: '여러 변수' },
      { id: 'var-4', latex: 'xyz', description: '변수 연속' },
    ],
  },

  // 2. 기본 사칙연산
  {
    name: '기본 사칙연산',
    description: '덧셈, 뺄셈, 곱셈, 나눗셈',
    cases: [
      { id: 'arith-1', latex: '1 + 2', description: '덧셈' },
      { id: 'arith-2', latex: '5 - 3', description: '뺄셈' },
      { id: 'arith-3', latex: '2 \\times 3', description: '곱셈 (times)' },
      { id: 'arith-4', latex: '2 \\cdot 3', description: '곱셈 (cdot)' },
      { id: 'arith-5', latex: '6 \\div 2', description: '나눗셈' },
      { id: 'arith-6', latex: 'a + b - c', description: '복합 연산' },
      { id: 'arith-7', latex: '2x + 3y - z', description: '변수 연산' },
      { id: 'arith-8', latex: '-a + b', description: '음수 시작' },
      { id: 'arith-9', latex: 'a \\pm b', description: '플러스 마이너스' },
    ],
  },

  // 3. 분수
  {
    name: '분수',
    description: '\\frac 명령어',
    cases: [
      { id: 'frac-1', latex: '\\frac{1}{2}', description: '단순 분수' },
      { id: 'frac-2', latex: '\\frac{a}{b}', description: '변수 분수' },
      { id: 'frac-3', latex: '\\frac{x+1}{x-1}', description: '수식 분수' },
      { id: 'frac-4', latex: '\\frac{1}{\\frac{2}{3}}', description: '중첩 분수' },
      { id: 'frac-5', latex: '\\frac{a+b}{c+d}', description: '복합 분수' },
      { id: 'frac-6', latex: '1 + \\frac{1}{2}', description: '분수 혼합' },
      { id: 'frac-7', latex: '\\frac{x^2}{y^2}', description: '거듭제곱 분수' },
      { id: 'frac-8', latex: '\\frac{\\sqrt{2}}{2}', description: '루트 분수' },
      { id: 'frac-9', latex: '\\frac{1}{2} + \\frac{1}{3}', description: '분수 덧셈' },
      { id: 'frac-10', latex: '\\frac{n!}{k!(n-k)!}', description: '조합 공식' },
    ],
  },

  // 4. 거듭제곱 (지수)
  {
    name: '거듭제곱',
    description: '위 첨자, 지수',
    cases: [
      { id: 'pow-1', latex: 'x^2', description: '제곱' },
      { id: 'pow-2', latex: 'x^3', description: '세제곱' },
      { id: 'pow-3', latex: 'x^n', description: 'n제곱' },
      { id: 'pow-4', latex: 'x^{10}', description: '두 자리 지수' },
      { id: 'pow-5', latex: 'x^{-1}', description: '음수 지수' },
      { id: 'pow-6', latex: '2^{x+1}', description: '수식 지수' },
      { id: 'pow-7', latex: 'e^{i\\pi}', description: '오일러' },
      { id: 'pow-8', latex: 'a^{b^c}', description: '중첩 지수' },
      { id: 'pow-9', latex: '(x+y)^2', description: '괄호 거듭제곱' },
      { id: 'pow-10', latex: 'x^{1/2}', description: '분수 지수' },
      { id: 'pow-11', latex: '10^{-3}', description: '음수 지수 숫자' },
    ],
  },

  // 5. 아래첨자
  {
    name: '아래첨자',
    description: '인덱스, 서브스크립트',
    cases: [
      { id: 'sub-1', latex: 'x_1', description: '단일 첨자' },
      { id: 'sub-2', latex: 'x_n', description: '변수 첨자' },
      { id: 'sub-3', latex: 'x_{10}', description: '두 자리 첨자' },
      { id: 'sub-4', latex: 'a_{i,j}', description: '복합 첨자' },
      { id: 'sub-5', latex: 'x_{n-1}', description: '수식 첨자' },
      { id: 'sub-6', latex: 'x_i + x_j', description: '첨자 연산' },
      { id: 'sub-7', latex: 'a_1 + a_2 + a_3', description: '수열' },
      { id: 'sub-8', latex: 'x_1^2', description: '첨자 + 지수' },
      { id: 'sub-9', latex: 'x^2_1', description: '지수 + 첨자' },
      { id: 'sub-10', latex: 'a_{n}^{m}', description: '양쪽 모두' },
    ],
  },

  // 6. 제곱근
  {
    name: '제곱근',
    description: '\\sqrt 명령어',
    cases: [
      { id: 'sqrt-1', latex: '\\sqrt{2}', description: '루트 2' },
      { id: 'sqrt-2', latex: '\\sqrt{x}', description: '루트 x' },
      { id: 'sqrt-3', latex: '\\sqrt{x+y}', description: '수식 루트' },
      { id: 'sqrt-4', latex: '\\sqrt{x^2+y^2}', description: '피타고라스' },
      { id: 'sqrt-5', latex: '\\sqrt[3]{8}', description: '세제곱근' },
      { id: 'sqrt-6', latex: '\\sqrt[n]{x}', description: 'n제곱근' },
      { id: 'sqrt-7', latex: '\\sqrt{\\sqrt{x}}', description: '중첩 루트' },
      { id: 'sqrt-8', latex: '\\sqrt{\\frac{a}{b}}', description: '분수 루트' },
      { id: 'sqrt-9', latex: '1 + \\sqrt{5}', description: '황금비' },
      { id: 'sqrt-10', latex: '\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}', description: '근의 공식' },
    ],
  },

  // 7. 괄호
  {
    name: '괄호',
    description: '소괄호, 중괄호, 대괄호',
    cases: [
      { id: 'paren-1', latex: '(x)', description: '소괄호' },
      { id: 'paren-2', latex: '[x]', description: '대괄호' },
      { id: 'paren-3', latex: '\\{x\\}', description: '중괄호' },
      { id: 'paren-4', latex: '(a+b)', description: '소괄호 수식' },
      { id: 'paren-5', latex: '[(a+b)]', description: '중첩 괄호' },
      { id: 'paren-6', latex: '\\{(a+b)\\}', description: '중첩 괄호 2' },
      { id: 'paren-7', latex: '(x)(y)', description: '연속 괄호' },
      { id: 'paren-8', latex: '\\left(\\frac{a}{b}\\right)', description: 'left/right 괄호' },
      { id: 'paren-9', latex: '\\left[\\frac{x}{y}\\right]', description: 'left/right 대괄호' },
      { id: 'paren-10', latex: '(a, b, c)', description: '순서쌍' },
    ],
  },

  // 8. 절댓값
  {
    name: '절댓값',
    description: '절댓값 기호',
    cases: [
      { id: 'abs-1', latex: '|x|', description: '단순 절댓값' },
      { id: 'abs-2', latex: '|a+b|', description: '수식 절댓값' },
      { id: 'abs-3', latex: '|x-3|', description: '뺄셈 절댓값' },
      { id: 'abs-4', latex: '|x| + |y|', description: '절댓값 합' },
      { id: 'abs-5', latex: '||x| - |y||', description: '중첩 절댓값' },
      { id: 'abs-6', latex: '|x|^2', description: '절댓값 제곱' },
      { id: 'abs-7', latex: '\\frac{|a|}{|b|}', description: '절댓값 분수' },
    ],
  },

  // 9. 부등호
  {
    name: '부등호',
    description: '비교 연산자',
    cases: [
      { id: 'ineq-1', latex: 'x < y', description: '미만' },
      { id: 'ineq-2', latex: 'x > y', description: '초과' },
      { id: 'ineq-3', latex: 'x \\leq y', description: '이하' },
      { id: 'ineq-4', latex: 'x \\geq y', description: '이상' },
      { id: 'ineq-5', latex: 'x \\neq y', description: '같지 않음' },
      { id: 'ineq-6', latex: 'a < b < c', description: '연속 부등식' },
      { id: 'ineq-7', latex: 'x \\leq 0', description: '0 이하' },
      { id: 'ineq-8', latex: '-1 \\leq x \\leq 1', description: '범위' },
      { id: 'ineq-9', latex: 'a \\approx b', description: '약' },
    ],
  },

  // 10. 등호
  {
    name: '등호',
    description: '등식과 정의',
    cases: [
      { id: 'eq-1', latex: 'x = 1', description: '단순 등식' },
      { id: 'eq-2', latex: 'a = b = c', description: '연속 등식' },
      { id: 'eq-3', latex: 'f(x) = x^2', description: '함수 정의' },
      { id: 'eq-4', latex: 'x + y = z', description: '덧셈 등식' },
      { id: 'eq-5', latex: 'E = mc^2', description: '에너지 질량' },
      { id: 'eq-6', latex: 'a^2 + b^2 = c^2', description: '피타고라스' },
    ],
  },

  // 11. 삼각함수
  {
    name: '삼각함수',
    description: 'sin, cos, tan 등',
    cases: [
      { id: 'trig-1', latex: '\\sin x', description: '사인' },
      { id: 'trig-2', latex: '\\cos x', description: '코사인' },
      { id: 'trig-3', latex: '\\tan x', description: '탄젠트' },
      { id: 'trig-4', latex: '\\sin^2 x', description: '사인 제곱' },
      { id: 'trig-5', latex: '\\cos^2 x + \\sin^2 x = 1', description: '항등식' },
      { id: 'trig-6', latex: '\\sin(x+y)', description: '합 공식' },
      { id: 'trig-7', latex: '\\tan \\theta', description: '세타' },
      { id: 'trig-8', latex: '\\cot x', description: '코탄젠트' },
      { id: 'trig-9', latex: '\\sec x', description: '시컨트' },
      { id: 'trig-10', latex: '\\csc x', description: '코시컨트' },
      { id: 'trig-11', latex: '\\arcsin x', description: '아크사인' },
      { id: 'trig-12', latex: '\\arccos x', description: '아크코사인' },
      { id: 'trig-13', latex: '\\arctan x', description: '아크탄젠트' },
      { id: 'trig-14', latex: '\\sinh x', description: '하이퍼볼릭 사인' },
      { id: 'trig-15', latex: '\\cosh x', description: '하이퍼볼릭 코사인' },
    ],
  },

  // 12. 로그함수
  {
    name: '로그함수',
    description: 'log, ln, exp',
    cases: [
      { id: 'log-1', latex: '\\log x', description: '로그' },
      { id: 'log-2', latex: '\\ln x', description: '자연로그' },
      { id: 'log-3', latex: '\\log_{10} x', description: '상용로그' },
      { id: 'log-4', latex: '\\log_2 8', description: '로그 계산' },
      { id: 'log-5', latex: '\\ln e', description: 'ln e' },
      { id: 'log-6', latex: 'e^x', description: '지수함수' },
      { id: 'log-7', latex: 'e^{-x}', description: '음수 지수' },
      { id: 'log-8', latex: '\\exp(x)', description: 'exp 표기' },
      { id: 'log-9', latex: '\\ln(1+x)', description: '로그 함수' },
      { id: 'log-10', latex: '\\log_a b = \\frac{\\ln b}{\\ln a}', description: '밑 변환' },
    ],
  },

  // 13. 적분
  {
    name: '적분',
    description: '정적분, 부정적분',
    cases: [
      { id: 'int-1', latex: '\\int f(x) dx', description: '부정적분' },
      { id: 'int-2', latex: '\\int_0^1 x dx', description: '정적분' },
      { id: 'int-3', latex: '\\int_a^b f(x) dx', description: '일반 정적분' },
      { id: 'int-4', latex: '\\int x^2 dx', description: '다항식 적분' },
      { id: 'int-5', latex: '\\int \\sin x dx', description: '삼각함수 적분' },
      { id: 'int-6', latex: '\\int_0^{\\infty} e^{-x} dx', description: '무한 적분' },
      { id: 'int-7', latex: '\\int \\frac{1}{x} dx', description: '로그 적분' },
      { id: 'int-8', latex: '\\iint f(x,y) dA', description: '이중적분' },
      { id: 'int-9', latex: '\\iiint f dV', description: '삼중적분' },
      { id: 'int-10', latex: '\\oint \\vec{F} \\cdot d\\vec{r}', description: '선적분' },
    ],
  },

  // 14. 시그마 (합)
  {
    name: '시그마',
    description: '합 기호',
    cases: [
      { id: 'sum-1', latex: '\\sum_{i=1}^{n} i', description: '기본 합' },
      { id: 'sum-2', latex: '\\sum_{k=0}^{\\infty} a_k', description: '무한급수' },
      { id: 'sum-3', latex: '\\sum x_i', description: '단순 합' },
      { id: 'sum-4', latex: '\\sum_{i=1}^{n} i^2', description: '제곱 합' },
      { id: 'sum-5', latex: '\\sum_{i=1}^{n} \\frac{1}{i}', description: '조화급수' },
      { id: 'sum-6', latex: '\\sum_{n=0}^{\\infty} \\frac{x^n}{n!}', description: '테일러급수' },
      { id: 'sum-7', latex: '\\displaystyle\\sum_{i=1}^n i = \\frac{n(n+1)}{2}', description: '합 공식' },
    ],
  },

  // 15. 곱 (product)
  {
    name: '곱 기호',
    description: '곱셈 기호 (product)',
    cases: [
      { id: 'prod-1', latex: '\\prod_{i=1}^{n} i', description: '팩토리얼' },
      { id: 'prod-2', latex: '\\prod_{k=1}^{n} a_k', description: '일반 곱' },
      { id: 'prod-3', latex: 'n! = \\prod_{k=1}^{n} k', description: '팩토리얼 정의' },
      { id: 'prod-4', latex: '\\prod_{p \\text{ prime}} p', description: '소수 곱' },
    ],
  },

  // 16. 극한
  {
    name: '극한',
    description: 'limit',
    cases: [
      { id: 'lim-1', latex: '\\lim_{x \\to 0} f(x)', description: '기본 극한' },
      { id: 'lim-2', latex: '\\lim_{x \\to \\infty} \\frac{1}{x}', description: '무한 극한' },
      { id: 'lim-3', latex: '\\lim_{n \\to \\infty} a_n', description: '수열 극한' },
      { id: 'lim-4', latex: '\\lim_{x \\to 0^+} \\frac{1}{x}', description: '우극한' },
      { id: 'lim-5', latex: '\\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}', description: '미분 정의' },
      { id: 'lim-6', latex: '\\lim_{x \\to a} f(x) = L', description: '극한 정의' },
    ],
  },

  // 17. 윗줄 (overline)
  {
    name: '윗줄',
    description: 'overline, bar',
    cases: [
      { id: 'over-1', latex: '\\overline{x}', description: '평균' },
      { id: 'over-2', latex: '\\overline{AB}', description: '선분' },
      { id: 'over-3', latex: '\\bar{x}', description: 'bar 표기' },
      { id: 'over-4', latex: '\\overline{x + y}', description: '수식 윗줄' },
      { id: 'over-5', latex: '\\hat{x}', description: '캐럿' },
      { id: 'over-6', latex: '\\vec{v}', description: '벡터' },
      { id: 'over-7', latex: '\\dot{x}', description: '점 (미분)' },
      { id: 'over-8', latex: '\\ddot{x}', description: '이중점' },
      { id: 'over-9', latex: '\\tilde{x}', description: '틸데' },
    ],
  },

  // 18. 그리스 문자
  {
    name: '그리스 문자',
    description: '그리스 알파벳',
    cases: [
      { id: 'greek-1', latex: '\\alpha', description: '알파' },
      { id: 'greek-2', latex: '\\beta', description: '베타' },
      { id: 'greek-3', latex: '\\gamma', description: '감마' },
      { id: 'greek-4', latex: '\\delta', description: '델타' },
      { id: 'greek-5', latex: '\\epsilon', description: '엡실론' },
      { id: 'greek-6', latex: '\\theta', description: '세타' },
      { id: 'greek-7', latex: '\\lambda', description: '람다' },
      { id: 'greek-8', latex: '\\mu', description: '뮤' },
      { id: 'greek-9', latex: '\\pi', description: '파이' },
      { id: 'greek-10', latex: '\\sigma', description: '시그마' },
      { id: 'greek-11', latex: '\\phi', description: '파이 (소)' },
      { id: 'greek-12', latex: '\\omega', description: '오메가' },
      { id: 'greek-13', latex: '\\Gamma', description: '감마 (대)' },
      { id: 'greek-14', latex: '\\Delta', description: '델타 (대)' },
      { id: 'greek-15', latex: '\\Omega', description: '오메가 (대)' },
      { id: 'greek-16', latex: '\\infty', description: '무한대' },
      { id: 'greek-17', latex: '\\nabla', description: '나블라' },
      { id: 'greek-18', latex: '\\partial', description: '편미분' },
    ],
  },

  // 19. 행렬
  {
    name: '행렬',
    description: 'matrix 환경',
    cases: [
      { id: 'mat-1', latex: '\\begin{matrix}a & b \\\\ c & d\\end{matrix}', description: '기본 행렬' },
      { id: 'mat-2', latex: '\\begin{pmatrix}a & b \\\\ c & d\\end{pmatrix}', description: '소괄호 행렬' },
      { id: 'mat-3', latex: '\\begin{bmatrix}a & b \\\\ c & d\\end{bmatrix}', description: '대괄호 행렬' },
      { id: 'mat-4', latex: '\\begin{vmatrix}a & b \\\\ c & d\\end{vmatrix}', description: '행렬식' },
      { id: 'mat-5', latex: '\\begin{Vmatrix}a & b \\\\ c & d\\end{Vmatrix}', description: '이중선 행렬' },
      { id: 'mat-6', latex: '\\begin{bmatrix}1 & 0 \\\\ 0 & 1\\end{bmatrix}', description: '단위행렬' },
      { id: 'mat-7', latex: '\\begin{pmatrix}x \\\\ y \\\\ z\\end{pmatrix}', description: '열벡터' },
      { id: 'mat-8', latex: '\\begin{bmatrix}a & b & c\\end{bmatrix}', description: '행벡터' },
    ],
  },

  // 20. cases (조건부)
  {
    name: 'cases (조건부)',
    description: '조건부 함수',
    cases: [
      { id: 'cases-1', latex: '|x| = \\begin{cases}x & x \\geq 0 \\\\ -x & x < 0\\end{cases}', description: '절댓값 정의' },
      { id: 'cases-2', latex: 'f(x) = \\begin{cases}1 & x > 0 \\\\ 0 & x = 0 \\\\ -1 & x < 0\\end{cases}', description: '부호 함수' },
      { id: 'cases-3', latex: 'n! = \\begin{cases}1 & n = 0 \\\\ n \\cdot (n-1)! & n > 0\\end{cases}', description: '팩토리얼 재귀' },
    ],
  },

  // 21. align 환경
  {
    name: 'align 환경',
    description: '정렬된 여러 줄 수식',
    cases: [
      { id: 'align-1', latex: '\\begin{align}x + y &= 5 \\\\ 2x - y &= 1\\end{align}', description: '연립방정식' },
      { id: 'align-2', latex: '\\begin{align}a &= b + c \\\\ &= d + e\\end{align}', description: '연속 정렬' },
      { id: 'align-3', latex: '\\begin{align*}(a+b)^2 &= a^2 + 2ab + b^2\\end{align*}', description: '전개' },
    ],
  },

  // 22. gather 환경
  {
    name: 'gather 환경',
    description: '중앙 정렬 여러 줄',
    cases: [
      { id: 'gather-1', latex: '\\begin{gather}a + b = c \\\\ x^2 + y^2 = r^2\\end{gather}', description: 'gather 기본' },
      { id: 'gather-2', latex: '\\begin{gather}E = mc^2 \\\\ F = ma\\end{gather}', description: '물리 공식' },
    ],
  },

  // 23. array 환경
  {
    name: 'array 환경',
    description: '정렬 지정 배열',
    cases: [
      { id: 'array-1', latex: '\\begin{array}{lcr}a & b & c \\\\ d & e & f\\end{array}', description: '정렬 배열' },
      { id: 'array-2', latex: '\\begin{array}{c|c}a & b \\\\ \\hline c & d\\end{array}', description: '구분선 배열' },
    ],
  },

  // 24. 텍스트
  {
    name: '텍스트',
    description: '\\text 명령어',
    cases: [
      { id: 'text-1', latex: '\\text{hello}', description: '단순 텍스트' },
      { id: 'text-2', latex: 'x \\text{ if } x > 0', description: '조건 텍스트' },
      { id: 'text-3', latex: 'f(x) = x^2 \\text{ (정의역: } \\mathbb{R} \\text{)}', description: '설명 텍스트' },
    ],
  },

  // 25. 복합 수식
  {
    name: '복합 수식',
    description: '여러 요소가 결합된 수식',
    cases: [
      { id: 'complex-1', latex: 'e^{i\\pi} + 1 = 0', description: '오일러 항등식' },
      { id: 'complex-2', latex: '\\frac{d}{dx} \\int_a^x f(t) dt = f(x)', description: '미적분 기본정리' },
      { id: 'complex-3', latex: '\\sum_{n=0}^{\\infty} \\frac{x^n}{n!} = e^x', description: '테일러 전개' },
      { id: 'complex-4', latex: '\\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = e', description: 'e의 정의' },
      { id: 'complex-5', latex: '\\int_0^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}', description: '가우스 적분' },
      { id: 'complex-6', latex: 'F = G\\frac{m_1 m_2}{r^2}', description: '만유인력' },
      { id: 'complex-7', latex: '\\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t}', description: '맥스웰 방정식' },
      { id: 'complex-8', latex: 'i\\hbar \\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi', description: '슈뢰딩거 방정식' },
      { id: 'complex-9', latex: 'ds^2 = -c^2 dt^2 + dx^2 + dy^2 + dz^2', description: '민코프스키 계량' },
      { id: 'complex-10', latex: '\\zeta(s) = \\sum_{n=1}^{\\infty} \\frac{1}{n^s}', description: '리만 제타' },
    ],
  },

  // 26. 집합 기호
  {
    name: '집합 기호',
    description: '집합론 기호',
    cases: [
      { id: 'set-1', latex: 'A \\cup B', description: '합집합' },
      { id: 'set-2', latex: 'A \\cap B', description: '교집합' },
      { id: 'set-3', latex: 'A \\subset B', description: '부분집합' },
      { id: 'set-4', latex: 'x \\in A', description: '원소' },
      { id: 'set-5', latex: 'A \\setminus B', description: '차집합' },
      { id: 'set-6', latex: '\\emptyset', description: '공집합' },
      { id: 'set-7', latex: '\\mathbb{R}', description: '실수 집합' },
      { id: 'set-8', latex: '\\mathbb{Z}', description: '정수 집합' },
      { id: 'set-9', latex: '\\mathbb{N}', description: '자연수 집합' },
      { id: 'set-10', latex: '\\mathbb{C}', description: '복소수 집합' },
    ],
  },

  // 27. 화살표
  {
    name: '화살표',
    description: '방향 기호',
    cases: [
      { id: 'arrow-1', latex: '\\rightarrow', description: '오른쪽 화살표' },
      { id: 'arrow-2', latex: '\\leftarrow', description: '왼쪽 화살표' },
      { id: 'arrow-3', latex: '\\leftrightarrow', description: '양방향' },
      { id: 'arrow-4', latex: '\\Rightarrow', description: '이중 오른쪽' },
      { id: 'arrow-5', latex: '\\Leftrightarrow', description: '이중 양방향' },
      { id: 'arrow-6', latex: 'x \\to y', description: '매핑' },
      { id: 'arrow-7', latex: 'f: X \\to Y', description: '함수 매핑' },
    ],
  },

  // 28. 논리 기호
  {
    name: '논리 기호',
    description: '논리 연산',
    cases: [
      { id: 'logic-1', latex: '\\forall x', description: '모든' },
      { id: 'logic-2', latex: '\\exists x', description: '존재' },
      { id: 'logic-3', latex: 'P \\land Q', description: '논리곱' },
      { id: 'logic-4', latex: 'P \\lor Q', description: '논리합' },
      { id: 'logic-5', latex: '\\neg P', description: '부정' },
      { id: 'logic-6', latex: 'P \\implies Q', description: '함축' },
      { id: 'logic-7', latex: 'P \\iff Q', description: '동치' },
    ],
  },
];

// ============================================================
// 컴포넌트
// ============================================================

/** 지연 렌더링 훅 - Intersection Observer 사용 */
function useLazyRender(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // 한 번 보이면 더 이상 관찰 안 함
        }
      },
      { rootMargin: '100px', ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

/** Fizzex 렌더러 */
function FizzexRenderer({ latex }: { latex: string }) {
  const [state, setState] = useState<EditorState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const ast = parseLatex(latex);
      setState({
        ast,
        cursor: { nodeId: ast.id, offset: ast.children.length },
        selection: null,
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parse error');
      setState(null);
    }
  }, [latex]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500 text-xs p-2">
        Error: {error}
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-xs">
        Loading...
      </div>
    );
  }

  return (
    <EditorView
      width={300}
      height={60}
      theme="light"
      initialState={state}
      readOnly
    />
  );
}

/** KaTeX 렌더러 */
function KaTeXRenderer({ latex }: { latex: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      katex.render(latex, containerRef.current, {
        throwOnError: false,
        displayMode: true,
        strict: false,
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Render error');
    }
  }, [latex]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500 text-xs p-2">
        Error: {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center h-full overflow-hidden"
      style={{ fontSize: '16px' }}
    />
  );
}

/** MathJax 렌더러 */
function MathJaxRenderer({ latex }: { latex: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = `\\[${latex}\\]`;

    // MathJax가 로드될 때까지 대기
    const tryTypeset = () => {
      if (window.MathJax?.typesetPromise) {
        window.MathJax.typesetPromise([container])
          .then(() => {
            setRendered(true);
            setError(null);
          })
          .catch((e: Error) => {
            setError(e.message || 'MathJax error');
          });
      } else {
        // MathJax가 아직 로드되지 않음 - 재시도
        setTimeout(tryTypeset, 100);
      }
    };

    tryTypeset();
  }, [latex]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500 text-xs p-2">
        Error: {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center h-full overflow-hidden"
      style={{ fontSize: '16px', opacity: rendered ? 1 : 0.3 }}
    />
  );
}

/** 단일 테스트 케이스 - 지연 렌더링 적용 */
function TestCaseRow({ testCase }: { testCase: TestCase }) {
  const { ref, isVisible } = useLazyRender();

  return (
    <tr ref={ref} className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-2 px-3 text-xs text-gray-600 w-32">
        {testCase.description}
      </td>
      <td className="py-2 px-3">
        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono break-all">
          {testCase.latex}
        </code>
      </td>
      <td className="py-2 px-3 border-l border-gray-200 bg-blue-50/30">
        <div className="flex items-center justify-center min-h-[60px]">
          {isVisible ? (
            <FizzexRenderer latex={testCase.latex} />
          ) : (
            <div className="text-gray-300 text-xs">⏳</div>
          )}
        </div>
      </td>
      <td className="py-2 px-3 border-l border-gray-200 bg-green-50/30">
        <div className="flex items-center justify-center min-h-[60px]">
          {isVisible ? (
            <KaTeXRenderer latex={testCase.latex} />
          ) : (
            <div className="text-gray-300 text-xs">⏳</div>
          )}
        </div>
      </td>
      <td className="py-2 px-3 border-l border-gray-200 bg-purple-50/30">
        <div className="flex items-center justify-center min-h-[60px]">
          {isVisible ? (
            <MathJaxRenderer latex={testCase.latex} />
          ) : (
            <div className="text-gray-300 text-xs">⏳</div>
          )}
        </div>
      </td>
    </tr>
  );
}

/** 카테고리 섹션 - 기본 접힌 상태로 시작 */
function CategorySection({ category, defaultOpen = false }: { category: TestCategory; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{category.name}</h2>
          <p className="text-sm text-gray-500">{category.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{category.cases.length}개</span>
          <span className="text-gray-400">{isOpen ? '▼' : '▶'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-600">
                <th className="py-2 px-3 text-left font-medium">설명</th>
                <th className="py-2 px-3 text-left font-medium">LaTeX</th>
                <th className="py-2 px-3 text-center font-medium border-l border-gray-200 bg-blue-100/50">
                  Fizzex
                </th>
                <th className="py-2 px-3 text-center font-medium border-l border-gray-200 bg-green-100/50">
                  KaTeX
                </th>
                <th className="py-2 px-3 text-center font-medium border-l border-gray-200 bg-purple-100/50">
                  MathJax
                </th>
              </tr>
            </thead>
            <tbody>
              {category.cases.map((tc) => (
                <TestCaseRow key={tc.id} testCase={tc} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** 메인 검증 페이지 */
export default function RenderingValidation() {
  const totalCases = useMemo(
    () => testCategories.reduce((sum, cat) => sum + cat.cases.length, 0),
    []
  );

  const [filterText, setFilterText] = useState('');
  const [expandKey, setExpandKey] = useState(0); // 리렌더링용 키

  const filteredCategories = useMemo(() => {
    if (!filterText.trim()) return testCategories;

    const lower = filterText.toLowerCase();
    return testCategories
      .map((cat) => ({
        ...cat,
        cases: cat.cases.filter(
          (tc) =>
            tc.id.toLowerCase().includes(lower) ||
            tc.latex.toLowerCase().includes(lower) ||
            tc.description.toLowerCase().includes(lower)
        ),
      }))
      .filter((cat) => cat.cases.length > 0);
  }, [filterText]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Fizzex 렌더링 검증
          </h1>
          <p className="text-gray-600">
            Fizzex 렌더링 결과와 KaTeX(업계 표준) 결과를 비교하여 정합성을 검증합니다.
          </p>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
              총 {totalCases}개 테스트 케이스
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
              {testCategories.length}개 카테고리
            </span>
          </div>
        </div>

        {/* 필터/컨트롤 */}
        <div className="mb-6 flex items-center gap-4">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="검색 (ID, LaTeX, 설명)..."
            className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setExpandKey(k => k + 1)}
            className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
          >
            모두 접기
          </button>
        </div>

        {/* 범례 */}
        <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">비교 방법</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• <span className="text-blue-600 font-medium">Fizzex</span>: 우리가 개발한 수식 렌더러 (Canvas 기반)</li>
            <li>• <span className="text-green-600 font-medium">KaTeX</span>: Khan Academy에서 개발한 LaTeX 렌더러 (HTML/CSS 기반)</li>
            <li>• <span className="text-purple-600 font-medium">MathJax</span>: 가장 널리 사용되는 LaTeX 렌더러 (SVG 기반)</li>
            <li>• 세 렌더링 결과가 시각적으로 유사해야 정합성이 유지됩니다.</li>
          </ul>
        </div>

        {/* 카테고리별 테스트 */}
        {filteredCategories.map((cat) => (
          <CategorySection key={`${cat.name}-${expandKey}`} category={cat} />
        ))}

        {filteredCategories.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
