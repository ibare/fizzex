/**
 * AST → LaTeX 변환기
 *
 * MathNode AST를 LaTeX 문자열로 직렬화
 */

import type { MathNode } from '../types';

/** AST를 LaTeX 문자열로 변환 */
export function astToLatex(node: MathNode): string {
  switch (node.type) {
    case 'root':
    case 'row':
      return node.children.map(astToLatex).join('');

    case 'number':
      return node.value;

    case 'variable':
      return convertVariable(node.name);

    case 'operator':
      return convertOperator(node.operator);

    case 'frac': {
      const num = node.numerator.map(astToLatex).join('');
      const den = node.denominator.map(astToLatex).join('');
      return `\\frac{${num}}{${den}}`;
    }

    case 'power': {
      const base = node.base.map(astToLatex).join('');
      const exp = node.exponent.map(astToLatex).join('');
      // 지수가 단일 문자면 중괄호 생략 가능
      if (exp.length === 1) {
        return `${wrapIfNeeded(base)}^${exp}`;
      }
      return `${wrapIfNeeded(base)}^{${exp}}`;
    }

    case 'subscript': {
      const base = node.base.map(astToLatex).join('');
      const sub = node.subscript.map(astToLatex).join('');
      // 아래첨자가 단일 문자면 중괄호 생략 가능
      if (sub.length === 1) {
        return `${wrapIfNeeded(base)}_${sub}`;
      }
      return `${wrapIfNeeded(base)}_{${sub}}`;
    }

    case 'abs': {
      const content = node.content.map(astToLatex).join('');
      return `|${content}|`;
    }

    case 'sqrt': {
      const content = node.content.map(astToLatex).join('');
      if (node.index && node.index.length > 0) {
        const index = node.index.map(astToLatex).join('');
        return `\\sqrt[${index}]{${content}}`;
      }
      return `\\sqrt{${content}}`;
    }

    case 'paren': {
      const content = node.content.map(astToLatex).join('');
      switch (node.parenType) {
        case '(':
          return `(${content})`;
        case '[':
          return `[${content}]`;
        case '{':
          return `\\{${content}\\}`;
        default:
          return `(${content})`;
      }
    }

    case 'func': {
      const arg = node.argument.map(astToLatex).join('');
      return `\\${node.name}(${arg})`;
    }

    case 'integral': {
      const lower = node.lower ? node.lower.map(astToLatex).join('') : '';
      const upper = node.upper ? node.upper.map(astToLatex).join('') : '';
      const integrand = node.integrand.map(astToLatex).join('');
      const diff = node.differential;

      let result = '\\int';
      if (lower || upper) {
        result += `_{${lower}}^{${upper}}`;
      }
      result += ` ${integrand} \\, d${diff}`;
      return result;
    }

    case 'sum': {
      const lower = node.lower.map(astToLatex).join('');
      const upper = node.upper.map(astToLatex).join('');
      const body = node.body.map(astToLatex).join('');
      return `\\sum_{${lower}}^{${upper}} ${body}`;
    }

    case 'limit': {
      const approach = node.approach.map(astToLatex).join('');
      const body = node.body.map(astToLatex).join('');
      return `\\lim_{${node.variable} \\to ${approach}} ${body}`;
    }

    case 'product': {
      const lower = node.lower.map(astToLatex).join('');
      const upper = node.upper.map(astToLatex).join('');
      const body = node.body.map(astToLatex).join('');
      return `\\prod_{${lower}}^{${upper}} ${body}`;
    }

    case 'overline': {
      const content = node.content.map(astToLatex).join('');
      return `\\overline{${content}}`;
    }

    case 'accent': {
      const content = node.content.map(astToLatex).join('');
      return `\\${node.accentType}{${content}}`;
    }

    case 'matrix': {
      const bracketEnv = getBmatrixEnv(node.bracketType);
      const rowsLatex = node.rows.map(row =>
        row.map(cell => astToLatex(cell)).join(' & ')
      ).join(' \\\\ ');
      return `\\begin{${bracketEnv}}${rowsLatex}\\end{${bracketEnv}}`;
    }

    case 'text': {
      return `\\text{${node.content}}`;
    }

    case 'space': {
      // 공백 크기에 따라 LaTeX 명령어 선택
      if (node.width >= 1.0) {
        return '\\quad ';
      } else if (node.width >= 0.5) {
        return '\\; ';
      } else if (node.width >= 0.25) {
        return '\\, ';
      }
      return ' ';
    }

    case 'align': {
      const envName = node.isInline ? 'aligned' : (node.starred ? 'align*' : 'align');
      const rowsLatex = node.rows.map(row =>
        row.map(cell => astToLatex(cell)).join(' & ')
      ).join(' \\\\ ');
      return `\\begin{${envName}}${rowsLatex}\\end{${envName}}`;
    }

    case 'cases': {
      const rowsLatex = node.rows.map(row =>
        row.map(cell => astToLatex(cell)).join(' & ')
      ).join(' \\\\ ');
      return `\\begin{cases}${rowsLatex}\\end{cases}`;
    }

    case 'gather': {
      const envName = node.isInline ? 'gathered' : (node.starred ? 'gather*' : 'gather');
      const rowsLatex = node.rows.map(row => astToLatex(row)).join(' \\\\ ');
      return `\\begin{${envName}}${rowsLatex}\\end{${envName}}`;
    }

    case 'array': {
      const colSpec = node.colAlign.join('');
      const rowsLatex = node.rows.map(row =>
        row.map(cell => astToLatex(cell)).join(' & ')
      ).join(' \\\\ ');
      return `\\begin{array}{${colSpec}}${rowsLatex}\\end{array}`;
    }

    default:
      return '';
  }
}

