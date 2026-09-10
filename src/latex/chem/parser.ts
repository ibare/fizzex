/**
 * 화학식 서브파서
 *
 * `\ce{` 의 여는 중괄호 다음부터 읽어 일반 MathNode 로 바꾼다. 화학 전용 노드를 만들지 않는
 * 이유는 편집기의 커서·탐색·수정 경로가 일반 노드에 대해 이미 동작하기 때문이다.
 *
 * 중괄호를 미리 세어 통째로 잘라내지 않는다 — 조건 라벨(`->[cat]`)과 중첩 수식(`$x$`)에서
 * 일반 파서로 되돌아가야 하므로, 토크나이저가 깊이 0 의 `}` 를 만나면 그 자리에서 멈춘다.
 */

import type { CommandContext } from '../commands/types.js';
import type { MathNode, ScriptsNode } from '../../types.js';
import {
  createChem,
  createNumber,
  createOperator,
  createParen,
  createScripts,
  attachScript,
  createSpace,
  createText,
  createXArrow,
} from '../commands/helpers.js';
import { THIN_SPACE_EM } from '../commands/spaces.js';
import { reportError, reportWarning } from '../parse-errors.js';
import { createChemTokenizer } from './tokenizer.js';
import type { ChemToken, ChemTokenizer } from './tokenizer.js';
import {
  GAS_MARK,
  HYDRATE_MARK,
  MINUS_SIGN,
  PRECIPITATE_MARK,
} from './grammar.js';

export interface ChemParseResult {
  /** chem 컨테이너에 들어갈 노드들 */
  nodes: MathNode[];
  /** 닫는 `}` **다음** 절대 인덱스 (CommandResult.consumed 규약과 같다) */
  consumed: number;
}

type ReentryContext = Pick<CommandContext, 'parseExpression' | 'parseCommand'>;

/** 첨자 슬롯에 들어갈 내용을 읽는다 (script 모드) */
function parseScriptArgument(
  tk: ChemTokenizer,
  latex: string,
  ctx: ReentryContext
): MathNode[] {
  const nodes: MathNode[] = [];

  // 중괄호 그룹이면 닫을 때까지
  if (tk.peek('script').kind === 'lbrace') {
    tk.next('script');
    for (;;) {
      const tok = tk.peek('script');
      if (tok.kind === 'end') {
        tk.next('script');
        break;
      }
      if (tok.kind === 'eof') {
        reportError('incomplete', '화학식 첨자의 중괄호가 닫히지 않았습니다', tok.start, latex);
        break;
      }
      if (!consumeScriptToken(tk, latex, ctx, nodes)) break;
    }
    return nodes;
  }

  // 중괄호가 없으면 한 덩어리만 (H2 의 2, Ca^2+ 의 2+)
  const first = tk.peek('script');
  if (first.kind === 'digits') {
    tk.next('script');
    nodes.push(createNumber(first.value));
    const sign = tk.peek('script');
    if (sign.kind === 'sign') {
      tk.next('script');
      nodes.push(createText(sign.value === '-' ? MINUS_SIGN : sign.value));
    }
    return nodes;
  }
  consumeScriptToken(tk, latex, ctx, nodes);
  return nodes;
}

/** 첨자 안의 토큰 하나를 소비한다. 계속 읽을 수 있으면 true */
function consumeScriptToken(
  tk: ChemTokenizer,
  latex: string,
  ctx: ReentryContext,
  out: MathNode[]
): boolean {
  const tok = tk.next('script');
  switch (tok.kind) {
    case 'digits':
      out.push(createNumber(tok.value));
      return true;
    case 'sign':
      out.push(createText(tok.value === '-' ? MINUS_SIGN : tok.value));
      return true;
    case 'element':
    case 'lower':
      out.push(createText(tok.value));
      return true;
    case 'command': {
      const result = ctx.parseCommand(latex, tok.start);
      out.push(...result.nodes);
      tk.seek(result.consumed);
      return true;
    }
    case 'mathshift': {
      const result = ctx.parseExpression(latex, tok.end, ['$']);
      out.push(...result.nodes);
      tk.seek(latex[result.consumed] === '$' ? result.consumed + 1 : result.consumed);
      return true;
    }
    default:
      return false;
  }
}

