/**
 * 극값·한계 연산자 평가 (`\max`, `\min`, `\sup`, `\inf`, `\gcd`)
 *
 * 이 연산자들은 자식을 갖지 않는다 — 피연산자가 AST 상 형제로 온다. 그래서
 * 결합은 `sequence.ts` 가 하고, 여기서는 결합된 토큰을 받아 값만 구한다.
 *
 * 표기 형태별 정책:
 *   `\max(a, b, c)`             유한 인자 — 확정
 *   `\max_{i=1}^{n} a_i`        인덱스 범위 순회 — 확정
 *   `\max_{x \in [a,b]} f(x)`   연속 구간 — 수치 근사. 전역 최적해는 보장할 수 없다
 *                               (정적분이 Simpson 근사를 value 로 돌려주는 것과 같은 규약)
 *   `\max x`                    피연산자가 하나뿐이면 그 값
 *
 * `\det` `\Pr` `\limsup` `\liminf` 은 각각 행렬식·확률측도·집적점이라는 별개 주제라
 * 정직하게 `unsupported` 를 돌려준다 — 값을 지어내지 않는다.
 */
import type { MathNode, OperatorNode, ParenNode, RowNode, VariableNode } from '../types.js';
import type { MathOpToken } from './sequence.js';
import { value, fail, type EvalContext, type EvalOutcome } from './types.js';
import { evalChildSequence, setMathOpEvaluator } from './arithmetic.js';
import { unwrapArgumentParen, splitByComma } from './args.js';
import { resolveRange } from './calculus.js';
import { normalizeVarName } from './normalize.js';

/** 구간 위 극값을 찾을 때 훑는 표본 수 */
const INTERVAL_SAMPLES = 2000;
/** 표본 최적점 주변을 좁혀 들어가는 횟수 */
const REFINE_STEPS = 80;

type Reducer = (a: number, b: number) => number;

/** 이름 → 값 두 개를 하나로 줄이는 방법. 여기 없는 이름은 unsupported 다. */
const REDUCERS: Readonly<Record<string, Reducer>> = {
  max: Math.max,
  min: Math.min,
  // 유한 집합·유계 구간에서 상한/하한은 최댓값/최솟값과 일치한다.
  sup: Math.max,
  inf: Math.min,
};

/** 구간 극값에서 어느 쪽을 좋은 값으로 볼지 */
function prefersLarger(name: string): boolean {
  return name === 'max' || name === 'sup';
}

function gcd2(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y > 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

function reduceAll(name: string, values: number[]): EvalOutcome {
  if (values.length === 0) {
    return fail('unsupported', { nodeType: 'mathop', reason: `${name}-empty-operand` });
  }
  if (name === 'gcd') {
    if (!values.every(Number.isInteger)) {
      return fail('domain', { nodeType: 'mathop', reason: 'gcd-non-integer' });
    }
    return value(values.reduce((a, b) => gcd2(a, b)));
  }
  const reducer = REDUCERS[name];
  if (!reducer) return fail('unsupported', { nodeType: 'mathop', reason: name });
  // reduce 는 인덱스와 배열까지 넘긴다 — 가변 인자인 Math.max 에 그대로 주면 NaN 이 된다.
  return value(values.reduce((a, b) => reducer(a, b)));
}

/** 하한이 `x \in <집합>` 형태인지 읽는다 */
function readMembership(
  lower: MathNode[]
): { variable: string; domain: MathNode[] } | null {
  if (lower.length !== 1 || lower[0].type !== 'row') return null;
  const cells = (lower[0] as RowNode).children;
  if (cells.length < 3) return null;
  if (cells[0].type !== 'variable') return null;
  const op = cells[1];
  if (op.type !== 'operator' || (op as OperatorNode).operator !== '∈') return null;
  return {
    variable: normalizeVarName((cells[0] as VariableNode).name),
    domain: cells.slice(2),
  };
}

/** `[a, b]` 처럼 닫힌 구간으로 읽히는지 확인하고 양 끝을 평가한다 */
function readClosedInterval(
  domain: MathNode[],
  ctx: EvalContext
): { lo: number; hi: number } | null {
  if (domain.length !== 1 || domain[0].type !== 'paren') return null;
  const paren = domain[0] as ParenNode;
  if (paren.parenType !== '[') return null;
  const cells = unwrapArgumentParen(domain);
  if (!cells) return null;
  const segments = splitByComma(cells);
  if (segments.length !== 2) return null;
  const loOut = evalChildSequence(segments[0], ctx);
  if (loOut.kind === 'fail') return null;
  const hiOut = evalChildSequence(segments[1], ctx);
  if (hiOut.kind === 'fail') return null;
  return { lo: loOut.value, hi: hiOut.value };
}

/**
 * 닫힌 구간 위의 극값 — 균등 표본 뒤 최적점 주변을 좁힌다.
 *
 * 전역 최적해를 보장하지 않는다. 표본 간격보다 좁은 봉우리는 놓칠 수 있다.
 */
function optimizeOnInterval(
  name: string,
  body: MathNode[],
  variable: string,
  lo: number,
  hi: number,
  ctx: EvalContext
): EvalOutcome {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    return fail('unsupported', { nodeType: 'mathop', reason: 'unbounded-interval' });
  }
  if (lo > hi) return fail('domain', { nodeType: 'mathop', reason: 'empty-interval' });

  const larger = prefersLarger(name);
  const better = (a: number, b: number): boolean => (larger ? a > b : a < b);

  const at = (x: number): EvalOutcome => evalChildSequence(body, ctx.withBinding(variable, x));

  let bestX = lo;
  let best: number | null = null;
  let lastFail: EvalOutcome | null = null;

  for (let i = 0; i <= INTERVAL_SAMPLES; i++) {
    const x = lo + ((hi - lo) * i) / INTERVAL_SAMPLES;
    const out = at(x);
    if (out.kind === 'fail') {
      lastFail = out;
      continue;
    }
    if (best === null || better(out.value, best)) {
      best = out.value;
      bestX = x;
    }
  }

  // 구간 전체에서 한 점도 평가되지 않으면 그 실패를 그대로 전한다.
  if (best === null) {
    return lastFail ?? fail('unsupported', { nodeType: 'mathop', reason: 'no-evaluable-point' });
  }

  // 표본 최적점 좌우 한 칸을 삼분 탐색으로 좁힌다.
  const step = (hi - lo) / INTERVAL_SAMPLES;
  let left = Math.max(lo, bestX - step);
  let right = Math.min(hi, bestX + step);
  for (let i = 0; i < REFINE_STEPS && right - left > Number.EPSILON; i++) {
    const m1 = left + (right - left) / 3;
    const m2 = right - (right - left) / 3;
    const o1 = at(m1);
    const o2 = at(m2);
    if (o1.kind === 'fail' || o2.kind === 'fail') break;
    if (better(o1.value, o2.value)) {
      right = m2;
      if (better(o1.value, best)) best = o1.value;
    } else {
      left = m1;
      if (better(o2.value, best)) best = o2.value;
    }
  }

  return value(best);
}

