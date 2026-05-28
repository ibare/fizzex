/**
 * 기본 명령어 핸들러 (frac, sqrt, text 등)
 */

import type { CommandHandler } from './types.js';
import {
  createFrac, createBinom, createSqrt, createText, createParen, createAbs,
  createSpace, createStyledRow, createOverset, createUnderset, createBoxed,
  createCancel, createFunc, createOperator, mapMathFont,
  generateId as generateLatexId, deriveId,
} from './helpers.js';
import type { MathFontStyle } from './helpers.js';
import { reportError } from '../parse-errors.js';

/** \frac{num}{den}, \dfrac, \tfrac, \cfrac */
export const fracHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  const numResult = ctx.parseGroup(ctx.latex, pos);
  pos = numResult.consumed;
  while (pos < ctx.latex.length && ctx.latex[pos] === ' ') pos++;
  const denResult = ctx.parseGroup(ctx.latex, pos);
  const styleOverride = ctx.commandName === 'dfrac' ? 'display' as const
    : (ctx.commandName === 'tfrac' || ctx.commandName === 'cfrac') ? 'text' as const
    : undefined;
  return {
    nodes: [createFrac(numResult.nodes, denResult.nodes, styleOverride)],
    consumed: denResult.consumed,
  };
};

/** \sqrt[n]{x} 또는 \sqrt{x} */
export const sqrtHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  let index: import('../../types.js').MathNode[] | undefined;
  if (ctx.latex[pos] === '[') {
    const indexResult = ctx.parseExpression(ctx.latex, pos + 1, [']']);
    index = indexResult.nodes;
    pos = indexResult.consumed + 1;
  }
  const contentResult = ctx.parseGroup(ctx.latex, pos);
  return {
    nodes: [createSqrt(contentResult.nodes, index)],
    consumed: contentResult.consumed,
  };
};

/** \text{...} */
export const textHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  if (ctx.latex[pos] !== '{') {
    return { nodes: [], consumed: pos };
  }
  pos++;
  const start = pos;
  let depth = 1;
  while (pos < ctx.latex.length && depth > 0) {
    if (ctx.latex[pos] === '{') depth++;
    else if (ctx.latex[pos] === '}') depth--;
    if (depth > 0) pos++;
  }
  const textContent = ctx.latex.substring(start, pos);
  return {
    nodes: [createText(textContent)],
    consumed: pos + 1,
  };
};

/** named delimiter 매핑 (open/close) */
const NAMED_DELIMITERS: Record<string, { char: string; parenType: '(' | '[' | '{' }> = {
  langle: { char: '⟨', parenType: '(' },
  rangle: { char: '⟩', parenType: '(' },
  lceil: { char: '⌈', parenType: '[' },
  rceil: { char: '⌉', parenType: '[' },
  lfloor: { char: '⌊', parenType: '[' },
  rfloor: { char: '⌋', parenType: '[' },
  lbrace: { char: '{', parenType: '{' },
  rbrace: { char: '}', parenType: '{' },
  lvert: { char: '|', parenType: '(' },
  rvert: { char: '|', parenType: '(' },
  lVert: { char: '‖', parenType: '(' },
  rVert: { char: '‖', parenType: '(' },
};

/** delimiter 파싱 결과 */
interface DelimiterInfo {
  parenType: '(' | '[' | '{';
  char: string;        // 실제 구분자 문자 ('(', ')', '⟨', '⟩' 등)
  isAbs: boolean;
  isDoubleBar: boolean;
  consumed: number;
}

