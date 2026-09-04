/**
 * MathNode → ExprNode 정규화.
 *
 * 세 가지를 흡수한다.
 *   1. row 래핑 이중성 — 파서 경로는 슬롯을 항상 `[RowNode]` 로 감싸고
 *      node-factory 경로는 감싸지 않는다. 양쪽이 같은 IR 로 수렴해야 한다.
 *   2. 평평한 시퀀스 — 암묵적 곱 삽입 + 우선순위 파싱으로 식 트리를 세운다.
 *      토큰화는 `evaluator/sequence.ts` 공유 leaf 가 담당한다.
 *   3. 교환법칙 — `add`/`mul` 피연산자를 정준 순서로 정렬한다.
 *
 * 어떤 입력에도 throw 하지 않는다. 실패는 `ok: false` + 부분 IR 로 접는다.
 * (규칙이 요구해서가 아니라, 매칭 경로가 렌더 중 동기 호출되기 때문이다.)
 */

import type {
  MathNode,
  AccentNode,
  AbsNode,
  AlignNode,
  ArrayNode,
  CancelNode,
  CasesNode,
  ErrorNode,
  FracNode,
  FuncNode,
  GatherNode,
  IntegralNode,
  LimitNode,
  LiteralNode,
  MatrixNode,
  NumberNode,
  OpaqueNode,
  OverlineNode,
  OversetNode,
  ParenNode,
  PowerNode,
  ProductNode,
  RootNode,
  RowNode,
  SqrtNode,
  SubscriptNode,
  SumNode,
  TextNode,
  VariableNode,
  XArrowNode,
} from '../../types.js';
import { normalizeVarName } from '../../evaluator/normalize.js';
import { tokenizeSequence, toRPN, type SeqToken } from '../../evaluator/sequence.js';
import {
  type ExprNode,
  type Provenance,
  app,
  call,
  childrenOfExpr,
  compareCanonical,
  num,
  opaque,
  rel,
  sym,
} from './expr.js';

/** 병리적 입력에서 스택이 터지지 않도록 하는 상한. */
const MAX_DEPTH = 200;

export interface NormalizedExpr {
  root: ExprNode;
  /** rel 노드 개수. 2 이상이면 form 매칭 대상이 아니다. */
  relationCount: number;
  hasOpaque: boolean;
  /** 정규화가 완전했는지. false 여도 `root` 는 항상 존재한다. */
  ok: boolean;
}

// ─── row 평탄화 ───

/**
 * 형제 시퀀스에서 `row` 래핑을 벗기고 표시 전용 `space` 를 제거한다.
 * **비파괴** — 원본 배열·노드를 수정하지 않고 새 배열을 반환한다.
 *
 * 주의: `matrix`/`align`/`cases`/`array`/`gather` 의 `rows` 는 형제 시퀀스가
 * 아니라 셀·행의 배열이므로 여기에 넘기면 안 된다. 셀 경계가 붕괴한다.
 */
export function flattenSequence(nodes: readonly MathNode[]): MathNode[] {
  const out: MathNode[] = [];
  const visit = (list: readonly MathNode[], depth: number): void => {
    if (depth > MAX_DEPTH) return;
    for (const n of list) {
      if (n.type === 'row') {
        visit((n as RowNode).children, depth + 1);
        continue;
      }
      // `\,` `\quad` 등은 표시 전용이다. 남겨두면 시퀀스 토크나이저가
      // 피연산자로 보고 암묵적 곱을 삽입해 `a \, b` 가 `a × space × b` 가 된다.
      if (n.type === 'space') continue;
      out.push(n);
    }
  };
  visit(nodes, 0);
  return out;
}

// ─── opaque 태그 ───

/**
 * 모델링하지 않는 노드의 판별 태그.
 *
 * `node.type` 만으로는 변별력이 없다 — `\hat{x}` 와 `\vec{x}`, `bmatrix` 와
 * `vmatrix`(행렬식), `\int` 와 `\oint` 가 전부 같은 키로 붕괴한다. 자식이 아닌
 * **스칼라 판별 필드**를 태그에 함께 실어 구분한다.
 */
