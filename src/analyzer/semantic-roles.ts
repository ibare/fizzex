/**
 * 구조적 의미 시스템 — Expression Explorer용
 *
 * 수식의 각 요소가 구조 안에서 갖는 의미를 2계층 규칙으로 해석한다.
 * Layer 1: 부모 노드 타입 + 자식 위치 → 기본 의미
 * Layer 2: 루트→현재 경로 패턴 → 조합 의미
 *
 * React/DOM 무관 순수 유틸리티 (C3 준수).
 */

import type { MathNode } from '../types';

// ─── 타입 ───

/** AST 조상 경로 항목 */
export interface AncestorEntry {
  /** 부모 AST 노드 */
  node: MathNode;
  /** 이 노드가 부모의 어떤 자식 위치인지 */
  childPosition: string;
}

/** 의미 해석 결과 */
export interface SemanticResult {
  /** 짧은 역할명 */
  role: string;
  /** 설명 문장 */
  description: string;
  /** 어느 레이어에서 왔는지 (내부용) */
  layer: 1 | 2 | 0;
}

/** Layer 1 규칙 */
interface SemanticRule {
  parentType: string;
  childPosition: string;
  role: string;
  description: string;
  refinements?: Array<{
    condition: (node: MathNode) => boolean;
    description: string;
  }>;
}

/** Layer 2 조합 규칙 */
interface CombinedSemanticRule {
  /** 경로 패턴 (부모→자식 순서, 끝이 현재 노드 바로 위) */
  pathPattern: string[];
  role?: string;
  description: string;
  condition?: (node: MathNode) => boolean;
}

// ─── 헬퍼 함수 ───

/** 노드에 변수가 포함되어 있는지 */
export function containsVariable(node: MathNode): boolean {
  if (node.type === 'variable') return true;
  for (const child of getChildArrays(node)) {
    for (const c of child) {
      if (containsVariable(c)) return true;
    }
  }
  return false;
}

/** 노드가 순수 상수인지 (변수 없음) */
function isConstantOnly(node: MathNode): boolean {
  return !containsVariable(node);
}

/** 노드가 무한대 기호인지 */
function isInfinity(node: MathNode): boolean {
  return node.type === 'variable' && (node.name === '∞' || node.name === 'inf');
}

/** 노드가 음의 무한대인지 (row: [operator(-), variable(∞)]) */
function isNegativeInfinity(nodes: MathNode[]): boolean {
  if (nodes.length === 2) {
    return nodes[0].type === 'operator' && nodes[0].operator === '-' && isInfinity(nodes[1]);
  }
  return false;
}

/** 노드가 자연상수 e인지 */
function isEulerE(node: MathNode): boolean {
  return node.type === 'variable' && node.name === 'e';
}

/** 특정 숫자 값인지 */
function isNumberValue(node: MathNode, value: number): boolean {
  return node.type === 'number' && parseFloat(node.value) === value;
}

/** 노드 배열이 음수 표현인지 */
function isNegativeExpression(nodes: MathNode[]): boolean {
  return nodes.length >= 1 && nodes[0].type === 'operator' && nodes[0].operator === '-';
}

/** x² + c 형태로 항상 양수인지 (간단 패턴만) */
function isAlwaysPositive(nodes: MathNode[]): boolean {
  // 단일 power 노드: base가 변수, exponent가 2 → x² (≥ 0)
  if (nodes.length === 1 && nodes[0].type === 'power') {
    const exp = nodes[0].exponent;
    if (exp.length === 1 && isNumberValue(exp[0], 2)) return true;
  }
  // x² + 상수 패턴
  if (nodes.length === 3) {
    const [a, op, b] = nodes;
    if (op.type === 'operator' && op.operator === '+') {
      if (a.type === 'power' && a.exponent.length === 1 && isNumberValue(a.exponent[0], 2)) {
        if (b.type === 'number' && parseFloat(b.value) > 0) return true;
      }
    }
  }
  return false;
}