/** delimiter 파싱 (단일 문자 또는 \ 명령어) */
function parseDelimiter(latex: string, pos: number): DelimiterInfo | null {
  if (pos >= latex.length) return null;

  // \| (이중 세로줄)
  if (latex[pos] === '\\' && pos + 1 < latex.length && latex[pos + 1] === '|') {
    return { parenType: '(', char: '‖', isAbs: false, isDoubleBar: true, consumed: pos + 2 };
  }

  // \ 명령어 delimiter (\langle, \lceil 등)
  if (latex[pos] === '\\') {
    let cmdEnd = pos + 1;
    while (cmdEnd < latex.length && /[a-zA-Z]/.test(latex[cmdEnd])) cmdEnd++;
    const cmd = latex.substring(pos + 1, cmdEnd);
    const delim = NAMED_DELIMITERS[cmd];
    if (delim) {
      return { parenType: delim.parenType, char: delim.char, isAbs: false, isDoubleBar: cmd === 'lVert' || cmd === 'rVert', consumed: cmdEnd };
    }
    return null;
  }

  // 단일 문자 delimiter
  const ch = latex[pos];
  if ('([{'.includes(ch)) return { parenType: ch as '(' | '[' | '{', char: ch, isAbs: false, isDoubleBar: false, consumed: pos + 1 };
  if (')]}'.includes(ch)) {
    const openMap: Record<string, '(' | '[' | '{'> = { ')': '(', ']': '[', '}': '{' };
    return { parenType: openMap[ch] || '(', char: ch, isAbs: false, isDoubleBar: false, consumed: pos + 1 };
  }
  if (ch === '|') return { parenType: '(', char: '|', isAbs: true, isDoubleBar: false, consumed: pos + 1 };
  if (ch === '.') return { parenType: '(', char: '.', isAbs: false, isDoubleBar: false, consumed: pos + 1 };

  return null;
}

/** \left ... \right 처리 */
export const leftHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;

  const openDelim = parseDelimiter(ctx.latex, pos);
  if (!openDelim) {
    return { nodes: [], consumed: pos };
  }
  pos = openDelim.consumed;

  const innerResult = ctx.parseExpression(ctx.latex, pos, ['\\right']);
  pos = innerResult.consumed;

  // \right 건너뛰기 + close delimiter 파싱
  if (ctx.latex.substring(pos, pos + 6) === '\\right') {
    pos += 6;
    const closeDelim = parseDelimiter(ctx.latex, pos);
    if (closeDelim) {
      pos = closeDelim.consumed;
    }
  }

  // 절댓값 처리 (양쪽 모두 |)
  if (openDelim.isAbs) {
    return {
      nodes: [createAbs(innerResult.nodes)],
      consumed: pos,
    };
  }

  return {
    nodes: [createParen(innerResult.nodes, openDelim.parenType, true)],
    consumed: pos,
  };
};

/** \binom{n}{k}, \dbinom, \tbinom */
export const binomHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  const numResult = ctx.parseGroup(ctx.latex, pos);
  pos = numResult.consumed;
  while (pos < ctx.latex.length && ctx.latex[pos] === ' ') pos++;
  const denResult = ctx.parseGroup(ctx.latex, pos);
  const styleOverride = ctx.commandName === 'dbinom' ? 'display' as const
    : ctx.commandName === 'tbinom' ? 'text' as const
    : undefined;
  return {
    nodes: [createBinom(numResult.nodes, denResult.nodes, styleOverride)],
    consumed: denResult.consumed,
  };
};

/** 수학 폰트 명령어 핸들러 생성 */
function createMathFontHandler(style: MathFontStyle): CommandHandler {
  return (ctx) => {
    let pos = ctx.pos;
    if (ctx.latex[pos] !== '{') {
      return { nodes: [], consumed: pos };
    }
    pos++;
    const start = pos;
    let depth = 1;
    while (pos < ctx.latex.length && depth > 0) {
      if (ctx.latex[pos] === '{') depth++;
      else if (ctx.latex[pos] === '}') depth--;
      if (depth > 0) pos++;
    }
    const content = ctx.latex.substring(start, pos);
    const mapped = mapMathFont(content, style);
    return {
      nodes: [createText(mapped)],
      consumed: pos + 1,
    };
  };
}

