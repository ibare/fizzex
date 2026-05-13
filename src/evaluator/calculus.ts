/**
 * E6 미적분 평가자 — 정적분 수치 평가 (adaptive Simpson)
 *
 * 본 단계는 1차원 정적분 \int_a^b f(x) dx 만 지원한다.
 * - 부정적분, 다중적분 (iint/iiint), 선적분 (oint) 은 unsupported.
 * - 적분 변수 differential 이 비어있으면 unsupported.
 *
 * 알고리즘: adaptive Simpson 1/3 재귀.
 * - 정밀도 eps = 1e-9, 최대 재귀 깊이 maxDepth = 20.
 * - 분할 [a,b] 의 Simpson 추정 S1 과 [a,m]+[m,b] 의 합 S2 가 |S2-S1|/15 < eps 이면 수렴.
 * - 깊이 초과 시 divergent.
 * - 피적분 평가 실패는 그대로 전파 (도메인/언바운드/미지원).
 */
import type { MathNode, IntegralNode } from '../types';
import { register } from './registry';
import { value, fail, type EvalContext, type EvalOutcome } from './types';
import { evalChildSequence } from './arithmetic';

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

let installed = false;

export function installCalculusHandlers(): void {
  if (installed) return;
  installed = true;
  register('integral', evalIntegral);
}