/** MathNode의 모든 자식 배열을 반환 */
function getChildArrays(node: MathNode): MathNode[][] {
  switch (node.type) {
    case 'root':
    case 'row':
      return [node.children];
    case 'frac':
      return [node.numerator, node.denominator];
    case 'power':
      return [node.base, node.exponent];
    case 'subscript':
      return [node.base, node.subscript];
    case 'sqrt':
      return node.index ? [node.content, node.index] : [node.content];
    case 'paren':
    case 'abs':
    case 'overline':
    case 'accent':
    case 'cancel':
      return [node.content];
    case 'func':
      return [node.argument];
    case 'integral': {
      const arrays: MathNode[][] = [node.integrand];
      if (node.lower) arrays.push(node.lower);
      if (node.upper) arrays.push(node.upper);
      return arrays;
    }
    case 'sum':
    case 'product':
      return [node.lower, node.upper, node.body];
    case 'limit':
      return [node.approach, node.body];
    case 'overset':
      return [node.base, node.annotation];
    case 'xarrow':
      return node.below ? [node.above, node.below] : [node.above];
    case 'matrix':
    case 'align':
    case 'cases':
    case 'array':
      return node.rows;
    case 'gather':
      return [node.rows];
    case 'opaque':
      return node.args;
    default:
      return [];
  }
}

// ─── AST 조상 경로 빌드 ───

/**
 * AST를 DFS 순회하며 각 노드 ID → 조상 경로 매핑을 구축한다.
 */
export function buildAstAncestorMap(ast: MathNode): Map<string, AncestorEntry[]> {
  const map = new Map<string, AncestorEntry[]>();

  function walk(node: MathNode, ancestors: AncestorEntry[]): void {
    map.set(node.id, [...ancestors]);

    switch (node.type) {
      case 'root':
      case 'row':
        for (const child of node.children) {
          walk(child, [...ancestors, { node, childPosition: 'child' }]);
        }
        break;
      case 'frac':
        for (const c of node.numerator)
          walk(c, [...ancestors, { node, childPosition: 'numerator' }]);
        for (const c of node.denominator)
          walk(c, [...ancestors, { node, childPosition: 'denominator' }]);
        break;
      case 'power':
        for (const c of node.base)
          walk(c, [...ancestors, { node, childPosition: 'base' }]);
        for (const c of node.exponent)
          walk(c, [...ancestors, { node, childPosition: 'exponent' }]);
        break;
      case 'subscript':
        for (const c of node.base)
          walk(c, [...ancestors, { node, childPosition: 'base' }]);
        for (const c of node.subscript)
          walk(c, [...ancestors, { node, childPosition: 'subscript' }]);
        break;
      case 'sqrt':
        for (const c of node.content)
          walk(c, [...ancestors, { node, childPosition: 'content' }]);
        if (node.index) {
          for (const c of node.index)
            walk(c, [...ancestors, { node, childPosition: 'index' }]);
        }
        break;
      case 'paren':
        for (const c of node.content)
          walk(c, [...ancestors, { node, childPosition: 'content' }]);
        break;
      case 'abs':
        for (const c of node.content)
          walk(c, [...ancestors, { node, childPosition: 'content' }]);
        break;
      case 'func':
        for (const c of node.argument)
          walk(c, [...ancestors, { node, childPosition: 'argument' }]);
        break;
      case 'integral':
        if (node.lower) {
          for (const c of node.lower)
            walk(c, [...ancestors, { node, childPosition: 'lower' }]);
        }
        if (node.upper) {
          for (const c of node.upper)
            walk(c, [...ancestors, { node, childPosition: 'upper' }]);
        }
        for (const c of node.integrand)
          walk(c, [...ancestors, { node, childPosition: 'integrand' }]);
        break;
      case 'sum':
      case 'product':
        for (const c of node.lower)
          walk(c, [...ancestors, { node, childPosition: 'lower' }]);
        for (const c of node.upper)
          walk(c, [...ancestors, { node, childPosition: 'upper' }]);
        for (const c of node.body)
          walk(c, [...ancestors, { node, childPosition: 'body' }]);
        break;
      case 'limit':
        for (const c of node.approach)
          walk(c, [...ancestors, { node, childPosition: 'approach' }]);
        for (const c of node.body)
          walk(c, [...ancestors, { node, childPosition: 'body' }]);
        break;
      case 'overline':
        for (const c of node.content)
          walk(c, [...ancestors, { node, childPosition: 'content' }]);
        break;
      case 'accent':
        for (const c of node.content)
          walk(c, [...ancestors, { node, childPosition: 'content' }]);
        break;
      case 'overset':
        for (const c of node.base)
          walk(c, [...ancestors, { node, childPosition: 'base' }]);
        for (const c of node.annotation)
          walk(c, [...ancestors, { node, childPosition: 'annotation' }]);
        break;
      case 'cancel':
        for (const c of node.content)
          walk(c, [...ancestors, { node, childPosition: 'content' }]);
        break;
      case 'xarrow':
        for (const c of node.above)
          walk(c, [...ancestors, { node, childPosition: 'above' }]);
        if (node.below) {
          for (const c of node.below)
            walk(c, [...ancestors, { node, childPosition: 'below' }]);
        }
        break;
      case 'matrix':
      case 'align':
      case 'cases':
      case 'array':
        for (let ri = 0; ri < node.rows.length; ri++) {
          const row = node.rows[ri];
          for (let ci = 0; ci < row.length; ci++) {
            walk(row[ci], [...ancestors, { node, childPosition: 'element' }]);
          }
        }
        break;
      case 'gather':
        for (const row of node.rows)
          walk(row, [...ancestors, { node, childPosition: 'row' }]);
        break;
      case 'opaque':
        for (const argGroup of node.args) {
          for (const c of argGroup) {
            walk(c, [...ancestors, { node, childPosition: 'arg' }]);
          }
        }
        break;
      // 리프: number, variable, operator, text, space, literal, error
      default:
        break;
    }
  }

  walk(ast, []);
  return map;
}