/** 폰트 선언 명령어 핸들러 생성 (\rm, \bf 등 — 중괄호 없이 사용 가능) */
function createFontDeclarationHandler(style: MathFontStyle | null): CommandHandler {
  return (ctx) => {
    let pos = ctx.pos;
    while (pos < ctx.latex.length && ctx.latex[pos] === ' ') pos++;

    // 중괄호가 있으면 createMathFontHandler와 동일하게 동작
    if (ctx.latex[pos] === '{') {
      pos++;
      const start = pos;
      let depth = 1;
      while (pos < ctx.latex.length && depth > 0) {
        if (ctx.latex[pos] === '{') depth++;
        else if (ctx.latex[pos] === '}') depth--;
        if (depth > 0) pos++;
      }
      const content = ctx.latex.substring(start, pos);
      if (style === null) {
        return { nodes: [createText(content)], consumed: pos + 1 };
      }
      return { nodes: [createText(mapMathFont(content, style))], consumed: pos + 1 };
    }

    // 중괄호 없음: 그룹 끝(}) 또는 다음 명령어(\) 또는 문자열 끝까지 소비
    const start = pos;
    while (pos < ctx.latex.length && ctx.latex[pos] !== '}' && ctx.latex[pos] !== '\\') {
      pos++;
    }
    const content = ctx.latex.substring(start, pos).trim();
    if (!content) return { nodes: [], consumed: pos };
    if (style === null) {
      return { nodes: [createText(content)], consumed: pos };
    }
    return { nodes: [createText(mapMathFont(content, style))], consumed: pos };
  };
}

/** \displaystyle, \textstyle, \scriptstyle, \scriptscriptstyle — 스타일 전환 */
function createStyleHandler(styleHint: 'display' | 'text' | 'script' | 'scriptscript'): CommandHandler {
  return (ctx) => {
    // 이후 그룹 끝(})이나 \right 등 stopChar까지의 콘텐츠를 파싱
    const result = ctx.parseExpression(ctx.latex, ctx.pos, ['}', '\\right', '\\end']);
    return {
      nodes: [createStyledRow(result.nodes, styleHint)],
      consumed: result.consumed,
    };
  };
}

/** \overset{above}{base} */
const oversetHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  const annoResult = ctx.parseGroup(ctx.latex, pos);
  pos = annoResult.consumed;
  while (pos < ctx.latex.length && ctx.latex[pos] === ' ') pos++;
  const baseResult = ctx.parseGroup(ctx.latex, pos);
  return {
    nodes: [createOverset(baseResult.nodes, annoResult.nodes)],
    consumed: baseResult.consumed,
  };
};

/** \underset{below}{base} */
const undersetHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  const annoResult = ctx.parseGroup(ctx.latex, pos);
  pos = annoResult.consumed;
  while (pos < ctx.latex.length && ctx.latex[pos] === ' ') pos++;
  const baseResult = ctx.parseGroup(ctx.latex, pos);
  return {
    nodes: [createUnderset(baseResult.nodes, annoResult.nodes)],
    consumed: baseResult.consumed,
  };
};

/** \stackrel{above}{base} — overset과 동일 */
const stackrelHandler: CommandHandler = oversetHandler;

/** \boxed{expr} */
const boxedHandler: CommandHandler = (ctx) => {
  const result = ctx.parseGroup(ctx.latex, ctx.pos);
  return {
    nodes: [createBoxed(result.nodes)],
    consumed: result.consumed,
  };
};

/** \cancel{expr}, \bcancel{expr}, \xcancel{expr} */
const cancelHandler: CommandHandler = (ctx) => {
  const cancelType = ctx.commandName as 'cancel' | 'bcancel' | 'xcancel';
  const result = ctx.parseGroup(ctx.latex, ctx.pos);
  return {
    nodes: [createCancel(result.nodes, cancelType)],
    consumed: result.consumed,
  };
};

/** \not — 다음 기호에 슬래시 오버레이 */
const NEGATION_MAP: Record<string, string> = {
  '=': '≠', '<': '≮', '>': '≯', '≤': '≰', '≥': '≱',
  '∈': '∉', '⊂': '⊄', '⊆': '⊈', '≡': '≢', '∼': '≁',
  '≈': '≉', '⪯': '⋠', '⪰': '⋡', '∋': '∌', '∥': '∦',
  '⊢': '⊬', '⊨': '⊭',
};