/** 행렬 괄호 타입에 맞는 LaTeX 환경 반환 */
function getBmatrixEnv(bracketType: '(' | '[' | '{' | '|' | '||' | 'none'): string {
  switch (bracketType) {
    case '(':
      return 'pmatrix';
    case '[':
      return 'bmatrix';
    case '{':
      return 'Bmatrix';
    case '|':
      return 'vmatrix';
    case '||':
      return 'Vmatrix';
    case 'none':
    default:
      return 'matrix';
  }
}

/** 변수를 LaTeX로 변환 */
function convertVariable(name: string): string {
  const greekMap: Record<string, string> = {
    'α': '\\alpha',
    'β': '\\beta',
    'γ': '\\gamma',
    'δ': '\\delta',
    'θ': '\\theta',
    'π': '\\pi',
    'σ': '\\sigma',
    'ω': '\\omega',
  };

  return greekMap[name] || name;
}

/** 연산자를 LaTeX로 변환 */
function convertOperator(op: string): string {
  switch (op) {
    case '×':
      return ' \\times ';
    case '÷':
      return ' \\div ';
    case '·':
      return ' \\cdot ';
    case '+':
      return ' + ';
    case '-':
      return ' - ';
    case '=':
      return ' = ';
    case '<':
      return ' < ';
    case '>':
      return ' > ';
    case '≤':
      return ' \\leq ';
    case '≥':
      return ' \\geq ';
    case '≠':
      return ' \\neq ';
    default:
      return ` ${op} `;
  }
}

/** 필요시 중괄호로 감싸기 */
function wrapIfNeeded(str: string): string {
  // 단일 문자나 이미 그룹화된 경우 그대로
  if (str.length === 1) return str;
  if (str.startsWith('(') && str.endsWith(')')) return str;
  if (str.startsWith('[') && str.endsWith(']')) return str;
  if (str.startsWith('\\{') && str.endsWith('\\}')) return str;
  // 복합 표현식은 중괄호로 감싸기
  return `{${str}}`;
}