// ─── Layer 1: 기본 구조적 의미 규칙 ───

const LAYER1_RULES: SemanticRule[] = [
  // ─── 분수 (frac) ───
  {
    parentType: 'frac',
    childPosition: 'numerator',
    role: '분자',
    description: '분수에서 위쪽 부분. 나누어지는 양입니다.',
    refinements: [
      {
        condition: (node) => containsVariable(node),
        description: '분자에 변수가 포함되어 있어 함수의 영점(f(x)=0)을 결정합니다.',
      },
      {
        condition: isConstantOnly,
        description: '분자가 상수이므로 이 분수의 크기가 고정된 비율입니다.',
      },
    ],
  },
  {
    parentType: 'frac',
    childPosition: 'denominator',
    role: '분모',
    description: '분수에서 아래쪽 부분. 나누는 양입니다. 0이 되면 정의되지 않습니다.',
    refinements: [
      {
        condition: (node) => containsVariable(node),
        description: '분모에 변수가 있어 특정 값에서 정의되지 않을 수 있습니다 (점근선).',
      },
      {
        condition: isConstantOnly,
        description: '분모가 상수이므로 전체 식에 고정 비율을 적용합니다.',
      },
    ],
  },

  // ─── 거듭제곱 (power) ───
  {
    parentType: 'power',
    childPosition: 'base',
    role: '밑',
    description: '거듭제곱에서 반복 곱해지는 대상입니다.',
    refinements: [
      {
        condition: isEulerE,
        description: '자연상수 e를 밑으로 하는 지수함수입니다. 성장/감쇠를 나타냅니다.',
      },
      {
        condition: (node) => node.type === 'variable',
        description: '변수의 거듭제곱입니다. 지수가 클수록 빠르게 증가합니다.',
      },
    ],
  },
  {
    parentType: 'power',
    childPosition: 'exponent',
    role: '지수',
    description: '거듭제곱에서 곱하는 횟수입니다.',
    refinements: [
      {
        condition: (node) => isNumberValue(node, 2),
        description: '제곱 — 결과는 항상 0 이상입니다.',
      },
      {
        condition: (node) => isNumberValue(node, -1),
        description: '역수 — 1/밑 과 같습니다.',
      },
      {
        condition: (node) => isNumberValue(node, 0.5) || isNumberValue(node, 1 / 2),
        description: '제곱근 — 밑의 양의 제곱근입니다.',
      },
      {
        condition: (node) => containsVariable(node),
        description: '지수에 변수가 포함되어 지수적 성장/감쇠를 나타냅니다.',
      },
    ],
  },

  // ─── 제곱근 (sqrt) ───
  {
    parentType: 'sqrt',
    childPosition: 'content',
    role: '피근호수',
    description: '제곱근을 구하는 대상입니다. 실수 범위에서는 음수가 될 수 없습니다.',
  },
  {
    parentType: 'sqrt',
    childPosition: 'index',
    role: '근호 차수',
    description: 'n제곱근의 n입니다. 생략되면 2(제곱근)입니다.',
  },

  // ─── 아래첨자 (subscript) ───
  {
    parentType: 'subscript',
    childPosition: 'base',
    role: '인덱싱 대상',
    description: '아래첨자가 붙는 대상입니다.',
  },
  {
    parentType: 'subscript',
    childPosition: 'subscript',
    role: '인덱스',
    description: '특정 원소나 성분을 지정하는 번호입니다.',
  },

  // ─── 시그마/합산 (sum) ───
  {
    parentType: 'sum',
    childPosition: 'lower',
    role: '합산 시작',
    description: '합산이 시작되는 인덱스 값입니다.',
  },
  {
    parentType: 'sum',
    childPosition: 'upper',
    role: '합산 끝',
    description: '합산이 끝나는 인덱스 값입니다.',
    refinements: [
      {
        condition: isInfinity,
        description: '무한대까지 합산하는 무한급수입니다. 수렴 여부가 중요합니다.',
      },
    ],
  },
  {
    parentType: 'sum',
    childPosition: 'body',
    role: '일반항',
    description: '각 단계에서 더해지는 양입니다. 인덱스에 따라 값이 달라집니다.',
  },

  // ─── 프로덕트 (product) ───
  {
    parentType: 'product',
    childPosition: 'lower',
    role: '곱 시작',
    description: '곱셈이 시작되는 인덱스 값입니다.',
  },
  {
    parentType: 'product',
    childPosition: 'upper',
    role: '곱 끝',
    description: '곱셈이 끝나는 인덱스 값입니다.',
  },
  {
    parentType: 'product',
    childPosition: 'body',
    role: '일반항',
    description: '각 단계에서 곱해지는 양입니다.',
  },

  // ─── 적분 (integral) ───
  {
    parentType: 'integral',
    childPosition: 'lower',
    role: '적분 하한',
    description: '적분 구간의 시작점입니다.',
  },
  {
    parentType: 'integral',
    childPosition: 'upper',
    role: '적분 상한',
    description: '적분 구간의 끝점입니다.',
    refinements: [
      {
        condition: isInfinity,
        description: '양의 무한대까지 적분합니다. 수렴 여부를 확인해야 합니다.',
      },
    ],
  },
  {
    parentType: 'integral',
    childPosition: 'integrand',
    role: '피적분함수',
    description: '적분하는 대상입니다. 이 함수의 곡선 아래 넓이를 구합니다.',
  },

  // ─── 극한 (limit) ───
  {
    parentType: 'limit',
    childPosition: 'approach',
    role: '접근 값',
    description: '변수가 한없이 가까워지는 목표 값입니다.',
  },
  {
    parentType: 'limit',
    childPosition: 'body',
    role: '극한 대상',
    description: '변수가 접근할 때 이 식의 값이 어디로 수렴하는지 봅니다.',
  },

  // ─── 괄호/절댓값 ───
  {
    parentType: 'paren',
    childPosition: 'content',
    role: '묶음',
    description: '괄호로 묶여 하나의 단위로 취급되는 식입니다.',
  },
  {
    parentType: 'abs',
    childPosition: 'content',
    role: '절댓값 대상',
    description: '부호를 무시한 크기입니다. 결과는 항상 0 이상입니다.',
  },

  // ─── 함수 (func) ───
  {
    parentType: 'func',
    childPosition: 'argument',
    role: '함수 인자',
    description: '함수에 입력되는 값입니다.',
  },

  // ─── 행렬 (matrix) ───
  {
    parentType: 'matrix',
    childPosition: 'element',
    role: '행렬 성분',
    description: '행렬의 한 원소입니다.',
  },

  // ─── cases ───
  {
    parentType: 'cases',
    childPosition: 'element',
    role: '조건부 값',
    description: '특정 조건이 만족될 때의 함수값입니다.',
  },

  // ─── 악센트 (accent) ───
  {
    parentType: 'accent',
    childPosition: 'content',
    role: '악센트 대상',
    description: '악센트가 붙은 기호입니다.',
    refinements: [
      {
        // hat → 추정값/단위벡터
        condition: (node) => {
          // 부모가 accent이고 accentType이 hat인지는 상위에서 판별
          // 여기서는 항상 false → 부모 accentType 기반 분기는 getSemanticForAccent에서 처리
          return false;
        },
        description: '',
      },
    ],
  },

  // ─── 윗줄 (overline) ───
  {
    parentType: 'overline',
    childPosition: 'content',
    role: '평균/켤레',
    description: '윗줄은 평균, 복소 켤레, 또는 위상수학에서 폐포를 나타냅니다.',
  },

  // ─── 취소선 (cancel) ───
  {
    parentType: 'cancel',
    childPosition: 'content',
    role: '취소된 항',
    description: '약분되거나 소거되는 부분입니다.',
  },

  // ─── 위/아래 주석 (overset) ───
  {
    parentType: 'overset',
    childPosition: 'base',
    role: '기본 기호',
    description: '주석이 붙는 대상 기호입니다.',
  },
  {
    parentType: 'overset',
    childPosition: 'annotation',
    role: '주석',
    description: '기호 위/아래에 붙는 추가 설명입니다.',
  },

  // ─── 확장 화살표 (xarrow) ───
  {
    parentType: 'xarrow',
    childPosition: 'above',
    role: '화살표 위 텍스트',
    description: '반응이나 변환의 조건을 나타냅니다.',
  },
  {
    parentType: 'xarrow',
    childPosition: 'below',
    role: '화살표 아래 텍스트',
    description: '반응이나 변환의 부가 조건을 나타냅니다.',
  },
];

