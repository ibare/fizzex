/**
 * 자동완성 제안 엔진
 *
 * 커서 상태를 분석하여 적절한 제안 목록을 생성
 */

import type { EditorState, MathNode, RootNode, RowNode } from '../types';
import type { CursorContext, SuggestionWithAction } from './types';

/** 모든 제안 항목 정의 (priority: 높을수록 먼저 표시) */
const ALL_SUGGESTIONS: SuggestionWithAction[] = [
  // ==================== 미적분 (priority: 10) ====================
  {
    id: 'integral',
    label: '적분',
    icon: '∫',
    category: 'calculus',
    description: '정적분/부정적분',
    priority: 10,
    action: { type: 'insert_integral' },
  },
  {
    id: 'sum',
    label: '시그마',
    icon: 'Σ',
    category: 'calculus',
    description: '합계',
    priority: 10,
    action: { type: 'insert_sum' },
  },
  {
    id: 'product',
    label: '곱',
    icon: 'Π',
    category: 'calculus',
    description: '곱셈 기호',
    priority: 10,
    action: { type: 'insert_product' },
  },
  {
    id: 'limit',
    label: '극한',
    icon: 'lim',
    category: 'calculus',
    description: '극한값',
    priority: 10,
    action: { type: 'insert_limit' },
  },

  // ==================== 구조 - 키보드 입력 불가 (priority: 8) ====================
  {
    id: 'sqrt',
    label: '제곱근',
    icon: '√',
    category: 'structure',
    description: '루트',
    priority: 8,
    action: { type: 'insert_sqrt' },
  },

  // ==================== 기호 - 키보드 입력 불가 (priority: 8) ====================
  {
    id: 'pi',
    label: '파이',
    icon: 'π',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'π' },
  },
  {
    id: 'infinity',
    label: '무한대',
    icon: '∞',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: '∞' },
  },
  {
    id: 'alpha',
    label: '알파',
    icon: 'α',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'α' },
  },
  {
    id: 'beta',
    label: '베타',
    icon: 'β',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'β' },
  },
  {
    id: 'theta',
    label: '세타',
    icon: 'θ',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'θ' },
  },
  {
    id: 'delta',
    label: '델타',
    icon: 'δ',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'δ' },
  },
  {
    id: 'lambda',
    label: '람다',
    icon: 'λ',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'λ' },
  },
  {
    id: 'mu',
    label: '뮤',
    icon: 'μ',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'μ' },
  },
  {
    id: 'epsilon',
    label: '엡실론',
    icon: 'ε',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'ε' },
  },
  {
    id: 'gamma',
    label: '감마',
    icon: 'γ',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'γ' },
  },
  {
    id: 'omega',
    label: '오메가',
    icon: 'Ω',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'Ω' },
  },
  {
    id: 'phi',
    label: '파이(대)',
    icon: 'Φ',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'Φ' },
  },
  {
    id: 'psi',
    label: '프사이',
    icon: 'Ψ',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'Ψ' },
  },
  {
    id: 'xi',
    label: '크시',
    icon: 'Ξ',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: 'Ξ' },
  },
  {
    id: 'nabla',
    label: '나블라',
    icon: '∇',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: '∇' },
  },
  {
    id: 'partial',
    label: '편미분',
    icon: '∂',
    category: 'symbol',
    priority: 8,
    action: { type: 'insert_variable', name: '∂' },
  },
  {
    id: 'transpose',
    label: '전치',
    icon: '⊤',
    category: 'symbol',
    priority: 7,
    action: { type: 'insert_variable', name: '⊤' },
  },
  {
    id: 'factorial',
    label: '팩토리얼',
    icon: '!',
    category: 'operator',
    description: 'n!',
    priority: 7,
    action: { type: 'insert_variable', name: '!' },
  },
  {
    id: 'cdot',
    label: '점곱',
    icon: '·',
    category: 'operator',
    priority: 7,
    action: { type: 'insert_operator', operator: '·' },
  },
  {
    id: 'parallel',
    label: '평행',
    icon: '∥',
    category: 'operator',
    priority: 7,
    action: { type: 'insert_operator', operator: '∥' },
  },

  // ==================== mathbb 집합 기호 (priority: 7) ====================
  {
    id: 'natural',
    label: '자연수',
    icon: 'ℕ',
    category: 'symbol',
    description: '자연수 집합',
    priority: 7,
    action: { type: 'insert_variable', name: 'ℕ' },
  },
  {
    id: 'integer',
    label: '정수',
    icon: 'ℤ',
    category: 'symbol',
    description: '정수 집합',
    priority: 7,
    action: { type: 'insert_variable', name: 'ℤ' },
  },
  {
    id: 'rational',
    label: '유리수',
    icon: 'ℚ',
    category: 'symbol',
    description: '유리수 집합',
    priority: 7,
    action: { type: 'insert_variable', name: 'ℚ' },
  },
  {
    id: 'real',
    label: '실수',
    icon: 'ℝ',
    category: 'symbol',
    description: '실수 집합',
    priority: 7,
    action: { type: 'insert_variable', name: 'ℝ' },
  },
  {
    id: 'complex',
    label: '복소수',
    icon: 'ℂ',
    category: 'symbol',
    description: '복소수 집합',
    priority: 7,
    action: { type: 'insert_variable', name: 'ℂ' },
  },

  // ==================== mathcal 스크립트 문자 (priority: 7) ====================
  {
    id: 'fourier',
    label: '푸리에',
    icon: 'ℱ',
    category: 'symbol',
    description: '푸리에 변환',
    priority: 7,
    action: { type: 'insert_variable', name: 'ℱ' },
  },
  {
    id: 'laplace',
    label: '라플라스',
    icon: 'ℒ',
    category: 'symbol',
    description: '라플라스 변환',
    priority: 7,
    action: { type: 'insert_variable', name: 'ℒ' },
  },
  {
    id: 'hilbert',
    label: '힐베르트',
    icon: 'ℋ',
    category: 'symbol',
    description: '힐베르트 공간',
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
    description: '행렬식',
    priority: 7,
    action: { type: 'insert_func', name: 'det' },
  },
  {
    id: 'tr',
    label: 'tr',
    icon: 'tr',
    category: 'function',
    description: '트레이스',
    priority: 7,
    action: { type: 'insert_func', name: 'tr' },
  },

  // ==================== 구조 - 단축키 비직관적 (priority: 5) ====================
  {
    id: 'frac',
    label: '분수',
    icon: '½',
    shortcut: '/',
    category: 'structure',
    description: '분수 형태로 입력',
    priority: 5,
    action: { type: 'insert_frac' },
  },
  {
    id: 'power',
    label: '거듭제곱',
    icon: 'x²',
    shortcut: '^',
    category: 'structure',
    description: '위 첨자 (지수)',
    priority: 5,
    action: { type: 'insert_power' },
  },
  {
    id: 'subscript',
    label: '아래첨자',
    icon: 'x₂',
    shortcut: '_',
    category: 'structure',
    description: '아래 첨자 (인덱스)',
    priority: 5,
    action: { type: 'insert_subscript' },
  },

  // ==================== 구조 - 단축키 직관적 (priority: 3) ====================
  {
    id: 'paren_round',
    label: '괄호',
    icon: '( )',
    shortcut: '(',
    category: 'structure',
    priority: 3,
    action: { type: 'insert_paren', parenType: '(' },
  },
  {
    id: 'paren_square',
    label: '대괄호',
    icon: '[ ]',
    shortcut: '[',
    category: 'structure',
    priority: 3,
    action: { type: 'insert_paren', parenType: '[' },
  },
  {
    id: 'abs',
    label: '절댓값',
    icon: '|x|',
    shortcut: '|',
    category: 'structure',
    priority: 3,
    action: { type: 'insert_abs' },
  },

  // ==================== 연산자 - 키보드 입력 어려움 (priority: 2) ====================
  {
    id: 'leq',
    label: '이하',
    icon: '≤',
    category: 'operator',
    priority: 2,
    action: { type: 'insert_operator', operator: '≤' },
  },
  {
    id: 'geq',
    label: '이상',
    icon: '≥',
    category: 'operator',
    priority: 2,
    action: { type: 'insert_operator', operator: '≥' },
  },

  // ==================== 연산자 - 직접 타이핑 가능 (priority: 0, 제외 대상) ====================
  {
    id: 'add',
    label: '덧셈',
    icon: '+',
    shortcut: '+',
    category: 'operator',
    priority: 0,
    action: { type: 'insert_operator', operator: '+' },
  },
  {
    id: 'subtract',
    label: '뺄셈',
    icon: '−',
    shortcut: '-',
    category: 'operator',
    priority: 0,
    action: { type: 'insert_operator', operator: '-' },
  },
  {
    id: 'multiply',
    label: '곱셈',
    icon: '×',
    shortcut: '*',
    category: 'operator',
    priority: 0,
    action: { type: 'insert_operator', operator: '×' },
  },
  {
    id: 'divide_op',
    label: '나눗셈',
    icon: '÷',
    category: 'operator',
    priority: 0,
    action: { type: 'insert_operator', operator: '÷' },
  },
  {
    id: 'equals',
    label: '등호',
    icon: '=',
    shortcut: '=',
    category: 'operator',
    priority: 0,
    action: { type: 'insert_operator', operator: '=' },
  },
  {
    id: 'less_than',
    label: '미만',
    icon: '<',
    shortcut: '<',
    category: 'operator',
    priority: 0,
    action: { type: 'insert_operator', operator: '<' },
  },
  {
    id: 'greater_than',
    label: '초과',
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
    'numerator', 'denominator', 'base', 'exponent', 'subscript',
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
        // 닫는 괄호/절댓값 뒤는 변수 뒤와 유사
        return 'after_variable';
      case 'frac':
      case 'power':
      case 'subscript':
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
