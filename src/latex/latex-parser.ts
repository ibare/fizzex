/**
 * LaTeX → AST 파서
 *
 * 간단한 수학 LaTeX를 파싱하여 MathNode AST로 변환
 */

import type {
  MathNode,
  RootNode,
  RowNode,
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
  SpaceNode,
} from '../types';
import { generateLatexId, resetLatexIdCounter, deriveId, deriveCellId } from '../utils/id-generator';
import { getCommandHandler, type CommandContext } from './command-registry';
import {
  type ParseError,
  createErrorCollector,
  clearErrorCollector,
  reportWarning,
} from './parse-errors';

/** generateId를 generateLatexId로 매핑 (하위 호환성) */
const generateId = generateLatexId;

/** LaTeX 파싱 결과 (내부용) */
interface ParseResult {
  nodes: MathNode[];
  consumed: number;
}

/** LaTeX 파싱 결과 (공개 API) */
export interface LatexParseResult {
  /** 파싱된 AST */
  ast: RootNode;
  /** 파싱 중 발생한 에러 목록 */
  errors: ParseError[];
  /** 파싱 중 발생한 경고 목록 */
  warnings: ParseError[];
  /** 에러 존재 여부 */
  hasErrors: boolean;
}

/**
 * LaTeX 문자열을 AST로 변환 (에러 정보 포함)
 *
 * @param latex LaTeX 문자열
 * @returns 파싱 결과 (AST + 에러/경고)
 */
export function parseLatexWithErrors(latex: string): LatexParseResult {
  resetLatexIdCounter();
  const collector = createErrorCollector();
  const trimmed = latex.trim();

  try {
    const result = parseExpression(trimmed, 0);
    const ast: RootNode = {
      id: generateId(),
      type: 'root',
      children: result.nodes,
    };

    return {
      ast,
      errors: collector.getErrors(),
      warnings: collector.getWarnings(),
      hasErrors: collector.hasErrors(),
    };
  } catch (e) {
    // 예상치 못한 에러 처리
    const errorMessage = e instanceof Error ? e.message : String(e);
    collector.addError('internal', `파싱 중 내부 오류: ${errorMessage}`, 0, latex);

    return {
      ast: { id: generateId(), type: 'root', children: [] },
      errors: collector.getErrors(),
      warnings: collector.getWarnings(),
      hasErrors: true,
    };
  } finally {
    clearErrorCollector();
  }
}

/**
 * LaTeX 문자열을 AST로 변환 (하위 호환성)
 *
 * @param latex LaTeX 문자열
 * @returns 파싱된 AST (에러 발생 시에도 부분 결과 반환)
 * @deprecated parseLatexWithErrors 사용 권장
 */
export function parseLatex(latex: string): RootNode {
  const result = parseLatexWithErrors(latex);
  return result.ast;
}