function opaqueTag(node: MathNode): string {
  switch (node.type) {
    case 'accent':
      return `accent:${(node as AccentNode).accentType}`;
    case 'overline':
      return `overline:${(node as OverlineNode).variant ?? 'bar'}`;
    case 'cancel':
      return `cancel:${(node as CancelNode).cancelType}`;
    case 'overset':
      return `overset:${(node as OversetNode).position}`;
    case 'xarrow':
      return `xarrow:${(node as XArrowNode).direction}`;
    case 'matrix': {
      const n = node as MatrixNode;
      return `matrix:${n.bracketType}${n.small ? ':sm' : ''}`;
    }
    case 'align': {
      const n = node as AlignNode;
      return `align:${n.starred ? '*' : ''}${n.isInline ? ':inl' : ''}`;
    }
    case 'array': {
      const n = node as ArrayNode;
      return `array:${n.colAlign.join('')}:${n.colLines.map(Number).join('')}:${n.rowLines.map(Number).join('')}`;
    }
    case 'gather': {
      const n = node as GatherNode;
      return `gather:${n.starred ? '*' : ''}${n.isInline ? ':inl' : ''}`;
    }
    case 'sum':
      return `sum:${(node as SumNode).symbol ?? '∑'}`;
    case 'integral':
      return `integral:${(node as IntegralNode).integralType ?? 'int'}`;
    // 자유 텍스트는 이스케이프한다 — `(`/`,`/`)` 가 그대로 들어가면
    // `\text{a,b)}` 류가 구조 키를 위조할 수 있다.
    case 'text':
      return `text:${JSON.stringify((node as TextNode).content)}`;
    case 'literal':
      return `literal:${JSON.stringify((node as LiteralNode).raw)}`;
    case 'error':
      return `error:${JSON.stringify((node as ErrorNode).raw)}`;
    case 'opaque':
      return `cmd:${JSON.stringify((node as OpaqueNode).command)}`;
    default:
      return node.type;
  }
}

// ─── 정규화 상태 ───

interface Ctx {
  ok: boolean;
}

const provOf = (node: MathNode): Provenance => [node.id];

// ─── 대수 정규형 ───

/**
 * 부호 반전 — 곱셈으로 흡수한다.
 *
 * 별도 `neg` 노드로 두면 `-x^2` 와 `(-1)x^2`, `x - 2x` 와 `x + (-2)x` 가 서로
 * 다른 키를 갖는다. 곱셈 문맥의 패턴에도 붙지 않는다.
 */
export function negate(e: ExprNode, src: Provenance): ExprNode {
  // 상수는 부호를 값으로 흡수한다. 그래야 상수항이 `num` 으로 남아
  // 정렬 규칙(상수 뒤로)이 적용된다.
  if (e.kind === 'num') return num(-e.value, e.src.length > 0 ? e.src : src);
  return assoc('mul', [num(-1, src), e], src);
}

/**
 * n-ary 평탄화 + 상수 폴딩 + 정준 정렬.
 *
 * 상수를 접지 않으면 `x - 2x` 가 `mul(x, -1, 2)` 로 남아 `x + (-2)x` 의
 * `mul(x, -2)` 와 다른 키가 된다.
 */
function assoc(op: 'add' | 'mul', parts: readonly ExprNode[], src: Provenance): ExprNode {
  const flat: ExprNode[] = [];
  for (const p of parts) {
    if (p.kind === 'app' && p.op === op) flat.push(...p.args);
    else flat.push(p);
  }

  const identity = op === 'add' ? 0 : 1;
  let acc = identity;
  const rest: ExprNode[] = [];
  const numSrc: string[] = [];
  for (const f of flat) {
    if (f.kind === 'num') {
      acc = op === 'add' ? acc + f.value : acc * f.value;
      for (const id of f.src) if (!numSrc.includes(id)) numSrc.push(id);
      continue;
    }
    rest.push(f);
  }

  if (op === 'mul' && acc === 0) return num(0, numSrc.length > 0 ? numSrc : src);
  if (rest.length === 0) return num(acc, numSrc.length > 0 ? numSrc : src);
  const merged = acc === identity ? rest : [...rest, num(acc, numSrc.length > 0 ? numSrc : src)];
  if (merged.length === 1) return merged[0];
  return app(op, [...merged].sort(compareCanonical), src);
}

// ─── 시퀀스 폴드 ───

function foldRpn(rpn: readonly SeqToken[], ctx: Ctx, depth: number): ExprNode | null {
  const stack: ExprNode[] = [];
  for (const t of rpn) {
    if (t.kind === 'operand') {
      stack.push(normalizeNode(t.node, ctx, depth + 1));
      continue;
    }
    if (t.kind === 'unaryMinus') {
      const a = stack.pop();
      if (!a) return null;
      stack.push(negate(a, a.src));
      continue;
    }
    const b = stack.pop();
    const a = stack.pop();
    if (!a || !b) return null;
    const src: Provenance = [...a.src, ...b.src];
    if (t.kind === 'rel') {
      stack.push(rel(t.op, a, b, src));
      continue;
    }
    switch (t.op) {
      case '+':
        stack.push(assoc('add', [a, b], src));
        break;
      case '-':
        stack.push(assoc('add', [a, negate(b, b.src)], src));
        break;
      case '×':
      case '·':
        stack.push(assoc('mul', [a, b], src));
        break;
      case '÷':
        stack.push(app('div', [a, b], src));
        break;
      default: {
        // 모든 BinaryOp 를 덮었다. 새 연산자가 추가되면 여기서 타입 에러가 난다.
        const exhaustive: never = t;
        void exhaustive;
        return null;
      }
    }
  }
  return stack.length === 1 ? stack[0] : null;
}

