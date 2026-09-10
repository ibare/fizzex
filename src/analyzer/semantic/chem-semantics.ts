/**
 * 화학식 안의 의미 해석
 *
 * 화학식 안에서는 같은 기호가 다른 뜻이다. `+` 는 덧셈이 아니라 화학종 구분이고,
 * `SO4^2-` 의 위첨자는 지수가 아니라 전하이며, `^{227}_{90}Th` 의 앞첨자는
 * 질량수와 원자 번호다. 수학 어휘를 그대로 흘리면 전하가 "거듭제곱에서 곱하는
 * 횟수" 로 설명된다.
 *
 * 이 모듈은 `helpers.ts` 의 `getSemanticForAccent` 와 같은 위상이다 — accent 가
 * `accentType` 으로 갈리듯 화학은 chem 스코프로 갈린다. 그래서 layer1/layer2 의
 * 규칙표는 건드리지 않는다. `matchesPathPattern` 이 경로 **접미사** 매칭이라
 * `Ca(OH)2` 처럼 중첩된 화학식은 애초에 layer2 규칙으로 표현할 수 없기도 하다.
 *
 * 모르는 노드에는 `null` 을 반환해 아래 레이어로 흘려보낸다 — `$\frac{a}{b}$` 로
 * 끼워 넣은 수식 조각은 평소의 수학 어휘로 설명되는 것이 맞다.
 */

import type { ChemNode, MathNode, ParenNode } from '../../types.js';
import {
  GAS_MARK,
  HYDRATE_MARK,
  PRECIPITATE_MARK,
  isChargeSign,
  isEquilibriumDirection,
} from '../../latex/chem/grammar.js';
import type { AncestorEntry, SemanticResult } from './types.js';
import type { ChemTextKey, SemanticTexts } from './loader.js';

/**
 * 상태 표기 기호.
 *
 * 파서는 `(aq)` 를 다른 괄호와 똑같이 다룬다 — 상태 표기를 특별 취급하면
 * 화이트리스트가 파서와 직렬화기 양쪽에 생긴다. 여기서만 의미를 붙인다.
 */
const STATE_LABELS = new Set(['s', 'l', 'g', 'aq', 'cr', 'sln']);

/** row 한 겹을 벗긴다 — 슬롯은 항상 RowNode 로 감싸여 있다 */
function unwrapRow(nodes: MathNode[]): MathNode[] {
  if (nodes.length === 1 && nodes[0].type === 'row') return nodes[0].children;
  return nodes;
}

/** `(aq)` 처럼 상태를 적은 괄호인가 */
function isStateLabel(paren: ParenNode): boolean {
  const inner = unwrapRow(paren.content);
  return (
    inner.length === 1 && inner[0].type === 'text' && STATE_LABELS.has(inner[0].content)
  );
}

/** 화학식 본문에 놓인 노드의 뜻 */
function bodyKey(node: MathNode): ChemTextKey | null {
  switch (node.type) {
    case 'number':
      // 본문의 숫자는 계수다. 원자 수는 아래첨자 슬롯에서 온다.
      return 'coefficient';

    case 'xarrow':
      return isEquilibriumDirection(node.direction) ? 'equilibriumArrow' : 'arrow';

    case 'operator':
      if (node.operator === '+') return 'plus';
      if (node.operator === HYDRATE_MARK) return 'hydrate';
      return null;

    case 'text':
      if (node.content === GAS_MARK) return 'gas';
      if (node.content === PRECIPITATE_MARK) return 'precipitate';
      if (isChargeSign(node.content)) return 'chargeSign';
      return 'element';

    case 'paren':
      return isStateLabel(node) ? 'state' : 'group';

    case 'scripts':
      return 'species';

    default:
      return null;
  }
}

/** 첨자 슬롯이 화학식에서 갖는 뜻 */
function slotKey(node: MathNode, childPosition: string): ChemTextKey | null {
  switch (childPosition) {
    case 'exponent':
      // 위첨자는 전하다. 부호 글자와 크기를 나눠 설명한다.
      return node.type === 'text' ? 'chargeSign' : 'charge';
    case 'subscript':
      return 'count';
    case 'leftSuperscript':
      return 'massNumber';
    case 'leftSubscript':
      return 'atomicNumber';
    case 'base':
      // 밑은 원소이거나 괄호로 묶인 원자단이다.
      return bodyKey(node) ?? 'element';
    default:
      return null;
  }
}

