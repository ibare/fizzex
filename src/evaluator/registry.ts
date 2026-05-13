/**
 * 노드 타입별 plugin registry
 *
 * 각 단계(E1~E12)는 자신의 핸들러를 `register()`로 등록한다.
 * 등록되지 않은 노드 타입은 evaluator에서 `unsupported` 로 신호된다 — silent-drop 금지.
 */
import type { MathNodeType } from '../types';
import type { EvalFn } from './types';

const registry = new Map<MathNodeType, EvalFn>();

export function register(type: MathNodeType, fn: EvalFn): void {
  registry.set(type, fn);
}

export function lookup(type: MathNodeType): EvalFn | undefined {
  return registry.get(type);
}

export function isRegistered(type: MathNodeType): boolean {
  return registry.has(type);
}

export function registeredTypes(): ReadonlySet<MathNodeType> {
  return new Set(registry.keys());
}