// ─── Layer 2: 조합 의미 규칙 ───

const LAYER2_RULES: CombinedSemanticRule[] = [
  // ─── 분수 + 거듭제곱 ───
  {
    pathPattern: ['frac.denominator', 'power.base'],
    description: '분모에서 거듭제곱의 밑입니다. 변수라면 커질수록 전체 함수값이 억제됩니다.',
    condition: (node) => node.type === 'variable',
  },
  {
    pathPattern: ['frac.denominator', 'power.exponent'],
    description: '분모의 거듭제곱 차수입니다. 지수가 클수록 분모가 빠르게 커져 전체 값을 억제합니다.',
  },

  // ─── 시그마 + 분수 ───
  {
    pathPattern: ['sum.body', 'frac.denominator'],
    role: '급수 분모',
    description: '급수의 각 항의 분모입니다. 빠르게 커지면 급수가 수렴할 가능성이 높습니다.',
  },
  {
    pathPattern: ['sum.body', 'frac.denominator', 'power.exponent'],
    role: 'p-급수 지수',
    description: '급수 분모의 거듭제곱 지수입니다. 1보다 크면 급수가 수렴합니다 (p-급수 판정).',
  },
  {
    pathPattern: ['sum.body', 'frac.numerator'],
    role: '급수 분자',
    description: '급수의 각 항의 분자입니다.',
  },

  // ─── 적분 + 무한 구간 ───
  {
    pathPattern: ['integral.lower'],
    description: '적분이 음의 무한대에서 시작하는 이상적분입니다. 피적분함수가 충분히 빨리 감쇠해야 수렴합니다.',
    condition: (node) => isInfinity(node) || (node.type === 'operator' && node.operator === '-'),
  },

  // ─── 지수함수 조합 ───
  {
    pathPattern: ['power.exponent', 'frac.numerator'],
    description: '지수가 분수의 분자입니다. 전체 지수가 분수면 근(root)을 나타냅니다.',
  },
  {
    pathPattern: ['power.exponent', 'frac.denominator'],
    description: '지수의 분모입니다. 분모가 n이면 n제곱근과 같습니다.',
  },

  // ─── 분수 중첩 ───
  {
    pathPattern: ['frac.numerator', 'frac.numerator'],
    role: '중첩 분자',
    description: '분수 안에 분수가 중첩되어 있습니다. 복잡한 비율 관계를 나타냅니다.',
  },
  {
    pathPattern: ['frac.denominator', 'frac.denominator'],
    role: '중첩 분모',
    description: '분모 안에 또 분수가 있습니다. 전체를 정리하면 곱셈으로 변환할 수 있습니다.',
  },

  // ─── 적분 + 분수 ───
  {
    pathPattern: ['integral.integrand', 'frac.numerator'],
    description: '적분하는 분수의 분자입니다.',
  },
  {
    pathPattern: ['integral.integrand', 'frac.denominator'],
    description: '적분하는 분수의 분모입니다. 부분분수 분해가 유용할 수 있습니다.',
  },

  // ─── 극한 + 분수 ───
  {
    pathPattern: ['limit.body', 'frac.numerator'],
    description: '극한에서 분수의 분자입니다. 분모와 동시에 0이나 무한이 되면 로피탈 정리를 적용할 수 있습니다.',
  },
  {
    pathPattern: ['limit.body', 'frac.denominator'],
    description: '극한에서 분수의 분모입니다. 분자와 동시에 0이나 무한이 되면 로피탈 정리를 적용할 수 있습니다.',
  },
];

