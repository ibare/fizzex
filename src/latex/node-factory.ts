/**
 * 수학 노드 제네릭 팩토리
 *
 * 타입 안전한 노드 생성을 위한 팩토리 함수 제공.
 * 중복된 create* 함수들을 통합하여 일관된 노드 생성 API 제공.
 */

import type {
  MathNode,
  MathNodeType,
  NumberNode,
  VariableNode,
  OperatorNode,
  FracNode,
  PowerNode,
  SubscriptNode,
  SqrtNode,
  ParenNode,
  AbsNode,
  FuncNode,
  IntegralNode,
  SumNode,
  LimitNode,
  ProductNode,
  OverlineNode,
  AccentNode,
  OversetNode,
  CancelNode,
  XArrowNode,
  MatrixNode,
  AlignNode,
  CasesNode,
  GatherNode,
  ArrayNode,
  TextNode,
  SpaceNode,
  RowNode,
  RootNode,
  LiteralNode,
  ErrorNode,
  OpaqueNode,
} from '../types';
import { generateLatexId } from '../utils/id-generator';

/**
 * 노드 타입 → 노드 인터페이스 매핑
 *
 * 이 타입을 통해 createNode<'frac'>(...)가 FracNode를 반환함을 보장
 */
export type MathNodeMap = {
  number: NumberNode;
  variable: VariableNode;
  operator: OperatorNode;
  frac: FracNode;
  power: PowerNode;
  subscript: SubscriptNode;
  sqrt: SqrtNode;
  paren: ParenNode;
  abs: AbsNode;
  func: FuncNode;
  integral: IntegralNode;
  sum: SumNode;
  limit: LimitNode;
  product: ProductNode;
  overline: OverlineNode;
  accent: AccentNode;
  overset: OversetNode;
  cancel: CancelNode;
  xarrow: XArrowNode;
  matrix: MatrixNode;
  align: AlignNode;
  cases: CasesNode;
  gather: GatherNode;
  array: ArrayNode;
  text: TextNode;
  space: SpaceNode;
  row: RowNode;
  root: RootNode;
  literal: LiteralNode;
  error: ErrorNode;
  opaque: OpaqueNode;
};

/**
 * 노드 생성에 필요한 속성 (id와 type 제외)
 */
export type NodeProps<T extends MathNodeType> = Omit<MathNodeMap[T], 'id' | 'type'>;

/**
 * 제네릭 노드 팩토리 함수
 *
 * 타입 안전하게 모든 종류의 수학 노드를 생성.
 *
 * @example
 * // 숫자 노드 생성
 * const num = createNode('number', { value: '42' });
 *
 * // 분수 노드 생성
 * const frac = createNode('frac', {
 *   numerator: [createNode('number', { value: '1' })],
 *   denominator: [createNode('number', { value: '2' })],
 * });
 *
 * // 함수 노드 생성
 * const sin = createNode('func', {
 *   name: 'sin',
 *   argument: [createNode('variable', { name: 'x' })],
 * });
 */
export function createNode<T extends MathNodeType>(
  type: T,
  props: NodeProps<T>
): MathNodeMap[T] {
  return {
    id: generateLatexId(),
    type,
    ...props,
  } as MathNodeMap[T];
}

/**
 * 커스텀 ID로 노드 생성
 *
 * 특정 ID가 필요한 경우 (예: 테스트, 직렬화 복원)
 */
export function createNodeWithId<T extends MathNodeType>(
  id: string,
  type: T,
  props: NodeProps<T>
): MathNodeMap[T] {
  return {
    id,
    type,
    ...props,
  } as MathNodeMap[T];
}

// ============================================================================
// 편의 함수들 - 자주 사용되는 노드 타입에 대한 숏컷
// ============================================================================

/** 숫자 노드 생성 */
export function num(value: string): NumberNode {
  return createNode('number', { value });
}

/** 변수 노드 생성 */
export function variable(name: string): VariableNode {
  return createNode('variable', { name });
}

/** 연산자 노드 생성 */
export function operator(op: string): OperatorNode {
  return createNode('operator', { operator: op });
}

/** 분수 노드 생성 */
export function frac(numerator: MathNode[], denominator: MathNode[]): FracNode {
  return createNode('frac', { numerator, denominator });
}

/** 거듭제곱 노드 생성 */
export function power(base: MathNode[], exponent: MathNode[]): PowerNode {
  return createNode('power', { base, exponent });
}

/** 아래첨자 노드 생성 */
export function subscript(base: MathNode[], sub: MathNode[]): SubscriptNode {
  return createNode('subscript', { base, subscript: sub });
}

/** 제곱근 노드 생성 */
export function sqrt(content: MathNode[], index?: MathNode[]): SqrtNode {
  return createNode('sqrt', { content, index });
}

/** 괄호 노드 생성 */
export function paren(
  content: MathNode[],
  parenType: '(' | '[' | '{' = '(',
  autoSize = false
): ParenNode {
  return createNode('paren', { content, parenType, autoSize });
}

/** 절댓값 노드 생성 */
export function abs(content: MathNode[]): AbsNode {
  return createNode('abs', { content });
}

/** 함수 노드 생성 */
export function func(name: string, argument: MathNode[]): FuncNode {
  return createNode('func', { name, argument });
}

