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
import { parseLatex } from './latex/latex-parser';
import { generateEditorId, deriveId, deriveCellId } from './utils/id-generator';
import {
  spliceChildren,
  rebuildAstWithNewChildren,
  buildNewState,
  freezeState,
} from './editor-utils';

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
    cursor: { nodeId: root.id, offset: 0 },
    selection: null,
  };
}

/** LaTeX 문자열에서 에디터 상태 생성 */
export function createStateFromLatex(latex: string): EditorState {
  if (!latex || latex.trim() === '') {
    return createInitialState();
  }

  try {
    const ast = parseLatex(latex);
    return {
      ast,
      cursor: { nodeId: ast.id, offset: ast.children.length },
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

  /** 커서 위치에 노드를 불변적으로 삽입하는 공유 헬퍼 */
  private insertNodeAtCursor(newNode: MathNode): void {
    const targetNode = findNodeById(this.state.ast, this.state.cursor.nodeId);
    if (!targetNode) return;

    const childKey = getChildKeys(targetNode)[0];
    if (!childKey) return;

    const children = getNodeChildArray(targetNode, childKey);
    const offset = this.state.cursor.offset;
    const newChildren = spliceChildren(children, offset, 0, newNode);
    const newAst = rebuildAstWithNewChildren(
      this.state.ast,
      this.state.cursor.nodeId,
      childKey,
      newChildren,
    );

    this.state = freezeState(buildNewState(newAst, { nodeId: this.state.cursor.nodeId, offset: offset + 1 }));
    this.onChange(this.state);
  }

  /** 구조 노드를 커서 위치에 삽입하고 커서를 내부로 이동하는 공유 헬퍼 */
  private insertStructureAtCursor(newNode: MathNode, cursorTargetId: string): void {
    const targetNode = findNodeById(this.state.ast, this.state.cursor.nodeId);
    if (!targetNode) return;

    const childKey = getChildKeys(targetNode)[0];
    if (!childKey) return;

    const children = getNodeChildArray(targetNode, childKey);
    const offset = this.state.cursor.offset;
    const newChildren = spliceChildren(children, offset, 0, newNode);
    const newAst = rebuildAstWithNewChildren(
      this.state.ast,
      this.state.cursor.nodeId,
      childKey,
      newChildren,
    );

    this.state = freezeState(buildNewState(newAst, { nodeId: cursorTargetId, offset: 0 }));
    this.onChange(this.state);
  }

  /** 조합 완료된 문자 입력 (한글 등 IME 입력) */
  handleCompositionEnd(data: string): void {
    for (const char of data) {
      this.insertVariable(char);
    }
  }

  /** 키 입력 처리 */
  handleKeyDown(e: KeyboardEvent): void {
    const { key } = e;

    // IME 조합 중이면 무시
    if (e.isComposing) return;

    // 숫자
    if (/^[0-9.]$/.test(key)) {
      e.preventDefault();
      this.insertNumber(key);
      return;
    }

    // 연산자
    if (key === '+') {
      e.preventDefault();
      this.insertOperator('+');
      return;
    }
    if (key === '-') {
      e.preventDefault();
      this.insertOperator('-');
      return;
    }
    if (key === '*') {
      e.preventDefault();
      this.insertOperator('×');
      return;
    }
    if (key === '/') {
      e.preventDefault();
      this.insertFraction();
      return;
    }
    if (key === '=') {
      e.preventDefault();
      this.insertOperator('=');
      return;
    }

    // 거듭제곱
    if (key === '^') {
      e.preventDefault();
      this.insertPower();
      return;
    }

    // 아래첨자
    if (key === '_') {
      e.preventDefault();
      this.insertSubscript();
      return;
    }

    // 부등호
    if (key === '<') {
      e.preventDefault();
      this.insertOperator('<');
      return;
    }
    if (key === '>') {
      e.preventDefault();
      this.insertOperator('>');
      return;
    }

    // 절댓값
    if (key === '|') {
      e.preventDefault();
      this.insertAbs();
      return;
    }

    // 괄호
    if (key === '(' || key === '[' || key === '{') {
      e.preventDefault();
      this.insertParen(key as '(' | '[' | '{');
      return;
    }
    // 닫는 괄호는 괄호 밖으로 이동
    if (key === ')' || key === ']' || key === '}') {
      e.preventDefault();
      this.exitParen();
      return;
    }

    // 백스페이스
    if (key === 'Backspace') {
      e.preventDefault();
      this.deleteBackward();
      return;
    }

    // 커서 이동
    if (key === 'ArrowLeft') {
      e.preventDefault();
      this.moveCursorLeft();
      return;
    }
    if (key === 'ArrowRight') {
      e.preventDefault();
      this.moveCursorRight();
      return;
    }

    // 기타 단일 문자는 모두 변수로 (한글, 그리스문자, 특수문자 등)
    if (key.length === 1 && !/[\s]/.test(key)) {
      e.preventDefault();
      this.insertVariable(key);
      return;
    }
  }

  /** 숫자 삽입 */
  insertNumber(digit: string): void {
    this.insertNodeAtCursor(createNumber(digit));
  }

  /** 변수 삽입 */
  insertVariable(name: string): void {
    this.insertNodeAtCursor(createVariable(name));
  }

  /** 연산자 삽입 */
  insertOperator(op: OperatorSymbol | string): void {
    // 복합 노드(지수, 분자, 분모 등) 안에 있으면 먼저 밖으로 나감
    this.exitComplexNodeIfNeeded();

    const newNode: OperatorNode = { id: generateId(), type: 'operator', operator: op };
    this.insertNodeAtCursor(newNode);
  }

  /** 복합 노드(지수, 분자/분모, 괄호 내부, 아래첨자, 적분, 시그마, 극한) 안에 있으면 밖으로 이동 */
  private exitComplexNodeIfNeeded(): void {
    const node = findNodeById(this.state.ast, this.state.cursor.nodeId);
    if (!node) return;

    // row 노드의 ID가 특정 접미사로 끝나면 복합 노드 내부
    const nodeId = node.id;
    const complexSuffixes = [
      '_exp', '_num', '_den', '_content', '_sub',  // 기존
      '_lower', '_upper', '_integrand', '_body', '_approach'  // Phase 2
    ];
    const isInComplexNode = complexSuffixes.some(suffix => nodeId.endsWith(suffix));

    if (!isInComplexNode) return;

    // 부모(power, frac, paren)를 찾고, 그 부모의 부모로 커서 이동
    const parentInfo = findParent(this.state.ast, node.id);
    if (!parentInfo) return;

    const complexNode = parentInfo.parent;  // power, frac, paren
    const grandParentInfo = findParent(this.state.ast, complexNode.id);
    if (!grandParentInfo) return;

    // 복합 노드 다음 위치로 커서 이동 (불변: 새 state 생성)
    this.state = freezeState(buildNewState(
      this.state.ast,
      { nodeId: grandParentInfo.parent.id, offset: grandParentInfo.index + 1 },
    ));
  }

  /** 분수 삽입 */
  insertFraction(): void {
    const targetNode = findNodeById(this.state.ast, this.state.cursor.nodeId);
    if (!targetNode) return;

    const childKey = getChildKeys(targetNode)[0];
    if (!childKey) return;

    const children = getNodeChildArray(targetNode, childKey);
    const offset = this.state.cursor.offset;

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
      this.state.ast, this.state.cursor.nodeId, childKey, newChildren,
    );
    this.state = freezeState(buildNewState(newAst, { nodeId: deriveId(fracNode.id, '_den'), offset: 0 }));
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
    const targetNode = findNodeById(this.state.ast, this.state.cursor.nodeId);
    if (!targetNode) return;

    const childKey = getChildKeys(targetNode)[0];
    if (!childKey) return;

    const children = getNodeChildArray(targetNode, childKey);
    const offset = this.state.cursor.offset;

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
      this.state.ast, this.state.cursor.nodeId, childKey, newChildren,
    );
    this.state = freezeState(buildNewState(newAst, { nodeId: deriveId(powerNode.id, '_exp'), offset: 0 }));
    this.onChange(this.state);
  }

  /** 아래첨자 삽입 */
  insertSubscript(): void {
    const targetNode = findNodeById(this.state.ast, this.state.cursor.nodeId);
    if (!targetNode) return;

    const childKey = getChildKeys(targetNode)[0];
    if (!childKey) return;

    const children = getNodeChildArray(targetNode, childKey);
    const offset = this.state.cursor.offset;

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
      this.state.ast, this.state.cursor.nodeId, childKey, newChildren,
    );
    this.state = freezeState(buildNewState(newAst, { nodeId: deriveId(subscriptNode.id, '_sub'), offset: 0 }));
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
    const node = findNodeById(this.state.ast, this.state.cursor.nodeId);
    if (!node) return;

    const parentInfo = findParent(this.state.ast, node.id);
    if (parentInfo && parentInfo.parent.type === 'paren') {
      const grandParentInfo = findParent(this.state.ast, parentInfo.parent.id);
      if (grandParentInfo) {
        this.state = freezeState(buildNewState(
          this.state.ast,
          { nodeId: grandParentInfo.parent.id, offset: grandParentInfo.index + 1 },
        ));
        this.onChange(this.state);
      }
    }
  }

  /** 뒤로 삭제 */
  private deleteBackward(): void {
    const node = findNodeById(this.state.ast, this.state.cursor.nodeId);
    if (!node) return;

    const childKey = getChildKeys(node)[0];
    if (!childKey) return;

    const children = getNodeChildArray(node, childKey);
    const offset = this.state.cursor.offset;

    if (offset > 0) {
      // 커서 앞 노드 삭제 (불변)
      const newChildren = spliceChildren(children, offset - 1, 1);
      const newAst = rebuildAstWithNewChildren(
        this.state.ast, this.state.cursor.nodeId, childKey, newChildren,
      );
      this.state = freezeState(buildNewState(newAst, { nodeId: this.state.cursor.nodeId, offset: offset - 1 }));
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
          this.state = freezeState(buildNewState(newAst, { nodeId: grandParentInfo.parent.id, offset: grandParentInfo.index }));
        }
      } else {
        // 일반적인 경우: 부모로 이동 (AST 불변, 커서만 변경)
        this.state = freezeState(buildNewState(this.state.ast, { nodeId: parent.id, offset: parentInfo.index }));
      }

      this.onChange(this.state);
    }
  }

  /** 커서 왼쪽 이동 */
  private moveCursorLeft(): void {
    const node = findNodeById(this.state.ast, this.state.cursor.nodeId);
    if (!node) return;

    const childKey = getChildKeys(node)[0];
    if (!childKey) {
      const parentInfo = findParent(this.state.ast, this.state.cursor.nodeId);
      if (parentInfo) {
        this.state = freezeState(buildNewState(this.state.ast, { nodeId: parentInfo.parent.id, offset: parentInfo.index }));
        this.onChange(this.state);
      }
      return;
    }

    const children = getNodeChildArray(node, childKey);

    if (this.state.cursor.offset > 0) {
      const leftNode = children[this.state.cursor.offset - 1];
      const enterableChild = this.getEnterableChild(leftNode, 'end');

      if (enterableChild) {
        this.state = freezeState(buildNewState(this.state.ast, { nodeId: enterableChild.id, offset: enterableChild.length }));
      } else {
        this.state = freezeState(buildNewState(this.state.ast, { nodeId: this.state.cursor.nodeId, offset: this.state.cursor.offset - 1 }));
      }
      this.onChange(this.state);
    } else {
      const parentInfo = findParent(this.state.ast, this.state.cursor.nodeId);
      if (parentInfo) {
        this.state = freezeState(buildNewState(this.state.ast, { nodeId: parentInfo.parent.id, offset: parentInfo.index }));
        this.onChange(this.state);
      }
    }
  }

  /** 커서 오른쪽 이동 */
  private moveCursorRight(): void {
    const node = findNodeById(this.state.ast, this.state.cursor.nodeId);
    if (!node) return;

    const childKey = getChildKeys(node)[0];
    if (!childKey) {
      const parentInfo = findParent(this.state.ast, node.id);
      if (parentInfo) {
        this.state = freezeState(buildNewState(this.state.ast, { nodeId: parentInfo.parent.id, offset: parentInfo.index + 1 }));
        this.onChange(this.state);
      }
      return;
    }

    const children = getNodeChildArray(node, childKey);

    if (this.state.cursor.offset < children.length) {
      const rightNode = children[this.state.cursor.offset];
      const enterableChild = this.getEnterableChild(rightNode, 'start');

      if (enterableChild) {
        this.state = freezeState(buildNewState(this.state.ast, { nodeId: enterableChild.id, offset: 0 }));
      } else {
        this.state = freezeState(buildNewState(this.state.ast, { nodeId: this.state.cursor.nodeId, offset: this.state.cursor.offset + 1 }));
      }
      this.onChange(this.state);
    } else {
      const parentInfo = findParent(this.state.ast, node.id);
      if (parentInfo) {
        this.state = freezeState(buildNewState(this.state.ast, { nodeId: parentInfo.parent.id, offset: parentInfo.index + 1 }));
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
