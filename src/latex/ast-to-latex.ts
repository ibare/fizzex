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
      return node.children.map(astToLatex).join('');

    case 'row': {
      const inner = node.children.map(astToLatex).join('');
      if (node.styleHint) {
        const styleCmd = { display: '\\displaystyle', text: '\\textstyle', script: '\\scriptstyle', scriptscript: '\\scriptscriptstyle' }[node.styleHint];
        return `${styleCmd} ${inner}`;
      }
      return inner;
    }

    case 'number':
      return node.value;

    case 'variable':
      return convertVariable(node.name);

    case 'operator':
      if (node.delimiterSize) {
        return `\\${node.delimiterSize}${node.operator}`;
      }
      return convertOperator(node.operator);

    case 'frac': {
      const num = node.numerator.map(astToLatex).join('');
      const den = node.denominator.map(astToLatex).join('');
      let cmd: string;
      if (node.variant === 'binom') {
        cmd = node.styleOverride === 'display' ? 'dbinom'
          : node.styleOverride === 'text' ? 'tbinom'
          : 'binom';
      } else {
        cmd = node.styleOverride === 'display' ? 'dfrac'
          : node.styleOverride === 'text' ? 'tfrac'
          : 'frac';
      }
      return `\\${cmd}{${num}}{${den}}`;
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
      const openClose: Record<string, [string, string]> = {
        '(': ['(', ')'],
        '[': ['[', ']'],
        '{': ['\\{', '\\}'],
      };
      const [open, close] = openClose[node.parenType] || ['(', ')'];

      if (node.delimiterSize) {
        return `\\${node.delimiterSize}${open} ${content} \\${node.delimiterSize}${close}`;
      }
      if (node.autoSize) {
        const leftOpen = node.parenType === '{' ? '\\{' : node.parenType;
        const rightClose = node.parenType === '(' ? ')' : node.parenType === '[' ? ']' : '\\}';
        return `\\left${leftOpen} ${content} \\right${rightClose}`;
      }
      return `${open}${content}${close}`;
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
      const symbolToCmd: Record<string, string> = {
        '∐': 'coprod', '∩': 'bigcap', '∪': 'bigcup',
        '∨': 'bigvee', '∧': 'bigwedge', '⊕': 'bigoplus',
        '⊗': 'bigotimes', '⊙': 'bigodot', '⊎': 'biguplus', '⊔': 'bigsqcup',
      };
      const cmd = (node.symbol && symbolToCmd[node.symbol]) || 'sum';
      return `\\${cmd}_{${lower}}^{${upper}} ${body}`;
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

    case 'overset': {
      const base = node.base.map(astToLatex).join('');
      const anno = node.annotation.map(astToLatex).join('');
      const cmd = node.position === 'below' ? 'underset' : 'overset';
      return `\\${cmd}{${anno}}{${base}}`;
    }

    case 'cancel': {
      const content = node.content.map(astToLatex).join('');
      return `\\${node.cancelType}{${content}}`;
    }

    case 'overline': {
      const content = node.content.map(astToLatex).join('');
      const variantMap: Record<string, string> = {
        underline: 'underline', boxed: 'boxed',
        overbrace: 'overbrace', underbrace: 'underbrace',
      };
      const cmd = (node.variant && variantMap[node.variant]) || 'overline';
      return `\\${cmd}{${content}}`;
    }

    case 'accent': {
      const content = node.content.map(astToLatex).join('');
      // 확장형 악센트의 LaTeX 명령어 매핑
      const accentCmdMap: Record<string, string> = {
        widehat: 'widehat', widetilde: 'widetilde',
        overleftarrow: 'overleftarrow', overrightarrow: 'overrightarrow',
        overleftrightarrow: 'overleftrightarrow',
      };
      const cmd = accentCmdMap[node.accentType] || node.accentType;
      return `\\${cmd}{${content}}`;
    }

    case 'xarrow': {
      const above = node.above.map(astToLatex).join('');
      const dirMap: Record<string, string> = { left: 'xleftarrow', right: 'xrightarrow', both: 'xleftrightarrow' };
      const cmd = dirMap[node.direction] || 'xrightarrow';
      if (node.below && node.below.length > 0) {
        const below = node.below.map(astToLatex).join('');
        return `\\${cmd}[${below}]{${above}}`;
      }
      return `\\${cmd}{${above}}`;
    }

    case 'matrix': {
      const bracketEnv = node.small ? 'smallmatrix' : getBmatrixEnv(node.bracketType);
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
function getBmatrixEnv(bracketType: '(' | '[' | '{' | '|' | '‖' | 'none'): string {
  switch (bracketType) {
    case '(':
      return 'pmatrix';
    case '[':
      return 'bmatrix';
    case '{':
      return 'Bmatrix';
    case '|':
      return 'vmatrix';
    case '‖':
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
