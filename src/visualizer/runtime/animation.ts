/**
 * animation.onFrame 스텝 실행기 (설계 §9).
 *
 * 각 프레임 시작 시점에 `runAnimationFrame(spec, store, rc)`를 호출해
 * onFrame 스텝을 순서대로 평가·대입한다.
 *
 * set 경로: 현재 MVP는 `state.<id>`만 지원. `vars.<name>` 경로는 필요 시 확장.
 * 스텝간 순차 참조: 같은 프레임에서 앞 스텝의 결과를 뒤 스텝이 보고 싶으면
 * rc.exprCtx에 주입된 state 객체 참조가 갱신되어야 하므로, compile 단계에서
 * store 내부 레코드를 exprCtx에 그대로 바인딩한다 (live view).
 */

import { evalExpr, type EvalContext } from './expr/eval-context.js';
import type { AnimationSpec } from './types/state.js';
import type { StateStore } from './state.js';

export function runAnimationFrame(
  spec: AnimationSpec | undefined,
  store: StateStore,
  rc: EvalContext,
): void {
  if (!spec?.onFrame || spec.onFrame.length === 0) return;

  for (const step of spec.onFrame) {
    const dot = step.set.indexOf('.');
    if (dot <= 0) {
      throw new Error(`animation: invalid set path "${step.set}"`);
    }
    const ns = step.set.slice(0, dot);
    const name = step.set.slice(dot + 1);
    if (ns !== 'state') {
      throw new Error(`animation: only "state.<id>" is supported, got "${step.set}"`);
    }

    const value = evalExpr(step.to, rc);
    if (typeof value !== 'number' && typeof value !== 'boolean' && typeof value !== 'string') {
      throw new TypeError(`animation: state.${name} value must be primitive, got ${typeof value}`);
    }
    store.setState(name, value);
  }
}