// ─── 경로 패턴 매칭 ───

/**
 * 조상 경로의 끝이 패턴과 매칭하는지 확인한다 (접미사 매칭).
 */
function matchesPathPattern(path: string[], pattern: string[]): boolean {
  if (pattern.length > path.length) return false;
  // 패턴은 경로 끝(현재 노드에 가까운 쪽)과 매칭
  const offset = path.length - pattern.length;
  for (let i = 0; i < pattern.length; i++) {
    if (path[offset + i] !== pattern[i]) return false;
  }
  return true;
}

// ─── 폴백 설명 ───

function getDefaultRole(node: MathNode): string {
  switch (node.type) {
    case 'number': return '숫자';
    case 'variable': return '변수';
    case 'operator': return '연산자';
    case 'frac': return '분수';
    case 'power': return '거듭제곱';
    case 'subscript': return '아래첨자';
    case 'sqrt': return '제곱근';
    case 'func': return `함수 ${node.name}`;
    case 'sum': return '합산 (Sigma)';
    case 'product': return '곱 (Pi)';
    case 'integral': return '적분';
    case 'limit': return '극한 (lim)';
    case 'matrix': return '행렬';
    case 'paren': return '괄호';
    case 'abs': return '절댓값';
    case 'overline': return '윗줄';
    case 'accent': return getAccentRoleName(node.accentType);
    case 'text': return '텍스트';
    case 'cases': return '조건부';
    case 'cancel': return '취소선';
    default: return node.type;
  }
}

