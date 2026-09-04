/**
 * IR 기반 다항식 프로파일.
 *
 * `analyzer/polynomial-analyzer.ts` 의 차수 계산을 대체하지 않고 **별개로**
 * 존재한다. 그쪽은 평평한 AST 위에서 "변수별 최고 지수" 를 세므로 다음을
 * 오판한다 — `2^x`→1차, `\sqrt{x}`→1차, `x^{-1}`→1차, `x^2/x`→2차,
 * `x^2y^3`→3차(항별 total degree 가 아님). IR 에는 `mul`/`pow`/`div` 가 명시되어
 * 있어 정확히 계산된다.
 *
 * 계수는 단변수일 때만 산출한다. 이 시스템에서 계수 **값**이 추출되는 것은
 * 여기가 처음이다 — `PolynomialInfo.degreesByVariable` 는 차수 맵이지 계수가 아니다.
 */

import { type ExprNode, type Provenance, canonicalKey, num } from './expr.js';

/** 다항식으로 다룰 최대 차수. */
const MAX_POLY_DEGREE = 64;

/** 재귀 깊이 상한 (차수 상한과 별개). */
const MAX_POLY_DEPTH = 200;

/**
 * 계수식 노드 예산.
 *
 * 차수만 제한하면 부족하다 — 기호 계수는 반복 합성곱에서 노드 수가 2^n 로
 * 자란다. `(x+a)^20` 은 차수 20 으로 상한을 통과하지만 계수식이 419만 노드다.
 * 이 경로는 렌더 중 동기 실행되므로 예산을 초과하면 즉시 포기한다.
 */
const MAX_COEFF_NODES = 4096;

export interface PolyProfile {
  /** 항별 total degree 의 최댓값. */
  degree: number;
  /** 차수 판정에 쓰인 변수 키 목록. */
  variables: string[];
  /** 차수 → 계수식. 단변수일 때만 채운다. */
  coefficients?: ReadonlyMap<number, ExprNode>;
}

/** 심볼의 정체성 키. `name` 만 쓰면 `N_0` 와 `N` 이 같은 변수로 붕괴한다. */
export function symKey(name: string, sub?: string): string {
  return sub === undefined ? name : `${name}_${sub}`;
}

/** 이 식이 주어진 변수 집합 중 하나라도 포함하는가. */
export function containsVar(e: ExprNode, vars: ReadonlySet<string>): boolean {
  if (e.kind === 'sym') return vars.has(symKey(e.name, e.sub));
  if (e.kind === 'num') return false;
  if (e.kind === 'app' || e.kind === 'call') return e.args.some((a) => containsVar(a, vars));
  if (e.kind === 'rel') return containsVar(e.lhs, vars) || containsVar(e.rhs, vars);
  return e.children.some((c) => containsVar(c, vars));
}

// ─── 계수 산술 (상수는 접는다) ───

interface Budget {
  left: number;
}

/** 계수 산술에서 유래를 합칠 때의 상한. */
const MAX_SRC = 32;

/**
 * 유래를 합친다 — 중복 제거 + 상한.
 *
 * 단순 concat 은 안 된다. `mulCoeffs` 가 계수 쌍을 반복 조합하므로 같은 배열이
 * 계속 복제되어 노드 수가 아니라 **배열 원소 수**가 지수적으로 자란다.
 * `(x+a)^{30}` 이 노드 예산을 통과한 채 OOM 으로 죽는 경로가 여기였다.
 */
function mergeSrc(a: Provenance, b: Provenance): Provenance {
  if (a.length === 0) return b.length > MAX_SRC ? b.slice(0, MAX_SRC) : b;
  if (b.length === 0) return a.length > MAX_SRC ? a.slice(0, MAX_SRC) : a;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of [a, b]) {
    for (const id of list) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      if (out.length >= MAX_SRC) return out;
    }
  }
  return out;
}

