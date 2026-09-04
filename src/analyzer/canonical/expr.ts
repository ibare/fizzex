/**
 * 분석 전용 정규화 IR.
 *
 * `MathNode` 는 렌더·편집을 위한 표현이고 `root.children` 이 평평하다 —
 * `a^2 + b^2 = c^2` 는 `[power, '+', power, '=', power]` 로 중위 연산자에 트리
 * 구조가 없다. 여기서 우선순위를 적용해 세운 식 트리가 `ExprNode` 다.
 *
 * `MathNode` 유니온에 노드를 추가하지 않는 이유: 새 MathNode 타입은
 * `astToBox()`/`astToLatex()` 분기를 요구하는데(C1), 정규화 노드는 그릴 것도
 * 직렬화할 것도 없다. 분석 전용 구조가 렌더 파이프라인을 오염시키지 않도록
 * 별도 유니온으로 둔다.
 *
 * IR 은 `normalizeAst(MathNode)` 의 순수 파생값이며 편집·영속 대상이 아니다.
 * 진실의 원천은 언제나 AST 다.
 */

import type { RelOp } from '../../evaluator/sequence.js';

export type { RelOp };

/**
 * 모델링하는 연산.
 *
 * `sub` 도 `neg` 도 없다 — `a - b` 는 `add(a, mul(-1, b))` 로 정규화된다.
 * 부호를 곱셈으로 흡수하지 않으면 `-x^2` 와 `(-1)x^2` 가 다른 키를 갖고,
 * `x^2 - 2x` 의 `-2x` 항이 `mul` 이 아니라 별도 노드가 되어 곱셈 패턴에
 * 붙지 않는다.
 */
export type AppOp = 'add' | 'mul' | 'pow' | 'div' | 'abs' | 'root';

/** 이 노드를 만든 원본 MathNode id 목록. 바인딩 → 노드 역추적용. */
export type Provenance = readonly string[];

export type ExprNode =
  | { kind: 'num'; value: number; src: Provenance }
  | { kind: 'sym'; name: string; sub?: string; src: Provenance }
  | { kind: 'app'; op: AppOp; args: readonly ExprNode[]; src: Provenance }
  | { kind: 'rel'; op: RelOp; lhs: ExprNode; rhs: ExprNode; src: Provenance }
  | { kind: 'call'; fn: string; args: readonly ExprNode[]; src: Provenance }
  /** 모델링하지 않는 구조. `tag` 는 타입 + 판별 스칼라 필드를 직렬화한 것. */
  | { kind: 'opaque'; tag: string; children: readonly ExprNode[]; src: Provenance };

// ─── 생성자 ───

export const num = (value: number, src: Provenance = []): ExprNode => ({ kind: 'num', value, src });

export const sym = (name: string, sub: string | undefined, src: Provenance = []): ExprNode =>
  sub === undefined ? { kind: 'sym', name, src } : { kind: 'sym', name, sub, src };

export const app = (op: AppOp, args: readonly ExprNode[], src: Provenance = []): ExprNode => ({
  kind: 'app',
  op,
  args,
  src,
});

export const rel = (op: RelOp, lhs: ExprNode, rhs: ExprNode, src: Provenance = []): ExprNode => ({
  kind: 'rel',
  op,
  lhs,
  rhs,
  src,
});

export const call = (fn: string, args: readonly ExprNode[], src: Provenance = []): ExprNode => ({
  kind: 'call',
  fn,
  args,
  src,
});

export const opaque = (tag: string, children: readonly ExprNode[], src: Provenance = []): ExprNode => ({
  kind: 'opaque',
  tag,
  children,
  src,
});

// ─── 정준 키 ───

/**
 * 구조 동등성 비교용 정준 키.
 *
 * `src`(유래)와 무관하게 **구조만** 반영한다. 같은 키 = 같은 식.
 * `add`/`mul` 은 정규화 단계에서 이미 정렬되어 있으므로 여기서 다시 정렬하지
 * 않는다 — 키 생성이 정렬에 쓰이기 때문에 순환을 피한다.
 */
export function canonicalKey(e: ExprNode): string {
  switch (e.kind) {
    case 'num':
      return `num:${e.value}`;
    case 'sym':
      return e.sub === undefined ? `sym:${e.name}` : `sym:${e.name}_${e.sub}`;
    case 'app':
      return `${e.op}(${e.args.map(canonicalKey).join(',')})`;
    case 'rel':
      return `rel${e.op}(${canonicalKey(e.lhs)},${canonicalKey(e.rhs)})`;
    case 'call':
      return `call:${e.fn}(${e.args.map(canonicalKey).join(',')})`;
    case 'opaque':
      return `opaque:${e.tag}(${e.children.map(canonicalKey).join(',')})`;
    default: {
      const exhaustive: never = e;
      return String(exhaustive);
    }
  }
}

/**
 * 교환법칙 피연산자의 정준 순서.
 * 상수(`num`)를 항상 뒤로 밀어 상수항이 마지막에 오게 한다.
 */
export function compareCanonical(a: ExprNode, b: ExprNode): number {
  const rank = (e: ExprNode) => (e.kind === 'num' ? 1 : 0);
  const dr = rank(a) - rank(b);
  if (dr !== 0) return dr;
  const ka = canonicalKey(a);
  const kb = canonicalKey(b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

/** 모든 자식을 방문한다 (구조 순회용). */
export function childrenOfExpr(e: ExprNode): readonly ExprNode[] {
  switch (e.kind) {
    case 'num':
    case 'sym':
      return [];
    case 'app':
    case 'call':
      return e.args;
    case 'rel':
      return [e.lhs, e.rhs];
    case 'opaque':
      return e.children;
    default: {
      const exhaustive: never = e;
      return exhaustive;
    }
  }
}