/**
 * 화살표 라벨 `[...]` 을 읽는다.
 *
 * 라벨 안도 화학 모드다 — 일반 파서로 넘기지 않고 이 파서를 재귀 호출한다.
 */
function parseArrowLabel(tk: ChemTokenizer, latex: string, ctx: ReentryContext): MathNode[] {
  tk.next('body'); // '['
  const nodes: MathNode[] = [];
  for (;;) {
    const tok = tk.peek('body');
    if (tok.kind === 'rbracket') {
      tk.next('body');
      break;
    }
    if (tok.kind === 'eof' || tok.kind === 'end') {
      reportError('incomplete', '화살표 라벨의 대괄호가 닫히지 않았습니다', tok.start, latex);
      break;
    }
    if (!consumeBodyToken(tk, latex, ctx, nodes, tok)) break;
  }
  return nodes;
}

/** 원자 뒤에 붙은 첨자들을 읽어 하나의 scripts 노드로 만든다 */
function attachTrailingScripts(
  tk: ChemTokenizer,
  latex: string,
  ctx: ReentryContext,
  base: MathNode
): MathNode {
  let subscript: MathNode[] | undefined;
  let superscript: MathNode[] | undefined;

  // 원소 바로 뒤 숫자는 아래첨자 (H2 → H₂)
  const digits = tk.peek('body');
  if (digits.kind === 'digits') {
    tk.next('body');
    subscript = [createNumber(digits.value)];
  }

  for (;;) {
    const tok = tk.peek('body');
    if (tok.kind === 'caret' && superscript === undefined) {
      tk.next('body');
      superscript = parseScriptArgument(tk, latex, ctx);
      continue;
    }
    if (tok.kind === 'underscore' && subscript === undefined) {
      tk.next('body');
      subscript = parseScriptArgument(tk, latex, ctx);
      continue;
    }
    break;
  }

  if (!subscript && !superscript) return base;

  // 아래첨자와 위첨자가 함께 오면 한 원자에 쌓지 않고 두 겹으로 만든다.
  //
  // `SO4^2-` 의 `2-` 는 O 의 지수가 아니라 화학종 전체의 전하다. 한 노드에
  // 담으면 조판이 둘을 같은 x 에 세로로 쌓고(TeX Rule 18e) 아래첨자가 표준보다
  // 더 내려간다. 표준 구현도 첨자마다 원자를 따로 만든다 — mhchem 은 폭 0
  // 팬텀을 밑으로 쓰고, 여기서는 안쪽 겹이 그 높이 기준 노릇을 한다.
  if (subscript && superscript) {
    return createScripts([createScripts([base], { subscript })], { superscript });
  }

  return createScripts([base], subscript ? { subscript } : { superscript });
}

/** 항 시작의 앞첨자를 읽는다 (`^{227}_{90}Th`) */
function parseLeadingScripts(
  tk: ChemTokenizer,
  latex: string,
  ctx: ReentryContext,
  out: MathNode[]
): void {
  let leftSuperscript: MathNode[] | undefined;
  let leftSubscript: MathNode[] | undefined;

  for (;;) {
    const tok = tk.peek('body');
    if (tok.kind === 'caret' && leftSuperscript === undefined) {
      tk.next('body');
      leftSuperscript = parseScriptArgument(tk, latex, ctx);
      continue;
    }
    if (tok.kind === 'underscore' && leftSubscript === undefined) {
      tk.next('body');
      leftSubscript = parseScriptArgument(tk, latex, ctx);
      continue;
    }
    break;
  }

  // 뒤따르는 원소를 밑으로 끌어온다
  const next = tk.peek('body');
  const base: MathNode[] = [];
  if (next.kind === 'element' || next.kind === 'lower') {
    tk.next('body');
    base.push(createText(next.value));
  }

  const node = createScripts(base, {
    ...(leftSuperscript ? { leftSuperscript } : {}),
    ...(leftSubscript ? { leftSubscript } : {}),
  }) as ScriptsNode;
  out.push(attachTrailingScriptsOnScripts(tk, latex, ctx, node));
}