const notHandler: CommandHandler = (ctx) => {
  // 다음 토큰 파싱
  const result = ctx.parseCommand(ctx.latex, ctx.pos);
  if (result.nodes.length > 0) {
    const node = result.nodes[0];
    // 연산자 노드면 부정 기호로 대체 시도
    if (node.type === 'operator' && NEGATION_MAP[node.operator]) {
      return {
        nodes: [createOperator(NEGATION_MAP[node.operator])],
        consumed: result.consumed,
      };
    }
  }
  // 대체 불가 시 슬래시 + 원본 기호
  return {
    nodes: [createOperator('̸'), ...result.nodes],
    consumed: result.consumed,
  };
};

/** \operatorname{name} */
const operatornameHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  if (ctx.latex[pos] !== '{') return { nodes: [], consumed: pos };
  pos++;
  const start = pos;
  let depth = 1;
  while (pos < ctx.latex.length && depth > 0) {
    if (ctx.latex[pos] === '{') depth++;
    else if (ctx.latex[pos] === '}') depth--;
    if (depth > 0) pos++;
  }
  const name = ctx.latex.substring(start, pos);
  return {
    nodes: [createFunc(name, [])],
    consumed: pos + 1,
  };
};

/** \substack{a \\ b} — 수직 스택 (1열 matrix로 변환) */
const substackHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  if (ctx.latex[pos] !== '{') return { nodes: [], consumed: pos };
  pos++;
  const start = pos;
  let depth = 1;
  while (pos < ctx.latex.length && depth > 0) {
    if (ctx.latex[pos] === '{') depth++;
    else if (ctx.latex[pos] === '}') depth--;
    if (depth > 0) pos++;
  }
  const content = ctx.latex.substring(start, pos);
  // \\ 로 행 분리 후 각 행을 파싱
  const lines = content.split('\\\\').map(s => s.trim());
  const rows = lines.map(line => {
    const result = ctx.parseExpression(line, 0);
    return result.nodes;
  });

  const matrixId = generateLatexId();
  const matrixRows = rows.map((row, i) => {
    const rowNode = { id: deriveId(matrixId, `_r${i}`), type: 'row' as const, children: row };
    return [rowNode];
  });
  return {
    nodes: [{ id: matrixId, type: 'matrix' as const, rows: matrixRows, bracketType: 'none' as const }],
    consumed: pos + 1,
  };
};

/** \phantom{...} — 내용의 너비만큼 투명 공백 */
const phantomHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  if (ctx.latex[pos] !== '{') return { nodes: [], consumed: pos };
  pos++;
  const start = pos;
  let depth = 1;
  while (pos < ctx.latex.length && depth > 0) {
    if (ctx.latex[pos] === '{') depth++;
    else if (ctx.latex[pos] === '}') depth--;
    if (depth > 0) pos++;
  }
  const content = ctx.latex.substring(start, pos);
  // 글자 수 기반 너비 근사 (1문자 ≈ 0.5em)
  const width = Math.max(content.length * 0.5, 0.167);
  return { nodes: [createSpace(width)], consumed: pos + 1 };
};

/** \vphantom{...} — 내용의 높이만 확보 (너비 0) */
const vphantomHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  if (ctx.latex[pos] !== '{') return { nodes: [], consumed: pos };
  pos++;
  let depth = 1;
  while (pos < ctx.latex.length && depth > 0) {
    if (ctx.latex[pos] === '{') depth++;
    else if (ctx.latex[pos] === '}') depth--;
    if (depth > 0) pos++;
  }
  // 인자를 소비하되 출력 없음
  return { nodes: [], consumed: pos + 1 };
};

/** \big, \Big, \bigg, \Bigg — 고정 크기 단일 구분자 */
function createBigDelimHandler(size: 'big' | 'Big' | 'bigg' | 'Bigg'): CommandHandler {
  return (ctx) => {
    let pos = ctx.pos;
    // 다음 토큰이 구분자 문자
    const delim = parseDelimiter(ctx.latex, pos);
    if (!delim) return { nodes: [], consumed: pos };
    pos = delim.consumed;
    // 단일 구분자를 OperatorNode로 표현 (ParenNode는 항상 쌍으로 렌더링되므로 부적합)
    const node = createOperator(delim.char);
    (node as import('../../types.js').OperatorNode).delimiterSize = size;
    return { nodes: [node], consumed: pos };
  };
}