function addExpr(bg: Budget, a: ExprNode, b: ExprNode): ExprNode | null {
  if (a.kind === 'num' && b.kind === 'num') return num(a.value + b.value, mergeSrc(a.src, b.src));
  if (a.kind === 'num' && a.value === 0) return b;
  if (b.kind === 'num' && b.value === 0) return a;
  if (--bg.left < 0) return null;
  return { kind: 'app', op: 'add', args: [a, b], src: mergeSrc(a.src, b.src) };
}

function mulExpr(bg: Budget, a: ExprNode, b: ExprNode): ExprNode | null {
  if (a.kind === 'num' && b.kind === 'num') return num(a.value * b.value, mergeSrc(a.src, b.src));
  if (a.kind === 'num' && a.value === 1) return b;
  if (b.kind === 'num' && b.value === 1) return a;
  if (a.kind === 'num' && a.value === 0) return num(0, mergeSrc(a.src, b.src));
  if (b.kind === 'num' && b.value === 0) return num(0, mergeSrc(a.src, b.src));
  if (--bg.left < 0) return null;
  return { kind: 'app', op: 'mul', args: [a, b], src: mergeSrc(a.src, b.src) };
}

// ─── 계수 다항식 (단변수) ───

type Coeffs = Map<number, ExprNode>;

const constCoeffs = (e: ExprNode): Coeffs => new Map([[0, e]]);

/**
 * 구조적으로 접을 수 없는 부분식의 처리.
 * 변수를 하나도 안 쓰면 형태와 무관하게 상수다 — 이 폴백이 없으면
 * `x + 2^{-1}` 이나 `a^{-1}x` 가 비다항식으로 떨어진다.
 */
const constOrNull = (e: ExprNode, vars: ReadonlySet<string>): Coeffs | null =>
  containsVar(e, vars) ? null : constCoeffs(e);

function addCoeffs(bg: Budget, a: Coeffs, b: Coeffs): Coeffs | null {
  const out = new Map(a);
  for (const [d, c] of b) {
    if (!out.has(d)) {
      out.set(d, c);
      continue;
    }
    const sum = addExpr(bg, out.get(d)!, c);
    if (!sum) return null;
    out.set(d, sum);
  }
  return out;
}

function mulCoeffs(bg: Budget, a: Coeffs, b: Coeffs): Coeffs | null {
  const out: Coeffs = new Map();
  for (const [da, ca] of a) {
    for (const [db, cb] of b) {
      const d = da + db;
      if (d > MAX_POLY_DEGREE) return null;
      const term = mulExpr(bg, ca, cb);
      if (!term) return null;
      if (!out.has(d)) {
        out.set(d, term);
        continue;
      }
      const sum = addExpr(bg, out.get(d)!, term);
      if (!sum) return null;
      out.set(d, sum);
    }
  }
  return out;
}

function negCoeffs(bg: Budget, a: Coeffs): Coeffs | null {
  const out: Coeffs = new Map();
  for (const [d, c] of a) {
    const n = mulExpr(bg, num(-1), c);
    if (!n) return null;
    out.set(d, n);
  }
  return out;
}

function degreeOfCoeffs(c: Coeffs): number {
  let max = 0;
  for (const [d, v] of c) {
    if (v.kind === 'num' && v.value === 0) continue;
    if (d > max) max = d;
  }
  return max;
}

/**
 * 식을 `vars` 에 대한 계수 다항식으로 접는다. 다항식이 아니면 `null`.
 * `vars` 가 여러 개면 total degree 만 의미가 있고 계수는 혼합된다.
 */
