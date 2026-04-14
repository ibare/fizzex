/**
 * LaTeX 수학 문법 생성 규칙 정의
 * 각 규칙은 "이 자리에 올 수 있는 것들"의 목록이다.
 */

export const GRAMMAR: Record<string, string[]> = {
  // 최상위: 수식은 expr의 나열
  formula: ['expr', 'expr op expr', 'expr rel expr', 'equation'],

  // 표현식
  expr: [
    'atom',
    'atom supscript',
    'atom subscript',
    'atom supscript subscript',
    'unary expr',
    'struct',
    'delimited',
    'func expr',
    'bigop expr',
    'font_wrap',
  ],

  // 원자
  atom: ['variable', 'number', 'greek', 'symbol'],

  // 변수
  variable: [
    'a', 'b', 'c', 'f', 'g', 'h', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'F', 'G', 'H', 'K', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  ],

  // 숫자
  number: ['0', '1', '2', '3', '4', '5', '10', '42', '100', '3.14'],

  // 그리스 문자
  greek: [
    '\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\zeta', '\\eta', '\\theta',
    '\\lambda', '\\mu', '\\nu', '\\xi', '\\pi', '\\rho', '\\sigma', '\\tau', '\\phi', '\\psi', '\\omega',
    '\\Gamma', '\\Delta', '\\Theta', '\\Lambda', '\\Xi', '\\Pi', '\\Sigma', '\\Phi', '\\Psi', '\\Omega',
  ],

  // 기호
  symbol: ['\\infty', '\\emptyset', '\\forall', '\\exists', '\\partial', '\\nabla', '\\ell', '\\hbar'],

  // 구조 커맨드
  struct: [
    '\\frac{expr}{expr}',
    '\\sqrt{expr}',
    '\\sqrt[number]{expr}',
    '\\binom{expr}{expr}',
    '\\overset{atom}{expr}',
    '\\underset{atom}{expr}',
    '\\overline{expr}',
    '\\underline{expr}',
    '\\hat{atom}',
    '\\bar{atom}',
    '\\vec{atom}',
    '\\dot{atom}',
    '\\ddot{atom}',
    '\\tilde{atom}',
    '\\widehat{expr}',
    '\\widetilde{expr}',
    '\\overbrace{expr}',
    '\\underbrace{expr}',
  ],

  // 구분자
  delimited: [
    '\\left( expr \\right)',
    '\\left[ expr \\right]',
    '\\left\\{ expr \\right\\}',
    '\\left| expr \\right|',
    '\\left\\langle expr \\right\\rangle',
    '\\left( expr \\right.',
    '\\left. expr \\right)',
  ],

  // 위첨자/아래첨자
  supscript: ['^{expr}', '^atom', '^\\prime', '^{\\dagger}'],
  subscript: ['_{expr}', '_atom', '_{atom,atom}'],

  // 함수명
  func: [
    '\\sin', '\\cos', '\\tan', '\\log', '\\ln', '\\exp', '\\lim', '\\max', '\\min',
    '\\sup', '\\inf', '\\det', '\\gcd', '\\dim', '\\ker', '\\arg',
  ],

  // 이항 연산자
  op: [
    '+', '-', '\\pm', '\\mp', '\\times', '\\div', '\\cdot', '\\circ',
    '\\cup', '\\cap', '\\oplus', '\\otimes', '\\wedge', '\\vee',
  ],

  // 관계 연산자
  rel: [
    '=', '<', '>', '\\leq', '\\geq', '\\neq', '\\equiv', '\\approx', '\\sim',
    '\\subset', '\\supset', '\\subseteq', '\\supseteq', '\\in', '\\ni',
    '\\rightarrow', '\\Rightarrow', '\\leftrightarrow', '\\mapsto',
  ],

  // 단항 연산자
  unary: ['-', '\\neg', '\\nabla', '\\partial'],

  // 큰 연산자
  bigop: [
    '\\sum_{subscript}^{supscript}',
    '\\prod_{subscript}^{supscript}',
    '\\int_{subscript}^{supscript}',
    '\\iint_{subscript}',
    '\\oint_{subscript}',
    '\\bigcup_{subscript}^{supscript}',
    '\\bigcap_{subscript}^{supscript}',
    '\\lim_{subscript}',
  ],

  // 환경
  environment: [
    '\\begin{pmatrix} matrix_content \\end{pmatrix}',
    '\\begin{bmatrix} matrix_content \\end{bmatrix}',
    '\\begin{vmatrix} matrix_content \\end{vmatrix}',
    '\\begin{cases} cases_content \\end{cases}',
  ],

  // 행렬 내용
  matrix_content: [
    'expr & expr \\\\\\\\ expr & expr',
    'expr & expr & expr \\\\\\\\ expr & expr & expr',
  ],

  // cases 내용
  cases_content: [
    'expr & \\text{if } expr \\\\\\\\ expr & \\text{otherwise}',
    'expr & expr \\\\\\\\ expr & expr \\\\\\\\ expr & expr',
  ],

  // 등식
  equation: [
    'expr = expr',
    'expr rel expr',
    'expr = expr = expr',
  ],

  // 간격
  spacing: ['\\,', '\\;', '\\:', '\\!', '\\quad', '\\qquad'],

  // 폰트 커맨드
  font_wrap: [
    '\\mathrm{atom}',
    '\\mathbf{atom}',
    '\\mathbb{variable}',
    '\\mathcal{variable}',
    '\\text{short_text}',
  ],

  short_text: ['if', 'for', 'and', 'or', 'where', 'such that'],
};

/** 터미널 심볼 (더 이상 확장하지 않는 것들) */
export const TERMINALS = new Set([
  'variable', 'number', 'greek', 'symbol', 'op', 'rel', 'unary',
  'func', 'spacing', 'short_text',
]);

/** 재귀를 야기하는 심볼 (깊이 제한 필요) */
export const RECURSIVE_RULES = new Set([
  'expr', 'struct', 'delimited', 'bigop', 'environment',
  'supscript', 'subscript', 'formula', 'equation', 'font_wrap',
]);