/** `sequence.ts` 가 묶어 준 극값 연산자 토큰을 평가한다 */
function evalMathOpToken(token: MathOpToken, ctx: EvalContext): EvalOutcome {
  const { name, lower, upper, operand } = token;

  if (operand.length === 0) {
    return fail('unsupported', { nodeType: 'mathop', reason: `${name}-missing-operand` });
  }
  if (!REDUCERS[name] && name !== 'gcd') {
    return fail('unsupported', { nodeType: 'mathop', reason: name });
  }

  // `_{i=1}^{n}` — 인덱스를 훑는다.
  if (lower && upper) {
    const range = resolveRange(lower, upper, ctx, 'mathop');
    if (!range.ok) return range.outcome;
    const values: number[] = [];
    for (let k = range.start; k <= range.end; k++) {
      const out = evalChildSequence(operand, ctx.withBinding(range.variable, k));
      if (out.kind === 'fail') return out;
      values.push(out.value);
    }
    return reduceAll(name, values);
  }

  // `_{x \in ...}` — 지금은 닫힌 구간만 읽는다.
  if (lower) {
    const member = readMembership(lower);
    if (!member) {
      return fail('unsupported', { nodeType: 'mathop', reason: 'unrecognized-limits' });
    }
    const interval = readClosedInterval(member.domain, ctx);
    if (interval) {
      return optimizeOnInterval(name, operand, member.variable, interval.lo, interval.hi, ctx);
    }
    return fail('unsupported', { nodeType: 'mathop', reason: 'unrecognized-domain' });
  }

  // 첨자가 없으면 괄호 안 인자 목록으로 본다.
  const cells = unwrapArgumentParen(operand);
  if (cells) {
    const values: number[] = [];
    for (const seg of splitByComma(cells)) {
      if (seg.length === 0) {
        return fail('unsupported', { nodeType: 'mathop', reason: `${name}-empty-argument` });
      }
      const out = evalChildSequence(seg, ctx);
      if (out.kind === 'fail') return out;
      values.push(out.value);
    }
    return reduceAll(name, values);
  }

  // 괄호도 첨자도 없으면 피연산자 하나를 그대로 줄인다 (`\max x` → x).
  const single = evalChildSequence(operand, ctx);
  if (single.kind === 'fail') return single;
  return reduceAll(name, [single.value]);
}

let installed = false;

export function installMathOpEvaluator(): void {
  if (installed) return;
  installed = true;
  setMathOpEvaluator(evalMathOpToken);
}
