/**
 * 화학식 직렬화기
 *
 * chem 노드 안의 일반 노드를 다시 mhchem 표기로 되돌린다.
 *
 * 왕복은 문자 단위로 같아지는 것이 아니라 **정규형으로 수렴**한다. `\ce{H_2O}` 는 `\ce{H2O}` 가
 * 되고, 그 뒤로는 몇 번을 왕복해도 그대로다.
 *
 * 어떤 노드가 와도 문자열을 낸다. 화학 표기로 적을 수 없는 것은 버리거나 컨테이너를 해체하지 않고
 * `$...$` 수식 구간으로 감싸 보존한다 — 파서가 그 구간을 다시 일반 파서로 넘기므로 왕복이 닫힌다.
 */

import type { MathNode, ParenNode, ScriptsNode, TextNode } from '../../types.js';
import {
  CHEM_TEXT_NOTATION,
  HYDRATE_MARK,
  arrowNotation,
  isBareSubscript,
  isBareSuperscript,
  wouldCollide,
} from './grammar.js';

/** astToLatex 순환 참조를 피하려고 주입받는다 */
export type LatexSerializer = (node: MathNode) => string;

/** row 한 겹을 벗긴다 — 슬롯은 항상 RowNode 로 감싸여 있다 */
function unwrapRow(nodes: MathNode[]): MathNode[] {
  if (nodes.length === 1 && nodes[0].type === 'row') {
    return (nodes[0] as MathNode & { children: MathNode[] }).children;
  }
  return nodes;
}

/**
 * chem 노드의 내용을 mhchem 표기로.
 *
 * `\ce{...}` 의 중괄호 안에 들어가는 문자열이다. 슬롯 row 한 겹을 벗기는 처리를
 * 여기 한 곳에 두어 직렬화기와 정규화기가 같은 문자열을 보게 한다.
 */
export function chemNotation(content: MathNode[], toLatex: LatexSerializer): string {
  return chemNodesToNotation(unwrapRow(content), toLatex);
}

/** 수식 구간으로 감싼다 (화학 표기로 적을 수 없는 내용) */
function escapeToMath(node: MathNode, toLatex: LatexSerializer): string {
  return `$${toLatex(node)}$`;
}

function serializeSlot(
  nodes: MathNode[] | undefined,
  toLatex: LatexSerializer
): string {
  if (!nodes) return '';
  return chemNodesToNotation(unwrapRow(nodes), toLatex);
}

/** 첨자가 붙은 노드 */
function serializeScripts(node: ScriptsNode, toLatex: LatexSerializer): string {
  let out = '';

  // 앞첨자는 항상 중괄호로 적는다 — 뒤의 밑과 붙어 읽히면 안 된다
  if (node.leftSuperscript) out += `^{${serializeSlot(node.leftSuperscript, toLatex)}}`;
  if (node.leftSubscript) out += `_{${serializeSlot(node.leftSubscript, toLatex)}}`;

  out += chemNodesToNotation(node.base, toLatex);

  if (node.subscript) {
    const sub = serializeSlot(node.subscript, toLatex);
    // 원소 뒤 숫자는 중괄호 없이 붙인다 (H2)
    out += isBareSubscript(sub) ? sub : `_{${sub}}`;
  }
  if (node.superscript) {
    const sup = serializeSlot(node.superscript, toLatex);
    out += isBareSuperscript(sup) ? `^${sup}` : `^{${sup}}`;
  }
  return out;
}

/** 노드 하나를 화학 표기로. 표기할 수 없으면 수식 구간으로 감싼다. */
function serializeNode(node: MathNode, toLatex: LatexSerializer): string {
  switch (node.type) {
    case 'text': {
      const content = (node as TextNode).content;
      return CHEM_TEXT_NOTATION.get(content) ?? content;
    }

    case 'number':
      return (node as MathNode & { value: string }).value;

    case 'space':
      return ' ';

    case 'operator': {
      const op = (node as MathNode & { operator: string }).operator;
      if (op === '+') return ' + ';
      if (op === HYDRATE_MARK) return ' * ';
      return escapeToMath(node, toLatex);
    }

    case 'scripts':
      return serializeScripts(node as ScriptsNode, toLatex);

    case 'paren': {
      const paren = node as ParenNode;
      if (paren.parenType === '{') return escapeToMath(node, toLatex);
      const close = paren.parenType === '(' ? ')' : ']';
      return `${paren.parenType}${chemNodesToNotation(unwrapRow(paren.content), toLatex)}${close}`;
    }

    case 'xarrow': {
      const arrow = node as MathNode & {
        above: MathNode[];
        below?: MathNode[];
        direction: Parameters<typeof arrowNotation>[0];
      };
      let out = arrowNotation(arrow.direction);
      const above = chemNodesToNotation(unwrapRow(arrow.above), toLatex).trim();
      const below = arrow.below
        ? chemNodesToNotation(unwrapRow(arrow.below), toLatex).trim()
        : '';
      if (above || below) out += `[${above}]`;
      if (below) out += `[${below}]`;
      // 화살표 좌우는 항상 한 칸 띄운다. 중복 공백은 collapseSpaces 가 접는다.
      return ` ${out} `;
    }

    case 'row':
      return chemNodesToNotation((node as MathNode & { children: MathNode[] }).children, toLatex);

    case 'variable': {
      const latex = toLatex(node);
      // \Delta 같은 명령어는 그대로 쓸 수 있다
      return latex.startsWith('\\') ? latex : escapeToMath(node, toLatex);
    }

    // 화학 표기에 대응이 없는 것은 전부 수식 구간으로 보존한다
    default:
      return escapeToMath(node, toLatex);
  }
}

/**
 * chem 노드 내부를 mhchem 표기로.
 *
 * 이어 붙였을 때 다른 토큰으로 읽히는 조합(`-` + `>` → `->`)은 수식 구간으로 끊어 막는다.
 */
export function chemNodesToNotation(nodes: MathNode[], toLatex: LatexSerializer): string {
  const parts: string[] = [];
  for (const node of nodes) {
    const piece = serializeNode(node, toLatex);
    const prev = parts.length > 0 ? parts[parts.length - 1] : '';
    if (wouldCollide(prev, piece)) {
      // 붙으면 화살표로 읽힌다 — 앞 조각을 수식 구간으로 감싸 끊는다
      parts[parts.length - 1] = `$${prev}$`;
    }
    parts.push(piece);
  }
  return collapseSpaces(parts.join(''));
}

/** 공백을 정규화한다 — 연속 공백은 하나로, 양끝은 없앤다 */
function collapseSpaces(s: string): string {
  return s.replace(/ {2,}/g, ' ').trim();
}