/** 표현식 파싱 (최상위 레벨) */
function parseExpression(latex: string, start: number, stopChars: string[] = []): ParseResult {
  const nodes: MathNode[] = [];
  let pos = start;

  while (pos < latex.length) {
    // 공백 스킵
    if (latex[pos] === ' ') {
      pos++;
      continue;
    }

    // 절댓값 (stopChars 체크보다 먼저 - 중첩 절댓값 지원)
    if (latex[pos] === '|') {
      const hasContent = nodes.length > 0;
      const isStopChar = stopChars.includes('|');

      // 닫는 | 판단: 내용이 있고, stopChars에 |가 있는 경우
      // 블랙리스트 방식: 다음이 "닫는 기호 뒤에 올 문자"면 닫는 기호로 판단
      // 닫는 기호 뒤에 오는 문자: 연산자, 닫는 괄호, 공백+연산자, 끝, 또 다른 닫는 |
      if (hasContent && isStopChar) {
        const rest = latex.substring(pos + 1).replace(/^ +/, ''); // 공백 제거 후 확인
        const firstChar = rest[0];

        // 닫는 기호로 판단하는 조건:
        // - 문자열 끝
        // - 이항 연산자 (+, -, =, <, >, 등)
        // - 닫는 괄호
        // - 콤마, 세미콜론
        // - | 다음이 비어있거나 연산자/닫는괄호 (||가 닫는 기호 두 개인 경우)
        const isClosingContext = !firstChar ||
          /^[+\-=<>)}\],;]/.test(firstChar) ||
          /^\\(right|end|\\)/.test(rest) ||
          (firstChar === '|' && (!rest[1] || /^[+\-=<>)}\],;\s]/.test(rest.substring(1).replace(/^ +/, ''))));

        if (isClosingContext) {
          break; // 닫는 기호
        }
      }

      // 절댓값 시작
      pos++;
      const innerResult = parseExpression(latex, pos, ['|']);
      nodes.push(createAbs(innerResult.nodes));
      pos = innerResult.consumed + 1; // '|' 스킵
      continue;
    }

    // 종료 문자/문자열 체크 (멀티 문자 지원, | 제외 - 위에서 처리)
    let shouldStop = false;
    for (const stopStr of stopChars) {
      if (stopStr !== '|' && latex.substring(pos, pos + stopStr.length) === stopStr) {
        shouldStop = true;
        break;
      }
    }
    if (shouldStop) {
      break;
    }

    // 숫자
    if (/[0-9.]/.test(latex[pos])) {
      const numResult = parseNumber(latex, pos);
      nodes.push(...numResult.nodes);
      pos = numResult.consumed;
      continue;
    }

    // 변수 (단일 영문자)
    if (/[a-zA-Z]/.test(latex[pos]) && latex[pos] !== '\\') {
      nodes.push(createVariable(latex[pos]));
      pos++;
      continue;
    }

    // LaTeX 명령어
    if (latex[pos] === '\\') {
      const cmdResult = parseCommand(latex, pos);
      nodes.push(...cmdResult.nodes);
      pos = cmdResult.consumed;
      continue;
    }

    // 연산자
    if ('+-=<>:'.includes(latex[pos])) {
      nodes.push(createOperator(latex[pos]));
      pos++;
      continue;
    }

    // 팩토리얼 (!) - 후위 연산자, 간격 없이 정체로 렌더링
    if (latex[pos] === '!') {
      nodes.push(createOperator('!'));
      pos++;
      continue;
    }

    // 구두점 (콤마, 세미콜론 등) - 정체로 렌더링 (숫자처럼 처리)
    if (',;'.includes(latex[pos])) {
      nodes.push(createNumber(latex[pos]));
      pos++;
      continue;
    }

    // 거듭제곱
    if (latex[pos] === '^') {
      pos++;
      const expResult = parseGroup(latex, pos);
      // 이전 노드를 base로
      const base = nodes.length > 0 ? [nodes.pop()!] : [];
      nodes.push(createPower(base, expResult.nodes));
      pos = expResult.consumed;
      continue;
    }

    // 아래첨자
    if (latex[pos] === '_') {
      pos++;
      const subResult = parseGroup(latex, pos);
      // 이전 노드를 base로
      const base = nodes.length > 0 ? [nodes.pop()!] : [];
      nodes.push(createSubscript(base, subResult.nodes));
      pos = subResult.consumed;
      continue;
    }

    // 괄호
    if (latex[pos] === '(') {
      pos++;
      const innerResult = parseExpression(latex, pos, [')']);
      nodes.push(createParen(innerResult.nodes, '('));
      pos = innerResult.consumed + 1; // ')' 스킵
      continue;
    }
    if (latex[pos] === '[') {
      pos++;
      const innerResult = parseExpression(latex, pos, [']']);
      nodes.push(createParen(innerResult.nodes, '['));
      pos = innerResult.consumed + 1;
      continue;
    }

    // 닫는 괄호는 stopChars에서 처리됨
    if (')]}}'.includes(latex[pos])) {
      break;
    }

    // 중괄호 그룹 (명시적)
    if (latex[pos] === '{') {
      pos++;
      const innerResult = parseExpression(latex, pos, ['}']);
      // 중괄호는 그룹핑용이므로 노드들을 직접 추가
      nodes.push(...innerResult.nodes);
      pos = innerResult.consumed + 1;
      continue;
    }

    // 알 수 없는 문자는 스킵
    pos++;
  }

  return { nodes, consumed: pos };
}

