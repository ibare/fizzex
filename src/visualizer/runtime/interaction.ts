/**
 * 캔버스 포인터/휠 인터랙션 (설계 §10).
 *
 * pointerdown/move/up/wheel을 캔버스에 부착. hitTest·when 가드를 통과하면
 * do 리스트의 액션을 순서대로 실행. setParam은 store + onParam 콜백을,
 * setState는 store만, pulse는 store.setState(true)를 호출한다.
 *
 * 좌표 변환: event.clientX/Y → canvas.getBoundingClientRect() 기준 로컬 좌표.
 * 이벤트별 Expression 로컬: `event.x`, `event.y`, `event.deltaY`.
 */

import {
  evalExpr,
  evalBoolOr,
  evalNumOr,
  extendEvalContext,
  type EvalContext,
} from './expr/eval-context.js';
import type {
  InteractionSpec,
  GestureKind,
  HitTestSpec,
  InteractionAction,
} from './types/interaction.js';
import type { StateStore } from './state.js';

export interface InteractionController {
  detach(): void;
}

export type ParamSetter = (id: string, value: number) => void;

export function attachInteraction(
  canvas: HTMLCanvasElement,
  spec: InteractionSpec | undefined,
  store: StateStore,
  rcProvider: () => EvalContext,
  onParam?: ParamSetter,
): InteractionController {
  if (!spec?.gestures || spec.gestures.length === 0) {
    return { detach: () => {} };
  }
  const gestures = spec.gestures;

  const toLocal = (e: MouseEvent | PointerEvent | WheelEvent): { x: number; y: number } => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const dispatch = (kind: GestureKind, e: MouseEvent | PointerEvent | WheelEvent): void => {
    const local = toLocal(e);
    const deltaY = e instanceof WheelEvent ? e.deltaY : 0;
    const eventLocals = { event: { x: local.x, y: local.y, deltaY } };
    const rc = extendEvalContext(rcProvider(), eventLocals);

    for (const g of gestures) {
      if (g.kind !== kind) continue;
      if (g.hitTest && !hitTestPass(g.hitTest, local, rc)) continue;
      if (g.when && !evalBoolOr(g.when, rc)) continue;
      runActions(g.do, store, rc, onParam);
      e.preventDefault();
    }
  };

  const hasKind = (k: GestureKind): boolean => gestures.some((g) => g.kind === k);

  let dragging = false;
  const onDown = (e: PointerEvent): void => {
    if (hasKind('drag')) {
      dragging = true;
      canvas.setPointerCapture(e.pointerId);
      dispatch('drag', e);
    }
    if (hasKind('pointer')) dispatch('pointer', e);
  };
  const onMove = (e: PointerEvent): void => {
    if (dragging) dispatch('drag', e);
    if (hasKind('pointer')) dispatch('pointer', e);
  };
  const onUp = (e: PointerEvent): void => {
    if (dragging) {
      dragging = false;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    }
  };
  const onWheel = (e: WheelEvent): void => dispatch('wheel', e);

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  return {
    detach() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
    },
  };
}

function hitTestPass(
  hit: HitTestSpec,
  local: { x: number; y: number },
  rc: EvalContext,
): boolean {
  if ('ref' in hit) {
    // Element id 참조 테이블은 Phase 5 compile에서 구체화. MVP에선 미지원.
    throw new Error(`interaction: hitTest ref "${hit.ref}" not supported in Phase 4`);
  }
  switch (hit.shape) {
    case 'canvas':
      return true;
    case 'rect': {
      const x = evalNumOr(hit.x, rc);
      const y = evalNumOr(hit.y, rc);
      const w = evalNumOr(hit.w, rc);
      const h = evalNumOr(hit.h, rc);
      return local.x >= x && local.x <= x + w && local.y >= y && local.y <= y + h;
    }
    case 'circle': {
      const cx = evalNumOr(hit.cx, rc);
      const cy = evalNumOr(hit.cy, rc);
      const r = evalNumOr(hit.r, rc);
      const dx = local.x - cx;
      const dy = local.y - cy;
      return dx * dx + dy * dy <= r * r;
    }
    default: {
      const _exhaustive: never = hit;
      throw new Error(`interaction: unknown hitTest shape ${JSON.stringify(_exhaustive)}`);
    }
  }
}

function runActions(
  actions: readonly InteractionAction[],
  store: StateStore,
  rc: EvalContext,
  onParam: ParamSetter | undefined,
): void {
  for (const a of actions) {
    if ('setParam' in a) {
      const v = evalExpr(a.to, rc);
      if (typeof v !== 'number') {
        throw new TypeError(`interaction: setParam ${a.setParam} value must be number`);
      }
      store.setParam(a.setParam, v, 'interaction');
      if (onParam) onParam(a.setParam, v);
      continue;
    }
    if ('setState' in a) {
      const v = evalExpr(a.to, rc);
      if (typeof v !== 'number' && typeof v !== 'boolean' && typeof v !== 'string') {
        throw new TypeError(`interaction: setState ${a.setState} value must be primitive`);
      }
      store.setState(a.setState, v);
      continue;
    }
    if ('pulse' in a) {
      store.setState(a.pulse, true);
      continue;
    }
    const _exhaustive: never = a;
    throw new Error(`interaction: unknown action ${JSON.stringify(_exhaustive)}`);
  }
}
