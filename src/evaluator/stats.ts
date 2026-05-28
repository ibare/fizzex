/**
 * E11 통계 분포 평가자
 *
 * 별도 노드 신설 없이 FuncNode 평가의 일부로 통합된다.
 *   `\operatorname{normpdf}(x, μ, σ)` 형태로 호출.
 *
 * 메인 evaluator 의 number 표면 그대로 활용 — pdf/cdf/quantile 결과 모두 scalar.
 *
 * 지원 분포 (1차):
 *   - 정규: normpdf, normcdf, norminv  (모수 μ, σ; σ>0)
 *   - 균등: unifpdf, unifcdf           (모수 a, b; a<b)
 *   - 지수: exppdf, expcdf             (모수 λ; λ>0)
 *   - 이항: binompmf, binomcdf         (모수 n, p; n∈ℕ, 0≤p≤1)
 *   - 푸아송: poisspmf, poisscdf       (모수 λ; λ>0)
 *
 * 인자 분리:
 *   parser 는 콤마를 `NumberNode(value=',')` 로 산출한다. arithmetic.ts
 *   tokenize 가 빈 인자 FuncNode + 다음 ParenNode 를 합성하여 argument
 *   필드에 ParenNode 한 개를 넣어준다. 본 모듈은 그 paren content 안의
 *   콤마로 인자를 split 한다.
 */
import type { MathNode, FuncNode, ParenNode, RowNode, NumberNode } from '../types.js';
import { value, fail, type EvalContext, type EvalOutcome } from './types.js';
import { evalChildSequence } from './arithmetic.js';

const DISTRIBUTION_NAMES: ReadonlySet<string> = new Set([
  'normpdf', 'normcdf', 'norminv',
  'unifpdf', 'unifcdf',
  'exppdf', 'expcdf',
  'binompmf', 'binomcdf',
  'poisspmf', 'poisscdf',
]);

export function isDistributionFunction(name: string): boolean {
  return DISTRIBUTION_NAMES.has(name);
}

/* ─────────────────── 인자 split ─────────────────── */

function unwrapArgumentParen(argument: MathNode[]): MathNode[] | null {
  if (argument.length !== 1) return null;
  const head = argument[0];
  if (head.type !== 'paren') return null;
  const content = (head as ParenNode).content;
  // paren content 는 보통 [RowNode { children }] 로 래핑된다.
  if (content.length === 1 && content[0].type === 'row') {
    return (content[0] as RowNode).children;
  }
  return content;
}

function splitByComma(cells: MathNode[]): MathNode[][] {
  const segments: MathNode[][] = [];
  let current: MathNode[] = [];
  for (const c of cells) {
    if (c.type === 'number' && (c as NumberNode).value === ',') {
      segments.push(current);
      current = [];
      continue;
    }
    current.push(c);
  }
  segments.push(current);
  return segments;
}

function evalArguments(node: FuncNode, ctx: EvalContext): { ok: true; args: number[] } | { ok: false; outcome: EvalOutcome } {
  const cells = unwrapArgumentParen(node.argument);
  if (!cells) {
    return {
      ok: false,
      outcome: fail('unsupported', { nodeType: 'func', reason: `${node.name}-missing-paren-argument` }),
    };
  }
  const segments = splitByComma(cells);
  const args: number[] = [];
  for (const seg of segments) {
    if (seg.length === 0) {
      return {
        ok: false,
        outcome: fail('unsupported', { nodeType: 'func', reason: `${node.name}-empty-argument` }),
      };
    }
    const out = evalChildSequence(seg, ctx);
    if (out.kind === 'fail') return { ok: false, outcome: out };
    args.push(out.value);
  }
  return { ok: true, args };
}

/* ─────────────────── 분포 함수 ─────────────────── */

const SQRT_2PI = Math.sqrt(2 * Math.PI);
const SQRT_2 = Math.SQRT2;