/** 조상 중 화학식이 있는가 */
function inChemScope(ancestors: AncestorEntry[]): boolean {
  return ancestors.some((a) => a.node.type === 'chem');
}

/**
 * 화학식 문맥의 의미를 해석한다.
 *
 * @returns 화학 어휘로 설명할 수 있으면 결과, 아니면 `null`
 */
export function getSemanticForChem(
  node: MathNode,
  ancestors: AncestorEntry[],
  texts: SemanticTexts,
): SemanticResult | null {
  // 화학식 노드 자신 — 반응 화살표 유무로 갈린다
  const chem = asChem(node);
  if (chem) {
    return result(hasArrow(chem.content) ? 'equation' : 'formula', node, texts);
  }

  if (!inChemScope(ancestors)) return null;

  const meaningful = ancestors.filter(
    (a) => a.node.type !== 'root' && a.node.type !== 'row',
  );
  const parent = meaningful[meaningful.length - 1];
  if (!parent) return null;

  const key = keyFor(node, parent);
  return key ? result(key, node, texts) : null;
}

/** 부모 관계로 뜻을 정한다 */
function keyFor(node: MathNode, parent: AncestorEntry): ChemTextKey | null {
  switch (parent.node.type) {
    case 'scripts':
      return slotKey(node, parent.childPosition);

    case 'xarrow':
      // 화살표 위아래는 촉매·온도 같은 반응 조건이다
      return 'condition';

    case 'paren':
      if (isStateLabel(parent.node)) return 'state';
      // 괄호 안을 감싼 row 는 괄호 자신의 뜻을 물려받는다. 그러지 않으면
      // 화학식 안인데도 layer1 의 "묶음" 같은 수학 어휘가 샌다.
      return node.type === 'row' ? 'group' : bodyKey(node);

    case 'chem':
      // 본문을 감싼 row 는 화학식 본문 그 자체다
      return node.type === 'row'
        ? hasArrow(parent.node.content)
          ? 'equation'
          : 'formula'
        : bodyKey(node);

    default:
      return null;
  }
}

/**
 * 노드 자신이 화학식이거나, 화학식 하나만 담은 수식 전체인가.
 *
 * `\ce{H2O}` 만 적은 수식의 전체 역할이 "수식 전체" 이면 화면에서 화학식이라는
 * 사실이 어디에도 드러나지 않는다.
 */
export function asChem(node: MathNode): ChemNode | null {
  if (node.type === 'chem') return node;
  if (node.type === 'root') {
    const children = unwrapRow(node.children);
    if (children.length === 1 && children[0].type === 'chem') return children[0];
  }
  return null;
}

/** 화학식 본문에 반응 화살표가 있는가 */
function hasArrow(nodes: MathNode[]): boolean {
  for (const node of unwrapRow(nodes)) {
    if (node.type === 'xarrow') return true;
  }
  return false;
}

/**
 * 어휘 키를 사람이 읽는 말로.
 *
 * 원소는 여기서만 이름표를 찾는다. `'element'` 로 수렴하는 자리가 셋이라
 * (본문 · 첨자의 밑 · 괄호 안) 조회를 세 곳에 흩으면 하나를 빠뜨린다.
 */
function result(key: ChemTextKey, node: MathNode, texts: SemanticTexts): SemanticResult {
  if (key === 'element' && node.type === 'text') {
    const element = texts.chemicalElements.bySymbol[node.content];
    if (element) {
      return {
        role: element.name,
        description: texts.chemicalElements.descriptionFormat
          .replace('{z}', String(element.z))
          .replace('{desc}', element.desc),
        layer: 'layer1',
      };
    }
    // 파서는 주기율표 없이 `[A-Z][a-z]*` 형태로만 자른다. 실재하지 않는
    // 기호도 여기로 오므로 이름표에 없으면 일반 설명으로 돌아간다.
  }

  const text = texts.fallback.chem[key];
  return { role: text.role, description: text.description, layer: 'layer1' };
}
