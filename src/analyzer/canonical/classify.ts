/**
 * IR 기반 식 분류.
 *
 * `analyzeExpression` 을 호출하지 않는다. 필요한 것(함수 목록, 모델링 밖 구조,
 * 상수)이 전부 IR 한 번 순회로 나오고, 부분적으로라도 소비하면 두 분석 체계가
 * 공존해 어느 쪽이 진실인지 흐려지기 때문이다. 대신 이름 휴리스틱과
 * `isMathConstantName` 은 그대로 재사용한다.
 */

import { isMathConstantName } from '../../evaluator/constants.js';
import { COEFFICIENT_NAMES, MAIN_VARIABLE_NAMES } from '../variable-classifier.js';
import { type ExprNode, type RelOp, app } from './expr.js';
import { type NormalizedExpr, negate } from './from-ast.js';
import { type PolyProfile, symKey, toPolynomial } from './polynomial.js';

export type ExprShape =
  | 'expression'
  | 'equation'
  | 'inequality'
  | 'definition'
  | 'multi-relation';

export interface ExprClass {
  shape: ExprShape;
  /** `definition` 일 때 좌변 종속변수 (`y = ...` 의 `y`). */
  dependent?: string;
  /** `equation` 일 때 한쪽으로 모은 식 (`lhs - rhs`). */
  canonicalSide?: ExprNode;
  /** 부정원으로 취급한 심볼 (`symKey` 형식). */
  mainVariables: string[];
  /** 계수·파라미터로 취급한 심볼. */
  parameters: string[];
  /**
   * 수학 상수 이름과 겹치는 심볼 — **분할이 아니라 태그다.**
   * `\varphi` 는 `φ` 로 정규화되는데 `φ` 는 황금비로 상수 목록에 있다.
   * `e`·`γ`·`τ` 도 같은 충돌을 갖는다. 이 층에서 해소할 수 없는 모호성이므로
   * 여기에 실리는 심볼도 `mainVariables`/`parameters` 에 그대로 남는다.
   */
  constants: string[];
  /** `mainVariables` 기준 다항식 프로파일. 다항식이 아니면 없다. */
  poly?: PolyProfile;
  /** 내장 함수 이름 (`call` 노드). 사용자 정의 `f(x)` 는 여기 안 잡힌다 — 아래 주석 참조. */
  functions: string[];
  hasOpaque: boolean;
}

// ─── 심볼 수집 ───

interface Collected {
  syms: Set<string>;
  functions: Set<string>;
  hasOpaque: boolean;
}

function collect(e: ExprNode, acc: Collected): void {
  switch (e.kind) {
    case 'num':
      return;
    case 'sym':
      acc.syms.add(symKey(e.name, e.sub));
      return;
    case 'call':
      acc.functions.add(e.fn);
      for (const a of e.args) collect(a, acc);
      return;
    case 'app':
      for (const a of e.args) collect(a, acc);
      return;
    case 'rel':
      collect(e.lhs, acc);
      collect(e.rhs, acc);
      return;
    case 'opaque':
      acc.hasOpaque = true;
      for (const c of e.children) collect(c, acc);
      return;
    default: {
      const exhaustive: never = e;
      void exhaustive;
    }
  }
}

/**
 * 심볼을 부정원과 파라미터로 가른다.
 *
 * 이름 휴리스틱만 쓰면 표적 수식 다수에서 부정원이 비어버린다 —
 * `a^2+b^2=c^2` 는 셋 다 계수명이고, `T^2 = \frac{4\pi^2}{GM}a^3` 은 `T`·`M`·`G`
 * 어느 것도 두 집합에 없다. 부정원이 비면 차수가 전부 0 이 되어 프로파일이
 * 무의미해지므로, 폴백을 둔다.
 */