/** 형제 시퀀스를 하나의 ExprNode 로 정규화한다. */
function normalizeSequence(
  nodes: readonly MathNode[],
  ctx: Ctx,
  depth: number,
  src: Provenance,
): ExprNode {
  if (depth > MAX_DEPTH) {
    ctx.ok = false;
    return opaque('depth-limit', [], src);
  }
  const flat = flattenSequence(nodes);
  if (flat.length === 0) {
    ctx.ok = false;
    return opaque('empty', [], src);
  }
  if (flat.length === 1) return normalizeNode(flat[0], ctx, depth + 1);

  const tokens = tokenizeSequence(flat);
  if (!Array.isArray(tokens)) {
    // `±`, `∈` 등 모델링하지 않는 연산자이거나 잘못된 배치다.
    ctx.ok = false;
    return opaque(
      `seq:${tokens.error}${tokens.operator ? `:${tokens.operator}` : ''}`,
      flat.map((n) => normalizeNode(n, ctx, depth + 1)),
      src,
    );
  }
  const folded = foldRpn(toRPN(tokens), ctx, depth);
  if (!folded) {
    ctx.ok = false;
    return opaque('seq:malformed', flat.map((n) => normalizeNode(n, ctx, depth + 1)), src);
  }
  return folded;
}

/** 단일 노드가 기대되는 슬롯 — 평탄화 후 판정해야 row 래핑에 속지 않는다. */
function soleNode(nodes: readonly MathNode[]): MathNode | null {
  const flat = flattenSequence(nodes);
  return flat.length === 1 ? flat[0] : null;
}

// ─── 노드별 정규화 ───

