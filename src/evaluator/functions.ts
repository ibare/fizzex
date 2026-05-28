/**
 * E2 표준 함수 평가자 — FuncNode 디스패치
 *
 * 라디안 고정. 각도 변환은 호스트의 input slot 변환 노드가 담당.
 *
 * 도메인 정책:
 *   ln(x≤0), log(x≤0)            → domain
 *   arcsin/arccos(|x|>1)         → domain
 *   arccosh(x<1)                 → domain
 *   arctanh(|x|≥1)               → domain
 *   sqrt(x<0)                    → domain
 *   tan/cot/sec/csc 특이점        → divergent (dispatch 의 NaN/Infinity 정규화)
 *
 * 미지원 함수명은 `unsupported` 로 정직 신호 — silent-drop 금지.
 */
import type { MathNode, FuncNode } from '../types.js';
import { register } from './registry.js';
import { value, fail, type EvalContext, type EvalOutcome } from './types.js';
import { evalChildSequence } from './arithmetic.js';
import { isDistributionFunction, evalDistributionCall } from './stats.js';

type UnaryFn = (x: number) => EvalOutcome;

function pure(fn: (x: number) => number): UnaryFn {
  return (x) => value(fn(x));
}

function gated(domain: (x: number) => string | null, fn: (x: number) => number): UnaryFn {
  return (x) => {
    const err = domain(x);
    if (err) return fail('domain', { nodeType: 'func', reason: err });
    return value(fn(x));
  };
}

const requirePositive =
  (label: string) =>
  (x: number): string | null =>
    x > 0 ? null : `${label}-non-positive`;

const requireNonNegative =
  (label: string) =>
  (x: number): string | null =>
    x >= 0 ? null : `${label}-negative`;

const requireRange =
  (label: string, lo: number, hi: number, inclusiveLo = true, inclusiveHi = true) =>
  (x: number): string | null => {
    const loOk = inclusiveLo ? x >= lo : x > lo;
    const hiOk = inclusiveHi ? x <= hi : x < hi;
    return loOk && hiOk ? null : `${label}-out-of-range`;
  };

const requireAtLeast =
  (label: string, lo: number) =>
  (x: number): string | null =>
    x >= lo ? null : `${label}-below-${lo}`;

const csc = (x: number) => 1 / Math.sin(x);
const sec = (x: number) => 1 / Math.cos(x);
const cot = (x: number) => 1 / Math.tan(x);

const csch = (x: number) => 1 / Math.sinh(x);
const sech = (x: number) => 1 / Math.cosh(x);
const coth = (x: number) => 1 / Math.tanh(x);

const FUNCTIONS: Readonly<Record<string, UnaryFn>> = {
  // 삼각
  sin: pure(Math.sin),
  cos: pure(Math.cos),
  tan: pure(Math.tan),
  cot: pure(cot),
  sec: pure(sec),
  csc: pure(csc),

  // 역삼각 (라디안 결과)
  asin: gated(requireRange('asin', -1, 1), Math.asin),
  arcsin: gated(requireRange('arcsin', -1, 1), Math.asin),
  acos: gated(requireRange('acos', -1, 1), Math.acos),
  arccos: gated(requireRange('arccos', -1, 1), Math.acos),
  atan: pure(Math.atan),
  arctan: pure(Math.atan),
  acot: pure((x) => Math.atan(1 / x)),
  arccot: pure((x) => Math.atan(1 / x)),

  // 쌍곡
  sinh: pure(Math.sinh),
  cosh: pure(Math.cosh),
  tanh: pure(Math.tanh),
  coth: pure(coth),
  sech: pure(sech),
  csch: pure(csch),

  // 역쌍곡
  asinh: pure(Math.asinh),
  arcsinh: pure(Math.asinh),
  acosh: gated(requireAtLeast('acosh', 1), Math.acosh),
  arccosh: gated(requireAtLeast('arccosh', 1), Math.acosh),
  atanh: gated(requireRange('atanh', -1, 1, false, false), Math.atanh),
  arctanh: gated(requireRange('arctanh', -1, 1, false, false), Math.atanh),

  // 지수/로그
  exp: pure(Math.exp),
  ln: gated(requirePositive('ln'), Math.log),
  log: gated(requirePositive('log'), Math.log10),
  lg: gated(requirePositive('lg'), Math.log10),
  lb: gated(requirePositive('lb'), Math.log2),

  // 기타
  sqrt: gated(requireNonNegative('sqrt'), Math.sqrt),
  abs: pure(Math.abs),
  floor: pure(Math.floor),
  ceil: pure(Math.ceil),
  round: pure(Math.round),
  sign: pure(Math.sign),
  sgn: pure(Math.sign),
};

function evalFunc(node: MathNode, ctx: EvalContext): EvalOutcome {
  const n = node as FuncNode;
  if (isDistributionFunction(n.name)) {
    return evalDistributionCall(n, ctx);
  }
  const fn = FUNCTIONS[n.name];
  if (!fn) {
    return fail('unsupported', { nodeType: 'func', reason: n.name });
  }
  const arg = evalChildSequence(n.argument, ctx);
  if (arg.kind === 'fail') return arg;
  return fn(arg.value);
}

let installed = false;

export function installFunctionHandlers(): void {
  if (installed) return;
  installed = true;
  register('func', evalFunc);
}