/** \bigl, \bigr 등 좌/우 명시 변형도 동일하게 처리 */
const bigVariants = ['big', 'Big', 'bigg', 'Bigg'] as const;

/** 기본 명령어 핸들러 레지스트리 */
/** No-op 핸들러 — 명령어만 소비하고 아무 노드도 생성하지 않음 */
const noopHandler: CommandHandler = (ctx) => {
  return { nodes: [], consumed: ctx.pos };
};

/** 그룹 인자를 소비하고 버리는 핸들러 (\tag{...}, \label{...}) */
const consumeGroupHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  if (pos < ctx.latex.length && ctx.latex[pos] === '{') {
    pos++;
    let depth = 1;
    while (pos < ctx.latex.length && depth > 0) {
      if (ctx.latex[pos] === '{') depth++;
      else if (ctx.latex[pos] === '}') depth--;
      pos++;
    }
  }
  return { nodes: [], consumed: pos };
};

/** \color{red} — 색상값을 소비하고 이후 내용을 그대로 파싱 */
const colorHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  // {color} 소비
  if (pos < ctx.latex.length && ctx.latex[pos] === '{') {
    pos++;
    let depth = 1;
    while (pos < ctx.latex.length && depth > 0) {
      if (ctx.latex[pos] === '{') depth++;
      else if (ctx.latex[pos] === '}') depth--;
      pos++;
    }
  }
  // \color는 선언형 — 이후 같은 스코프 내 내용에 적용
  return { nodes: [], consumed: pos };
};

/** \textcolor{red}{content} — 색상값 소비 후 내용 반환 */
const textcolorHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  // {color} 소비
  if (pos < ctx.latex.length && ctx.latex[pos] === '{') {
    pos++;
    let depth = 1;
    while (pos < ctx.latex.length && depth > 0) {
      if (ctx.latex[pos] === '{') depth++;
      else if (ctx.latex[pos] === '}') depth--;
      pos++;
    }
  }
  // {content} 파싱하여 반환
  const content = ctx.parseGroup(ctx.latex, pos);
  return { nodes: content.nodes, consumed: content.consumed };
};

/**
 * \end{...} — 환경 매칭 실패 시 단독 출현
 * \begin{env}에서 환경을 인식한 경우 \end는 parseBeginEnvironment 내부에서 소비된다.
 * 여기에 도달했다면 환경이 미지원이거나 매칭에 실패한 것이다.
 */
const unmatchedEndHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  // \end{envname} 소비
  let envName = 'unknown';
  if (pos < ctx.latex.length && ctx.latex[pos] === '{') {
    pos++;
    const nameStart = pos;
    while (pos < ctx.latex.length && ctx.latex[pos] !== '}') pos++;
    envName = ctx.latex.substring(nameStart, pos);
    if (pos < ctx.latex.length) pos++; // '}' 스킵
  }
  reportError('environment', `매칭되지 않은 환경 종료: \\end{${envName}}`, ctx.pos, ctx.latex, 'end', [`\\begin{${envName}}`]);
  return { nodes: [], consumed: pos };
};

/**
 * \right — \left와 매칭되지 않은 단독 출현
 * 정상적인 \left...\right 쌍에서는 leftHandler가 \right를 소비한다.
 * 여기에 도달했다면 \left 없이 \right가 나타난 것이다.
 */
const unmatchedRightHandler: CommandHandler = (ctx) => {
  let pos = ctx.pos;
  // 뒤따르는 구분자 소비 (\right. \right) \right| 등)
  if (pos < ctx.latex.length) {
    if (ctx.latex[pos] === '\\') {
      pos++;
      while (pos < ctx.latex.length && /[a-zA-Z]/.test(ctx.latex[pos])) pos++;
    } else {
      pos++;
    }
  }
  reportError('syntax', `매칭되지 않은 \\right`, ctx.pos, ctx.latex, 'right', ['\\left']);
  return { nodes: [], consumed: pos };
};