function normalizeNode(node: MathNode, ctx: Ctx, depth: number): ExprNode {
  if (depth > MAX_DEPTH) {
    ctx.ok = false;
    return opaque('depth-limit', [], provOf(node));
  }
  const src = provOf(node);
  const seq = (nodes: readonly MathNode[]) => normalizeSequence(nodes, ctx, depth + 1, src);
  const each = (nodes: readonly MathNode[]) => nodes.map((n) => normalizeNode(n, ctx, depth + 1));

  switch (node.type) {
    case 'number': {
      const v = Number((node as NumberNode).value);
      if (!Number.isFinite(v)) {
        ctx.ok = false;
        return opaque(`num:${(node as NumberNode).value}`, [], src);
      }
      return num(v, src);
    }

    case 'variable':
      return sym(normalizeVarName((node as VariableNode).name), undefined, src);

    case 'subscript': {
      const n = node as SubscriptNode;
      const base = soleNode(n.base);
      const subNode = soleNode(n.subscript);
      if (base?.type === 'variable' && subNode) {
        if (subNode.type === 'number') {
          return sym(normalizeVarName(base.name), (subNode as NumberNode).value, src);
        }
        if (subNode.type === 'variable') {
          return sym(normalizeVarName(base.name), normalizeVarName(subNode.name), src);
        }
      }
      return opaque('subscript', [seq(n.base), seq(n.subscript)], src);
    }

    case 'frac': {
      const n = node as FracNode;
      // \binom{n}{k} 도 FracNode 다. div 로 매핑하면 이항계수가 나눗셈이 된다.
      if (n.variant === 'binom') {
        return call('binom', [seq(n.numerator), seq(n.denominator)], src);
      }
      return app('div', [seq(n.numerator), seq(n.denominator)], src);
    }

    case 'power': {
      const n = node as PowerNode;
      return app('pow', [seq(n.base), seq(n.exponent)], src);
    }

    case 'sqrt': {
      const n = node as SqrtNode;
      const index = n.index ? seq(n.index) : num(2, src);
      return app('root', [seq(n.content), index], src);
    }

    case 'abs':
      return app('abs', [seq((node as AbsNode).content)], src);

    // 괄호는 그룹핑이 이미 우선순위로 흡수됐고, cancel 은 표시 전용이다.
    // 단 `[a,b]`·`{a,b}` 는 구간·집합 표기이므로 통과시키면 거짓 동등성이 된다.
    case 'paren': {
      const n = node as ParenNode;
      if (n.parenType !== '(') {
        return opaque(`paren:${n.parenType}`, [seq(n.content)], src);
      }
      return seq(n.content);
    }

    case 'cancel':
      return seq((node as CancelNode).content);

    case 'func': {
      const n = node as FuncNode;
      return call(n.name, n.argument.length > 0 ? [seq(n.argument)] : [], src);
    }

    case 'root':
      return seq((node as RootNode).children);

    case 'row':
      return seq((node as RowNode).children);

    // ─── 이하 모델링하지 않는 구조 ───

    case 'integral': {
      const n = node as IntegralNode;
      const parts: ExprNode[] = [seq(n.integrand)];
      if (n.lower) parts.push(seq(n.lower));
      if (n.upper) parts.push(seq(n.upper));
      // differential 은 문자열로 저장된 변수다 — 자식 순회로 잡히지 않는다.
      if (n.differential) parts.push(sym(normalizeVarName(n.differential), undefined, src));
      return opaque(opaqueTag(node), parts, src);
    }

    case 'sum':
    case 'product': {
      const n = node as SumNode | ProductNode;
      return opaque(opaqueTag(node), [seq(n.lower), seq(n.upper), seq(n.body)], src);
    }

    case 'limit': {
      const n = node as LimitNode;
      const parts: ExprNode[] = [seq(n.approach), seq(n.body)];
      // variable 도 문자열이다.
      if (n.variable) parts.push(sym(normalizeVarName(n.variable), undefined, src));
      return opaque(opaqueTag(node), parts, src);
    }

    case 'overline':
      return opaque(opaqueTag(node), [seq((node as OverlineNode).content)], src);

    case 'accent':
      return opaque(opaqueTag(node), [seq((node as AccentNode).content)], src);

    case 'overset': {
      const n = node as OversetNode;
      return opaque(opaqueTag(node), [seq(n.base), seq(n.annotation)], src);
    }

    case 'xarrow': {
      const n = node as XArrowNode;
      const parts = [seq(n.above)];
      if (n.below) parts.push(seq(n.below));
      return opaque(opaqueTag(node), parts, src);
    }

    // rows 는 형제 시퀀스가 아니라 셀·행의 배열이다. 각 셀을 독립 정규화한다.
    case 'matrix':
    case 'align':
    case 'cases':
    case 'array': {
      const n = node as MatrixNode | AlignNode | CasesNode | ArrayNode;
      // 행마다 한 겹 두른다. 셀만 펼치면 2×2 와 1×4 가 같은 키가 된다.
      const rows = n.rows.map((row) =>
        opaque('row', row.map((cell) => normalizeNode(cell, ctx, depth + 1)), src),
      );
      return opaque(opaqueTag(node), rows, src);
    }

    case 'gather': {
      // rows 가 1차원이다. 각 원소가 한 줄이므로 줄 단위로 정규화한다.
      const n = node as GatherNode;
      return opaque(opaqueTag(node), each(n.rows), src);
    }

    case 'text':
    case 'space':
    case 'literal':
    case 'error':
      return opaque(opaqueTag(node), [], src);

    case 'opaque': {
      const n = node as OpaqueNode;
      return opaque(opaqueTag(node), n.args.map((argGroup) => seq(argGroup)), src);
    }

    case 'operator':
      // 시퀀스 토크나이저가 소비했어야 한다. 여기 도달하면 홀로 남은 연산자다.
      ctx.ok = false;
      return opaque(`bare-operator:${node.operator}`, [], src);

    default: {
      const exhaustive: never = node;
      return exhaustive;
    }
  }
}

// ─── 진입점 ───

export function normalizeAst(ast: MathNode): NormalizedExpr {
  const ctx: Ctx = { ok: true };
  let root: ExprNode;
  try {
    root = normalizeNode(ast, ctx, 0);
  } catch {
    return { root: opaque('normalize-failed', [], [ast.id]), relationCount: 0, hasOpaque: true, ok: false };
  }

  let relationCount = 0;
  let hasOpaque = false;
  let truncated = false;
  const walk = (e: ExprNode, depth: number): void => {
    if (depth > MAX_DEPTH) {
      // 여기서 멈추면 relationCount 가 과소 계상된다 — 게이트가 느슨해지므로 알린다.
      truncated = true;
      return;
    }
    if (e.kind === 'rel') relationCount++;
    if (e.kind === 'opaque') hasOpaque = true;
    for (const c of childrenOfExpr(e)) walk(c, depth + 1);
  };
  walk(root, 0);

  return { root, relationCount, hasOpaque, ok: ctx.ok && !truncated };
}

