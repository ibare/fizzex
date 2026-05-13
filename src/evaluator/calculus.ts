/**
 * E6/E7 미적분 + 유한 합/곱 평가자
 *
 * 본 모듈은 "반복 평가 기반 수치 평가자" 들을 응집한다:
 *   - 정적분 (adaptive Simpson 1/3)
 *   - 유한 합 / 곱 (인덱스 변수 반복 바인딩)
 *
 * 도메인 정책:
 *   - 정적분만 지원, 부정적분·다중적분·선적분 → unsupported
 *   - 합/곱: 인덱스 = 시작값 ≤ 종료값 (둘 다 정수). 위반 시 domain
 *   - 합/곱 항 수 > 1e6 → unsupported (메모리·시간 가드)
 *   - 피적분/피합/피곱 평가 실패는 그대로 전파
 */
import type { MathNode, IntegralNode, SumNode, ProductNode, OperatorNode, VariableNode, RowNode } from '../types';
import { register } from './registry';
import { value, fail, type EvalContext, type EvalOutcome } from './types';
import { evalChildSequence } from './arithmetic';

const TERM_COUNT_LIMIT = 1_000_000;

const EPS = 1e-9;
const MAX_DEPTH = 20;

/**
 * 적분 변수 t 에 대한 닫힌 f(t) → number | fail.
 * 평가 도중 fail 이 발생하면 그 fail 을 그대로 반환한다.
 */
type Integrand = (t: number) => EvalOutcome;

function simpsonRule(f: Integrand, a: number, b: number, fa: number, fb: number, fm: number): number {
  return ((b - a) / 6) * (fa + 4 * fm + fb);
}

interface SimpsonResult {
  ok: true;
  value: number;
}
interface SimpsonFail {
  ok: false;
  outcome: EvalOutcome;
}

function evalF(f: Integrand, t: number): { ok: true; value: number } | SimpsonFail {
  const out = f(t);
  if (out.kind === 'fail') return { ok: false, outcome: out };
  if (!Number.isFinite(out.value)) {
    return {
      ok: false,
      outcome: fail('divergent', { nodeType: 'integral', reason: 'integrand-non-finite' }),
    };
  }
  return { ok: true, value: out.value };
}

function adaptiveSimpson(
  f: Integrand,
  a: number,
  b: number,
  fa: number,
  fb: number,
  fm: number,
  whole: number,
  eps: number,
  depth: number,
): SimpsonResult | SimpsonFail {
  const m = (a + b) / 2;
  const lm = (a + m) / 2;
  const rm = (m + b) / 2;
  const flm = evalF(f, lm);
  if (!flm.ok) return flm;
  const frm = evalF(f, rm);
  if (!frm.ok) return frm;
  const left = simpsonRule(f, a, m, fa, fm, flm.value);
  const right = simpsonRule(f, m, b, fm, fb, frm.value);
  const delta = left + right - whole;
  if (depth <= 0) {
    return {
      ok: false,
      outcome: fail('divergent', { nodeType: 'integral', reason: 'max-depth-exceeded' }),
    };
  }
  if (Math.abs(delta) <= 15 * eps) {
    return { ok: true, value: left + right + delta / 15 };
  }
  const lRes = adaptiveSimpson(f, a, m, fa, fm, flm.value, left, eps / 2, depth - 1);
  if (!lRes.ok) return lRes;
  const rRes = adaptiveSimpson(f, m, b, fm, fb, frm.value, right, eps / 2, depth - 1);
  if (!rRes.ok) return rRes;
  return { ok: true, value: lRes.value + rRes.value };
}

function integrate(f: Integrand, a: number, b: number): EvalOutcome {
  if (a === b) return value(0);
  const sign = a < b ? 1 : -1;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const flo = evalF(f, lo);
  if (!flo.ok) return flo.outcome;
  const fhi = evalF(f, hi);
  if (!fhi.ok) return fhi.outcome;
  const mid = (lo + hi) / 2;
  const fmid = evalF(f, mid);
  if (!fmid.ok) return fmid.outcome;
  const whole = simpsonRule(f, lo, hi, flo.value, fhi.value, fmid.value);
  const result = adaptiveSimpson(f, lo, hi, flo.value, fhi.value, fmid.value, whole, EPS, MAX_DEPTH);
  if (!result.ok) return result.outcome;
  return value(sign * result.value);
}

