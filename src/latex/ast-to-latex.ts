/**
 * AST → LaTeX 변환기
 *
 * MathNode AST를 LaTeX 문자열로 직렬화
 */

import type { MathNode, XArrowNode } from '../types.js';
import { chemNotation } from './chem/serializer.js';

/**
 * LaTeX 조각들을 잇는다.
 *
 * 앞 조각이 `\\max` 처럼 명령으로 끝나고 뒤 조각이 글자로 시작하면 공백을 넣는다.
 * 그냥 붙이면 `\\max f` 가 `\\maxf` 가 되어 존재하지 않는 다른 명령으로 읽힌다.
 */
function joinLatex(parts: string[]): string {
  let out = '';
  for (const part of parts) {
    if (/\\[a-zA-Z]+$/.test(out) && /^[a-zA-Z]/.test(part)) out += ' ';
    out += part;
  }
  return out;
}

/** AST를 LaTeX 문자열로 변환 */
export function astToLatex(node: MathNode): string {
  switch (node.type) {
    case 'root':
      return joinLatex(node.children.map(astToLatex));

    case 'row': {
      const inner = joinLatex(node.children.map(astToLatex));
      if (node.styleHint) {
        const styleCmd = { display: '\\displaystyle', text: '\\textstyle', script: '\\scriptstyle', scriptscript: '\\scriptscriptstyle' }[node.styleHint];
        return `${styleCmd} ${inner}`;
      }
      return inner;
    }

    case 'number':
      // 짝을 못 찾은 중괄호는 글리프로 남는다. 맨 `{` 로 내보내면 LaTeX 에서
      // 그룹 시작이 되어 의미가 달라지므로 이스케이프해 돌려준다.
      if (node.value === '{' || node.value === '}') return `\\${node.value}`;
      return node.value;

    case 'variable':
      return convertVariable(node.name);

    case 'operator':
      if (node.delimiterSize) {
        return `\\${node.delimiterSize}${node.operator}`;
      }
      return convertOperator(node.operator);

    case 'frac': {
      const num = joinLatex(node.numerator.map(astToLatex));
      const den = joinLatex(node.denominator.map(astToLatex));
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

    case 'scripts': {
      // 슬롯 하나를 LaTeX 인자로. 한 글자면 중괄호를 생략한다.
      const arg = (nodes: MathNode[]): string => {
        const s = joinLatex(nodes.map(astToLatex));
        return s.length === 1 ? s : `{${s}}`;
      };

      let out = '';
      // 좌측 첨자는 빈 그룹을 앞세워야 base 가 흡수되지 않는다
      if (node.leftSuperscript || node.leftSubscript) {
        out += '{}';
        if (node.leftSuperscript) out += `^${arg(node.leftSuperscript)}`;
        if (node.leftSubscript) out += `_${arg(node.leftSubscript)}`;
      }

      const base = joinLatex(node.base.map(astToLatex));
      out += base.length > 0 ? wrapIfNeeded(base) : (out === '' ? '{}' : '');

      // 아래첨자를 먼저 낸다 — 화학 관례(SO_4^{2-})와 맞고,
      // 재파싱 시 슬롯 채우기 덕분에 어느 순서든 같은 AST 로 돌아온다.
      if (node.subscript) out += `_${arg(node.subscript)}`;
      if (node.superscript) out += `^${arg(node.superscript)}`;
      return out;
    }

    case 'chem':
      return `\\ce{${chemNotation(node.content, astToLatex)}}`;

    case 'abs': {
      const content = joinLatex(node.content.map(astToLatex));
      return `|${content}|`;
    }

    case 'sqrt': {
      const content = joinLatex(node.content.map(astToLatex));
      if (node.index && node.index.length > 0) {
        const index = joinLatex(node.index.map(astToLatex));
        return `\\sqrt[${index}]{${content}}`;
      }
      return `\\sqrt{${content}}`;
    }

    case 'paren': {
      const content = joinLatex(node.content.map(astToLatex));
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
      const arg = joinLatex(node.argument.map(astToLatex));
      return `\\${node.name}(${arg})`;
    }

    case 'mathop':
      // 인자도 첨자도 없다 — 첨자는 이 노드를 감싼 scripts 가 찍는다.
      return `\\${node.name}`;

    case 'integral': {
      const lower = node.lower ? joinLatex(node.lower.map(astToLatex)) : '';
      const upper = node.upper ? joinLatex(node.upper.map(astToLatex)) : '';
      const integrand = joinLatex(node.integrand.map(astToLatex));
      const diff = node.differential;

      let result = '\\int';
      if (lower || upper) {
        result += `_{${lower}}^{${upper}}`;
      }
      result += ` ${integrand} \\, d${diff}`;
      return result;
    }

    case 'sum': {
      const lower = joinLatex(node.lower.map(astToLatex));
      const upper = joinLatex(node.upper.map(astToLatex));
      const body = joinLatex(node.body.map(astToLatex));
      const symbolToCmd: Record<string, string> = {
        '∐': 'coprod', '∩': 'bigcap', '∪': 'bigcup',
        '∨': 'bigvee', '∧': 'bigwedge', '⊕': 'bigoplus',
        '⊗': 'bigotimes', '⊙': 'bigodot', '⊎': 'biguplus', '⊔': 'bigsqcup',
      };
      const cmd = (node.symbol && symbolToCmd[node.symbol]) || 'sum';
      return `\\${cmd}_{${lower}}^{${upper}} ${body}`;
    }

    case 'limit': {
      const approach = joinLatex(node.approach.map(astToLatex));
      const body = joinLatex(node.body.map(astToLatex));
      return `\\lim_{${node.variable} \\to ${approach}} ${body}`;
    }

    case 'product': {
      const lower = joinLatex(node.lower.map(astToLatex));
      const upper = joinLatex(node.upper.map(astToLatex));
      const body = joinLatex(node.body.map(astToLatex));
      return `\\prod_{${lower}}^{${upper}} ${body}`;
    }

    case 'overset': {
      const base = joinLatex(node.base.map(astToLatex));
      const anno = joinLatex(node.annotation.map(astToLatex));
      const cmd = node.position === 'below' ? 'underset' : 'overset';
      return `\\${cmd}{${anno}}{${base}}`;
    }

    case 'cancel': {
      const content = joinLatex(node.content.map(astToLatex));
      return `\\${node.cancelType}{${content}}`;
    }

    case 'overline': {
      const content = joinLatex(node.content.map(astToLatex));
      const variantMap: Record<string, string> = {
        underline: 'underline', boxed: 'boxed',
        overbrace: 'overbrace', underbrace: 'underbrace',
      };
      const cmd = (node.variant && variantMap[node.variant]) || 'overline';
      return `\\${cmd}{${content}}`;
    }

    case 'accent': {
      const content = joinLatex(node.content.map(astToLatex));
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
      const above = joinLatex(node.above.map(astToLatex));
      // Record 를 direction 유니온으로 좁혀 둔다 — 방향이 늘 때 컴파일이 잡아준다.
      const dirMap: Record<XArrowNode['direction'], string> = {
        left: 'xleftarrow',
        right: 'xrightarrow',
        both: 'xleftrightarrow',
        // 가역 화살표는 대응하는 표준 명령이 없어 harpoon 으로 모은다.
        // chem 안에서는 화학 직렬화기가 표기를 지키므로 이 경로는 밖으로 꺼낸 경우만이다.
        equilibrium: 'xrightleftharpoons',
        equilibriumForward: 'xrightleftharpoons',
        equilibriumReverse: 'xrightleftharpoons',
      };
      const cmd = dirMap[node.direction];
      if (node.below && node.below.length > 0) {
        const below = joinLatex(node.below.map(astToLatex));
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

    case 'literal':
      return node.raw;

    case 'error':
      return node.raw;

    case 'opaque': {
      const argsLatex = node.args.map(arg =>
        `{${joinLatex(arg.map(astToLatex))}}`
      ).join('');
      return `\\${node.command}${argsLatex}`;
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

/** 유니코드 변수 → LaTeX 역매핑 (greek.ts + operators.ts의 variableHandler 기반) */
const VARIABLE_REVERSE_MAP: Record<string, string> = {
  // 소문자 그리스 문자
  'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta',
  'ϵ': '\\epsilon', 'ε': '\\varepsilon', 'ζ': '\\zeta', 'η': '\\eta',
  'θ': '\\theta', 'ϑ': '\\vartheta', 'ι': '\\iota', 'κ': '\\kappa',
  'λ': '\\lambda', 'μ': '\\mu', 'ν': '\\nu', 'ξ': '\\xi',
  'π': '\\pi', 'ϖ': '\\varpi', 'ρ': '\\rho', 'ϱ': '\\varrho',
  'σ': '\\sigma', 'ς': '\\varsigma', 'τ': '\\tau', 'υ': '\\upsilon',
  'ϕ': '\\phi', 'φ': '\\varphi', 'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
  // 대문자 그리스 문자
  'Γ': '\\Gamma', 'Δ': '\\Delta', 'Θ': '\\Theta', 'Λ': '\\Lambda',
  'Ξ': '\\Xi', 'Π': '\\Pi', 'Σ': '\\Sigma', 'Υ': '\\Upsilon',
  'Φ': '\\Phi', 'Ψ': '\\Psi', 'Ω': '\\Omega',
  // 확장 그리스 / 히브리
  'ϝ': '\\digamma', 'ϰ': '\\varkappa',
  'ℶ': '\\beth', 'ℷ': '\\gimel', 'ℸ': '\\daleth',
  // 기타 기호 (operators.ts에서 variableHandler로 등록된 것)
  '∞': '\\infty', '∂': '\\partial', '∇': '\\nabla', '′': '\\prime',
  '\uE000': '\\emptyset', '∅': '\\varnothing',
  '∠': '\\angle', '∡': '\\measuredangle', '∖': '\\backslash',
  'ℵ': '\\aleph', '℘': '\\wp', 'ℜ': '\\Re', 'ℑ': '\\Im',
  'ℓ': '\\ell', 'ℏ': '\\hbar',
  '\u{1D6A4}': '\\imath', '\u{1D6A5}': '\\jmath',
  '♣': '\\clubsuit', '♢': '\\diamondsuit', '♡': '\\heartsuit', '♠': '\\spadesuit',
  '△': '\\triangle', '□': '\\square',
};

/** 변수를 LaTeX로 변환 */
function convertVariable(name: string): string {
  return VARIABLE_REVERSE_MAP[name] || name;
}

/** 유니코드 연산자 → LaTeX 역매핑 (operators.ts의 operatorHandler 기반) */
const OPERATOR_REVERSE_MAP: Record<string, string> = {
  // 기본 연산자
  '×': '\\times', '÷': '\\div', '·': '\\cdot', '±': '\\pm', '∓': '\\mp',
  '∗': '\\ast', '⋆': '\\star', '∘': '\\circ', '•': '\\bullet', '⋄': '\\diamond',
  '⊕': '\\oplus', '⊖': '\\ominus', '⊗': '\\otimes', '⊘': '\\oslash', '⊙': '\\odot', '○': '\\bigcirc',
  '†': '\\dagger', '‡': '\\ddagger',
  '∨': '\\vee', '∧': '\\wedge', '⊓': '\\sqcap', '⊔': '\\sqcup', '⊎': '\\uplus',
  '◁': '\\triangleleft', '▷': '\\triangleright', '▽': '\\bigtriangledown',
  '⨿': '\\amalg', '≀': '\\wr',
  '⊲': '\\lhd', '⊳': '\\rhd', '⊴': '\\unlhd', '⊵': '\\unrhd',
  // 관계 연산자
  '≠': '\\neq', '≤': '\\leq', '≥': '\\geq', '⩽': '\\leqslant', '⩾': '\\geqslant',
  '≪': '\\ll', '≫': '\\gg', '≡': '\\equiv', '∼': '\\sim', '≃': '\\simeq',
  '≈': '\\approx', '≅': '\\cong', '≐': '\\doteq', '∝': '\\propto', '≍': '\\asymp',
  '≺': '\\prec', '≻': '\\succ', '⪯': '\\preceq', '⪰': '\\succeq',
  '⋈': '\\bowtie', '⌣': '\\smile', '⌢': '\\frown',
  // 집합 연산자
  '∈': '\\in', '∋': '\\ni', '∉': '\\notin',
  '⊂': '\\subset', '⊃': '\\supset', '⊆': '\\subseteq', '⊇': '\\supseteq',
  '⊑': '\\sqsubseteq', '⊒': '\\sqsupseteq',
  '∪': '\\cup', '∩': '\\cap',
  '⊢': '\\vdash', '⊣': '\\dashv', '⊨': '\\models',
  // 부정 관계 연산자
  '≮': '\\nless', '≯': '\\ngtr', '≰': '\\nleq', '≱': '\\ngeq',
  '⊀': '\\nprec', '⊁': '\\nsucc', '⋠': '\\npreceq', '⋡': '\\nsucceq',
  '⊈': '\\nsubseteq', '⊉': '\\nsupseteq', '⊊': '\\subsetneq', '⊋': '\\supsetneq',
  '∤': '\\nmid', '∦': '\\nparallel',
  '⊬': '\\nvdash', '⊮': '\\nVdash', '⊭': '\\nvDash', '⊯': '\\nVDash',
  '⋪': '\\ntriangleleft', '⋫': '\\ntriangleright', '⋬': '\\ntrianglelefteq', '⋭': '\\ntrianglerighteq',
  '≇': '\\ncong', '≁': '\\nsim',
  // 논리 연산자
  '¬': '\\neg', '∀': '\\forall', '∃': '\\exists', '∄': '\\nexists',
  // 화살표
  '→': '\\to', '←': '\\leftarrow', '↔': '\\leftrightarrow',
  '⇒': '\\Rightarrow', '⇐': '\\Leftarrow', '⇔': '\\Leftrightarrow',
  '⟹': '\\implies', '⟺': '\\iff', '↦': '\\mapsto',
  '↑': '\\uparrow', '↓': '\\downarrow',
  '⟵': '\\longleftarrow', '⟶': '\\longrightarrow', '⟷': '\\longleftrightarrow',
  '⟸': '\\Longleftarrow', '⟼': '\\longmapsto',
  '↕': '\\updownarrow', '⇑': '\\Uparrow', '⇓': '\\Downarrow', '⇕': '\\Updownarrow',
  '↗': '\\nearrow', '↘': '\\searrow', '↙': '\\swarrow', '↖': '\\nwarrow',
  '↪': '\\hookrightarrow', '↩': '\\hookleftarrow',
  '⇀': '\\rightharpoonup', '⇁': '\\rightharpoondown',
  '↼': '\\leftharpoonup', '↽': '\\leftharpoondown',
  '⇌': '\\rightleftharpoons', '⇋': '\\leftrightharpoons',
  '⇢': '\\dashrightarrow', '⇠': '\\dashleftarrow',
  '↠': '\\twoheadrightarrow', '↞': '\\twoheadleftarrow',
  '↣': '\\rightarrowtail', '↢': '\\leftarrowtail',
  '⇝': '\\rightsquigarrow', '↭': '\\leftrightsquigarrow',
  '↶': '\\curvearrowleft', '↷': '\\curvearrowright',
  '↺': '\\circlearrowleft', '↻': '\\circlearrowright',
  '↰': '\\Lsh', '↱': '\\Rsh',
  // 기타 기호 (operatorHandler)
  '⊥': '\\perp', '∥': '\\parallel', '∣': '\\mid',
  // 구분자 (standalone)
  '⟨': '\\langle', '⟩': '\\rangle',
  '⌈': '\\lceil', '⌉': '\\rceil', '⌊': '\\lfloor', '⌋': '\\rfloor',
  '‖': '\\|',
  // 점 기호
  '…': '\\ldots', '⋯': '\\cdots', '⋮': '\\vdots', '⋱': '\\ddots',
};

/** 연산자를 LaTeX로 변환 */
function convertOperator(op: string): string {
  // 기본 산술/비교 연산자는 양쪽에 공백
  if ('+-=<>'.includes(op)) return ` ${op} `;
  const mapped = OPERATOR_REVERSE_MAP[op];
  if (mapped) return ` ${mapped} `;
  return ` ${op} `;
}

/** 필요시 중괄호로 감싸기 */
function wrapIfNeeded(str: string): string {
  // 단일 문자나 이미 그룹화된 경우 그대로
  if (str.length === 1) return str;
  // 명령 하나뿐이면 감싸지 않는다. `{\max}` 는 Ord atom 이라 첨자가 아래가 아니라
  // 옆에 붙는다 — 내보낸 LaTeX 가 limits 의미를 잃는다.
  if (/^\\[a-zA-Z]+$/.test(str)) return str;
  if (str.startsWith('(') && str.endsWith(')')) return str;
  if (str.startsWith('[') && str.endsWith(']')) return str;
  if (str.startsWith('\\{') && str.endsWith('\\}')) return str;
  // 복합 표현식은 중괄호로 감싸기
  return `{${str}}`;
}