/** 숫자 파싱 (각 자릿수를 별도 노드로) */
function parseNumber(latex: string, start: number): ParseResult {
  const nodes: MathNode[] = [];
  let pos = start;

  while (pos < latex.length && /[0-9.]/.test(latex[pos])) {
    nodes.push(createNumber(latex[pos]));
    pos++;
  }

  return { nodes, consumed: pos };
}

/** 그룹 파싱 ({...}, (...) 또는 단일 문자) */
function parseGroup(latex: string, start: number): ParseResult {
  if (start >= latex.length) {
    return { nodes: [], consumed: start };
  }

  // 중괄호 그룹
  if (latex[start] === '{') {
    const innerResult = parseExpression(latex, start + 1, ['}']);
    return { nodes: innerResult.nodes, consumed: innerResult.consumed + 1 };
  }

  // 소괄호 그룹 (함수 인자용)
  if (latex[start] === '(') {
    const innerResult = parseExpression(latex, start + 1, [')']);
    return { nodes: innerResult.nodes, consumed: innerResult.consumed + 1 };
  }

  // 단일 문자
  if (/[0-9]/.test(latex[start])) {
    return { nodes: [createNumber(latex[start])], consumed: start + 1 };
  }
  if (/[a-zA-Z]/.test(latex[start])) {
    return { nodes: [createVariable(latex[start])], consumed: start + 1 };
  }
  // 연산자 (+, -, 등) - 첨자에서 사용될 수 있음
  if ('+-'.includes(latex[start])) {
    return { nodes: [createOperator(latex[start] as '+' | '-')], consumed: start + 1 };
  }

  return { nodes: [], consumed: start + 1 };
}