function getAccentRoleName(accentType: string): string {
  switch (accentType) {
    case 'hat': case 'widehat': return '추정값/단위벡터';
    case 'vec': case 'overrightarrow': case 'overleftarrow': return '벡터';
    case 'dot': return '시간 미분';
    case 'ddot': return '이계 시간 미분';
    case 'tilde': case 'widetilde': return '근사/변환';
    case 'bar': return '평균/켤레';
    default: return '악센트';
  }
}

function getDefaultDescription(node: MathNode): string {
  switch (node.type) {
    case 'number':
      return `숫자 ${node.value}입니다.`;
    case 'variable': {
      if (isInfinity(node)) return '무한대를 나타냅니다.';
      if (isEulerE(node)) return '자연상수 e (약 2.718)입니다. 지수함수와 미적분의 기초입니다.';
      if (node.name === 'π' || node.name === 'pi') return '원주율 파이 (약 3.14159)입니다.';
      if (node.name === 'i') return '허수 단위입니다. i의 제곱은 -1입니다.';
      return `변수 ${node.name}입니다. 값이 변할 수 있습니다.`;
    }
    case 'operator':
      return getOperatorDescription(node.operator);
    case 'frac':
      return '분수 — 위(분자)를 아래(분모)로 나눈 값입니다.';
    case 'power':
      return '거듭제곱 — 밑을 지수만큼 반복 곱합니다.';
    case 'sqrt':
      return '제곱근 — 제곱해서 이 값이 되는 수입니다.';
    case 'func':
      return getFunctionDescription(node.name);
    case 'sum':
      return '합산 — 인덱스를 바꿔가며 일반항을 모두 더합니다.';
    case 'product':
      return '곱 — 인덱스를 바꿔가며 일반항을 모두 곱합니다.';
    case 'integral':
      return '적분 — 함수의 곡선 아래 넓이를 구합니다.';
    case 'limit':
      return '극한 — 변수가 특정 값에 가까워질 때의 수렴값입니다.';
    case 'matrix':
      return `${node.rows.length}x${node.rows[0]?.length ?? 0} 행렬입니다.`;
    case 'paren':
      return '괄호로 묶인 식입니다.';
    case 'abs':
      return '절댓값 — 부호를 무시한 크기입니다.';
    case 'accent':
      return getAccentDescription(node.accentType);
    case 'overline':
      return '윗줄이 있는 기호입니다. 평균, 켤레, 폐포 등을 나타냅니다.';
    default:
      return '';
  }
}

