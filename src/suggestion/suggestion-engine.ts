/**
 * 자동완성 제안 엔진
 *
 * 커서 상태를 분석하여 적절한 제안 목록을 생성
 */

import type { EditorState, MathNode, RootNode, RowNode } from '../types.js';
import type { CursorContext, SuggestionWithAction } from './types.js';

/** 모든 제안 항목 정의 (priority: 높을수록 먼저 표시) */
const ALL_SUGGESTIONS: SuggestionWithAction[] = [
  // ==================== 미적분 (priority: 10) ====================
  {
    id: 'integral',
    label: 'Integral',
    icon: '∫',
    category: 'calculus',
    description: 'Definite/Indefinite integral',
    priority: 10,
    action: { type: 'insert_integral' },
  },
  {
    id: 'sum',
    label: 'Sigma',
    icon: 'Σ',
    category: 'calculus',
    description: 'Summation',
    priority: 10,
    action: { type: 'insert_sum' },
  },
  {
    id: 'product',
    label: 'Product',
    icon: 'Π',
    category: 'calculus',
    description: 'Product notation',
    priority: 10,
    action: { type: 'insert_product' },
  },
  {
    id: 'limit',
    label: 'Limit',
    icon: 'lim',
    category: 'calculus',
    description: 'Limit value',
    priority: 10,
    action: { type: 'insert_limit' },
  },

  // ==================== 구조 - 키보드 입력 불가 (priority: 8) ====================
  {
    id: 'sqrt',
    label: 'Square root',
    icon: '√',
    category: 'structure',
    description: 'Root',
    priority: 8,
    action: { type: 'insert_sqrt' },
  },

  // ==================== 기호 - 키보드 입력 불가 (priority: 8) ====================
  {
    id: 'pi',
    label: 'Pi',
    icon: 'π',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'π' },
  },
  {
    id: 'infinity',
    label: 'Infinity',
    icon: '∞',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: '∞' },
  },
  {
    id: 'alpha',
    label: 'Alpha',
    icon: 'α',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'α' },
  },
  {
    id: 'beta',
    label: 'Beta',
    icon: 'β',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'β' },
  },
  {
    id: 'theta',
    label: 'Theta',
    icon: 'θ',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'θ' },
  },
  {
    id: 'delta',
    label: 'Delta',
    icon: 'δ',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'δ' },
  },
  {
    id: 'lambda',
    label: 'Lambda',
    icon: 'λ',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'λ' },
  },
  {
    id: 'mu',
    label: 'Mu',
    icon: 'μ',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'μ' },
  },
  {
    id: 'epsilon',
    label: 'Epsilon',
    icon: 'ε',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'ε' },
  },
  {
    id: 'gamma',
    label: 'Gamma',
    icon: 'γ',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'γ' },
  },
  {
    id: 'omega',
    label: 'Omega',
    icon: 'Ω',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'Ω' },
  },
  {
    id: 'phi',
    label: 'Phi',
    icon: 'Φ',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'Φ' },
  },
  {
    id: 'psi',
    label: 'Psi',
    icon: 'Ψ',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'Ψ' },
  },
  {
    id: 'xi',
    label: 'Xi',
    icon: 'Ξ',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'Ξ' },
  },
  {
    id: 'nabla',
    label: 'Nabla',
    icon: '∇',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: '∇' },
  },
  {
    id: 'partial',
    label: 'Partial',
    icon: '∂',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: '∂' },
  },
  {
    id: 'transpose',
    label: 'Transpose',
    icon: '⊤',
    category: 'symbol',
    priority: 7,
    action: { type: 'insert_variable', name: '⊤' },
  },
  {
    id: 'factorial',
    label: 'Factorial',
    icon: '!',
    category: 'operator',
    description: 'n!',
    priority: 7,
    action: { type: 'insert_variable', name: '!' },
  },
  {
    id: 'cdot',
    label: 'Dot',
    icon: '·',
    category: 'operator',
    priority: 7,
    action: { type: 'insert_operator', operator: '·' },
  },
  {
    id: 'parallel',
    label: 'Parallel',
    icon: '∥',
    category: 'operator',
    priority: 7,
    action: { type: 'insert_operator', operator: '∥' },
  },

  // ==================== mathbb 집합 기호 (priority: 7) ====================
  {
    id: 'natural',
    label: 'Natural',
    icon: 'ℕ',
    category: 'symbol',
    description: 'Natural numbers',
    priority: 7,
    action: { type: 'insert_variable', name: 'ℕ' },
  },
  {
    id: 'integer',
    label: 'Integer',
    icon: 'ℤ',
    category: 'symbol',
    description: 'Integers',
    priority: 7,
    action: { type: 'insert_variable', name: 'ℤ' },
  },
  {
    id: 'rational',
    label: 'Rational',
    icon: 'ℚ',
    category: 'symbol',
    description: 'Rational numbers',
    priority: 7,
    action: { type: 'insert_variable', name: 'ℚ' },
  },
  {
    id: 'real',
    label: 'Real',
    icon: 'ℝ',
    category: 'symbol',
    description: 'Real numbers',
    priority: 7,
    action: { type: 'insert_variable', name: 'ℝ' },
  },
  {
    id: 'complex',
    label: 'Complex',
    icon: 'ℂ',
    category: 'symbol',
    description: 'Complex numbers',
    priority: 7,
    action: { type: 'insert_variable', name: 'ℂ' },
  },

  // ==================== mathcal 스크립트 문자 (priority: 7) ====================
  {
    id: 'fourier',
    label: 'Fourier',
    icon: 'ℱ',
    category: 'symbol',
    description: 'Fourier transform',
    priority: 7,
    action: { type: 'insert_variable', name: 'ℱ' },
  },
  {
    id: 'laplace',
    label: 'Laplace',
    icon: 'ℒ',
    category: 'symbol',
    description: 'Laplace transform',
    priority: 7,
    action: { type: 'insert_variable', name: 'ℒ' },
  },
  {
    id: 'hilbert',
    label: 'Hilbert',
    icon: 'ℋ',
    category: 'symbol',
    description: 'Hilbert space',
    priority: 7,
    action: { type: 'insert_variable', name: 'ℋ' },
  },

  // ==================== 함수 (priority: 7) ====================
  {
    id: 'sin',
    label: 'sin',
    icon: 'sin',
    category: 'function',
    priority: 7,
    action: { type: 'insert_func', name: 'sin' },
  },
  {
    id: 'cos',
    label: 'cos',
    icon: 'cos',
    category: 'function',
    priority: 7,
    action: { type: 'insert_func', name: 'cos' },
  },
  {
    id: 'tan',
    label: 'tan',
    icon: 'tan',
    category: 'function',
    priority: 7,
    action: { type: 'insert_func', name: 'tan' },
  },
  {
    id: 'log',
    label: 'log',
    icon: 'log',
    category: 'function',
    priority: 7,
    action: { type: 'insert_func', name: 'log' },
  },
  {
    id: 'ln',
    label: 'ln',
    icon: 'ln',
    category: 'function',
    priority: 7,
    action: { type: 'insert_func', name: 'ln' },
  },
  {
    id: 'det',
    label: 'det',
    icon: 'det',
    category: 'function',
    description: 'Determinant',
    priority: 7,
    action: { type: 'insert_func', name: 'det' },
  },
  {
    id: 'tr',
    label: 'tr',
    icon: 'tr',
    category: 'function',
    description: 'Trace',
    priority: 7,
    action: { type: 'insert_func', name: 'tr' },
  },

  // ==================== 구조 - 단축키 비직관적 (priority: 5) ====================
  {
    id: 'frac',
    label: 'Fraction',
    icon: '½',
    shortcut: '/',
    category: 'structure',
    description: 'Fraction form',
    priority: 5,
    action: { type: 'insert_frac' },
  },
  {
    id: 'power',
    label: 'Power',
    icon: 'x²',
    shortcut: '^',
    category: 'structure',
    description: 'Superscript (exponent)',
    priority: 5,
    action: { type: 'insert_script', slot: 'superscript' },
  },
  {
    id: 'subscript',
    label: 'Subscript',
    icon: 'x₂',
    shortcut: '_',
    category: 'structure',
    description: 'Subscript (index)',
    priority: 5,
    action: { type: 'insert_script', slot: 'subscript' },
  },

  // ==================== 구조 - 단축키 직관적 (priority: 3) ====================
  {
    id: 'paren_round',
    label: 'Parentheses',
    icon: '( )',
    shortcut: '(',
    category: 'structure',
    priority: 3,
    action: { type: 'insert_paren', parenType: '(' },
  },
  {
    id: 'paren_square',
    label: 'Brackets',
    icon: '[ ]',
    shortcut: '[',
    category: 'structure',
    priority: 3,
    action: { type: 'insert_paren', parenType: '[' },
  },
  {
    id: 'abs',
    label: 'Absolute',
    icon: '|x|',
    shortcut: '|',
    category: 'structure',
    priority: 3,
    action: { type: 'insert_abs' },
  },

  // ==================== 연산자 - 키보드 입력 어려움 (priority: 2) ====================
  {
    id: 'leq',
    label: 'Less or equal',
    icon: '≤',
    category: 'operator',
    priority: 2,
    action: { type: 'insert_operator', operator: '≤' },
  },
  {
    id: 'geq',
    label: 'Greater or equal',
    icon: '≥',
    category: 'operator',
    priority: 2,
    action: { type: 'insert_operator', operator: '≥' },
  },

  // ==================== 연산자 - 직접 타이핑 가능 (priority: 0, 제외 대상) ====================
  {
    id: 'add',
    label: 'Add',
    icon: '+',
    shortcut: '+',
    category: 'operator',
    priority: 0,
    action: { type: 'insert_operator', operator: '+' },
  },
  {
    id: 'subtract',
    label: 'Subtract',
    icon: '−',
    shortcut: '-',
    category: 'operator',
    priority: 0,
    action: { type: 'insert_operator', operator: '-' },
  },
  {
    id: 'multiply',
    label: 'Multiply',
    icon: '×',
    shortcut: '*',
    category: 'operator',
    priority: 0,
    action: { type: 'insert_operator', operator: '×' },
  },
  {
    id: 'divide_op',
    label: 'Divide',
    icon: '÷',
    category: 'operator',
    priority: 0,
    action: { type: 'insert_operator', operator: '÷' },
  },
  {
    id: 'equals',
    label: 'Equals',
    icon: '=',
    shortcut: '=',
    category: 'operator',
    priority: 0,
    action: { type: 'insert_operator', operator: '=' },
  },
  {
    id: 'less_than',
    label: 'Less than',
    icon: '<',
    shortcut: '<',
    category: 'operator',
    priority: 0,
    action: { type: 'insert_operator', operator: '<' },
  },
  {
    id: 'greater_than',
    label: 'Greater than',
    icon: '>',
    shortcut: '>',
    category: 'operator',
    priority: 0,
    action: { type: 'insert_operator', operator: '>' },
  },
];