/** erf 근사 — Abramowitz & Stegun 7.1.26, 최대 오차 ≈ 1.5e-7. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

/** 정규 quantile — Peter J. Acklam 알고리즘, 7e-10 정밀도. */
function normInv(p: number): number {
  // 입력: p ∈ (0, 1).
  const aCoef = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const bCoef = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const cCoef = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const dCoef = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number;
  let r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((cCoef[0] * q + cCoef[1]) * q + cCoef[2]) * q + cCoef[3]) * q + cCoef[4]) * q + cCoef[5]) /
      ((((dCoef[0] * q + dCoef[1]) * q + dCoef[2]) * q + dCoef[3]) * q + 1);
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((aCoef[0] * r + aCoef[1]) * r + aCoef[2]) * r + aCoef[3]) * r + aCoef[4]) * r + aCoef[5]) * q /
      (((((bCoef[0] * r + bCoef[1]) * r + bCoef[2]) * r + bCoef[3]) * r + bCoef[4]) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((cCoef[0] * q + cCoef[1]) * q + cCoef[2]) * q + cCoef[3]) * q + cCoef[4]) * q + cCoef[5]) /
    ((((dCoef[0] * q + dCoef[1]) * q + dCoef[2]) * q + dCoef[3]) * q + 1);
}

/** Lanczos log-gamma 근사 (Spouge / Lanczos). */
const LANCZOS_G = 7;
const LANCZOS_C: ReadonlyArray<number> = [
  0.99999999999980993,
  676.5203681218851,
  -1259.1392167224028,
  771.32342877765313,
  -176.61502916214059,
  12.507343278686905,
  -0.13857109526572012,
  9.9843695780195716e-6,
  1.5056327351493116e-7,
];