/** LaTeX 명령어 파싱 */
function parseCommand(latex: string, start: number): ParseResult {
  if (latex[start] !== '\\') {
    return { nodes: [], consumed: start };
  }

  let pos = start + 1;
  let cmdName = '';

  // 특수 문자 이스케이프 처리 (\{, \}, \%, \& 등)
  if (pos < latex.length && /[{}%&$#_]/.test(latex[pos])) {
    const char = latex[pos];
    pos++;
    // \{ 와 \} 는 중괄호 기호로 렌더링
    if (char === '{' || char === '}') {
      return { nodes: [createNumber(char)], consumed: pos };
    }
    // 다른 특수문자는 그대로 출력
    return { nodes: [createNumber(char)], consumed: pos };
  }

  // 명령어 이름 추출
  while (pos < latex.length && /[a-zA-Z]/.test(latex[pos])) {
    cmdName += latex[pos];
    pos++;
  }

  // 공백 스킵
  while (pos < latex.length && latex[pos] === ' ') {
    pos++;
  }

  // 레지스트리에서 핸들러 조회
  const handler = getCommandHandler(cmdName);
  if (handler) {
    const ctx: CommandContext = {
      latex,
      pos,
      parseExpression,
      parseGroup,
      parseNumber,
      parseCommand,
    };
    return handler(ctx);
  }

  // \begin 환경은 별도 처리
  if (cmdName === 'begin') {
    return parseBeginEnvironment(latex, pos);
  }

  // 알 수 없는 명령어 - 경고 보고
  if (cmdName) {
    reportWarning('unknown_command', `알 수 없는 명령어: \\${cmdName}`, start, latex, cmdName);
  }
  return { nodes: [], consumed: pos };
}

/** \begin{...} 환경 파싱 */
function parseBeginEnvironment(latex: string, pos: number): ParseResult {
  if (latex[pos] !== '{') {
    return { nodes: [], consumed: pos };
  }

  pos++;
  let envName = '';
  while (pos < latex.length && latex[pos] !== '}') {
    envName += latex[pos];
    pos++;
  }
  pos++; // '}' 스킵

  // 행렬 환경
  const matrixEnvs = ['matrix', 'pmatrix', 'bmatrix', 'Bmatrix', 'vmatrix', 'Vmatrix'];
  if (matrixEnvs.includes(envName)) {
    const bracketType = getMatrixBracketType(envName);
    const matrixResult = parseMatrixContent(latex, pos, envName);
    return {
      nodes: [createMatrix(matrixResult.rows, bracketType)],
      consumed: matrixResult.consumed,
    };
  }

  // align / align* / aligned 환경
  const alignEnvs = ['align', 'align*', 'aligned'];
  if (alignEnvs.includes(envName)) {
    const alignResult = parseAlignContent(latex, pos, envName);
    return {
      nodes: [createAlign(alignResult.rows, envName === 'align*', envName === 'aligned')],
      consumed: alignResult.consumed,
    };
  }

  // cases 환경
  if (envName === 'cases') {
    const casesResult = parseAlignContent(latex, pos, envName);
    return {
      nodes: [createCases(casesResult.rows)],
      consumed: casesResult.consumed,
    };
  }

  // gather / gather* / gathered 환경
  const gatherEnvs = ['gather', 'gather*', 'gathered'];
  if (gatherEnvs.includes(envName)) {
    const gatherResult = parseGatherContent(latex, pos, envName);
    return {
      nodes: [createGather(gatherResult.rows, envName === 'gather*', envName === 'gathered')],
      consumed: gatherResult.consumed,
    };
  }

  // array 환경
  if (envName === 'array') {
    const arrayResult = parseArrayContent(latex, pos);
    return {
      nodes: [createArray(arrayResult.rows, arrayResult.colAlign, arrayResult.colLines, arrayResult.rowLines)],
      consumed: arrayResult.consumed,
    };
  }

  return { nodes: [], consumed: pos };
}


/** 노드 생성 헬퍼들 */
function createNumber(value: string): NumberNode {
  return { id: generateId(), type: 'number', value };
}

function createVariable(name: string): VariableNode {
  return { id: generateId(), type: 'variable', name };
}

function createOperator(op: string): OperatorNode {
  return { id: generateId(), type: 'operator', operator: op };
}

function createFrac(numerator: MathNode[], denominator: MathNode[]): FracNode {
  const fracId = generateId();
  const numRow: RowNode = { id: deriveId(fracId, '_num'), type: 'row', children: numerator };
  const denRow: RowNode = { id: deriveId(fracId, '_den'), type: 'row', children: denominator };
  return { id: fracId, type: 'frac', numerator: [numRow], denominator: [denRow] };
}

function createPower(base: MathNode[], exponent: MathNode[]): PowerNode {
  const powerId = generateId();
  const expRow: RowNode = { id: deriveId(powerId, '_exp'), type: 'row', children: exponent };
  return { id: powerId, type: 'power', base, exponent: [expRow] };
}

function createSubscript(base: MathNode[], subscript: MathNode[]): SubscriptNode {
  const subId = generateId();
  const subRow: RowNode = { id: deriveId(subId, '_sub'), type: 'row', children: subscript };
  return { id: subId, type: 'subscript', base, subscript: [subRow] };
}

function createParen(content: MathNode[], parenType: '(' | '[' | '{', autoSize: boolean = false): ParenNode {
  const parenId = generateId();
  const contentRow: RowNode = { id: deriveId(parenId, '_content'), type: 'row', children: content };
  return { id: parenId, type: 'paren', content: [contentRow], parenType, autoSize };
}

function createAbs(content: MathNode[]): AbsNode {
  const absId = generateId();
  const contentRow: RowNode = { id: deriveId(absId, '_content'), type: 'row', children: content };
  return { id: absId, type: 'abs', content: [contentRow] };
}

function createSqrt(content: MathNode[], index?: MathNode[]): SqrtNode {
  const sqrtId = generateId();
  const contentRow: RowNode = { id: deriveId(sqrtId, '_content'), type: 'row', children: content };
  if (index) {
    const indexRow: RowNode = { id: deriveId(sqrtId, '_index'), type: 'row', children: index };
    return { id: sqrtId, type: 'sqrt', content: [contentRow], index: [indexRow] };
  }
  return { id: sqrtId, type: 'sqrt', content: [contentRow] };
}

function createFunc(name: string, argument: MathNode[]): FuncNode {
  return { id: generateId(), type: 'func', name, argument };
}

function createIntegral(
  lower: MathNode[],
  upper: MathNode[],
  integrand: MathNode[],
  differential: string,
  integralType: 'int' | 'iint' | 'iiint' | 'oint' = 'int'
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
    integralType,
  };
}