function coeffsOf(
  bg: Budget,
  e: ExprNode,
  vars: ReadonlySet<string>,
  depth: number,
): Coeffs | null {
  if (depth > MAX_POLY_DEPTH) return null;

  switch (e.kind) {
    case 'num':
      return constCoeffs(e);

    case 'sym':
      return vars.has(symKey(e.name, e.sub)) ? new Map([[1, num(1, e.src)]]) : constCoeffs(e);

    case 'rel':
      // 관계식은 다항식이 아니다. 좌·우변을 따로 넘겨야 한다.
      return null;

    case 'opaque':
      // 모델링 밖 구조는 변수를 포함하지 않아도 상수로 통과시키지 않는다.
      // 정규화 실패(seq:malformed, empty, bare-operator …)가 여기로 접히는데,
      // 그것을 "상수 다항식" 으로 읽으면 실패가 은폐된다.
      return null;

    case 'call':
      return containsVar(e, vars) ? null : constCoeffs(e);

    case 'app':
      switch (e.op) {
        case 'add': {
          let acc: Coeffs = new Map();
          for (const a of e.args) {
            const c = coeffsOf(bg, a, vars, depth + 1);
            if (!c) return null;
            const sum = addCoeffs(bg, acc, c);
            if (!sum) return null;
            acc = sum;
          }
          return acc;
        }
        case 'mul': {
          let acc: Coeffs = new Map([[0, num(1)]]);
          for (const a of e.args) {
            const c = coeffsOf(bg, a, vars, depth + 1);
            if (!c) return null;
            const m = mulCoeffs(bg, acc, c);
            if (!m) return null;
            acc = m;
          }
          return acc;
        }
        case 'neg': {
          const c = e.args.length === 1 ? coeffsOf(bg, e.args[0], vars, depth + 1) : null;
          return c ? negCoeffs(bg, c) : null;
        }
        case 'pow': {
          if (e.args.length !== 2) return null;
          const [base, exp] = e.args;
          // 지수는 비음 정수 상수여야 한다. `2^x` 와 `x^{-1}` 이 여기서 걸린다.
          if (exp.kind !== 'num' || !Number.isInteger(exp.value) || exp.value < 0)
            return constOrNull(e, vars);
          if (exp.value > MAX_POLY_DEGREE) return null;
          const b = coeffsOf(bg, base, vars, depth + 1);
          if (!b) return null;
          let acc: Coeffs = new Map([[0, num(1)]]);
          for (let i = 0; i < exp.value; i++) {
            const m = mulCoeffs(bg, acc, b);
            if (!m) return null;
            acc = m;
          }
          return acc;
        }
        case 'div': {
          if (e.args.length !== 2) return null;
          const [p, q] = e.args;
          // 분모에 변수가 있으면 유리식이다. `x^2/x` 가 여기서 걸린다.
          if (containsVar(q, vars)) return constOrNull(e, vars);
          const pc = coeffsOf(bg, p, vars, depth + 1);
          if (!pc) return null;
          const out: Coeffs = new Map();
          for (const [d, c] of pc) {
            if (--bg.left < 0) return null;
            out.set(d, { kind: 'app', op: 'div', args: [c, q], src: mergeSrc(c.src, q.src) });
          }
          return out;
        }
        case 'root':
        case 'abs':
          // 구조적으로 접을 수 없다. 변수가 없으면 아래 폴백이 상수로 받는다.
          return constOrNull(e, vars);
        default: {
          // 모든 AppOp 를 덮었다. 새 연산이 추가되면 여기서 타입 에러가 난다.
          const exhaustive: never = e;
          void exhaustive;
          return null;
        }
      }

    default: {
      const exhaustive: never = e;
      void exhaustive;
      return null;
    }
  }
}

/**
 * 다항식 프로파일. 다항식이 아니면 `null`.
 *
 * @param vars 부정원으로 취급할 심볼 키 집합 (`symKey` 형식).
 */
export function toPolynomial(e: ExprNode, vars: ReadonlySet<string>): PolyProfile | null {
  const coeffs = coeffsOf({ left: MAX_COEFF_NODES }, e, vars, 0);
  if (!coeffs) return null;
  const variables = [...vars].sort();
  const profile: PolyProfile = {
    degree: degreeOfCoeffs(coeffs),
    variables,
  };
  // 계수는 부정원이 하나일 때만 의미가 있다.
  if (vars.size === 1) return { ...profile, coefficients: coeffs };
  return profile;
}

/** 계수식을 사람이 읽는 형태로 — 진단·테스트용. */
export function describeCoefficients(c: ReadonlyMap<number, ExprNode>): string {
  return [...c.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([d, v]) => `${d}: ${v.kind === 'num' ? v.value : canonicalKey(v)}`)
    .join(', ');
}