function getOperatorDescription(op: string): string {
  switch (op) {
    case '+': return '덧셈 연산입니다.';
    case '-': return '뺄셈 연산 또는 음수 부호입니다.';
    case '×': case '·': case '*': return '곱셈 연산입니다.';
    case '÷': return '나눗셈 연산입니다.';
    case '=': return '등호 — 양변이 같음을 나타냅니다.';
    case '<': return '부등호 — 왼쪽이 오른쪽보다 작습니다.';
    case '>': return '부등호 — 왼쪽이 오른쪽보다 큽니다.';
    case '≤': return '이하 — 왼쪽이 오른쪽보다 작거나 같습니다.';
    case '≥': return '이상 — 왼쪽이 오른쪽보다 크거나 같습니다.';
    case '≠': return '같지 않음을 나타냅니다.';
    case '∈': return '원소 포함 — 왼쪽이 오른쪽 집합에 속합니다.';
    case '→': case '⟹': return '함의 — 왼쪽 조건이 오른쪽 결론을 이끌어냅니다.';
    case '∪': return '합집합 — 두 집합의 모든 원소를 합칩니다.';
    case '∩': return '교집합 — 두 집합에 공통인 원소만 남깁니다.';
    default: return `연산자 ${op}입니다.`;
  }
}

function getFunctionDescription(name: string): string {
  switch (name) {
    case 'sin': return '사인 함수 — 삼각함수의 하나로, 직각삼각형에서 대변/빗변입니다.';
    case 'cos': return '코사인 함수 — 삼각함수의 하나로, 인접변/빗변입니다.';
    case 'tan': return '탄젠트 함수 — sin/cos 입니다.';
    case 'log': return '로그 함수 — 거듭제곱의 역함수입니다.';
    case 'ln': return '자연로그 — 밑이 e인 로그입니다.';
    case 'exp': return '지수함수 — e의 거듭제곱입니다.';
    case 'lim': return '극한 함수입니다.';
    case 'det': return '행렬식 — 행렬의 스칼라 특성값입니다.';
    case 'max': return '최댓값을 구하는 함수입니다.';
    case 'min': return '최솟값을 구하는 함수입니다.';
    default: return `함수 ${name}입니다.`;
  }
}

function getAccentDescription(accentType: string): string {
  switch (accentType) {
    case 'hat': case 'widehat': return '모자 기호는 추정값 또는 단위 벡터를 나타냅니다.';
    case 'vec': case 'overrightarrow': return '화살표는 크기와 방향을 가진 벡터임을 나타냅니다.';
    case 'dot': return '점은 시간에 대한 미분을 나타냅니다. 물리에서 속도 등에 사용합니다.';
    case 'ddot': return '점 두 개는 시간에 대한 이차 미분을 나타냅니다. 가속도 등에 사용합니다.';
    case 'tilde': case 'widetilde': return '물결표는 근사값 또는 변환된 양을 나타냅니다.';
    case 'bar': return '가로줄은 평균값 또는 복소수의 켤레를 나타냅니다.';
    default: return '악센트가 붙은 기호입니다.';
  }
}

// ─── 메인 엔진 ───