/** 컨텍스트별 제안 ID 매핑 */
const CONTEXT_SUGGESTIONS: Record<CursorContext, string[]> = {
  // 빈 상태: 값을 입력할 수 있는 것들
  empty: [
    'paren_round', 'sqrt', 'abs',
    'integral', 'sum', 'product', 'limit',
    'sin', 'cos', 'tan', 'log', 'ln', 'det', 'tr',
    'pi', 'infinity', 'alpha', 'beta', 'theta',
    'natural', 'integer', 'rational', 'real', 'complex',
    'fourier', 'laplace', 'hilbert',
  ],

  // 숫자 뒤: 연산자, 구조
  after_number: [
    'add', 'subtract', 'multiply', 'divide_op', 'equals',
    'less_than', 'greater_than', 'leq', 'geq',
    'frac', 'power', 'subscript', 'factorial',
  ],

  // 변수 뒤: 연산자, 구조, 값
  after_variable: [
    'add', 'subtract', 'multiply', 'divide_op', 'equals',
    'less_than', 'greater_than', 'leq', 'geq',
    'frac', 'power', 'subscript', 'factorial',
    'paren_round', 'sqrt', 'abs',
    'integral', 'sum', 'product', 'limit',
    'sin', 'cos', 'tan', 'log', 'ln',
    'pi', 'infinity', 'alpha', 'beta', 'theta',
  ],

  // 연산자 뒤: 값
  after_operator: [
    'paren_round', 'sqrt', 'abs',
    'integral', 'sum', 'product', 'limit',
    'sin', 'cos', 'tan', 'log', 'ln', 'det', 'tr',
    'pi', 'infinity', 'alpha', 'beta', 'theta',
    'natural', 'integer', 'rational', 'real', 'complex',
    'fourier', 'laplace', 'hilbert',
  ],

  // 여는 괄호 뒤: 값
  after_open_paren: [
    'sqrt', 'abs',
    'sin', 'cos', 'tan', 'log', 'ln', 'det', 'tr',
    'pi', 'infinity', 'alpha', 'beta', 'theta',
    'natural', 'integer', 'rational', 'real', 'complex',
    'fourier', 'laplace', 'hilbert',
  ],

  // row 시작 (구조 내부): 값
  start_of_row: [
    'paren_round', 'sqrt', 'abs',
    'sin', 'cos', 'tan', 'log', 'ln', 'det', 'tr',
    'pi', 'infinity', 'alpha', 'beta', 'theta',
    'natural', 'integer', 'rational', 'real', 'complex',
    'fourier', 'laplace', 'hilbert',
  ],
};

