/**
 * E0 코어 핸들러 — 컨테이너(root, row), 원자(number, variable)
 *
 * 다중 자식 row/root (예: `x + y`)는 E1 의 산수 평가자가 등록되면서 확장된다.
 * E0 시점에서는 단일 자식 컨테이너만 의미를 가진다.
 */
import type { MathNode, NumberNode, VariableNode, RootNode, RowNode } from '../types.js';
import { register } from './registry.js';
import { value, fail, type EvalContext, type EvalOutcome } from './types.js';
import { normalizeVarName } from './normalize.js';

/**
 * 다중 자식 시퀀스 평가 hook.
 *
 * E0 시점에는 미설정 (단일 자식만 의미). E1 산수 평가자가
 * shunting-yard 기반 시퀀스 평가를 등록한다.
 */
type SequenceEvalFn = (children: MathNode[], ctx: EvalContext) => EvalOutcome;
let sequenceEval: SequenceEvalFn | null = null;

export function setSequenceEvaluator(fn: SequenceEvalFn): void {
  sequenceEval = fn;
}

function evalContainer(node: MathNode, ctx: EvalContext): EvalOutcome {
  const children = (node as RootNode | RowNode).children;
  if (children.length === 0) {
    return fail('unsupported', { nodeType: node.type, reason: 'empty' });
  }
  if (children.length === 1) {
    return ctx.evaluate(children[0]);
  }
  if (sequenceEval) {
    return sequenceEval(children, ctx);
  }
  return fail('unsupported', { nodeType: node.type, reason: 'multi-child-not-registered' });
}

function evalNumber(node: MathNode): EvalOutcome {
  const raw = (node as NumberNode).value;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) {
    return fail('domain', { nodeType: 'number', reason: `cannot parse "${raw}"` });
  }
  return value(n);
}

function evalVariable(node: MathNode, ctx: EvalContext): EvalOutcome {
  const raw = (node as VariableNode).name;
  const canonical = normalizeVarName(raw);
  const direct = ctx.bindings[canonical];
  if (typeof direct === 'number') return value(direct);
  const alias = ctx.bindings[raw];
  if (typeof alias === 'number') return value(alias);
  return fail('unbound', { variable: canonical });
}

let installed = false;

/** core 핸들러를 registry 에 1회 등록한다 (idempotent). */
export function installCoreHandlers(): void {
  if (installed) return;
  installed = true;
  register('root', evalContainer);
  register('row', evalContainer);
  register('number', evalNumber);
  register('variable', evalVariable);
}
