/**
 * 의미 해석 엔진
 *
 * Layer 2 (경로 조합) → Layer 1 (부모-자식) → 폴백 순서로 탐색.
 * 텍스트 데이터는 JSON에서 로드, 조건 함수는 matchers에서 실행.
 */

import type { MathNode } from '../../types.js';
import { SCRIPT_SLOTS } from '../../types.js';
import { scriptRole } from './script-roles.js';
import type { AncestorEntry, SemanticResult, CatalogMatchResult, CatalogDetail } from './types.js';
import { getChildArrays, getSemanticForAccent } from './helpers.js';
import { getSemanticTexts, getCatalogIndex, getCatalogDetail } from './loader.js';
import { matchLayer1, getLayer1RoleFromTexts } from './matchers/layer1-matcher.js';
import { matchLayer2 } from './matchers/layer2-matcher.js';
import { matchCatalog } from './matchers/catalog-matcher.js';
import { compileForms, matchForm, type CompiledForm } from './matchers/form-matcher.js';
import { normalizeAst } from '../canonical/from-ast.js';
// 형식 템플릿은 LaTeX 이고 파서는 하나뿐이다. analyzer → latex 는 새 방향
// 의존이지만, 사본을 만드는 것이 더 나쁘고 실사용 경로(headless)는 이미 파서를
//싣고 있어 번들 비용이 사실상 없다.
import { parseLatex } from '../../latex/latex-parser.js';
import { getFormIndex } from './loader.js';
import { getDefaultRoleFromTexts, getDefaultDescriptionFromTexts } from './fallback.js';

/** row 래핑을 벗겨 단일 자식 노드를 반환. 단일 노드가 아니면 null. */
function unwrapRow(nodes: MathNode[]): MathNode | null {
  if (nodes.length === 1) {
    const n = nodes[0];
    if (n.type === 'row' && n.children.length === 1) return n.children[0];
    return n;
  }
  return null;
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
          walk(child, [...ancestors, { node, parentType: node.type, childPosition: 'child' }]);
        }
        break;
      case 'frac':
        for (const c of node.numerator)
          walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'numerator' }]);
        for (const c of node.denominator)
          walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'denominator' }]);
        break;
      case 'scripts': {
        // 첨자는 슬롯마다 의미 어휘가 다르다 (x^2 의 밑 vs x_i 의 밑)
        const baseRole = scriptRole(node, 'base');
        for (const c of node.base)
          walk(c, [...ancestors, { node, ...baseRole }]);
        for (const slot of SCRIPT_SLOTS) {
          const value = node[slot];
          if (!value) continue;
          const role = scriptRole(node, slot);
          for (const c of value) walk(c, [...ancestors, { node, ...role }]);
        }
        break;
      }
      case 'chem':
        for (const c of node.content)
          walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'content' }]);
        break;
      case 'sqrt':
        for (const c of node.content)
          walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'content' }]);
        if (node.index) {
          for (const c of node.index)
            walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'index' }]);
        }
        break;
      case 'paren':
        for (const c of node.content)
          walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'content' }]);
        break;
      case 'abs':
        for (const c of node.content)
          walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'content' }]);
        break;
      case 'func':
        for (const c of node.argument)
          walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'argument' }]);
        break;
      case 'integral':
        if (node.lower) {
          for (const c of node.lower)
            walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'lower' }]);
        }
        if (node.upper) {
          for (const c of node.upper)
            walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'upper' }]);
        }
        for (const c of node.integrand)
          walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'integrand' }]);
        break;
      case 'sum':
      case 'product':
        for (const c of node.lower)
          walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'lower' }]);
        for (const c of node.upper)
          walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'upper' }]);
        for (const c of node.body)
          walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'body' }]);
        break;
      case 'limit':
        for (const c of node.approach)
          walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'approach' }]);
        for (const c of node.body)
          walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'body' }]);
        break;
      case 'overline':
        for (const c of node.content)
          walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'content' }]);
        break;
      case 'accent':
        for (const c of node.content)
          walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'content' }]);
        break;
      case 'overset':
        for (const c of node.base)
          walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'base' }]);
        for (const c of node.annotation)
          walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'annotation' }]);
        break;
      case 'cancel':
        for (const c of node.content)
          walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'content' }]);
        break;
      case 'xarrow':
        for (const c of node.above)
          walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'above' }]);
        if (node.below) {
          for (const c of node.below)
            walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'below' }]);
        }
        break;
      case 'matrix':
      case 'align':
      case 'cases':
      case 'array':
        for (let ri = 0; ri < node.rows.length; ri++) {
          const row = node.rows[ri];
          for (let ci = 0; ci < row.length; ci++) {
            walk(row[ci], [...ancestors, { node, parentType: node.type, childPosition: 'element' }]);
          }
        }
        break;
      case 'gather':
        for (const row of node.rows)
          walk(row, [...ancestors, { node, parentType: node.type, childPosition: 'row' }]);
        break;
      case 'opaque':
        for (const argGroup of node.args) {
          for (const c of argGroup) {
            walk(c, [...ancestors, { node, parentType: node.type, childPosition: 'arg' }]);
          }
        }
        break;
      default:
        break;
    }
  }

  walk(ast, []);
  return map;
}

