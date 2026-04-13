/**
 * Fizzex - 수식 에디터 타입 정의
 */

/** AST 노드 타입 */
export type MathNodeType =
  | 'root'      // 루트 컨테이너
  | 'row'       // 가로 나열
  | 'number'    // 숫자
  | 'variable'  // 변수 (x, y, θ 등)
  | 'operator'  // 연산자 (+, -, ×, ÷, =, <, >, ≤, ≥, ≠)
  | 'frac'      // 분수
  | 'power'     // 거듭제곱
  | 'subscript' // 아래첨자
  | 'sqrt'      // 제곱근
  | 'paren'     // 괄호
  | 'abs'       // 절댓값
  | 'func'      // 함수 (sin, cos, log 등)
  | 'integral'  // 적분
  | 'sum'       // 시그마/합
  | 'limit'     // 극한
  | 'product'   // 곱 (∏)
  | 'overline'  // 윗줄 (평균, 벡터 등)
  | 'accent'    // 악센트 (hat, vec, dot, ddot, tilde 등)
  | 'matrix'    // 행렬
  | 'text'      // 텍스트 (레이블)
  | 'space'     // 수식 공백 (\,, \;, \quad 등)
  | 'align'     // 정렬 환경 (align, align*, aligned)
  | 'cases'     // 조건부 환경 (cases)
  | 'gather'    // 중앙 정렬 환경 (gather, gather*, gathered)
  | 'array';    // 배열 환경 (array)

/** 기본 노드 인터페이스 */
export interface MathNodeBase {
  id: string;
  type: MathNodeType;
}

/** 숫자 노드 */
export interface NumberNode extends MathNodeBase {
  type: 'number';
  value: string; // "123", "3.14" 등
}

/** 변수 노드 */
export interface VariableNode extends MathNodeBase {
  type: 'variable';
  name: string; // "x", "y", "θ" 등
}

/** 연산자 노드 */
export interface OperatorNode extends MathNodeBase {
  type: 'operator';
  operator: string; // +, -, ×, ÷, =, ·, <, >, ≤, ≥, ≠, ∀, ∃, ∧, ∨, ¬, →, ←, ↔, ⟹, ⟺, ∈, ∉, ⊂, ⊆, ∪, ∩, etc.
}

/** 분수 노드 */
export interface FracNode extends MathNodeBase {
  type: 'frac';
  numerator: MathNode[];   // 분자
  denominator: MathNode[]; // 분모
}

/** 거듭제곱 노드 */
export interface PowerNode extends MathNodeBase {
  type: 'power';
  base: MathNode[];     // 밑
  exponent: MathNode[]; // 지수
}

/** 아래첨자 노드 */
export interface SubscriptNode extends MathNodeBase {
  type: 'subscript';
  base: MathNode[];     // 밑
  subscript: MathNode[]; // 아래첨자
}

/** 제곱근 노드 */
export interface SqrtNode extends MathNodeBase {
  type: 'sqrt';
  content: MathNode[];  // 루트 안 내용
  index?: MathNode[];   // n제곱근의 n (생략 시 2)
}

/** 괄호 노드 */
export interface ParenNode extends MathNodeBase {
  type: 'paren';
  content: MathNode[];
  parenType: '(' | '[' | '{';
  /** 자동 크기 조절 여부 (\left \right 사용 시 true) */
  autoSize?: boolean;
}

/** 절댓값 노드 */
export interface AbsNode extends MathNodeBase {
  type: 'abs';
  content: MathNode[];
}

/** 함수 노드 */
export interface FuncNode extends MathNodeBase {
  type: 'func';
  name: string; // "sin", "cos", "log" 등
  argument: MathNode[];
}

/** 적분 노드 */
export interface IntegralNode extends MathNodeBase {
  type: 'integral';
  lower?: MathNode[];    // 하한 (생략 가능)
  upper?: MathNode[];    // 상한 (생략 가능)
  integrand: MathNode[]; // 피적분 함수
  differential: string;  // 적분 변수 ("x", "t" 등)
  integralType?: 'int' | 'iint' | 'iiint' | 'oint';  // 적분 타입 (기본: int)
}

/** 시그마/합 및 대형 연산자 노드 */
export interface SumNode extends MathNodeBase {
  type: 'sum';
  symbol?: string;        // 연산자 기호 (기본: 'Σ', 예: '∩', '∪', '∐' 등)
  lower: MathNode[];     // 하한 (i=1 등)
  upper: MathNode[];     // 상한 (n 등)
  body: MathNode[];      // 피합 표현식
}

/** 극한 노드 */
export interface LimitNode extends MathNodeBase {
  type: 'limit';
  variable: string;      // 변수 ("x", "n" 등)
  approach: MathNode[];  // 접근값 (∞, 0 등)
  body: MathNode[];      // 표현식
}