/**
 * 주어진 AST 노드의 구조적 의미를 해석한다.
 *
 * Layer 2 (경로 조합) → Layer 1 (부모-자식) → 폴백 순서로 탐색.
 *
 * @param node - 호버된 AST 노드
 * @param ancestors - buildAstAncestorMap에서 얻은 조상 경로
 */
export function getSemanticMeaning(
  node: MathNode,
  ancestors: AncestorEntry[],
): SemanticResult {
  // 의미 있는 조상만 추출 (root, row는 구조적 의미가 없으므로 건너뜀)
  const meaningfulAncestors = ancestors.filter(
    a => a.node.type !== 'root' && a.node.type !== 'row',
  );

  // 조상 경로를 "parentType.childPosition" 문자열 배열로 변환
  const path = meaningfulAncestors.map(a => `${a.node.type}.${a.childPosition}`);

  // 1. Layer 2: 조합 규칙 (긴 패턴 먼저)
  const sortedL2 = [...LAYER2_RULES].sort(
    (a, b) => b.pathPattern.length - a.pathPattern.length,
  );

  for (const rule of sortedL2) {
    if (matchesPathPattern(path, rule.pathPattern)) {
      if (!rule.condition || rule.condition(node)) {
        return {
          role: rule.role || getLayer1Role(node, meaningfulAncestors) || getDefaultRole(node),
          description: rule.description,
          layer: 2,
        };
      }
    }
  }

  // 2. Layer 1: 기본 구조적 의미 (의미 있는 가장 가까운 부모에서 매칭)
  if (meaningfulAncestors.length > 0) {
    const parent = meaningfulAncestors[meaningfulAncestors.length - 1];
    // accent 타입은 별도 처리 (accentType 기반 분기)
    if (parent.node.type === 'accent') {
      return getSemanticForAccent(node, parent);
    }

    const rule = LAYER1_RULES.find(
      r => r.parentType === parent.node.type && r.childPosition === parent.childPosition,
    );

    if (rule) {
      let description = rule.description;
      if (rule.refinements) {
        for (const ref of rule.refinements) {
          if (ref.condition(node)) {
            description = ref.description;
            break;
          }
        }
      }
      return { role: rule.role, description, layer: 1 };
    }
  }

  // 3. 폴백
  return {
    role: getDefaultRole(node),
    description: getDefaultDescription(node),
    layer: 0,
  };
}

/** Layer 1에서 role만 가져오기 (Layer 2에서 role 폴백용, meaningfulAncestors 전달) */
function getLayer1Role(_node: MathNode, meaningfulAncestors: AncestorEntry[]): string | null {
  if (meaningfulAncestors.length === 0) return null;
  const parent = meaningfulAncestors[meaningfulAncestors.length - 1];
  const rule = LAYER1_RULES.find(
    r => r.parentType === parent.node.type && r.childPosition === parent.childPosition,
  );
  return rule?.role ?? null;
}

/** accent 노드의 accentType별 의미 */
function getSemanticForAccent(node: MathNode, parent: AncestorEntry): SemanticResult {
  const accentNode = parent.node;
  if (accentNode.type !== 'accent') {
    return { role: '악센트 대상', description: '악센트가 붙은 기호입니다.', layer: 1 };
  }

  const role = getAccentRoleName(accentNode.accentType);
  const description = getAccentDescription(accentNode.accentType);
  return { role, description, layer: 1 };
}

/**
 * AST 전체에 대해 한번에 semantic 정보를 빌드한다.
 * ExpressionExplorer에서 사용 — AST 노드 ID → 의미 결과 매핑.
 *
 * @param ast - AST 루트 노드
 * @returns nodeId → SemanticResult 맵
 */
export function buildSemanticMap(
  ast: MathNode,
): Map<string, SemanticResult> {
  const ancestorMap = buildAstAncestorMap(ast);
  const semanticMap = new Map<string, SemanticResult>();

  function walk(node: MathNode): void {
    const ancestors = ancestorMap.get(node.id) ?? [];
    semanticMap.set(node.id, getSemanticMeaning(node, ancestors));
    for (const children of getChildArrays(node)) {
      for (const child of children) walk(child);
    }
  }

  walk(ast);
  return semanticMap;
}