// ─── 매칭 ───

/**
 * 컴파일된 형식 캐시.
 *
 * 매처는 순수 함수로 두고 캐시는 여기가 소유한다. 템플릿 파싱은 매번 하면
 * 비싸고, 형식 데이터는 번들에 정적으로 박혀 있어 바뀌지 않는다.
 */
let compiledForms: CompiledForm[] | null = null;

function getCompiledForms(): CompiledForm[] {
  if (!compiledForms) {
    compiledForms = compileForms(getFormIndex(), (latex) => normalizeAst(parseLatex(latex).ast));
  }
  return compiledForms;
}

/**
 * 수식을 형식 → 폴백 순서로 판정한다.
 *
 * 형식 매칭은 구조 유니피케이션이라 점수가 없다. 성공하면 `confirmed` 이고,
 * 이것만이 시각화 칩을 만들 수 있다. 폴백 스코어러는 구조적으로
 * `approximate` 만 만든다 — 칩 오탐을 임계값이 아니라 타입으로 막는다.
 */
export function matchExpression(ast: MathNode): CatalogMatchResult | null {
  const fallback = matchCatalog(ast, getCatalogIndex());

  // 이름만 가진 수식이 일반 형식에 삼켜지지 않게 한다.
  // `E = mc^2` 는 c 에 대한 이차식이 맞지만 질량-에너지 등가라는 이름이 있고,
  // 그 이름을 "이차식 꼴" 로 바꾸면 정보가 준다.
  if (fallback?.exhaustive) return fallback;

  const normalized = normalizeAst(ast);
  const formMatch = matchForm(normalized, getCompiledForms());
  if (formMatch) {
    const entry = getCatalogIndex().find((e) => e.form === formMatch.formId);
    if (entry) {
      return {
        catalogId: entry.id,
        category: entry.category,
        tier: 'confirmed',
        formId: formMatch.formId,
        bindings: formMatch.bindings,
      };
    }
    // 이름 붙은 카탈로그 항목이 없는 형식 — 형식 자체가 이름을 낸다.
    return {
      catalogId: formMatch.formId,
      category: 'algebra',
      tier: 'confirmed',
      formId: formMatch.formId,
      bindings: formMatch.bindings,
    };
  }
  return fallback;
}

// ─── 메인 엔진 ───

/**
 * 주어진 AST 노드의 구조적 의미를 해석한다.
 *
 * Layer 2 (경로 조합) → Layer 1 (부모-자식) → 폴백 순서로 탐색.
 */
