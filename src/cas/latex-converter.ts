/**
 * LaTeX ↔ Nerdamer 문자열 변환
 *
 * Nerdamer는 자체 문법을 사용하므로 LaTeX와 상호 변환 필요
 */

/**
 * LaTeX 문자열을 Nerdamer 문법으로 변환
 *
 * @example
 * latexToNerdamer('\\frac{1}{2}') → '(1)/(2)'
 * latexToNerdamer('x^{2}') → 'x^(2)'
 * latexToNerdamer('\\sqrt{x}') → 'sqrt(x)'
 */
export function latexToNerdamer(latex: string): string {
  let result = latex;

  // 공백 제거
  result = result.replace(/\s+/g, '');

  // \frac{a}{b} → (a)/(b)
  result = result.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)');
  // 중첩된 frac 처리 (재귀적)
  while (/\\frac\{/.test(result)) {
    result = result.replace(/\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '($1)/($2)');
  }

  // \sqrt{x} → sqrt(x)
  result = result.replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)');

  // \sqrt[n]{x} → x^(1/n)
  result = result.replace(/\\sqrt\[([^\]]+)\]\{([^{}]*)\}/g, '($2)^(1/($1))');

  // x^{n} → x^(n)
  result = result.replace(/\^{([^{}]*)}/g, '^($1)');

  // x_{n} → 아래첨자는 일반적으로 제거 또는 변수명에 포함
  result = result.replace(/_{([^{}]*)}/g, '_$1');

  // 삼각함수: \sin, \cos, \tan 등
  result = result.replace(/\\sin/g, 'sin');
  result = result.replace(/\\cos/g, 'cos');
  result = result.replace(/\\tan/g, 'tan');
  result = result.replace(/\\cot/g, 'cot');
  result = result.replace(/\\sec/g, 'sec');
  result = result.replace(/\\csc/g, 'csc');

  // 역삼각함수
  result = result.replace(/\\arcsin/g, 'asin');
  result = result.replace(/\\arccos/g, 'acos');
  result = result.replace(/\\arctan/g, 'atan');

  // 쌍곡선함수
  result = result.replace(/\\sinh/g, 'sinh');
  result = result.replace(/\\cosh/g, 'cosh');
  result = result.replace(/\\tanh/g, 'tanh');

  // 로그/지수
  result = result.replace(/\\ln/g, 'log');
  result = result.replace(/\\log/g, 'log10');
  result = result.replace(/\\exp/g, 'exp');

  // 상수
  result = result.replace(/\\pi/g, 'pi');
  result = result.replace(/\\infty/g, 'Infinity');

  // 괄호
  result = result.replace(/\\left\(/g, '(');
  result = result.replace(/\\right\)/g, ')');
  result = result.replace(/\\left\[/g, '[');
  result = result.replace(/\\right\]/g, ']');
  result = result.replace(/\\left\|/g, 'abs(');
  result = result.replace(/\\right\|/g, ')');

  // 절댓값
  result = result.replace(/\|([^|]+)\|/g, 'abs($1)');

  // 연산자
  result = result.replace(/\\cdot/g, '*');
  result = result.replace(/\\times/g, '*');
  result = result.replace(/\\div/g, '/');
  result = result.replace(/\\pm/g, '±');

  // 남은 LaTeX 명령어 제거
  result = result.replace(/\\[a-zA-Z]+/g, '');

  // 중괄호 제거
  result = result.replace(/[{}]/g, '');

  // 암묵적 곱셈 처리: 2x → 2*x, xy → x*y (선택적)
  // Nerdamer는 암묵적 곱셈을 지원하지만, 명확성을 위해 일부 변환
  result = addImplicitMultiplication(result);

  return result;
}

/**
 * 암묵적 곱셈 추가
 * 숫자와 변수 사이, 변수와 변수 사이에 * 추가
 */
function addImplicitMultiplication(expr: string): string {
  let result = '';
  let prev = '';

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];

    // 숫자 뒤에 문자(변수/함수 시작)가 오면 * 추가
    if (/\d/.test(prev) && /[a-zA-Z(]/.test(char)) {
      // 단, 소수점 뒤는 제외
      if (prev !== '.') {
        result += '*';
      }
    }

    // 닫는 괄호 뒤에 여는 괄호나 문자가 오면 * 추가
    if (prev === ')' && /[a-zA-Z0-9(]/.test(char)) {
      result += '*';
    }

    // 문자 뒤에 여는 괄호가 오면 함수 호출일 수 있으므로 그대로 둠
    // 문자 뒤에 문자가 오면 변수명의 일부일 수 있으므로 그대로 둠
    // (Nerdamer가 처리)

    result += char;
    prev = char;
  }

  return result;
}

/**
 * Nerdamer 결과 LaTeX를 정리
 *
 * Nerdamer의 toTeX() 결과를 Fizzex 파서가 이해할 수 있도록 정리
 */
export function cleanNerdamerLatex(latex: string): string {
  let result = latex;

  // Nerdamer 특유의 표현 정리
  // \cdot → 공백 또는 제거
  result = result.replace(/\\cdot\s*/g, ' ');

  // 불필요한 괄호 일부 정리 (선택적)
  // result = result.replace(/\(([a-zA-Z0-9])\)/g, '$1');

  // 정리된 공백
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * 방정식에서 등호 기준으로 좌변, 우변 분리
 *
 * @returns [좌변, 우변] 또는 등호가 없으면 [전체식, '0']
 */
export function splitEquation(latex: string): [string, string] {
  // 먼저 Nerdamer 형식으로 변환
  const nerdamerExpr = latexToNerdamer(latex);

  // = 기준 분리
  const eqIndex = nerdamerExpr.indexOf('=');
  if (eqIndex === -1) {
    return [nerdamerExpr, '0'];
  }

  const left = nerdamerExpr.substring(0, eqIndex).trim();
  const right = nerdamerExpr.substring(eqIndex + 1).trim();

  // 우변을 좌변으로 이항: left - right = 0
  if (right === '0') {
    return [left, '0'];
  }

  return [`(${left})-(${right})`, '0'];
}
