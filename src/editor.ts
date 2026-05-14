/**
 * 수식 에디터 로직
 *
 * AST 조작, 커서 관리, 키보드 입력 처리
 */

import type {
  MathNode,
  RootNode,
  RowNode,
  CursorPosition,
  EditorState,
  NumberNode,
  VariableNode,
  OperatorNode,
  FracNode,
  PowerNode,
  SubscriptNode,
  ParenNode,
  AbsNode,
  SqrtNode,
  FuncNode,
  IntegralNode,
  SumNode,
  LimitNode,
  ProductNode,
  OverlineNode,
  AccentNode,
  MatrixNode,
  AlignNode,
  CasesNode,
  GatherNode,
  ArrayNode,
  TextNode,
} from './types';
import { boundary, intra } from './types';
import { parseLatex } from './latex/latex-parser';
import { generateEditorId, deriveId, deriveCellId } from './utils/id-generator';
import {
  spliceChildren,
  rebuildAstWithNewChildren,
  buildNewState,
  freezeState,
} from './editor-utils';
import { getSlotPolicyByParent } from './cursor-policy';

/** MathNode에서 문자열 키로 자식 배열을 안전하게 접근하는 헬퍼 */
function getNodeChildArray(node: MathNode, key: string): MathNode[] {
  const descriptor = Object.getOwnPropertyDescriptor(node, key);
  if (!descriptor) return [];
  return Array.isArray(descriptor.value) ? descriptor.value : [];
}

/** generateId를 generateEditorId로 매핑 (하위 호환성) */
const generateId = generateEditorId;

/** 빈 루트 노드 생성 */
export function createEmptyRoot(): RootNode {
  return {
    id: generateId(),
    type: 'root',
    children: [],
  };
}

/** 초기 에디터 상태 */
export function createInitialState(): EditorState {
  const root = createEmptyRoot();
  return {
    ast: root,
    cursor: boundary(root.id, 0),
    selection: null,
  };
}

/** LaTeX 문자열에서 에디터 상태 생성 */
export function createStateFromLatex(latex: string): EditorState {
  if (!latex || latex.trim() === '') {
    return createInitialState();
  }

  try {
    const { ast } = parseLatex(latex);
    return {
      ast,
      cursor: boundary(ast.id, ast.children.length),
      selection: null,
    };
  } catch {
    // 파싱 실패 시 빈 상태 반환
    return createInitialState();
  }
}

/** 노드 생성 헬퍼들 */
export function createNumber(value: string): NumberNode {
  return { id: generateId(), type: 'number', value };
}

export function createVariable(name: string): VariableNode {
  return { id: generateId(), type: 'variable', name };
}

/** 연산자 타입 (createOperator의 허용 값) */
type OperatorSymbol = '+' | '-' | '×' | '÷' | '=' | '·' | '<' | '>' | '≤' | '≥' | '≠';

/**
 * 키보드 입력으로 발화되는 편집 액션의 디스크리미네이트 유니온.
 * 키→액션 매핑(`keyToInputAction`)이 단일 진실이고, MathEditor 내부 dispatcher가
 * 이를 받아 AST 변경 메서드로 위임한다.
 */
export type InputAction =
  | { type: 'insertNumber'; char: string }
  | { type: 'insertVariable'; name: string }
  | { type: 'insertOperator'; op: OperatorSymbol }
  | { type: 'insertFraction' }
  | { type: 'insertPower' }
  | { type: 'insertSubscript' }
  | { type: 'insertAbs' }
  | { type: 'insertParen'; paren: '(' | '[' | '{' }
  | { type: 'exitParen' }
  | { type: 'deleteBackward' }
  | { type: 'moveLeft' }
  | { type: 'moveRight' };

/**
 * 키 → InputAction 매핑. 매핑이 없으면 null.
 * editor.ts와 headless 어댑터가 공통으로 이 함수만 참조하도록 한다.
 */
export function keyToInputAction(key: string): InputAction | null {
  if (/^[0-9.]$/.test(key)) return { type: 'insertNumber', char: key };
  switch (key) {
    case '+': return { type: 'insertOperator', op: '+' };
    case '-': return { type: 'insertOperator', op: '-' };
    case '*': return { type: 'insertOperator', op: '×' };
    case '=': return { type: 'insertOperator', op: '=' };
    case '<': return { type: 'insertOperator', op: '<' };
    case '>': return { type: 'insertOperator', op: '>' };
    case '/': return { type: 'insertFraction' };
    case '^': return { type: 'insertPower' };
    case '_': return { type: 'insertSubscript' };
    case '|': return { type: 'insertAbs' };
    case '(':
    case '[':
    case '{':
      return { type: 'insertParen', paren: key };
    case ')':
    case ']':
    case '}':
      return { type: 'exitParen' };
    case 'Backspace': return { type: 'deleteBackward' };
    case 'ArrowLeft': return { type: 'moveLeft' };
    case 'ArrowRight': return { type: 'moveRight' };
  }
  if (key.length === 1 && !/\s/.test(key)) {
    return { type: 'insertVariable', name: key };
  }
  return null;
}

export function createOperator(op: OperatorSymbol): OperatorNode {
  return { id: generateId(), type: 'operator', operator: op };
}