/**
 * 앞첨자가 붙은 노드에 뒤첨자까지 마저 붙인다.
 *
 * 아래첨자 슬롯은 `attachScript` 로 채운다 — id 가 `deriveId(부모.id, '_sub')` 규약을
 * 지켜야 편집기가 나중에 같은 슬롯을 채울 때 커서가 떠 있지 않는다. 위첨자는 바깥
 * 겹으로 갈 수 있어 `createScripts` 가 새 부모 id 기준으로 슬롯 row 를 만든다.
 */
function attachTrailingScriptsOnScripts(
  tk: ChemTokenizer,
  latex: string,
  ctx: ReentryContext,
  node: ScriptsNode
): MathNode {
  let current = node;
  // 위첨자는 바로 붙이지 않고 모아 둔다. 아래첨자가 위첨자보다 뒤에 올 수도 있어서
  // (`Th^{3+}2`), 다 읽고 나서야 한 겹으로 둘지 두 겹으로 나눌지 정할 수 있다.
  let superscript: MathNode[] | undefined;

  for (;;) {
    const tok = tk.peek('body');
    if (tok.kind === 'caret' && superscript === undefined) {
      tk.next('body');
      superscript = parseScriptArgument(tk, latex, ctx);
      continue;
    }
    if (tok.kind === 'underscore' && current.subscript === undefined) {
      tk.next('body');
      current = attachScript(current, 'subscript', parseScriptArgument(tk, latex, ctx));
      continue;
    }
    if (tok.kind === 'digits' && current.subscript === undefined) {
      tk.next('body');
      current = attachScript(current, 'subscript', [createNumber(tok.value)]);
      continue;
    }
    break;
  }

  if (!superscript) return current;

  // 본문 경로와 같은 규칙 — 아래첨자가 있으면 위첨자는 바깥 겹으로.
  // 앞첨자는 안쪽에 그대로 남아야 직렬화 순서가 유지된다.
  return current.subscript !== undefined
    ? createScripts([current], { superscript })
    : attachScript(current, 'superscript', superscript);
}

/** 본문 토큰 하나를 소비한다. 계속 읽을 수 있으면 true */
function consumeBodyToken(
  tk: ChemTokenizer,
  latex: string,
  ctx: ReentryContext,
  out: MathNode[],
  peeked: ChemToken
): boolean {
  switch (peeked.kind) {
    case 'space':
      tk.next('body');
      out.push(createSpace(THIN_SPACE_EM));
      return true;

    case 'plus':
      tk.next('body');
      out.push(createOperator('+'));
      return true;

    case 'hydrate':
      tk.next('body');
      out.push(createOperator(HYDRATE_MARK));
      return true;

    case 'gas':
      tk.next('body');
      out.push(createText(GAS_MARK));
      return true;

    case 'precipitate':
      tk.next('body');
      out.push(createText(PRECIPITATE_MARK));
      return true;

    case 'arrow': {
      tk.next('body');
      const labels: MathNode[][] = [];
      while (labels.length < 2 && tk.peek('body').kind === 'lbracket') {
        labels.push(parseArrowLabel(tk, latex, ctx));
      }
      out.push(createXArrow(labels[0] ?? [], labels[1], peeked.direction!));
      return true;
    }

    case 'digits': {
      tk.next('body');
      // 항 시작의 숫자는 계수라 본문 크기로 남는다 (2H2O 의 2)
      out.push(createNumber(peeked.value));
      return true;
    }

    case 'element':
    case 'lower': {
      tk.next('body');
      out.push(attachTrailingScripts(tk, latex, ctx, createText(peeked.value)));
      return true;
    }

    case 'caret':
    case 'underscore': {
      // 항 시작이면 앞첨자(^{227}_{90}Th), 아니면 직전 원자의 뒤첨자다.
      // 이 구분이 없으면 $x$_{i}^2 를 다시 읽을 때 첨자가 앞으로 가버린다.
      if (out.length > 0 && !tk.atTermStart) {
        const base = out.pop()!;
        out.push(attachTrailingScripts(tk, latex, ctx, base));
        return true;
      }
      parseLeadingScripts(tk, latex, ctx, out);
      return true;
    }

    case 'lparen':
    case 'lbracket': {
      const open = peeked.kind === 'lparen' ? '(' : '[';
      const close = peeked.kind === 'lparen' ? 'rparen' : 'rbracket';
      tk.next('body');
      const inner: MathNode[] = [];
      for (;;) {
        const tok = tk.peek('body');
        if (tok.kind === close) {
          tk.next('body');
          break;
        }
        if (tok.kind === 'eof' || tok.kind === 'end') {
          reportError('incomplete', `화학식의 ${open} 가 닫히지 않았습니다`, tok.start, latex);
          break;
        }
        if (!consumeBodyToken(tk, latex, ctx, inner, tok)) break;
      }
      const group = createParen(inner, open);
      out.push(attachTrailingScripts(tk, latex, ctx, group));
      return true;
    }

    case 'command': {
      tk.next('body');
      const result = ctx.parseCommand(latex, peeked.start);
      out.push(...result.nodes);
      tk.seek(result.consumed);
      return true;
    }

    case 'mathshift': {
      tk.next('body');
      const result = ctx.parseExpression(latex, peeked.end, ['$']);
      out.push(...result.nodes);
      if (latex[result.consumed] === '$') {
        tk.seek(result.consumed + 1);
      } else {
        reportError('incomplete', '화학식 안의 수식 구간 $ 가 닫히지 않았습니다', peeked.start, latex);
        tk.seek(result.consumed);
      }
      return true;
    }

    case 'stray': {
      tk.next('body');
      if (peeked.value === '-') {
        // 결합 표기(C6H5-CHO)는 아직 지원하지 않는다. 내용은 버리지 않고 남긴다.
        reportWarning(
          'unsupported',
          '화학 결합 표기(-)는 아직 지원하지 않습니다',
          peeked.start,
          latex
        );
        out.push(createText(MINUS_SIGN));
      } else {
        reportWarning('syntax', `화학식에서 해석할 수 없는 문자: ${peeked.value}`, peeked.start, latex);
      }
      return true;
    }

    case 'rparen':
    case 'rbracket':
    case 'rbrace':
    case 'lbrace':
      tk.next('body');
      reportWarning('syntax', `화학식에서 짝이 맞지 않는 ${peeked.value}`, peeked.start, latex);
      return true;

    default:
      return false;
  }
}

