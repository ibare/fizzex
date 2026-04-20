/**
 * Expression 평가기 (설계 §3.5).
 *
 * Context 체인에서 식별자 해소:
 *   1. ctx.lookup(name)
 *   2. BUILTINS
 *   3. CONSTANTS
 *   4. 미해소 → ExprEvalError
 *
 * 에러 정책 (결정 D5): throw. 상위 런타임이 프레임 스킵 + 콘솔 경고로 복원.
 */

import type jsep from 'jsep';
import type { Context } from './context';
import { BUILTINS, CONSTANTS } from './builtins';
import type { ExprAst } from './parse';

export class ExprEvalError extends Error {
  constructor(message: string, public readonly source?: string) {
    super(source ? `eval error in "${source}": ${message}` : `eval error: ${message}`);
    this.name = 'ExprEvalError';
  }
}

type EvalFn = (node: ExprAst, ctx: Context) => unknown;

// @jsep-plugin/object가 주입하는 노드. jsep 기본 타입에 포함되지 않음.
interface ObjectPropertyNode {
  key: ExprAst;
  value: ExprAst;
  computed: boolean;
  shorthand: boolean;
}
interface ObjectExpressionNode extends jsep.Expression {
  properties: ObjectPropertyNode[];
}

const evaluators: Record<string, EvalFn> = {
  Literal: (node) => (node as jsep.Literal).value,

  Identifier: (node, ctx) => {
    const name = (node as jsep.Identifier).name;
    if (ctx.has(name)) return ctx.lookup(name);
    if (name in BUILTINS) return BUILTINS[name];
    if (name in CONSTANTS) return CONSTANTS[name];
    throw new ExprEvalError(`undefined identifier: ${name}`);
  },

  UnaryExpression: (node, ctx) => {
    const n = node as jsep.UnaryExpression;
    const arg = evalNode(n.argument, ctx);
    switch (n.operator) {
      case '-': return -(arg as number);
      case '+': return +(arg as number);
      case '!': return !arg;
      default: throw new ExprEvalError(`unary op: ${n.operator}`);
    }
  },

  BinaryExpression: (node, ctx) => {
    const n = node as jsep.BinaryExpression;
    const op = n.operator;
    // 단락 평가
    if (op === '&&') return evalNode(n.left, ctx) && evalNode(n.right, ctx);
    if (op === '||') return evalNode(n.left, ctx) || evalNode(n.right, ctx);
    const l = evalNode(n.left, ctx);
    const r = evalNode(n.right, ctx);
    switch (op) {
      case '+': return (l as number) + (r as number);
      case '-': return (l as number) - (r as number);
      case '*': return (l as number) * (r as number);
      case '/': return (l as number) / (r as number);
      case '%': return (l as number) % (r as number);
      case '**': return Math.pow(l as number, r as number);
      case '==': return l === r;
      case '!=': return l !== r;
      case '<': return (l as number) < (r as number);
      case '<=': return (l as number) <= (r as number);
      case '>': return (l as number) > (r as number);
      case '>=': return (l as number) >= (r as number);
      default: throw new ExprEvalError(`binary op: ${op}`);
    }
  },

  LogicalExpression: (node, ctx) => {
    // jsep는 &&/||도 BinaryExpression으로 주지만, 플러그인·버전 차이에 대비.
    const n = node as jsep.BinaryExpression;
    if (n.operator === '&&') return evalNode(n.left, ctx) && evalNode(n.right, ctx);
    if (n.operator === '||') return evalNode(n.left, ctx) || evalNode(n.right, ctx);
    throw new ExprEvalError(`logical op: ${n.operator}`);
  },

  ConditionalExpression: (node, ctx) => {
    const n = node as jsep.ConditionalExpression;
    return evalNode(n.test, ctx) ? evalNode(n.consequent, ctx) : evalNode(n.alternate, ctx);
  },

  MemberExpression: (node, ctx) => {
    const n = node as jsep.MemberExpression;
    const obj = evalNode(n.object, ctx);
    if (obj == null) throw new ExprEvalError('member access on null/undefined');
    const prop = n.computed
      ? (evalNode(n.property, ctx) as string | number)
      : (n.property as jsep.Identifier).name;
    const val = (obj as Record<string | number, unknown>)[prop];
    return typeof val === 'function' ? (val as (...a: unknown[]) => unknown).bind(obj) : val;
  },

  CallExpression: (node, ctx) => {
    const n = node as jsep.CallExpression;
    const callee = evalNode(n.callee, ctx);
    if (typeof callee !== 'function') {
      throw new ExprEvalError(`not callable: ${n.callee.type}`);
    }
    const args = n.arguments.map((a) => evalNode(a, ctx));
    return (callee as (...a: unknown[]) => unknown)(...args);
  },

  ArrayExpression: (node, ctx) => {
    const n = node as jsep.ArrayExpression;
    return n.elements.map((e) => (e ? evalNode(e, ctx) : null));
  },

  ObjectExpression: (node, ctx) => {
    const n = node as ObjectExpressionNode;
    const obj: Record<string, unknown> = {};
    for (const p of n.properties) {
      const key = p.computed
        ? String(evalNode(p.key, ctx))
        : p.key.type === 'Identifier'
          ? (p.key as jsep.Identifier).name
          : String((p.key as jsep.Literal).value);
      obj[key] = evalNode(p.value, ctx);
    }
    return obj;
  },

  Compound: (node, ctx) => {
    const n = node as jsep.Compound;
    let last: unknown;
    for (const e of n.body) last = evalNode(e, ctx);
    return last;
  },
};

export function evalNode(node: ExprAst, ctx: Context): unknown {
  const fn = evaluators[node.type];
  if (!fn) throw new ExprEvalError(`unsupported node: ${node.type}`);
  return fn(node, ctx);
}

export function evalNumber(node: ExprAst, ctx: Context): number {
  const v = evalNode(node, ctx);
  if (typeof v !== 'number') {
    throw new ExprEvalError(`number expected, got ${typeof v}`);
  }
  return v;
}