export function createFrac(numerator: MathNode[], denominator: MathNode[]): FracNode {
  const fracId = generateId();
  // 분자와 분모를 각각 row로 감싸서 별도 ID 부여
  const numRow: RowNode = { id: deriveId(fracId, '_num'), type: 'row', children: numerator };
  const denRow: RowNode = { id: deriveId(fracId, '_den'), type: 'row', children: denominator };
  return { id: fracId, type: 'frac', numerator: [numRow], denominator: [denRow] };
}

export function createPower(base: MathNode[], exponent: MathNode[]): PowerNode {
  const powerId = generateId();
  // exponent를 row로 감싸서 별도 ID 부여 (커서 이동용)
  const expRow: RowNode = { id: deriveId(powerId, '_exp'), type: 'row', children: exponent };
  return { id: powerId, type: 'power', base, exponent: [expRow] };
}

export function createParen(content: MathNode[], parenType: '(' | '[' | '{' = '('): ParenNode {
  const parenId = generateId();
  const contentRow: RowNode = { id: deriveId(parenId, '_content'), type: 'row', children: content };
  return { id: parenId, type: 'paren', content: [contentRow], parenType };
}

export function createSubscript(base: MathNode[], subscript: MathNode[]): SubscriptNode {
  const subId = generateId();
  // subscript를 row로 감싸서 별도 ID 부여 (커서 이동용)
  const subRow: RowNode = { id: deriveId(subId, '_sub'), type: 'row', children: subscript };
  return { id: subId, type: 'subscript', base, subscript: [subRow] };
}

export function createAbs(content: MathNode[]): AbsNode {
  const absId = generateId();
  const contentRow: RowNode = { id: deriveId(absId, '_content'), type: 'row', children: content };
  return { id: absId, type: 'abs', content: [contentRow] };
}

export function createIntegral(
  lower: MathNode[] = [],
  upper: MathNode[] = [],
  integrand: MathNode[] = [],
  differential: string = 'x'
): IntegralNode {
  const integralId = generateId();
  const lowerRow: RowNode = { id: deriveId(integralId, '_lower'), type: 'row', children: lower };
  const upperRow: RowNode = { id: deriveId(integralId, '_upper'), type: 'row', children: upper };
  const integrandRow: RowNode = { id: deriveId(integralId, '_integrand'), type: 'row', children: integrand };
  return {
    id: integralId,
    type: 'integral',
    lower: [lowerRow],
    upper: [upperRow],
    integrand: [integrandRow],
    differential,
  };
}

export function createSum(
  lower: MathNode[] = [],
  upper: MathNode[] = [],
  body: MathNode[] = []
): SumNode {
  const sumId = generateId();
  const lowerRow: RowNode = { id: deriveId(sumId, '_lower'), type: 'row', children: lower };
  const upperRow: RowNode = { id: deriveId(sumId, '_upper'), type: 'row', children: upper };
  const bodyRow: RowNode = { id: deriveId(sumId, '_body'), type: 'row', children: body };
  return {
    id: sumId,
    type: 'sum',
    lower: [lowerRow],
    upper: [upperRow],
    body: [bodyRow],
  };
}

export function createLimit(
  variable: string = 'x',
  approach: MathNode[] = [],
  body: MathNode[] = []
): LimitNode {
  const limitId = generateId();
  const approachRow: RowNode = { id: deriveId(limitId, '_approach'), type: 'row', children: approach };
  const bodyRow: RowNode = { id: deriveId(limitId, '_body'), type: 'row', children: body };
  return {
    id: limitId,
    type: 'limit',
    variable,
    approach: [approachRow],
    body: [bodyRow],
  };
}

export function createProduct(
  lower: MathNode[] = [],
  upper: MathNode[] = [],
  body: MathNode[] = []
): ProductNode {
  const productId = generateId();
  const lowerRow: RowNode = { id: deriveId(productId, '_lower'), type: 'row', children: lower };
  const upperRow: RowNode = { id: deriveId(productId, '_upper'), type: 'row', children: upper };
  const bodyRow: RowNode = { id: deriveId(productId, '_body'), type: 'row', children: body };
  return {
    id: productId,
    type: 'product',
    lower: [lowerRow],
    upper: [upperRow],
    body: [bodyRow],
  };
}

export function createOverline(content: MathNode[] = []): OverlineNode {
  const overlineId = generateId();
  const contentRow: RowNode = { id: deriveId(overlineId, '_content'), type: 'row', children: content };
  return {
    id: overlineId,
    type: 'overline',
    content: [contentRow],
  };
}

export function createMatrix(
  rows: number = 2,
  cols: number = 2,
  bracketType: '(' | '[' | '{' | '|' | 'none' = '('
): MatrixNode {
  const matrixId = generateId();
  const matrixRows: MathNode[][] = [];

  for (let i = 0; i < rows; i++) {
    const row: MathNode[] = [];
    for (let j = 0; j < cols; j++) {
      const cellRow: RowNode = {
        id: deriveCellId(matrixId, i, j),
        type: 'row',
        children: []
      };
      row.push(cellRow);
    }
    matrixRows.push(row);
  }

  return {
    id: matrixId,
    type: 'matrix',
    rows: matrixRows,
    bracketType,
  };
}

export function createText(content: string = ''): TextNode {
  return {
    id: generateId(),
    type: 'text',
    content,
  };
}