/** ID로 제안 찾기 */
function getSuggestionById(id: string): SuggestionWithAction | undefined {
  return ALL_SUGGESTIONS.find(s => s.id === id);
}

/** AST에서 노드 찾기 */
function findNodeById(node: MathNode, id: string): MathNode | null {
  if (node.id === id) return node;

  // children 탐색
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }

  // 구조별 하위 노드 탐색
  const childArrays = [
    'numerator', 'denominator', 'base', 'superscript', 'subscript',
    'leftSuperscript', 'leftSubscript',
    'content', 'argument', 'lower', 'upper', 'body', 'integrand',
    'approach', 'index',
  ];

  for (const key of childArrays) {
    if (key in node) {
      const descriptor = Object.getOwnPropertyDescriptor(node, key);
      if (descriptor && Array.isArray(descriptor.value)) {
        for (const child of descriptor.value as MathNode[]) {
          const found = findNodeById(child, id);
          if (found) return found;
        }
      }
    }
  }

  // matrix rows
  if ('rows' in node && Array.isArray(node.rows)) {
    for (const row of node.rows as MathNode[][]) {
      for (const cell of row) {
        const found = findNodeById(cell, id);
        if (found) return found;
      }
    }
  }

  return null;
}

/** 커서 위치의 이전 노드 가져오기 */
function getPreviousNode(state: EditorState): MathNode | null {
  const { ast, cursor } = state;
  if (cursor.kind === 'intra') {
    return findNodeById(ast, cursor.nodeId);
  }
  const parentNode = findNodeById(ast, cursor.parentId);

  if (!parentNode) return null;

  // row/root 타입에서 children 확인
  if (parentNode.type === 'root' || parentNode.type === 'row') {
    const rowNode = parentNode as RootNode | RowNode;
    if (cursor.index > 0 && cursor.index <= rowNode.children.length) {
      return rowNode.children[cursor.index - 1];
    }
  }

  return null;
}