/**
 * `\ce{` 의 여는 중괄호 **다음** 위치부터 파싱한다.
 */
/**
 * 연산자·화살표 양옆의 공백을 걷어낸다.
 *
 * 그 여백은 조판이 kern 으로 넣는다(convertChem). AST 에 남기면 폭이 두 번 들어가고,
 * 사용자가 지울 수 있는 공백이 되어 버린다. 항과 항 사이의 공백만 의미로 남긴다.
 */
function absorbOperatorSpaces(nodes: MathNode[]): MathNode[] {
  const spacingOwner = (node: MathNode | undefined): boolean =>
    node?.type === 'operator' || node?.type === 'xarrow';

  return nodes.filter((node, i) => {
    if (node.type !== 'space') return true;
    return !spacingOwner(nodes[i - 1]) && !spacingOwner(nodes[i + 1]);
  });
}

export function parseChemBody(
  latex: string,
  bodyStart: number,
  ctx: ReentryContext
): ChemParseResult {
  const tk = createChemTokenizer(latex, bodyStart);
  const nodes: MathNode[] = [];

  for (;;) {
    const tok = tk.peek('body');
    if (tok.kind === 'end') {
      tk.next('body');
      return { nodes: absorbOperatorSpaces(nodes), consumed: tk.pos };
    }
    if (tok.kind === 'eof') {
      reportError('incomplete', '\\ce 의 중괄호가 닫히지 않았습니다', tok.start, latex);
      return { nodes: absorbOperatorSpaces(nodes), consumed: tk.pos };
    }
    if (!consumeBodyToken(tk, latex, ctx, nodes, tok)) {
      // 소비하지 못하는 토큰이 남으면 무한 루프를 피해 한 글자 건너뛴다
      tk.next('body');
    }
  }
}

/** `\ce{...}` 전체를 파싱해 chem 노드를 만든다 */
export function parseChem(latex: string, bodyStart: number, ctx: ReentryContext): ChemParseResult {
  const body = parseChemBody(latex, bodyStart, ctx);
  return { nodes: [createChem(body.nodes)], consumed: body.consumed };
}