function evalIntegral(node: MathNode, ctx: EvalContext): EvalOutcome {
  const n = node as IntegralNode;
  if (n.integralType && n.integralType !== 'int') {
    return fail('unsupported', { nodeType: 'integral', reason: `multidim:${n.integralType}` });
  }
  if (!n.lower || !n.upper || n.lower.length === 0 || n.upper.length === 0) {
    return fail('unsupported', { nodeType: 'integral', reason: 'indefinite-integral' });
  }
  if (!n.differential) {
    return fail('unsupported', { nodeType: 'integral', reason: 'missing-differential' });
  }
  const lo = evalChildSequence(n.lower, ctx);
  if (lo.kind === 'fail') return lo;
  const hi = evalChildSequence(n.upper, ctx);
  if (hi.kind === 'fail') return hi;
  const f: Integrand = (t) => {
    const inner = ctx.withBinding(n.differential, t);
    return evalChildSequence(n.integrand, inner);
  };
  return integrate(f, lo.value, hi.value);
}

/**
 * 합/곱의 하한 패턴 `i = start` 를 인식한다.
 * SumNode.lower 는 [RowNode { children: [Variable, Operator('='), ...startSeq] }] 구조.
 */
type IndexAssignment =
  | { ok: true; variable: string; startSeq: MathNode[] }
  | { ok: false; outcome: EvalOutcome };

function parseIndexAssignment(lower: MathNode[], hostNodeType: 'sum' | 'product'): IndexAssignment {
  const malformed = (reason: string): IndexAssignment => ({
    ok: false,
    outcome: fail('unsupported', { nodeType: hostNodeType, reason }),
  });
  if (lower.length !== 1) return malformed('lower-not-singleton');
  const head = lower[0];
  if (head.type !== 'row') return malformed('lower-not-row');
  const cells = (head as RowNode).children;
  if (cells.length < 3) return malformed('lower-too-short');
  const first = cells[0];
  const second = cells[1];
  if (first.type !== 'variable') return malformed('lower-no-variable');
  if (second.type !== 'operator' || (second as OperatorNode).operator !== '=') {
    return malformed('lower-missing-equals');
  }
  return {
    ok: true,
    variable: (first as VariableNode).name,
    startSeq: cells.slice(2),
  };
}

interface RangeResolution {
  ok: true;
  variable: string;
  start: number;
  end: number;
}
interface RangeFail {
  ok: false;
  outcome: EvalOutcome;
}

function resolveRange(
  lower: MathNode[],
  upper: MathNode[],
  ctx: EvalContext,
  hostNodeType: 'sum' | 'product',
): RangeResolution | RangeFail {
  const idx = parseIndexAssignment(lower, hostNodeType);
  if (!idx.ok) return idx;
  const startOut = evalChildSequence(idx.startSeq, ctx);
  if (startOut.kind === 'fail') return { ok: false, outcome: startOut };
  const endOut = evalChildSequence(upper, ctx);
  if (endOut.kind === 'fail') return { ok: false, outcome: endOut };
  if (!Number.isInteger(startOut.value) || !Number.isInteger(endOut.value)) {
    return {
      ok: false,
      outcome: fail('domain', { nodeType: hostNodeType, reason: 'non-integer-bound' }),
    };
  }
  if (startOut.value > endOut.value) {
    return {
      ok: false,
      outcome: fail('domain', { nodeType: hostNodeType, reason: 'empty-range' }),
    };
  }
  if (endOut.value - startOut.value + 1 > TERM_COUNT_LIMIT) {
    return {
      ok: false,
      outcome: fail('unsupported', { nodeType: hostNodeType, reason: 'term-count-exceeds-limit' }),
    };
  }
  return { ok: true, variable: idx.variable, start: startOut.value, end: endOut.value };
}

function evalSum(node: MathNode, ctx: EvalContext): EvalOutcome {
  const n = node as SumNode;
  const r = resolveRange(n.lower, n.upper, ctx, 'sum');
  if (!r.ok) return r.outcome;
  let acc = 0;
  for (let k = r.start; k <= r.end; k++) {
    const inner = ctx.withBinding(r.variable, k);
    const term = evalChildSequence(n.body, inner);
    if (term.kind === 'fail') return term;
    acc += term.value;
  }
  return value(acc);
}

function evalProduct(node: MathNode, ctx: EvalContext): EvalOutcome {
  const n = node as ProductNode;
  const r = resolveRange(n.lower, n.upper, ctx, 'product');
  if (!r.ok) return r.outcome;
  let acc = 1;
  for (let k = r.start; k <= r.end; k++) {
    const inner = ctx.withBinding(r.variable, k);
    const term = evalChildSequence(n.body, inner);
    if (term.kind === 'fail') return term;
    acc *= term.value;
  }
  return value(acc);
}

let installed = false;

export function installCalculusHandlers(): void {
  if (installed) return;
  installed = true;
  register('integral', evalIntegral);
  register('sum', evalSum);
  register('product', evalProduct);
}