/** 부모 노드 찾기 */
function findParent(root: MathNode, targetId: string): { parent: MathNode; childKey: string; index: number } | null {
  function search(node: MathNode): { parent: MathNode; childKey: string; index: number } | null {
    const childKeys = getChildKeys(node);

    for (const key of childKeys) {
      const children = getNodeChildArray(node, key);
      if (!Array.isArray(children)) continue;

      for (let i = 0; i < children.length; i++) {
        if (children[i].id === targetId) {
          return { parent: node, childKey: key, index: i };
        }
        const found = search(children[i]);
        if (found) return found;
      }
    }
    return null;
  }

  return search(root);
}

/** 노드의 자식 배열 키 반환 */
function getChildKeys(node: MathNode): string[] {
  switch (node.type) {
    case 'root':
    case 'row':
      return ['children'];
    case 'frac':
      return ['numerator', 'denominator'];
    case 'power':
      return ['base', 'exponent'];
    case 'subscript':
      return ['base', 'subscript'];
    case 'sqrt':
      return ['content', 'index'];
    case 'paren':
    case 'abs':
    case 'overline':
    case 'accent':
    case 'cancel':
      return ['content'];
    case 'overset':
      return ['base', 'annotation'];
    case 'xarrow':
      return ['above', 'below'];
    case 'func':
      return ['argument'];
    case 'integral':
      return ['lower', 'upper', 'integrand'];
    case 'sum':
    case 'product':
      return ['lower', 'upper', 'body'];
    case 'limit':
      return ['approach', 'body'];
    case 'matrix':
    case 'align':
    case 'cases':
    case 'array':
      return ['rows'];
    case 'gather':
      return ['rows'];
    case 'number':
    case 'variable':
    case 'operator':
    case 'text':
    case 'space':
    case 'literal':
    case 'error':
    case 'opaque':
      return [];
  }
}