function lgamma(x: number): number {
  if (x < 0.5) {
    // Reflection: ln Γ(x) = ln π − ln sin(πx) − ln Γ(1−x)
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  }
  const z = x - 1;
  let a = LANCZOS_C[0];
  for (let i = 1; i < LANCZOS_G + 2; i++) {
    a += LANCZOS_C[i] / (z + i);
  }
  const t = z + LANCZOS_G + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

function logBinomCoef(n: number, k: number): number {
  return lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
}

/* 분포 — 각 함수는 인자 검증 후 outcome 반환 */

function evalNormPdf(args: number[]): EvalOutcome {
  if (args.length !== 3) return fail('unsupported', { nodeType: 'func', reason: 'normpdf-arity-3' });
  const [x, mu, sigma] = args;
  if (!(sigma > 0)) return fail('domain', { nodeType: 'func', reason: 'normpdf-sigma-non-positive' });
  const z = (x - mu) / sigma;
  return value(Math.exp(-0.5 * z * z) / (sigma * SQRT_2PI));
}

function evalNormCdf(args: number[]): EvalOutcome {
  if (args.length !== 3) return fail('unsupported', { nodeType: 'func', reason: 'normcdf-arity-3' });
  const [x, mu, sigma] = args;
  if (!(sigma > 0)) return fail('domain', { nodeType: 'func', reason: 'normcdf-sigma-non-positive' });
  return value(0.5 * (1 + erf((x - mu) / (sigma * SQRT_2))));
}

function evalNormInv(args: number[]): EvalOutcome {
  if (args.length !== 3) return fail('unsupported', { nodeType: 'func', reason: 'norminv-arity-3' });
  const [p, mu, sigma] = args;
  if (!(sigma > 0)) return fail('domain', { nodeType: 'func', reason: 'norminv-sigma-non-positive' });
  if (!(p > 0 && p < 1)) return fail('domain', { nodeType: 'func', reason: 'norminv-p-out-of-range' });
  return value(mu + sigma * normInv(p));
}

function evalUnifPdf(args: number[]): EvalOutcome {
  if (args.length !== 3) return fail('unsupported', { nodeType: 'func', reason: 'unifpdf-arity-3' });
  const [x, a, b] = args;
  if (!(a < b)) return fail('domain', { nodeType: 'func', reason: 'unifpdf-a-not-less-than-b' });
  if (x < a || x > b) return value(0);
  return value(1 / (b - a));
}

function evalUnifCdf(args: number[]): EvalOutcome {
  if (args.length !== 3) return fail('unsupported', { nodeType: 'func', reason: 'unifcdf-arity-3' });
  const [x, a, b] = args;
  if (!(a < b)) return fail('domain', { nodeType: 'func', reason: 'unifcdf-a-not-less-than-b' });
  if (x <= a) return value(0);
  if (x >= b) return value(1);
  return value((x - a) / (b - a));
}

function evalExpPdf(args: number[]): EvalOutcome {
  if (args.length !== 2) return fail('unsupported', { nodeType: 'func', reason: 'exppdf-arity-2' });
  const [x, lambda] = args;
  if (!(lambda > 0)) return fail('domain', { nodeType: 'func', reason: 'exppdf-lambda-non-positive' });
  if (x < 0) return value(0);
  return value(lambda * Math.exp(-lambda * x));
}

function evalExpCdf(args: number[]): EvalOutcome {
  if (args.length !== 2) return fail('unsupported', { nodeType: 'func', reason: 'expcdf-arity-2' });
  const [x, lambda] = args;
  if (!(lambda > 0)) return fail('domain', { nodeType: 'func', reason: 'expcdf-lambda-non-positive' });
  if (x < 0) return value(0);
  return value(1 - Math.exp(-lambda * x));
}

function evalBinomPmf(args: number[]): EvalOutcome {
  if (args.length !== 3) return fail('unsupported', { nodeType: 'func', reason: 'binompmf-arity-3' });
  const [kRaw, n, p] = args;
  if (!Number.isInteger(n) || n < 0) return fail('domain', { nodeType: 'func', reason: 'binompmf-n-non-natural' });
  if (!(p >= 0 && p <= 1)) return fail('domain', { nodeType: 'func', reason: 'binompmf-p-out-of-range' });
  if (!Number.isInteger(kRaw)) return fail('domain', { nodeType: 'func', reason: 'binompmf-k-non-integer' });
  const k = kRaw;
  if (k < 0 || k > n) return value(0);
  if (p === 0) return value(k === 0 ? 1 : 0);
  if (p === 1) return value(k === n ? 1 : 0);
  const log = logBinomCoef(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p);
  return value(Math.exp(log));
}

function evalBinomCdf(args: number[]): EvalOutcome {
  if (args.length !== 3) return fail('unsupported', { nodeType: 'func', reason: 'binomcdf-arity-3' });
  const [kRaw, n, p] = args;
  if (!Number.isInteger(n) || n < 0) return fail('domain', { nodeType: 'func', reason: 'binomcdf-n-non-natural' });
  if (!(p >= 0 && p <= 1)) return fail('domain', { nodeType: 'func', reason: 'binomcdf-p-out-of-range' });
  const k = Math.floor(kRaw);
  if (k < 0) return value(0);
  if (k >= n) return value(1);
  let sum = 0;
  for (let i = 0; i <= k; i++) {
    const pmf = evalBinomPmf([i, n, p]);
    if (pmf.kind === 'fail') return pmf;
    sum += pmf.value;
  }
  return value(sum);
}

function evalPoissPmf(args: number[]): EvalOutcome {
  if (args.length !== 2) return fail('unsupported', { nodeType: 'func', reason: 'poisspmf-arity-2' });
  const [kRaw, lambda] = args;
  if (!(lambda > 0)) return fail('domain', { nodeType: 'func', reason: 'poisspmf-lambda-non-positive' });
  if (!Number.isInteger(kRaw)) return fail('domain', { nodeType: 'func', reason: 'poisspmf-k-non-integer' });
  const k = kRaw;
  if (k < 0) return value(0);
  // log-space 안정성
  const log = -lambda + k * Math.log(lambda) - lgamma(k + 1);
  return value(Math.exp(log));
}

function evalPoissCdf(args: number[]): EvalOutcome {
  if (args.length !== 2) return fail('unsupported', { nodeType: 'func', reason: 'poisscdf-arity-2' });
  const [kRaw, lambda] = args;
  if (!(lambda > 0)) return fail('domain', { nodeType: 'func', reason: 'poisscdf-lambda-non-positive' });
  const k = Math.floor(kRaw);
  if (k < 0) return value(0);
  let sum = 0;
  for (let i = 0; i <= k; i++) {
    const pmf = evalPoissPmf([i, lambda]);
    if (pmf.kind === 'fail') return pmf;
    sum += pmf.value;
  }
  return value(sum);
}

type DistFn = (args: number[]) => EvalOutcome;

const DISTRIBUTIONS: Readonly<Record<string, DistFn>> = {
  normpdf: evalNormPdf,
  normcdf: evalNormCdf,
  norminv: evalNormInv,
  unifpdf: evalUnifPdf,
  unifcdf: evalUnifCdf,
  exppdf: evalExpPdf,
  expcdf: evalExpCdf,
  binompmf: evalBinomPmf,
  binomcdf: evalBinomCdf,
  poisspmf: evalPoissPmf,
  poisscdf: evalPoissCdf,
};

export function evalDistributionCall(node: FuncNode, ctx: EvalContext): EvalOutcome {
  const fn = DISTRIBUTIONS[node.name];
  if (!fn) return fail('unsupported', { nodeType: 'func', reason: node.name });
  const argsRes = evalArguments(node, ctx);
  if (!argsRes.ok) return argsRes.outcome;
  return fn(argsRes.args);
}