/** 곱 노드 (∏) */
export interface ProductNode extends MathNodeBase {
  type: 'product';
  lower: MathNode[];     // 하한 (i=1 등)
  upper: MathNode[];     // 상한 (n 등)
  body: MathNode[];      // 피곱 표현식
}

/** 윗줄 노드 (평균, 벡터 등) */
export interface OverlineNode extends MathNodeBase {
  type: 'overline';
  content: MathNode[];   // 윗줄 아래 내용
}

/** 악센트 노드 (hat, vec, dot, ddot, tilde 등) */
export interface AccentNode extends MathNodeBase {
  type: 'accent';
  content: MathNode[];   // 악센트 아래 내용
  accentType: 'hat' | 'vec' | 'dot' | 'ddot' | 'tilde' | 'bar' | 'breve' | 'check' | 'acute' | 'grave' | 'mathring';
}

/** 행렬 노드 */
export interface MatrixNode extends MathNodeBase {
  type: 'matrix';
  rows: MathNode[][];    // 2D 배열 (각 셀은 row 노드)
  bracketType: '(' | '[' | '{' | '|' | '||' | 'none';  // 괄호 타입
}

/**
 * 정렬 환경 노드 (align, align*, aligned)
 *
 * 각 행은 & 로 구분된 열들로 구성
 * 홀수 열은 오른쪽 정렬, 짝수 열은 왼쪽 정렬
 */
export interface AlignNode extends MathNodeBase {
  type: 'align';
  rows: MathNode[][];    // 2D 배열 [행][열]
  starred: boolean;      // align* 여부 (번호 없음)
  isInline: boolean;     // aligned 여부 (다른 환경 내부용)
}

/**
 * 조건부 환경 노드 (cases)
 *
 * 왼쪽 중괄호와 함께 조건별 수식 표시
 */
export interface CasesNode extends MathNodeBase {
  type: 'cases';
  rows: MathNode[][];    // 2D 배열 [조건][값, 조건설명]
}

/**
 * 중앙 정렬 환경 노드 (gather, gather*, gathered)
 *
 * 모든 행이 중앙 정렬됨
 */
export interface GatherNode extends MathNodeBase {
  type: 'gather';
  rows: MathNode[];      // 각 행 (중앙 정렬)
  starred: boolean;      // gather* 여부
  isInline: boolean;     // gathered 여부
}

/**
 * 배열 환경 노드 (array)
 *
 * 일반적인 테이블 형태, 열 정렬 지정 가능
 */
export interface ArrayNode extends MathNodeBase {
  type: 'array';
  rows: MathNode[][];    // 2D 배열
  colAlign: ('l' | 'c' | 'r')[];  // 각 열의 정렬 (left, center, right)
  colLines: boolean[];   // 열 사이 세로선 (n+1개: 왼쪽, 열 사이, 오른쪽)
  rowLines: boolean[];   // 행 사이 가로선 (n+1개: 위, 행 사이, 아래)
}

/** 텍스트 노드 (레이블) */
export interface TextNode extends MathNodeBase {
  type: 'text';
  content: string;       // 텍스트 내용
}

/** 수식 공백 노드 */
export interface SpaceNode extends MathNodeBase {
  type: 'space';
  /** 공백 크기 (em 단위, \, = 0.167, \; = 0.278, \quad = 1.0) */
  width: number;
}

/** Row 노드 (가로 나열) */
export interface RowNode extends MathNodeBase {
  type: 'row';
  children: MathNode[];
}

/** Root 노드 */
export interface RootNode extends MathNodeBase {
  type: 'root';
  children: MathNode[];
}

/** 모든 노드 타입 */
export type MathNode =
  | NumberNode
  | VariableNode
  | OperatorNode
  | FracNode
  | PowerNode
  | SubscriptNode
  | SqrtNode
  | ParenNode
  | AbsNode
  | FuncNode
  | IntegralNode
  | SumNode
  | LimitNode
  | ProductNode
  | OverlineNode
  | AccentNode
  | MatrixNode
  | AlignNode
  | CasesNode
  | GatherNode
  | ArrayNode
  | TextNode
  | SpaceNode
  | RowNode
  | RootNode;

/** 레이아웃 계산 결과 */
export interface LayoutBox {
  nodeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  baseline: number; // 기준선 (y 좌표 기준)
}

/** 커서 위치 */
export interface CursorPosition {
  /** 현재 위치한 노드의 ID */
  nodeId: string;
  /** 노드 내에서의 위치 (0 = 노드 앞, children.length = 노드 끝) */
  offset: number;
}

/** 렌더링 설정 */
export interface RenderConfig {
  fontSize: number;
  fontFamily: string;
  color: string;
  cursorColor: string;
  selectionColor: string;
}

/** 에디터 상태 */
export interface EditorState {
  ast: RootNode;
  cursor: CursorPosition;
  selection: { start: CursorPosition; end: CursorPosition } | null;
}
