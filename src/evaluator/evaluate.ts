/**
 * 동기 AST evaluator 표면
 *
 *   evaluateSync(ast, bindings) → number | undefined   (핫패스)
 *   evaluate    (ast, bindings) → EvalResult           (콜드패스)
 *
 * - throw 금지. console 호출 금지.
 * - NaN/±Infinity 는 핫패스로 새지 않게 정규화 (E3 에서 dispatch 게이트 강화).
 * - 결정적·순수·재진입 가능.
 */
import type { MathNode } from '../types';
import type { Bindings, EvalContext, EvalOutcome, EvalResult } from './types';
import { lookup } from './registry';
import { installCoreHandlers } from './core';

function dispatch(node: MathNode, ctx: EvalContext): EvalOutcome {
  const fn = lookup(node.type);
  if (!fn) {
    return { kind: 'fail', status: 'unsupported', detail: { nodeType: node.type } };
  }
  const out = fn(node, ctx);
  if (out.kind === 'value' && !Number.isFinite(out.value)) {
    return { kind: 'fail', status: 'divergent', detail: { nodeType: node.type } };
  }
  return out;
}

function makeContext(bindings: Bindings): EvalContext {
  const ctx: EvalContext = {
    bindings,
    evaluate(node) {
      return dispatch(node, ctx);
    },
    withBinding(name, val) {
      return makeContext({ ...bindings, [name]: val });
    },
  };
  return ctx;
}

const EMPTY_BINDINGS: Bindings = Object.freeze({});

export function evaluateSync(node: MathNode, bindings: Bindings = EMPTY_BINDINGS): number | undefined {
  installCoreHandlers();
  const out = dispatch(node, makeContext(bindings));
  return out.kind === 'value' ? out.value : undefined;
}

export function evaluate(node: MathNode, bindings: Bindings = EMPTY_BINDINGS): EvalResult {
  installCoreHandlers();
  const out = dispatch(node, makeContext(bindings));
  if (out.kind === 'value') return { ok: true, value: out.value };
  return { ok: false, status: out.status, detail: out.detail };
}
