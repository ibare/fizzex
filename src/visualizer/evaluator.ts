/**
 * Expression Evaluator
 *
 * LaTeX 또는 간단한 수식 문자열을 평가하여 y 값 계산
 */

import type { EvaluationPoint, GraphRange } from './types';

/**
 * LaTeX를 평가 가능한 JavaScript 표현식으로 변환
 */
export function latexToEvaluable(latex: string): string {
  let expr = latex;

  // 공백 제거
  expr = expr.replace(/\s+/g, '');

  // \frac{a}{b} → (a)/(b)
  while (/\\frac\{/.test(expr)) {
    expr = expr.replace(
      /\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
      '(($1)/($2))'
    );
  }

  // \sqrt{x} → Math.sqrt(x)
  expr = expr.replace(/\\sqrt\{([^{}]*)\}/g, 'Math.sqrt($1)');

  // \sqrt[n]{x} → Math.pow(x, 1/n)
  expr = expr.replace(/\\sqrt\[([^\]]+)\]\{([^{}]*)\}/g, 'Math.pow($2, 1/($1))');

  // x^{n} → Math.pow(x, n)
  expr = expr.replace(/\^{([^{}]*)}/g, '**($1)');
  expr = expr.replace(/\^(\d+)/g, '**$1');
  expr = expr.replace(/\^([a-zA-Z])/g, '**$1');

  // 삼각함수
  expr = expr.replace(/\\sin/g, 'Math.sin');
  expr = expr.replace(/\\cos/g, 'Math.cos');
  expr = expr.replace(/\\tan/g, 'Math.tan');
  expr = expr.replace(/\\cot/g, '(1/Math.tan');
  expr = expr.replace(/\\sec/g, '(1/Math.cos');
  expr = expr.replace(/\\csc/g, '(1/Math.sin');

  // 역삼각함수
  expr = expr.replace(/\\arcsin/g, 'Math.asin');
  expr = expr.replace(/\\arccos/g, 'Math.acos');
  expr = expr.replace(/\\arctan/g, 'Math.atan');

  // 로그/지수
  expr = expr.replace(/\\ln/g, 'Math.log');
  expr = expr.replace(/\\log/g, 'Math.log10');
  expr = expr.replace(/\\exp/g, 'Math.exp');

  // 절댓값
  expr = expr.replace(/\\left\|/g, 'Math.abs(');
  expr = expr.replace(/\\right\|/g, ')');
  expr = expr.replace(/\|([^|]+)\|/g, 'Math.abs($1)');

  // 상수
  expr = expr.replace(/\\pi/g, 'Math.PI');
  expr = expr.replace(/\\e(?![a-zA-Z])/g, 'Math.E');

  // 괄호
  expr = expr.replace(/\\left\(/g, '(');
  expr = expr.replace(/\\right\)/g, ')');
  expr = expr.replace(/\\left\[/g, '(');
  expr = expr.replace(/\\right\]/g, ')');

  // 연산자
  expr = expr.replace(/\\cdot/g, '*');
  expr = expr.replace(/\\times/g, '*');
  expr = expr.replace(/\\div/g, '/');

  // 암묵적 곱셈 처리
  // 숫자 뒤 변수: 2x → 2*x
  expr = expr.replace(/(\d)([a-zA-Z])/g, '$1*$2');
  // 닫는 괄호 뒤 여는 괄호: )(  → )*(
  expr = expr.replace(/\)\(/g, ')*(');
  // 닫는 괄호 뒤 변수: )x → )*x
  expr = expr.replace(/\)([a-zA-Z])/g, ')*$1');
  // 변수 뒤 여는 괄호: x( → x*(
  expr = expr.replace(/([a-zA-Z])\(/g, '$1*(');

  // 남은 LaTeX 명령어 제거
  expr = expr.replace(/\\[a-zA-Z]+/g, '');

  // 중괄호 제거
  expr = expr.replace(/[{}]/g, '');

  return expr;
}

/**
 * 표현식을 주어진 x 값으로 평가
 */
export function evaluateAt(expression: string, x: number): number | null {
  try {
    // 안전한 평가를 위해 Function 생성자 사용
    const evalFunc = new Function('x', `return ${expression}`);
    const result = evalFunc(x);

    // NaN, Infinity 체크
    if (!Number.isFinite(result)) {
      return null;
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * 범위 내의 점들을 계산
 */
export function calculatePoints(
  latex: string,
  range: GraphRange,
  numPoints: number = 200
): EvaluationPoint[] {
  const evaluable = latexToEvaluable(latex);
  const points: EvaluationPoint[] = [];

  const step = (range.xMax - range.xMin) / numPoints;

  for (let i = 0; i <= numPoints; i++) {
    const x = range.xMin + i * step;
    const y = evaluateAt(evaluable, x);

    points.push({
      x,
      y: y ?? 0,
      valid: y !== null && y >= range.yMin && y <= range.yMax,
    });
  }

  return points;
}

/**
 * 표현식이 그래프로 표현 가능한지 확인
 */
export function canGraph(latex: string): boolean {
  try {
    const evaluable = latexToEvaluable(latex);
    // 간단한 테스트: x=0, x=1에서 평가
    const y0 = evaluateAt(evaluable, 0);
    const y1 = evaluateAt(evaluable, 1);
    // 적어도 하나는 유효해야 함
    return y0 !== null || y1 !== null;
  } catch {
    return false;
  }
}