export function getSemanticMeaning(
  node: MathNode,
  ancestors: AncestorEntry[],
  catalogContext?: { match: CatalogMatchResult; detail: CatalogDetail } | null,
): SemanticResult {
  const texts = getSemanticTexts();

  // 0. 카탈로그 레이어 (buildSemanticMap에서 전달)
  if (catalogContext) {
    const elementKey = findElementKey(node, catalogContext.match);
    const elementMeaning = elementKey ? catalogContext.detail.elementMeanings[elementKey] : undefined;
    if (elementMeaning) {
      return {
        role: elementMeaning.role,
        description: elementMeaning.description,
        layer: 'catalog',
        catalogId: catalogContext.match.catalogId,
        // 노드 단위 결과에도 티어를 싣는다. approximate 매칭의 카탈로그
        // parameterConfig 가 인라인 컨트롤 범위로 새면 배너 오탐보다 나쁘다.
        catalogCategory: catalogContext.match.category,
        tier: catalogContext.match.tier,
        score: catalogContext.match.score,
      };
    }
  }

  // 의미 있는 조상만 추출 (root, row는 구조적 의미가 없으므로 건너뜀)
  const meaningfulAncestors = ancestors.filter(
    a => a.node.type !== 'root' && a.node.type !== 'row',
  );

  // 조상 경로를 "parentType.childPosition" 문자열 배열로 변환
  const path = meaningfulAncestors.map(a => `${a.parentType}.${a.childPosition}`);

  // 1. Layer 2: 조합 규칙
  const l2Match = matchLayer2(node, path, texts.layer2);
  if (l2Match) {
    // role 폴백: Layer 2에 role이 없으면 Layer 1에서 가져옴
    let role = l2Match.role;
    if (!role && meaningfulAncestors.length > 0) {
      const parent = meaningfulAncestors[meaningfulAncestors.length - 1];
      role = getLayer1RoleFromTexts(parent, texts.layer1);
    }
    return {
      role: role || getDefaultRoleFromTexts(node, texts.fallback),
      description: l2Match.description,
      layer: 'layer2',
    };
  }

  // 2. Layer 1: 기본 구조적 의미
  if (meaningfulAncestors.length > 0) {
    const parent = meaningfulAncestors[meaningfulAncestors.length - 1];

    // accent 타입은 별도 처리 (accentType 기반 분기, 텍스트는 fallback JSON에서)
    if (parent.node.type === 'accent') {
      return getSemanticForAccent(node, parent, texts.fallback);
    }

    const l1Match = matchLayer1(node, parent, texts.layer1);
    if (l1Match) {
      return { role: l1Match.role, description: l1Match.description, layer: 'layer1' };
    }
  }

  // 3. 폴백
  return {
    role: getDefaultRoleFromTexts(node, texts.fallback),
    description: getDefaultDescriptionFromTexts(node, texts.fallback),
    layer: 'fallback',
  };
}

// ─── 카탈로그 elementKey 매칭 ───

/**
 * 현재 노드에 대응하는 카탈로그 elementMeaning 키를 찾는다.
 * 변수명, 또는 "변수^지수" 형태의 복합 키를 탐색.
 */
function findElementKey(
  node: MathNode,
  catalogMatch: CatalogMatchResult,
): string | null {
  // 변수 노드: 직접 매핑
  if (node.type === 'variable') {
    return node.name;
  }

  // 거듭제곱: "base^exponent" 형태 키 (예: "c^2").
  // 다른 첨자가 함께 붙어 있으면 만들지 않는다 — E_k^2 가 E^2 로 오인되면 안 된다.
  if (
    node.type === 'scripts' &&
    node.superscript &&
    !node.subscript &&
    !node.leftSuperscript &&
    !node.leftSubscript
  ) {
    const base = node.base.length === 1 && node.base[0].type === 'variable'
      ? node.base[0].name : null;
    const expNode = unwrapRow(node.superscript);
    const exp = expNode?.type === 'number' ? expNode.value : null;
    if (base && exp) {
      return `${base}^${exp}`;
    }
  }

  // 숫자 노드: 값으로 매핑 (예: "0", "1")
  if (node.type === 'number') {
    return node.value;
  }

  return null;
}

/**
 * AST 전체에 대해 한번에 semantic 정보를 빌드한다.
 */
export function buildSemanticMap(
  ast: MathNode,
): Map<string, SemanticResult> {
  const ancestorMap = buildAstAncestorMap(ast);
  const semanticMap = new Map<string, SemanticResult>();

  // 형식 매칭을 먼저 시도하고, 실패하면 폴백 스코어러로 내려간다.
  // 형식은 구조 유니피케이션이므로 점수도 임계값도 없다.
  const catalogMatch = matchExpression(ast);
  let catalogContext: { match: CatalogMatchResult; detail: CatalogDetail } | null = null;

  if (catalogMatch) {
    const detail = getCatalogDetail(catalogMatch.catalogId, catalogMatch.category);
    if (detail) {
      catalogContext = { match: catalogMatch, detail };
    }
  }

  function walk(node: MathNode): void {
    const ancestors = ancestorMap.get(node.id) ?? [];
    semanticMap.set(node.id, getSemanticMeaning(node, ancestors, catalogContext));
    for (const children of getChildArrays(node)) {
      for (const child of children) walk(child);
    }
  }

  walk(ast);

  // 카탈로그 매칭 정보를 root 노드에 첨부 (배너 + 주석 표시용)
  if (catalogContext) {
    const rootResult = semanticMap.get(ast.id);
    if (rootResult) {
      semanticMap.set(ast.id, {
        ...rootResult,
        role: catalogContext.detail.name,
        description: catalogContext.detail.oneLiner,
        layer: 'catalog',
        catalogId: catalogContext.match.catalogId,
        catalogCategory: catalogContext.match.category,
        tier: catalogContext.match.tier,
        formId: catalogContext.match.formId,
        score: catalogContext.match.score,
      });
    }
  }

  return semanticMap;
}