export const basicHandlers: Map<string, CommandHandler> = new Map([
  ['frac', fracHandler],
  ['dfrac', fracHandler],
  ['tfrac', fracHandler],
  ['cfrac', fracHandler],
  ['binom', binomHandler],
  ['dbinom', binomHandler],
  ['tbinom', binomHandler],
  ['sqrt', sqrtHandler],
  ['text', textHandler],
  ['mathrm', textHandler],
  ['textrm', textHandler],
  ['textbf', createMathFontHandler('mathbf')],
  ['textit', createMathFontHandler('mathit')],
  ['textsf', createMathFontHandler('mathsf')],
  ['texttt', createMathFontHandler('mathtt')],
  ['mathbf', createMathFontHandler('mathbf')],
  ['mathit', createMathFontHandler('mathit')],
  ['mathsf', createMathFontHandler('mathsf')],
  ['mathtt', createMathFontHandler('mathtt')],
  ['mathcal', createMathFontHandler('mathcal')],
  ['mathbb', createMathFontHandler('mathbb')],
  ['mathfrak', createMathFontHandler('mathfrak')],
  ['mathscr', createMathFontHandler('mathcal')],
  ['boldsymbol', createMathFontHandler('mathbf')],
  ['rm', createFontDeclarationHandler(null)],
  ['bf', createFontDeclarationHandler('mathbf')],
  ['it', createFontDeclarationHandler('mathit')],
  ['sf', createFontDeclarationHandler('mathsf')],
  ['tt', createFontDeclarationHandler('mathtt')],
  ['phantom', phantomHandler],
  ['hphantom', phantomHandler],
  ['vphantom', vphantomHandler],
  ['left', leftHandler],
  ['displaystyle', createStyleHandler('display')],
  ['textstyle', createStyleHandler('text')],
  ['scriptstyle', createStyleHandler('script')],
  ['scriptscriptstyle', createStyleHandler('scriptscript')],
  ['overset', oversetHandler],
  ['underset', undersetHandler],
  ['stackrel', stackrelHandler],
  ['boxed', boxedHandler],
  ['cancel', cancelHandler],
  ['bcancel', cancelHandler],
  ['xcancel', cancelHandler],
  ['not', notHandler],
  ['operatorname', operatornameHandler],
  ['substack', substackHandler],
  ['end', unmatchedEndHandler],
  ['right', unmatchedRightHandler],
  // ── 텍스트 박스 ──
  ['mbox', textHandler],
  ['hbox', textHandler],
  ['fbox', textHandler],
  // ── 연산자 수식어 (no-op: 렌더링 위치 제어는 향후 구현) ──
  ['limits', noopHandler],
  ['nolimits', noopHandler],
  // ── 환경 제어 (no-op: 수식 번호/태그) ──
  ['nonumber', noopHandler],
  ['notag', noopHandler],
  ['tag', consumeGroupHandler],
  ['label', consumeGroupHandler],
  // ── 폰트 선언 ──
  ['cal', createFontDeclarationHandler('mathcal')],
  // ── 수학 연산자 ──
  ['mathop', operatornameHandler],
  // ── 크기 명령어 (no-op: 크기 변경은 향후 구현) ──
  ['tiny', noopHandler],
  ['scriptsize', noopHandler],
  ['footnotesize', noopHandler],
  ['small', noopHandler],
  ['normalsize', noopHandler],
  ['large', noopHandler],
  ['Large', noopHandler],
  ['LARGE', noopHandler],
  ['huge', noopHandler],
  ['Huge', noopHandler],
  // ── 색상 (색상값 소비, 내용만 반환) ──
  ['color', colorHandler],
  ['textcolor', textcolorHandler],
  // ── 고정 크기 구분자 ──
  ...bigVariants.flatMap(size => [
    [size, createBigDelimHandler(size)] as [string, CommandHandler],
    [`${size}l`, createBigDelimHandler(size)] as [string, CommandHandler],
    [`${size}r`, createBigDelimHandler(size)] as [string, CommandHandler],
    [`${size}m`, createBigDelimHandler(size)] as [string, CommandHandler],
  ]),
]);