/** 커서 컨텍스트 분석 */
export function analyzeCursorContext(state: EditorState): CursorContext {
  const { ast, cursor } = state;
  if (cursor.kind === 'intra') {
    return 'after_number';
  }
  const parentNode = findNodeById(ast, cursor.parentId);

  if (!parentNode) return 'empty';

  // row/root 타입 확인
  if (parentNode.type === 'root' || parentNode.type === 'row') {
    const rowNode = parentNode as RootNode | RowNode;

    // 빈 상태 또는 시작 위치
    if (rowNode.children.length === 0 || cursor.index === 0) {
      // root가 아닌 row면 구조 내부
      if (parentNode.type === 'row') {
        return 'start_of_row';
      }
      return 'empty';
    }

    // 이전 노드 확인
    const prevNode = rowNode.children[cursor.index - 1];
    if (!prevNode) return 'empty';

    switch (prevNode.type) {
      case 'number':
        return 'after_number';
      case 'variable':
        return 'after_variable';
      case 'operator':
        return 'after_operator';
      case 'paren':
      case 'abs':
      case 'chem':
        // 닫는 괄호/절댓값/화학식 뒤는 변수 뒤와 유사
        return 'after_variable';
      case 'frac':
      case 'scripts':
      case 'sqrt':
      case 'func':
      case 'integral':
      case 'sum':
      case 'product':
      case 'limit':
        // 구조 뒤는 변수 뒤와 유사
        return 'after_variable';
      default:
        return 'empty';
    }
  }

  return 'empty';
}

/** 현재 상태에서 제안 목록 가져오기 (priority 순 정렬, priority 0 제외) */
export function getSuggestions(state: EditorState): SuggestionWithAction[] {
  const context = analyzeCursorContext(state);
  const suggestionIds = CONTEXT_SUGGESTIONS[context] || [];

  return suggestionIds
    .map(id => getSuggestionById(id))
    .filter((s): s is SuggestionWithAction => s !== undefined && s.priority > 0)
    .sort((a, b) => b.priority - a.priority);
}

/** 현재 상태에서 모든 제안 목록 가져오기 (priority 0 포함, 더보기용) */
export function getAllSuggestionsForContext(state: EditorState): SuggestionWithAction[] {
  const context = analyzeCursorContext(state);
  const suggestionIds = CONTEXT_SUGGESTIONS[context] || [];

  return suggestionIds
    .map(id => getSuggestionById(id))
    .filter((s): s is SuggestionWithAction => s !== undefined)
    .sort((a, b) => b.priority - a.priority);
}

/** 모든 제안 가져오기 (priority 순 정렬, 전체 포함) */
export function getAllSuggestions(): SuggestionWithAction[] {
  return [...ALL_SUGGESTIONS]
    .sort((a, b) => b.priority - a.priority);
}

/** 제안 검색 (priority 순 정렬, priority 0 제외) */
export function searchSuggestions(query: string): SuggestionWithAction[] {
  const lowerQuery = query.toLowerCase();
  return ALL_SUGGESTIONS
    .filter(s =>
      s.priority > 0 && (
        s.label.toLowerCase().includes(lowerQuery) ||
        s.icon.toLowerCase().includes(lowerQuery) ||
        s.id.includes(lowerQuery)
      )
    )
    .sort((a, b) => b.priority - a.priority);
}