function partitionSymbols(syms: ReadonlySet<string>): { main: string[]; params: string[] } {
  const main: string[] = [];
  const params: string[] = [];
  const others: string[] = [];
  for (const s of [...syms].sort()) {
    const bare = s.split('_')[0];
    if (MAIN_VARIABLE_NAMES.has(bare)) main.push(s);
    else if (COEFFICIENT_NAMES.has(bare)) params.push(s);
    else others.push(s);
  }
  if (main.length > 0) return { main, params: [...params, ...others].sort() };
  // 관례적 부정원이 없다 — 이름으로 계수라고 볼 근거가 없는 쪽을 부정원으로 삼는다.
  // 단 수학 상수명은 폴백에서 제외한다. π 를 부정원으로 삼으면
  // `A = \pi r^2` 이 r 이 아니라 π 에 대한 1차식이 된다.
  const fallback = others.filter((s) => !isMathConstantName(s));
  if (fallback.length > 0) {
    return { main: fallback, params: [...params, ...others.filter((s) => isMathConstantName(s))].sort() };
  }
  // 그것도 없으면 계수명이라도 부정원으로 둔다 (a^2+b^2=c^2 같은 경우).
  if (params.length > 0) return { main: params, params: others };
  return { main: others, params: [] };
}

// ─── shape 판정 ───

function shapeOfRel(op: RelOp): 'equation' | 'inequality' {
  switch (op) {
    case '=':
      return 'equation';
    case '<':
    case '>':
    case '≤':
    case '≥':
    case '⩽':
    case '⩾':
    case '≠':
      // `≠` 는 순서 관계가 아니지만 등식도 아니다. 형식 매칭 대상이 아니라는
      // 점에서 부등호와 같은 취급이 맞다.
      return 'inequality';
    default: {
      const exhaustive: never = op;
      void exhaustive;
      return 'inequality';
    }
  }
}

// ─── 진입점 ───

export function classifyExpr(n: NormalizedExpr): ExprClass {
  const acc: Collected = { syms: new Set(), functions: new Set(), hasOpaque: false };
  collect(n.root, acc);

  const constants = [...acc.syms].filter((s) => isMathConstantName(s)).sort();
  const functions = [...acc.functions].sort();

  const base = {
    constants,
    functions,
    hasOpaque: acc.hasOpaque || n.hasOpaque,
  };

  if (n.relationCount >= 2) {
    const { main, params } = partitionSymbols(acc.syms);
    return { shape: 'multi-relation', mainVariables: main, parameters: params, ...base };
  }

  if (n.root.kind !== 'rel') {
    const { main, params } = partitionSymbols(acc.syms);
    const poly = toPolynomial(n.root, new Set(main)) ?? undefined;
    return { shape: 'expression', mainVariables: main, parameters: params, poly, ...base };
  }

  const { op, lhs, rhs } = n.root;
  if (shapeOfRel(op) === 'inequality') {
    const { main, params } = partitionSymbols(acc.syms);
    return { shape: 'inequality', mainVariables: main, parameters: params, ...base };
  }

  // `y = ...` 처럼 좌변이 단일 심볼이고 우변에 다시 나오지 않으면 정의식이다.
  // 이 분기가 없으면 `y = ax^2+bx+c` 의 변수 집합에 y 가 섞여 차수 판정이 흐려진다.
  if (lhs.kind === 'sym') {
    const dep = symKey(lhs.name, lhs.sub);
    const rhsAcc: Collected = { syms: new Set(), functions: new Set(), hasOpaque: false };
    collect(rhs, rhsAcc);
    if (!rhsAcc.syms.has(dep)) {
      const { main, params } = partitionSymbols(rhsAcc.syms);
      const poly = toPolynomial(rhs, new Set(main)) ?? undefined;
      return {
        shape: 'definition',
        dependent: dep,
        mainVariables: main,
        parameters: params,
        poly,
        ...base,
      };
    }
  }

  // 일반 등식 — 한쪽으로 모아 다항식으로 읽는다.
  const canonicalSide = app('add', [lhs, negate(rhs, rhs.src)], n.root.src);
  const { main, params } = partitionSymbols(acc.syms);
  const poly = toPolynomial(canonicalSide, new Set(main)) ?? undefined;
  return {
    shape: 'equation',
    canonicalSide,
    mainVariables: main,
    parameters: params,
    poly,
    ...base,
  };
}

/** 진단·테스트용 요약. */
export function describeClass(c: ExprClass): string {
  const parts: string[] = [c.shape];
  if (c.dependent) parts.push(`dep=${c.dependent}`);
  parts.push(`main=[${c.mainVariables.join(',')}]`);
  if (c.parameters.length) parts.push(`param=[${c.parameters.join(',')}]`);
  if (c.poly) parts.push(`deg=${c.poly.degree}`);
  else parts.push('deg=—');
  if (c.functions.length) parts.push(`fn=[${c.functions.join(',')}]`);
  return parts.join(' ');
}