/** 적분 노드 생성 */
export function integral(
  integrand: MathNode[],
  differential: string,
  lower?: MathNode[],
  upper?: MathNode[],
  integralType: 'int' | 'iint' | 'iiint' | 'oint' = 'int'
): IntegralNode {
  return createNode('integral', { integrand, differential, lower, upper, integralType });
}

/** 시그마(합) 노드 생성 */
export function sum(lower: MathNode[], upper: MathNode[], body: MathNode[]): SumNode {
  return createNode('sum', { lower, upper, body });
}

/** 극한 노드 생성 */
export function limit(variable: string, approach: MathNode[], body: MathNode[]): LimitNode {
  return createNode('limit', { variable, approach, body });
}

/** 곱(∏) 노드 생성 */
export function product(lower: MathNode[], upper: MathNode[], body: MathNode[]): ProductNode {
  return createNode('product', { lower, upper, body });
}

/** 윗줄 노드 생성 */
export function overline(content: MathNode[]): OverlineNode {
  return createNode('overline', { content });
}

/** 악센트 노드 생성 */
export function accent(
  content: MathNode[],
  accentType: 'hat' | 'vec' | 'dot' | 'ddot' | 'tilde' | 'bar' | 'breve' | 'check'
): AccentNode {
  return createNode('accent', { content, accentType });
}

/** 행렬 노드 생성 */
export function matrix(
  rows: MathNode[][],
  bracketType: '(' | '[' | '{' | '|' | '‖' | 'none' = 'none'
): MatrixNode {
  return createNode('matrix', { rows, bracketType });
}

/** 정렬 환경 노드 생성 */
export function align(
  rows: MathNode[][],
  starred = false,
  isInline = false
): AlignNode {
  return createNode('align', { rows, starred, isInline });
}

/** cases 환경 노드 생성 */
export function cases(rows: MathNode[][]): CasesNode {
  return createNode('cases', { rows });
}

/** gather 환경 노드 생성 */
export function gather(
  rows: MathNode[],
  starred = false,
  isInline = false
): GatherNode {
  return createNode('gather', { rows, starred, isInline });
}

/** array 환경 노드 생성 */
export function array(
  rows: MathNode[][],
  colAlign: ('l' | 'c' | 'r')[],
  colLines: boolean[] = [],
  rowLines: boolean[] = []
): ArrayNode {
  return createNode('array', { rows, colAlign, colLines, rowLines });
}

/** 텍스트 노드 생성 */
export function text(content: string): TextNode {
  return createNode('text', { content });
}

/** 공백 노드 생성 */
export function space(width: number): SpaceNode {
  return createNode('space', { width });
}

/** Row 노드 생성 */
export function row(children: MathNode[]): RowNode {
  return createNode('row', { children });
}

/** Root 노드 생성 */
export function root(children: MathNode[]): RootNode {
  return createNode('root', { children });
}

/** 리터럴 노드 생성 (원본 LaTeX 보존) */
export function literal(raw: string): LiteralNode {
  return createNode('literal', { raw });
}

/** 에러 노드 생성 (파싱 실패 구간) */
export function error(raw: string, message: string, expected?: string[]): ErrorNode {
  return createNode('error', { raw, errorInfo: { message, expected } });
}

/** 불투명 노드 생성 (미지 커맨드) */
export function opaque(command: string, args: MathNode[][] = []): OpaqueNode {
  return createNode('opaque', { command, args });
}

// ============================================================================
// 노드 타입 검사 유틸리티
// ============================================================================

/**
 * 노드가 특정 타입인지 확인하는 타입 가드
 *
 * @example
 * if (isNodeType(node, 'frac')) {
 *   // node는 FracNode로 타입 추론됨
 *   console.log(node.numerator);
 * }
 */
export function isNodeType<T extends MathNodeType>(
  node: MathNode,
  type: T
): node is MathNodeMap[T] {
  return node.type === type;
}

/**
 * 여러 타입 중 하나인지 확인
 *
 * @example
 * if (isAnyNodeType(node, ['number', 'variable'])) {
 *   // node는 NumberNode | VariableNode로 타입 추론됨
 * }
 */
export function isAnyNodeType<T extends MathNodeType>(
  node: MathNode,
  types: T[]
): node is MathNodeMap[T] {
  return types.includes(node.type as T);
}

/**
 * 컨테이너 노드인지 확인 (children 속성을 가진 노드)
 */
export function isContainerNode(node: MathNode): node is RowNode | RootNode {
  return node.type === 'row' || node.type === 'root';
}

/**
 * 복합 노드인지 확인 (자식 노드 배열을 가진 노드)
 */
export function hasChildren(node: MathNode): boolean {
  const type = node.type;
  return (
    type === 'row' ||
    type === 'root' ||
    type === 'frac' ||
    type === 'power' ||
    type === 'subscript' ||
    type === 'sqrt' ||
    type === 'paren' ||
    type === 'abs' ||
    type === 'func' ||
    type === 'integral' ||
    type === 'sum' ||
    type === 'limit' ||
    type === 'product' ||
    type === 'overline' ||
    type === 'accent' ||
    type === 'matrix' ||
    type === 'align' ||
    type === 'cases' ||
    type === 'gather' ||
    type === 'array' ||
    type === 'overset' ||
    type === 'cancel' ||
    type === 'xarrow' ||
    type === 'opaque'
  );
}