/** ID로 노드 찾기 */
function findNodeById(root: MathNode, id: string): MathNode | null {
  if (root.id === id) return root;

  const childKeys = getChildKeys(root);
  for (const key of childKeys) {
    const children = getNodeChildArray(root, key);
    if (!Array.isArray(children)) continue;

    for (const child of children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

/** 에디터 클래스 */
export class MathEditor {
  private state: EditorState;
  private onChange: (state: EditorState) => void;

  constructor(onChange: (state: EditorState) => void) {
    this.state = freezeState(createInitialState());
    this.onChange = onChange;
  }

  getState(): EditorState {
    return this.state;
  }

  setState(state: EditorState): void {
    this.state = freezeState(state);
    this.onChange(this.state);
  }

  /**
   * intra 커서를 boundary로 강제 전환한다. intra가 NumberNode 내부 어딘가를
   * 가리키면 그 지점에서 노드를 두 NumberNode로 분할하고, 분할 경계의 boundary
   * 커서로 state를 갱신한다. charOffset이 0 또는 value.length이면 분할 없이
   * 인접 boundary로만 이동.
   */
  private splitIntraIntoBoundary(): void {
    const c = this.state.cursor;
    if (c.kind === 'boundary') return;
    const numNode = findNodeById(this.state.ast, c.nodeId);
    if (!numNode || numNode.type !== 'number') {
      this.state = freezeState(buildNewState(this.state.ast, boundary(this.state.ast.id, 0)));
      return;
    }
    const parentInfo = findParent(this.state.ast, c.nodeId);
    if (!parentInfo) return;
    const { parent, childKey, index: nodeIndex } = parentInfo;
    if (c.charOffset === 0) {
      this.state = freezeState(buildNewState(this.state.ast, boundary(parent.id, nodeIndex)));
      return;
    }
    if (c.charOffset >= numNode.value.length) {
      this.state = freezeState(buildNewState(this.state.ast, boundary(parent.id, nodeIndex + 1)));
      return;
    }
    const left = createNumber(numNode.value.slice(0, c.charOffset));
    const right = createNumber(numNode.value.slice(c.charOffset));
    const siblings = getNodeChildArray(parent, childKey);
    const newSiblings = spliceChildren(siblings, nodeIndex, 1, left, right);
    const newAst = rebuildAstWithNewChildren(this.state.ast, parent.id, childKey, newSiblings);
    this.state = freezeState(buildNewState(newAst, boundary(parent.id, nodeIndex + 1)));
  }

  /** 현재 커서를 boundary로 normalize 후 반환 (intra 시 split 부수효과 발생) */
  private requireBoundary(): { parentId: string; index: number } {
    if (this.state.cursor.kind !== 'boundary') {
      this.splitIntraIntoBoundary();
    }
    const c = this.state.cursor;
    if (c.kind !== 'boundary') {
      throw new Error('cursor normalize failed');
    }
    return { parentId: c.parentId, index: c.index };
  }

  /** 커서 위치에 노드를 불변적으로 삽입하는 공유 헬퍼 */
  private insertNodeAtCursor(newNode: MathNode): void {
    const targetNode = findNodeById(this.state.ast, this.requireBoundary().parentId);
    if (!targetNode) return;

    const childKey = getChildKeys(targetNode)[0];
    if (!childKey) return;

    const children = getNodeChildArray(targetNode, childKey);
    const offset = this.requireBoundary().index;
    const newChildren = spliceChildren(children, offset, 0, newNode);
    const newAst = rebuildAstWithNewChildren(
      this.state.ast,
      this.requireBoundary().parentId,
      childKey,
      newChildren,
    );

    this.state = freezeState(buildNewState(newAst, boundary(this.requireBoundary().parentId, offset + 1)));
    this.onChange(this.state);
  }

  /** 구조 노드를 커서 위치에 삽입하고 커서를 내부로 이동하는 공유 헬퍼 */
  private insertStructureAtCursor(newNode: MathNode, cursorTargetId: string): void {
    const targetNode = findNodeById(this.state.ast, this.requireBoundary().parentId);
    if (!targetNode) return;

    const childKey = getChildKeys(targetNode)[0];
    if (!childKey) return;

    const children = getNodeChildArray(targetNode, childKey);
    const offset = this.requireBoundary().index;
    const newChildren = spliceChildren(children, offset, 0, newNode);
    const newAst = rebuildAstWithNewChildren(
      this.state.ast,
      this.requireBoundary().parentId,
      childKey,
      newChildren,
    );

    this.state = freezeState(buildNewState(newAst, boundary(cursorTargetId, 0)));
    this.onChange(this.state);
  }

  /** 조합 완료된 문자 입력 (한글 등 IME 입력) */
  handleCompositionEnd(data: string): void {
    for (const char of data) {
      this.insertVariable(char);
    }
  }

  /** 키 입력 처리 — keyToInputAction 매핑 → dispatchInputAction 위임 */
  handleKeyDown(e: KeyboardEvent): void {
    if (e.isComposing) return;
    const action = keyToInputAction(e.key);
    if (!action) return;
    e.preventDefault();
    this.dispatchInputAction(action);
  }

  /** InputAction 실행. dispatcher는 exhaustive switch로 타입 안전성 보장. */
  dispatchInputAction(action: InputAction): void {
    switch (action.type) {
      case 'insertNumber': this.insertNumber(action.char); return;
      case 'insertVariable': this.insertVariable(action.name); return;
      case 'insertOperator': this.insertOperator(action.op); return;
      case 'insertFraction': this.insertFraction(); return;
      case 'insertPower': this.insertPower(); return;
      case 'insertSubscript': this.insertSubscript(); return;
      case 'insertAbs': this.insertAbs(); return;
      case 'insertParen': this.insertParen(action.paren); return;
      case 'exitParen': this.exitParen(); return;
      case 'deleteBackward': this.deleteBackward(); return;
      case 'moveLeft': this.moveCursorLeft(); return;
      case 'moveRight': this.moveCursorRight(); return;
    }
  }

  /** 숫자 삽입 */
  insertNumber(digit: string): void {
    const c = this.state.cursor;
    if (c.kind === 'intra') {
      const numNode = findNodeById(this.state.ast, c.nodeId);
      if (numNode && numNode.type === 'number') {
        const newValue = numNode.value.slice(0, c.charOffset) + digit + numNode.value.slice(c.charOffset);
        const parentInfo = findParent(this.state.ast, numNode.id);
        if (parentInfo) {
          const { parent, childKey, index } = parentInfo;
          const siblings = getNodeChildArray(parent, childKey);
          const updated: NumberNode = { ...numNode, value: newValue };
          const newSiblings = spliceChildren(siblings, index, 1, updated);
          const newAst = rebuildAstWithNewChildren(this.state.ast, parent.id, childKey, newSiblings);
          this.state = freezeState(buildNewState(newAst, intra(numNode.id, c.charOffset + 1)));
          this.onChange(this.state);
          return;
        }
      }
    }
    // 좌측 sibling이 NumberNode면 그 value에 머지 (페르소나: 연속 키 입력은 하나의 숫자)
    if (c.kind === 'boundary' && c.index > 0) {
      const parent = findNodeById(this.state.ast, c.parentId);
      if (parent) {
        const childKey = getChildKeys(parent)[0];
        if (childKey) {
          const siblings = getNodeChildArray(parent, childKey);
          const leftNode = siblings[c.index - 1];
          if (leftNode && leftNode.type === 'number') {
            const updated: NumberNode = { ...leftNode, value: leftNode.value + digit };
            const newSiblings = spliceChildren(siblings, c.index - 1, 1, updated);
            const newAst = rebuildAstWithNewChildren(this.state.ast, parent.id, childKey, newSiblings);
            this.state = freezeState(buildNewState(newAst, boundary(parent.id, c.index)));
            this.onChange(this.state);
            return;
          }
        }
      }
    }
    this.insertNodeAtCursor(createNumber(digit));
  }

  /** 변수 삽입 */
  insertVariable(name: string): void {
    this.insertNodeAtCursor(createVariable(name));
  }

  /** 연산자 삽입 */
  insertOperator(op: OperatorSymbol | string): void {
    // 현재 슬롯의 정책이 autoExitOnBinop 이면 컨테이너 밖으로 먼저 나간다
    this.exitSlotForBinaryOperator();

    const newNode: OperatorNode = { id: generateId(), type: 'operator', operator: op };
    this.insertNodeAtCursor(newNode);
  }

  /**
   * 현재 커서가 속한 슬롯의 정책이 이항 연산자에 자동 종료되는 slot 이면
   * 컨테이너 바로 다음 위치로 커서를 이동한다.
   *
   * 정책 조회는 `cursor-policy.ts` 의 (parentType, slotName) 정책표가 단일 진실의
   * 원천. row id 접미사 휴리스틱은 사용하지 않는다.
   */
  private exitSlotForBinaryOperator(): void {
    const rowId = this.requireBoundary().parentId;
    const parentInfo = findParent(this.state.ast, rowId);
    if (!parentInfo) return;

    const policy = getSlotPolicyByParent(parentInfo.parent.type, parentInfo.childKey);
    if (!policy?.autoExitOnBinop) return;

    // 컨테이너 노드(예: power, frac) 다음 위치로 커서 이동
    const containerInfo = findParent(this.state.ast, parentInfo.parent.id);
    if (!containerInfo) return;

    this.state = freezeState(buildNewState(
      this.state.ast,
      boundary(containerInfo.parent.id, containerInfo.index + 1),
    ));
  }

  /** 분수 삽입 */
  insertFraction(): void {
    const targetNode = findNodeById(this.state.ast, this.requireBoundary().parentId);
    if (!targetNode) return;

    const childKey = getChildKeys(targetNode)[0];
    if (!childKey) return;

    const children = getNodeChildArray(targetNode, childKey);
    const offset = this.requireBoundary().index;

    // 커서 앞의 연속된 숫자/변수/괄호를 분자로 (연산자 전까지)
    const numerator = this.collectPrecedingTerm(children, offset);
    const removeCount = numerator.length;

    // 불변 이중 splice: 선행 term 제거 → frac 삽입
    let newChildren = children;
    let insertOffset = offset;
    if (removeCount > 0) {
      newChildren = spliceChildren(newChildren, offset - removeCount, removeCount);
      insertOffset = offset - removeCount;
    }

    const fracNode = createFrac(numerator, []);
    newChildren = spliceChildren(newChildren, insertOffset, 0, fracNode);

    const newAst = rebuildAstWithNewChildren(
      this.state.ast, this.requireBoundary().parentId, childKey, newChildren,
    );
    this.state = freezeState(buildNewState(newAst, boundary(deriveId(fracNode.id, '_den'), 0)));
    this.onChange(this.state);
  }

  /** 커서 앞의 연속된 항(term) 수집 */
  private collectPrecedingTerm(children: MathNode[], offset: number): MathNode[] {
    if (offset === 0) return [];

    const result: MathNode[] = [];
    let i = offset - 1;

    // 뒤에서부터 연산자가 아닌 노드들을 수집
    while (i >= 0) {
      const node = children[i];
      // 연산자를 만나면 중단
      if (node.type === 'operator') break;
      result.unshift(node);
      i--;
    }

    return result;
  }

  /** 거듭제곱 삽입 */
  insertPower(): void {
    const targetNode = findNodeById(this.state.ast, this.requireBoundary().parentId);
    if (!targetNode) return;

    const childKey = getChildKeys(targetNode)[0];
    if (!childKey) return;

    const children = getNodeChildArray(targetNode, childKey);
    const offset = this.requireBoundary().index;

    const base = this.collectPrecedingTerm(children, offset);
    const removeCount = base.length;

    let newChildren = children;
    let insertOffset = offset;
    if (removeCount > 0) {
      newChildren = spliceChildren(newChildren, offset - removeCount, removeCount);
      insertOffset = offset - removeCount;
    }

    const powerNode = createPower(base, []);
    newChildren = spliceChildren(newChildren, insertOffset, 0, powerNode);

    const newAst = rebuildAstWithNewChildren(
      this.state.ast, this.requireBoundary().parentId, childKey, newChildren,
    );
    this.state = freezeState(buildNewState(newAst, boundary(deriveId(powerNode.id, '_exp'), 0)));
    this.onChange(this.state);
  }

  /** 아래첨자 삽입 */
  insertSubscript(): void {
    const targetNode = findNodeById(this.state.ast, this.requireBoundary().parentId);
    if (!targetNode) return;

    const childKey = getChildKeys(targetNode)[0];
    if (!childKey) return;

    const children = getNodeChildArray(targetNode, childKey);
    const offset = this.requireBoundary().index;

    const base = this.collectPrecedingTerm(children, offset);
    const removeCount = base.length;

    let newChildren = children;
    let insertOffset = offset;
    if (removeCount > 0) {
      newChildren = spliceChildren(newChildren, offset - removeCount, removeCount);
      insertOffset = offset - removeCount;
    }

    const subscriptNode = createSubscript(base, []);
    newChildren = spliceChildren(newChildren, insertOffset, 0, subscriptNode);

    const newAst = rebuildAstWithNewChildren(
      this.state.ast, this.requireBoundary().parentId, childKey, newChildren,
    );
    this.state = freezeState(buildNewState(newAst, boundary(deriveId(subscriptNode.id, '_sub'), 0)));
    this.onChange(this.state);
  }

  /** 절댓값 삽입 */
  insertAbs(): void {
    const absNode = createAbs([]);
    this.insertStructureAtCursor(absNode, deriveId(absNode.id, '_content'));
  }

  /** 적분 삽입 (프로그래매틱 삽입용) */
  insertIntegral(differential: string = 'x'): void {
    const integralNode = createIntegral([], [], [], differential);
    this.insertStructureAtCursor(integralNode, deriveId(integralNode.id, '_integrand'));
  }

  /** 시그마/합 삽입 (프로그래매틱 삽입용) */
  insertSum(): void {
    const sumNode = createSum([], [], []);
    this.insertStructureAtCursor(sumNode, deriveId(sumNode.id, '_lower'));
  }

  /** 극한 삽입 (프로그래매틱 삽입용) */
  insertLimit(variable: string = 'x'): void {
    const limitNode = createLimit(variable, [], []);
    this.insertStructureAtCursor(limitNode, deriveId(limitNode.id, '_approach'));
  }

  /** 곱(∏) 삽입 (프로그래매틱 삽입용) */
  insertProduct(): void {
    const productNode = createProduct([], [], []);
    this.insertStructureAtCursor(productNode, deriveId(productNode.id, '_lower'));
  }

  /** 윗줄 삽입 (프로그래매틱 삽입용) */
  insertOverline(): void {
    const overlineNode = createOverline([]);
    this.insertStructureAtCursor(overlineNode, deriveId(overlineNode.id, '_content'));
  }

  /** 행렬 삽입 (프로그래매틱 삽입용) */
  insertMatrix(rows: number = 2, cols: number = 2, bracketType: '(' | '[' | '{' | '|' | 'none' = '('): void {
    const matrixNode = createMatrix(rows, cols, bracketType);
    this.insertStructureAtCursor(matrixNode, deriveCellId(matrixNode.id, 0, 0));
  }

  /** 텍스트 삽입 (프로그래매틱 삽입용) */
  insertText(content: string = ''): void {
    this.insertNodeAtCursor(createText(content));
  }

  /** 괄호 삽입 */
  insertParen(parenType: '(' | '[' | '{'): void {
    const parenNode = createParen([], parenType);
    this.insertStructureAtCursor(parenNode, deriveId(parenNode.id, '_content'));
  }

  /** 괄호 밖으로 이동 */
  private exitParen(): void {
    const node = findNodeById(this.state.ast, this.requireBoundary().parentId);
    if (!node) return;

    const parentInfo = findParent(this.state.ast, node.id);
    if (parentInfo && parentInfo.parent.type === 'paren') {
      const grandParentInfo = findParent(this.state.ast, parentInfo.parent.id);
      if (grandParentInfo) {
        this.state = freezeState(buildNewState(
          this.state.ast,
          boundary(grandParentInfo.parent.id, grandParentInfo.index + 1),
        ));
        this.onChange(this.state);
      }
    }
  }

  /** 뒤로 삭제 */
  private deleteBackward(): void {
    const c = this.state.cursor;
    if (c.kind === 'intra') {
      const numNode = findNodeById(this.state.ast, c.nodeId);
      if (numNode && numNode.type === 'number' && c.charOffset > 0) {
        const newValue = numNode.value.slice(0, c.charOffset - 1) + numNode.value.slice(c.charOffset);
        const parentInfo = findParent(this.state.ast, numNode.id);
        if (parentInfo) {
          const { parent, childKey, index } = parentInfo;
          const siblings = getNodeChildArray(parent, childKey);
          const updated: NumberNode = { ...numNode, value: newValue };
          const newSiblings = spliceChildren(siblings, index, 1, updated);
          const newAst = rebuildAstWithNewChildren(this.state.ast, parent.id, childKey, newSiblings);
          const nextCursor = newValue.length >= 2
            ? intra(numNode.id, c.charOffset - 1)
            : boundary(parent.id, index + 1);
          this.state = freezeState(buildNewState(newAst, nextCursor));
          this.onChange(this.state);
          return;
        }
      }
    }

    const node = findNodeById(this.state.ast, this.requireBoundary().parentId);
    if (!node) return;

    const childKey = getChildKeys(node)[0];
    if (!childKey) return;

    const children = getNodeChildArray(node, childKey);
    const offset = this.requireBoundary().index;

    if (offset > 0) {
      // 커서 앞 노드 삭제 (불변)
      const newChildren = spliceChildren(children, offset - 1, 1);
      const newAst = rebuildAstWithNewChildren(
        this.state.ast, this.requireBoundary().parentId, childKey, newChildren,
      );
      this.state = freezeState(buildNewState(newAst, boundary(this.requireBoundary().parentId, offset - 1)));
      this.onChange(this.state);
    } else {
      // offset이 0일 때: 부모로 이동하거나 복합 노드 삭제
      const parentInfo = findParent(this.state.ast, node.id);
      if (!parentInfo) return;

      const parent = parentInfo.parent;

      const complexTypes = ['frac', 'power', 'paren', 'subscript', 'abs', 'integral', 'sum', 'limit', 'product', 'overline', 'matrix'];
      if (complexTypes.includes(parent.type)) {
        // 복합 노드 전체를 삭제 (불변)
        const grandParentInfo = findParent(this.state.ast, parent.id);
        if (grandParentInfo) {
          const grandChildren = getNodeChildArray(grandParentInfo.parent, grandParentInfo.childKey);
          const newGrandChildren = spliceChildren(grandChildren, grandParentInfo.index, 1);
          const newAst = rebuildAstWithNewChildren(
            this.state.ast, grandParentInfo.parent.id, grandParentInfo.childKey, newGrandChildren,
          );
          this.state = freezeState(buildNewState(newAst, boundary(grandParentInfo.parent.id, grandParentInfo.index)));
        }
      } else {
        // 일반적인 경우: 부모로 이동 (AST 불변, 커서만 변경)
        this.state = freezeState(buildNewState(this.state.ast, boundary(parent.id, parentInfo.index)));
      }

      this.onChange(this.state);
    }
  }

  /** 커서 왼쪽 이동 */
  private moveCursorLeft(): void {
    const c = this.state.cursor;
    if (c.kind === 'intra') {
      const numNode = findNodeById(this.state.ast, c.nodeId);
      if (numNode && numNode.type === 'number') {
        if (c.charOffset > 1) {
          this.state = freezeState(buildNewState(this.state.ast, intra(numNode.id, c.charOffset - 1)));
          this.onChange(this.state);
          return;
        }
        const parentInfo = findParent(this.state.ast, numNode.id);
        if (parentInfo) {
          this.state = freezeState(buildNewState(this.state.ast, boundary(parentInfo.parent.id, parentInfo.index)));
          this.onChange(this.state);
          return;
        }
      }
    }

    const node = findNodeById(this.state.ast, this.requireBoundary().parentId);
    if (!node) return;

    const childKey = getChildKeys(node)[0];
    if (!childKey) {
      const parentInfo = findParent(this.state.ast, this.requireBoundary().parentId);
      if (parentInfo) {
        this.state = freezeState(buildNewState(this.state.ast, boundary(parentInfo.parent.id, parentInfo.index)));
        this.onChange(this.state);
      }
      return;
    }

    const children = getNodeChildArray(node, childKey);

    if (this.requireBoundary().index > 0) {
      const leftNode = children[this.requireBoundary().index - 1];
      const enterableChild = this.getEnterableChild(leftNode, 'end');

      if (enterableChild) {
        this.state = freezeState(buildNewState(this.state.ast, boundary(enterableChild.id, enterableChild.length)));
      } else if (leftNode.type === 'number' && leftNode.value.length >= 2) {
        this.state = freezeState(buildNewState(this.state.ast, intra(leftNode.id, leftNode.value.length - 1)));
      } else {
        this.state = freezeState(buildNewState(this.state.ast, boundary(this.requireBoundary().parentId, this.requireBoundary().index - 1)));
      }
      this.onChange(this.state);
    } else {
      const parentInfo = findParent(this.state.ast, this.requireBoundary().parentId);
      if (parentInfo) {
        this.state = freezeState(buildNewState(this.state.ast, boundary(parentInfo.parent.id, parentInfo.index)));
        this.onChange(this.state);
      }
    }
  }

  /** 커서 오른쪽 이동 */
  private moveCursorRight(): void {
    const c = this.state.cursor;
    if (c.kind === 'intra') {
      const numNode = findNodeById(this.state.ast, c.nodeId);
      if (numNode && numNode.type === 'number') {
        if (c.charOffset < numNode.value.length - 1) {
          this.state = freezeState(buildNewState(this.state.ast, intra(numNode.id, c.charOffset + 1)));
          this.onChange(this.state);
          return;
        }
        const parentInfo = findParent(this.state.ast, numNode.id);
        if (parentInfo) {
          this.state = freezeState(buildNewState(this.state.ast, boundary(parentInfo.parent.id, parentInfo.index + 1)));
          this.onChange(this.state);
          return;
        }
      }
    }

    const node = findNodeById(this.state.ast, this.requireBoundary().parentId);
    if (!node) return;

    const childKey = getChildKeys(node)[0];
    if (!childKey) {
      const parentInfo = findParent(this.state.ast, node.id);
      if (parentInfo) {
        this.state = freezeState(buildNewState(this.state.ast, boundary(parentInfo.parent.id, parentInfo.index + 1)));
        this.onChange(this.state);
      }
      return;
    }

    const children = getNodeChildArray(node, childKey);

    if (this.requireBoundary().index < children.length) {
      const rightNode = children[this.requireBoundary().index];
      const enterableChild = this.getEnterableChild(rightNode, 'start');

      if (enterableChild) {
        this.state = freezeState(buildNewState(this.state.ast, boundary(enterableChild.id, 0)));
      } else if (rightNode.type === 'number' && rightNode.value.length >= 2) {
        this.state = freezeState(buildNewState(this.state.ast, intra(rightNode.id, 1)));
      } else {
        this.state = freezeState(buildNewState(this.state.ast, boundary(this.requireBoundary().parentId, this.requireBoundary().index + 1)));
      }
      this.onChange(this.state);
    } else {
      const parentInfo = findParent(this.state.ast, node.id);
      if (parentInfo) {
        this.state = freezeState(buildNewState(this.state.ast, boundary(parentInfo.parent.id, parentInfo.index + 1)));
        this.onChange(this.state);
      }
    }
  }

  /** 복합 노드의 진입 가능한 자식 찾기 */
  private getEnterableChild(
    node: MathNode,
    position: 'start' | 'end'
  ): { id: string; length: number } | null {
    switch (node.type) {
      case 'paren': {
        const contentRow = node.content[0] as RowNode;
        return { id: contentRow.id, length: contentRow.children.length };
      }
      case 'frac': {
        // 분수: start면 분자, end면 분모
        if (position === 'start') {
          const numRow = node.numerator[0] as RowNode;
          return { id: numRow.id, length: numRow.children.length };
        } else {
          const denRow = node.denominator[0] as RowNode;
          return { id: denRow.id, length: denRow.children.length };
        }
      }
      case 'power': {
        // 거듭제곱: start면 base, end면 exponent
        // power는 base가 row가 아닐 수 있음, exponent로 들어가기
        if (node.exponent.length > 0) {
          const exp = node.exponent;
          // exponent가 row면 그 안으로
          if (exp.length === 1 && exp[0].type === 'row') {
            const expRow = exp[0] as RowNode;
            return { id: expRow.id, length: expRow.children.length };
          }
        }
        return null;
      }
      case 'sqrt': {
        const contentRow = node.content[0] as RowNode;
        return { id: contentRow.id, length: contentRow.children.length };
      }
      case 'subscript': {
        // 아래첨자: subscript row로 들어가기
        if (node.subscript.length > 0) {
          const sub = node.subscript;
          if (sub.length === 1 && sub[0].type === 'row') {
            const subRow = sub[0] as RowNode;
            return { id: subRow.id, length: subRow.children.length };
          }
        }
        return null;
      }
      case 'abs': {
        const contentRow = node.content[0] as RowNode;
        return { id: contentRow.id, length: contentRow.children.length };
      }
      case 'integral': {
        // 적분: start면 하한, end면 피적분함수
        if (position === 'start') {
          if (node.lower && node.lower.length > 0 && node.lower[0].type === 'row') {
            const lowerRow = node.lower[0] as RowNode;
            return { id: lowerRow.id, length: lowerRow.children.length };
          }
        } else {
          if (node.integrand.length > 0 && node.integrand[0].type === 'row') {
            const integrandRow = node.integrand[0] as RowNode;
            return { id: integrandRow.id, length: integrandRow.children.length };
          }
        }
        return null;
      }
      case 'sum': {
        // 시그마: start면 하한, end면 본문
        if (position === 'start') {
          if (node.lower.length > 0 && node.lower[0].type === 'row') {
            const lowerRow = node.lower[0] as RowNode;
            return { id: lowerRow.id, length: lowerRow.children.length };
          }
        } else {
          if (node.body.length > 0 && node.body[0].type === 'row') {
            const bodyRow = node.body[0] as RowNode;
            return { id: bodyRow.id, length: bodyRow.children.length };
          }
        }
        return null;
      }
      case 'limit': {
        // 극한: start면 접근값, end면 본문
        if (position === 'start') {
          if (node.approach.length > 0 && node.approach[0].type === 'row') {
            const approachRow = node.approach[0] as RowNode;
            return { id: approachRow.id, length: approachRow.children.length };
          }
        } else {
          if (node.body.length > 0 && node.body[0].type === 'row') {
            const bodyRow = node.body[0] as RowNode;
            return { id: bodyRow.id, length: bodyRow.children.length };
          }
        }
        return null;
      }
      case 'product': {
        // 곱: start면 하한, end면 본문
        if (position === 'start') {
          if (node.lower.length > 0 && node.lower[0].type === 'row') {
            const lowerRow = node.lower[0] as RowNode;
            return { id: lowerRow.id, length: lowerRow.children.length };
          }
        } else {
          if (node.body.length > 0 && node.body[0].type === 'row') {
            const bodyRow = node.body[0] as RowNode;
            return { id: bodyRow.id, length: bodyRow.children.length };
          }
        }
        return null;
      }
      case 'overline': {
        // 윗줄: content로 들어가기
        if (node.content.length > 0 && node.content[0].type === 'row') {
          const contentRow = node.content[0] as RowNode;
          return { id: contentRow.id, length: contentRow.children.length };
        }
        return null;
      }
      case 'matrix': {
        // 행렬: start면 첫 셀, end면 마지막 셀
        if (node.rows.length > 0 && node.rows[0].length > 0) {
          if (position === 'start') {
            const firstCell = node.rows[0][0] as RowNode;
            return { id: firstCell.id, length: firstCell.children.length };
          } else {
            const lastRow = node.rows[node.rows.length - 1];
            const lastCell = lastRow[lastRow.length - 1] as RowNode;
            return { id: lastCell.id, length: lastCell.children.length };
          }
        }
        return null;
      }
      default:
        return null;
    }
  }

  /** 제곱근 삽입 */
  insertSqrt(): void {
    const sqrtId = generateEditorId();
    const contentRowId = deriveId(sqrtId, '_content');
    const sqrtNode: SqrtNode = {
      id: sqrtId,
      type: 'sqrt',
      content: [{ id: contentRowId, type: 'row', children: [] }],
    };
    this.insertStructureAtCursor(sqrtNode, contentRowId);
  }

  /** 함수 삽입 */
  insertFunc(name: string): void {
    const funcId = generateEditorId();
    const argRowId = deriveId(funcId, '_arg');
    const funcNode: FuncNode = {
      id: funcId,
      type: 'func',
      name,
      argument: [{ id: argRowId, type: 'row', children: [] }],
    };
    this.insertStructureAtCursor(funcNode, argRowId);
  }
}