function createSum(lower: MathNode[], upper: MathNode[], body: MathNode[]): SumNode {
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

function createLimit(variable: string, approach: MathNode[], body: MathNode[]): LimitNode {
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

function createProduct(lower: MathNode[], upper: MathNode[], body: MathNode[]): ProductNode {
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

function createOverline(content: MathNode[]): OverlineNode {
  const overlineId = generateId();
  const contentRow: RowNode = { id: deriveId(overlineId, '_content'), type: 'row', children: content };
  return {
    id: overlineId,
    type: 'overline',
    content: [contentRow],
  };
}

function createAccent(
  content: MathNode[],
  accentType: 'hat' | 'vec' | 'dot' | 'ddot' | 'tilde' | 'bar' | 'breve' | 'check'
): AccentNode {
  const accentId = generateId();
  const contentRow: RowNode = { id: deriveId(accentId, '_content'), type: 'row', children: content };
  return {
    id: accentId,
    type: 'accent',
    content: [contentRow],
    accentType,
  };
}

function createText(content: string): TextNode {
  return {
    id: generateId(),
    type: 'text',
    content,
  };
}

function createSpace(width: number): SpaceNode {
  return {
    id: generateId(),
    type: 'space',
    width,
  };
}

function createMatrix(rows: MathNode[][], bracketType: '(' | '[' | '{' | '|' | '||' | 'none'): MatrixNode {
  const matrixId = generateId();
  // 각 셀을 RowNode로 감싸기
  const wrappedRows = rows.map((row, i) =>
    row.map((cell, j) => {
      if (cell.type === 'row') {
        // 이미 row 노드면 ID만 교체
        return { ...cell, id: deriveCellId(matrixId, i, j) };
      }
      // 아니면 row로 감싸기
      const cellRow: RowNode = {
        id: deriveCellId(matrixId, i, j),
        type: 'row',
        children: [cell]
      };
      return cellRow;
    })
  );

  return {
    id: matrixId,
    type: 'matrix',
    rows: wrappedRows,
    bracketType,
  };
}

/** 행렬 환경 이름에서 괄호 타입 반환 */
function getMatrixBracketType(envName: string): '(' | '[' | '{' | '|' | '||' | 'none' {
  switch (envName) {
    case 'pmatrix':
      return '(';
    case 'bmatrix':
      return '[';
    case 'Bmatrix':
      return '{';
    case 'vmatrix':
      return '|';
    case 'Vmatrix':
      return '||';
    case 'matrix':
    default:
      return 'none';
  }
}

/** 행렬 내용 파싱 */
function parseMatrixContent(
  latex: string,
  start: number,
  envName: string
): { rows: MathNode[][]; consumed: number } {
  const rows: MathNode[][] = [];
  let currentRow: MathNode[] = [];
  let pos = start;

  // \end{envName}까지 파싱
  const endMarker = `\\end{${envName}}`;

  while (pos < latex.length) {
    // \end 확인
    if (latex.substring(pos, pos + endMarker.length) === endMarker) {
      // 마지막 셀 처리
      if (currentRow.length > 0) {
        const cellRow: RowNode = {
          id: generateId(),
          type: 'row',
          children: currentRow,
        };
        if (rows.length === 0) {
          rows.push([]);
        }
        const lastRow = rows[rows.length - 1];
        lastRow.push(cellRow);
      }
      pos += endMarker.length;
      break;
    }

    // 공백 스킵
    if (latex[pos] === ' ' || latex[pos] === '\n' || latex[pos] === '\t') {
      pos++;
      continue;
    }

    // 열 구분자 &
    if (latex[pos] === '&') {
      // 현재 셀 완료, 다음 셀 시작
      const cellRow: RowNode = {
        id: generateId(),
        type: 'row',
        children: currentRow,
      };
      if (rows.length === 0) {
        rows.push([]);
      }
      const lastRow = rows[rows.length - 1];
      lastRow.push(cellRow);
      currentRow = [];
      pos++;
      continue;
    }

    // 행 구분자 \\
    if (latex[pos] === '\\' && pos + 1 < latex.length && latex[pos + 1] === '\\') {
      // 현재 셀을 현재 행에 추가
      const cellRow: RowNode = {
        id: generateId(),
        type: 'row',
        children: currentRow,
      };
      if (rows.length === 0) {
        rows.push([]);
      }
      const lastRow = rows[rows.length - 1];
      lastRow.push(cellRow);
      currentRow = [];
      // 새 행 시작
      rows.push([]);
      pos += 2;
      continue;
    }

    // 일반 표현식 파싱 (& 또는 \\ 또는 \end까지)
    const cellResult = parseExpression(latex, pos, ['&', '\\\\', '\\end']);
    currentRow.push(...cellResult.nodes);
    if (cellResult.consumed > pos) {
      pos = cellResult.consumed;
    } else {
      // 무한 루프 방지: 진행이 없으면 한 문자 스킵
      pos++;
    }
  }

  // 마지막 행이 빈 경우 제거
  if (rows.length > 0 && rows[rows.length - 1].length === 0) {
    rows.pop();
  }

  return { rows, consumed: pos };
}

/**
 * align/cases 환경 내용 파싱
 * & 로 열 구분, \\ 로 행 구분
 */
function parseAlignContent(
  latex: string,
  start: number,
  envName: string
): { rows: MathNode[][]; consumed: number } {
  const rows: MathNode[][] = [];
  let currentRow: MathNode[] = [];
  let currentCell: MathNode[] = [];
  let pos = start;

  const endMarker = `\\end{${envName}}`;

  while (pos < latex.length) {
    // \end 확인
    if (latex.substring(pos, pos + endMarker.length) === endMarker) {
      // 마지막 셀 저장
      if (currentCell.length > 0) {
        const cellRow: RowNode = {
          id: generateId(),
          type: 'row',
          children: currentCell,
        };
        currentRow.push(cellRow);
      }
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      pos += endMarker.length;
      break;
    }

    // 공백 스킵 (줄바꿈 제외)
    if (latex[pos] === ' ' || latex[pos] === '\t') {
      pos++;
      continue;
    }

    // 줄바꿈 (단독)
    if (latex[pos] === '\n') {
      pos++;
      continue;
    }

    // 열 구분자 &
    if (latex[pos] === '&') {
      const cellRow: RowNode = {
        id: generateId(),
        type: 'row',
        children: currentCell,
      };
      currentRow.push(cellRow);
      currentCell = [];
      pos++;
      continue;
    }

    // 행 구분자 \\
    if (latex[pos] === '\\' && pos + 1 < latex.length && latex[pos + 1] === '\\') {
      // 현재 셀 완료
      const cellRow: RowNode = {
        id: generateId(),
        type: 'row',
        children: currentCell,
      };
      currentRow.push(cellRow);
      rows.push(currentRow);
      currentRow = [];
      currentCell = [];
      pos += 2;
      continue;
    }

    // 일반 내용 파싱 (\end에서도 멈춤)
    const result = parseExpression(latex, pos, ['&', '\\\\', '\\end']);
    if (result.nodes.length > 0) {
      currentCell.push(...result.nodes);
    }
    if (result.consumed > pos) {
      pos = result.consumed;
    } else {
      pos++;
    }
  }

  return { rows, consumed: pos };
}

/**
 * gather 환경 내용 파싱
 * 열 구분 없이 \\ 로만 행 구분
 */
function parseGatherContent(
  latex: string,
  start: number,
  envName: string
): { rows: MathNode[]; consumed: number } {
  const rows: MathNode[] = [];
  let currentRow: MathNode[] = [];
  let pos = start;

  const endMarker = `\\end{${envName}}`;

  while (pos < latex.length) {
    // \end 확인
    if (latex.substring(pos, pos + endMarker.length) === endMarker) {
      if (currentRow.length > 0) {
        const rowNode: RowNode = {
          id: generateId(),
          type: 'row',
          children: currentRow,
        };
        rows.push(rowNode);
      }
      pos += endMarker.length;
      break;
    }

    // 공백 스킵
    if (latex[pos] === ' ' || latex[pos] === '\t' || latex[pos] === '\n') {
      pos++;
      continue;
    }

    // 행 구분자 \\
    if (latex[pos] === '\\' && pos + 1 < latex.length && latex[pos + 1] === '\\') {
      const rowNode: RowNode = {
        id: generateId(),
        type: 'row',
        children: currentRow,
      };
      rows.push(rowNode);
      currentRow = [];
      pos += 2;
      continue;
    }

    // 일반 내용 파싱 (\end에서도 멈춤)
    const result = parseExpression(latex, pos, ['\\\\', '\\end']);
    if (result.nodes.length > 0) {
      currentRow.push(...result.nodes);
    }
    if (result.consumed > pos) {
      pos = result.consumed;
    } else {
      pos++;
    }
  }

  return { rows, consumed: pos };
}

/**
 * array 환경 내용 파싱
 * {l|c|r} 형태의 열 정렬 및 구분선 지정자 파싱 포함
 */
function parseArrayContent(
  latex: string,
  start: number
): { rows: MathNode[][]; colAlign: ('l' | 'c' | 'r')[]; colLines: boolean[]; rowLines: boolean[]; consumed: number } {
  let pos = start;
  const colAlign: ('l' | 'c' | 'r')[] = [];
  const colLines: boolean[] = [false]; // 첫 번째는 왼쪽 경계선

  // {l|c|r} 열 정렬 지정자 파싱
  if (latex[pos] === '{') {
    pos++;
    let pendingLine = false;
    while (pos < latex.length && latex[pos] !== '}') {
      const ch = latex[pos];
      if (ch === 'l' || ch === 'c' || ch === 'r') {
        // 이전에 | 가 있었으면 현재 열 앞에 선 추가
        if (colAlign.length === 0) {
          colLines[0] = pendingLine;
        } else {
          colLines.push(pendingLine);
        }
        colAlign.push(ch);
        pendingLine = false;
      } else if (ch === '|') {
        pendingLine = true;
      }
      pos++;
    }
    // 마지막 | 처리 (오른쪽 경계선)
    colLines.push(pendingLine);
    pos++; // '}' 스킵
  }

  // 기본 정렬이 없으면 중앙 정렬
  if (colAlign.length === 0) {
    colAlign.push('c');
    colLines.push(false); // 오른쪽 경계선
  }

  // array 내용 파싱 (\hline 지원)
  const rows: MathNode[][] = [];
  const rowLines: boolean[] = [false]; // 첫 번째는 상단 경계선
  let currentRow: MathNode[] = [];
  const endMarker = '\\end{array}';

  while (pos < latex.length) {
    // \end 확인
    if (latex.substring(pos, pos + endMarker.length) === endMarker) {
      // 마지막 셀 처리
      if (currentRow.length > 0) {
        const cellRow: RowNode = {
          id: generateId(),
          type: 'row',
          children: currentRow,
        };
        if (rows.length === 0) {
          rows.push([]);
        }
        const lastRow = rows[rows.length - 1];
        lastRow.push(cellRow);
      }
      rowLines.push(false); // 하단 경계선
      pos += endMarker.length;
      break;
    }

    // 공백 스킵
    if (latex[pos] === ' ' || latex[pos] === '\n' || latex[pos] === '\t') {
      pos++;
      continue;
    }

    // \hline 처리
    if (latex.substring(pos, pos + 6) === '\\hline') {
      // 현재 위치에 가로선 추가
      if (rows.length === 0) {
        rowLines[0] = true; // 상단 경계선
      } else {
        rowLines[rowLines.length - 1] = true;
      }
      pos += 6;
      continue;
    }

    // 열 구분자 &
    if (latex[pos] === '&') {
      const cellRow: RowNode = {
        id: generateId(),
        type: 'row',
        children: currentRow,
      };
      if (rows.length === 0) {
        rows.push([]);
      }
      const lastRow = rows[rows.length - 1];
      lastRow.push(cellRow);
      currentRow = [];
      pos++;
      continue;
    }

    // 행 구분자 \\
    if (latex[pos] === '\\' && pos + 1 < latex.length && latex[pos + 1] === '\\') {
      const cellRow: RowNode = {
        id: generateId(),
        type: 'row',
        children: currentRow,
      };
      if (rows.length === 0) {
        rows.push([]);
      }
      const lastRow = rows[rows.length - 1];
      lastRow.push(cellRow);
      currentRow = [];
      // 새 행 시작
      rows.push([]);
      rowLines.push(false); // 다음 행 위 경계선 (기본 false)
      pos += 2;
      continue;
    }

    // 일반 표현식 파싱
    const cellResult = parseExpression(latex, pos, ['&', '\\\\', '\\end', '\\hline']);
    currentRow.push(...cellResult.nodes);
    if (cellResult.consumed > pos) {
      pos = cellResult.consumed;
    } else {
      pos++;
    }
  }

  // 마지막 행이 빈 경우 제거
  if (rows.length > 0 && rows[rows.length - 1].length === 0) {
    rows.pop();
    rowLines.pop();
  }

  return {
    rows,
    colAlign,
    colLines,
    rowLines,
    consumed: pos,
  };
}

/** align 노드 생성 */
function createAlign(rows: MathNode[][], starred: boolean, isInline: boolean): AlignNode {
  return {
    id: generateId(),
    type: 'align',
    rows,
    starred,
    isInline,
  };
}

/** cases 노드 생성 */
function createCases(rows: MathNode[][]): CasesNode {
  return {
    id: generateId(),
    type: 'cases',
    rows,
  };
}

/** gather 노드 생성 */
function createGather(rows: MathNode[], starred: boolean, isInline: boolean): GatherNode {
  return {
    id: generateId(),
    type: 'gather',
    rows,
    starred,
    isInline,
  };
}

/** array 노드 생성 */
function createArray(
  rows: MathNode[][],
  colAlign: ('l' | 'c' | 'r')[],
  colLines: boolean[],
  rowLines: boolean[]
): ArrayNode {
  return {
    id: generateId(),
    type: 'array',
    rows,
    colAlign,
    colLines,
    rowLines,
  };
}
