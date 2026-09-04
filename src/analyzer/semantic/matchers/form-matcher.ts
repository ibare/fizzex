/**
 * 형식 템플릿 유니피케이션.
 *
 * 템플릿도 대상도 같은 IR(`analyzer/canonical`)로 정규화되므로 별도 패턴 타입이
 * 없다. 슬롯으로 선언된 심볼은 메타변수, `free` 로 선언된 심볼은 임의 기호,
 * 나머지는 전부 리터럴이다.
 *
 * 결과는 **점수가 아니라 불리언 + 바인딩**이다. 임계값도 튜닝도 없다.
 *
 * 순수 함수만 둔다 — 컴파일 캐시는 호출 측(로더)이 소유한다.
 */

import type { FormEntry } from '../types.js';
import {
  type ExprNode,
  canonicalKey,
  num,
} from '../../canonical/expr.js';
import type { NormalizedExpr } from '../../canonical/from-ast.js';
import { symKey } from '../../canonical/polynomial.js';
import { normalizeVarName } from '../../../evaluator/normalize.js';

/** AC 노드당 백트래킹 폭 상한. 초과하면 데이터가 잘못된 것이다. */
const MAX_AC_ARGS = 8;

// ─── 컴파일 ───

export interface CompiledShape {
  /** 템플릿 IR. */
  pattern: ExprNode;
  /** IR 심볼 키 → 슬롯 이름. `\omega` 는 `ω` 로, `N_0` 는 `N_0` 로 옮겨진다. */
  slotOf: ReadonlyMap<string, string>;
  /** 자유 기호의 IR 심볼 키. */
  freeKeys: ReadonlySet<string>;
  /** 패턴 쪽 리터럴 노드 수 — 모호성 해소용. */
  literalCount: number;
}

export interface CompiledForm {
  id: string;
  shapes: CompiledShape[];
  /** 대응 항이 없어도 되는 슬롯 이름. */
  optionalSlots: ReadonlySet<string>;
  /** 수식에서 읽는 슬롯 이름. */
  formulaSlots: ReadonlySet<string>;
}

/**
 * 선언 이름을 IR 심볼 키로 옮긴다.
 * 슬롯 이름은 `spec.userBindings` 를 따라 `\omega`·`N_0` 형태인데
 * IR 은 `ω`·`sym{N, sub:'0'}` 이다.
 */
export function declaredSymKey(name: string): string {
  const m = /^(.+?)_(.+)$/.exec(name);
  if (m) return symKey(normalizeVarName(m[1]), m[2]);
  return symKey(normalizeVarName(name));
}

function countLiterals(
  e: ExprNode,
  slotKeys: ReadonlySet<string>,
  freeKeys: ReadonlySet<string>,
): number {
  if (e.kind === 'sym') {
    const k = symKey(e.name, e.sub);
    return slotKeys.has(k) || freeKeys.has(k) ? 0 : 1;
  }
  if (e.kind === 'num') return 1;
  if (e.kind === 'rel') {
    return 1 + countLiterals(e.lhs, slotKeys, freeKeys) + countLiterals(e.rhs, slotKeys, freeKeys);
  }
  if (e.kind === 'app' || e.kind === 'call') {
    return 1 + e.args.reduce((n, a) => n + countLiterals(a, slotKeys, freeKeys), 0);
  }
  return 1 + e.children.reduce((n, c) => n + countLiterals(c, slotKeys, freeKeys), 0);
}

/**
 * 형식을 매칭 가능한 형태로 컴파일한다.
 *
 * 템플릿 파싱은 호출 측이 주입한다 — analyzer 가 latex 파서를 직접 끌어오면
 * 커맨드 레지스트리 전체가 analyzer 번들로 딸려온다.
 */
export function compileForms(
  forms: readonly FormEntry[],
  normalizeLatex: (latex: string) => NormalizedExpr,
): CompiledForm[] {
  const out: CompiledForm[] = [];
  for (const form of forms) {
    const optionalSlots = new Set(form.slots.filter((s) => s.optional).map((s) => s.name));
    const formulaSlots = new Set(
      form.slots.filter((s) => s.source === 'formula').map((s) => s.name),
    );
    const shapes: CompiledShape[] = [];
    for (const shape of form.shapes) {
      let normalized: NormalizedExpr;
      try {
        normalized = normalizeLatex(shape.latex);
      } catch {
        continue; // 데이터 결함은 검증 스크립트가 잡는다. 런타임은 조용히 건너뛴다.
      }
      if (!normalized.ok) continue;
      const slotOf = new Map<string, string>();
      for (const name of shape.slots) slotOf.set(declaredSymKey(name), name);
      const freeKeys = new Set(shape.free.map(declaredSymKey));
      shapes.push({
        pattern: normalized.root,
        slotOf,
        freeKeys,
        literalCount: countLiterals(normalized.root, new Set(slotOf.keys()), freeKeys),
      });
    }
    if (shapes.length > 0) out.push({ id: form.id, shapes, optionalSlots, formulaSlots });
  }
  return out;
}

// ─── 유니피케이션 ───

interface Ctx {
  slotOf: ReadonlyMap<string, string>;
  freeKeys: ReadonlySet<string>;
  optionalSlots: ReadonlySet<string>;
  bindings: Map<string, ExprNode>;
  freeBind: Map<string, ExprNode>;
  defaulted: Set<string>;
}

const cloneCtx = (c: Ctx): Ctx => ({
  ...c,
  bindings: new Map(c.bindings),
  freeBind: new Map(c.freeBind),
  defaulted: new Set(c.defaulted),
});

/** 패턴 안의 슬롯 이름들. */
function slotsIn(p: ExprNode, ctx: Ctx, out: Set<string>): void {
  if (p.kind === 'sym') {
    const s = ctx.slotOf.get(symKey(p.name, p.sub));
    if (s) out.add(s);
    return;
  }
  if (p.kind === 'num') return;
  if (p.kind === 'rel') {
    slotsIn(p.lhs, ctx, out);
    slotsIn(p.rhs, ctx, out);
    return;
  }
  if (p.kind === 'app' || p.kind === 'call') {
    for (const a of p.args) slotsIn(a, ctx, out);
    return;
  }
  for (const c of p.children) slotsIn(c, ctx, out);
}

/**
 * 자명한 항인가 — 맨 슬롯/자유 기호이거나 그것들의 곱.
 *
 * 자명하지 않은 항(리터럴 수·`pow`·`call` 등 구조를 가진 항)은 기본값으로
 * 건너뛸 수 없다. 이 가드가 없으면 `y = 5` 가 이차식 꼴에 매칭된다 —
 * `c=5`, `a`·`b` 는 기본값, `x` 는 어디에도 안 묶인 채로.
 */
function isTrivialTerm(p: ExprNode, ctx: Ctx): boolean {
  if (p.kind === 'sym') {
    const k = symKey(p.name, p.sub);
    return ctx.slotOf.has(k) || ctx.freeKeys.has(k);
  }
  if (p.kind === 'app' && p.op === 'mul') return p.args.every((a) => isTrivialTerm(a, ctx));
  return false;
}

/** 맨 슬롯 심볼이면 그 이름. */
function bareSlot(p: ExprNode, ctx: Ctx): string | null {
  if (p.kind !== 'sym') return null;
  return ctx.slotOf.get(symKey(p.name, p.sub)) ?? null;
}

function bindSlot(ctx: Ctx, slot: string, value: ExprNode): boolean {
  const prev = ctx.bindings.get(slot);
  if (prev) return canonicalKey(prev) === canonicalKey(value);
  ctx.bindings.set(slot, value);
  return true;
}

/**
 * 계속(continuation) — 이 지점까지의 바인딩을 받아 나머지를 시도한다.
 *
 * 불리언만 주고받으면 형제 인자 사이를 되짚을 수 없다. `y - f(a) = f'(a)(x-a)`
 * 처럼 교환법칙 자리에 미지수가 둘 있고 올바른 짝이 식의 다른 곳에서만
 * 결정되는 경우, 좌변에서 잘못 묶고 우변에서 실패해도 좌변을 다시 시도해야
 * 한다.
 */
type Cont = (ctx: Ctx) => boolean;

/** 인자 목록을 순서대로 맞추되, 뒤에서 실패하면 앞으로 되짚는다. */
function unifySeq(
  pats: readonly ExprNode[],
  tgts: readonly ExprNode[],
  i: number,
  ctx: Ctx,
  k: Cont,
): boolean {
  if (i >= pats.length) return k(ctx);
  return unify(pats[i], tgts[i], ctx, (c) => unifySeq(pats, tgts, i + 1, c, k));
}

function unify(pat: ExprNode, tgt: ExprNode, ctx: Ctx, k: Cont): boolean {
  switch (pat.kind) {
    case 'sym': {
      const key = symKey(pat.name, pat.sub);
      const slot = ctx.slotOf.get(key);
      if (slot) {
        const trial = cloneCtx(ctx);
        if (!bindSlot(trial, slot, tgt)) return false;
        return k(trial);
      }
      if (ctx.freeKeys.has(key)) {
        // 자유 기호는 **심볼에만** 묶인다. 임의 서브트리를 받으면
        // `y = (t+1)^2` 가 x=(t+1) 로 이차식에 매칭된다.
        if (tgt.kind !== 'sym') return false;
        const prev = ctx.freeBind.get(key);
        if (prev) return canonicalKey(prev) === canonicalKey(tgt) ? k(ctx) : false;
        const trial = cloneCtx(ctx);
        trial.freeBind.set(key, tgt);
        return k(trial);
      }
      return tgt.kind === 'sym' && symKey(tgt.name, tgt.sub) === key ? k(ctx) : false;
    }

    case 'num':
      return tgt.kind === 'num' && tgt.value === pat.value ? k(ctx) : false;

    case 'rel':
      if (tgt.kind !== 'rel' || tgt.op !== pat.op) return false;
      return unify(pat.lhs, tgt.lhs, ctx, (c) => unify(pat.rhs, tgt.rhs, c, k));

    case 'call':
      if (tgt.kind !== 'call' || tgt.fn !== pat.fn || tgt.args.length !== pat.args.length) {
        return false;
      }
      return unifySeq(pat.args, tgt.args, 0, ctx, k);

    case 'opaque':
      if (
        tgt.kind !== 'opaque' ||
        tgt.tag !== pat.tag ||
        tgt.children.length !== pat.children.length
      ) {
        return false;
      }
      return unifySeq(pat.children, tgt.children, 0, ctx, k);

    case 'app': {
      if (pat.op === 'add' || pat.op === 'mul') return unifyAC(pat.op, pat.args, tgt, ctx, k);
      if (tgt.kind !== 'app' || tgt.op !== pat.op || tgt.args.length !== pat.args.length) {
        return false;
      }
      return unifySeq(pat.args, tgt.args, 0, ctx, k);
    }

    default: {
      const exhaustive: never = pat;
      void exhaustive;
      return false;
    }
  }
}

/**
 * 교환·결합 위치의 다중집합 매칭.
 *
 * 단위 증강 — 대상이 같은 연산의 `app` 이 아니면 1항으로 승격한다.
 * 없으면 `x^2 + 2x - 3` 의 `pow(x,2)` 항이 패턴 `mul(a, pow(x,2))` 에 안 붙어
 * 계수 1 인 이차식이 전부 실패한다. (`pow` 로는 확장하지 않는다 —
 * `1 = 1^2` 승격을 허용하면 `\sin^2θ+\cos^2θ=1` 이 두 제곱의 합에 걸린다.)
 */
function unifyAC(
  op: 'add' | 'mul',
  patArgs: readonly ExprNode[],
  tgt: ExprNode,
  ctx: Ctx,
  k: Cont,
): boolean {
  const tgtArgs = tgt.kind === 'app' && tgt.op === op ? tgt.args : [tgt];
  if (patArgs.length > MAX_AC_ARGS || tgtArgs.length > MAX_AC_ARGS) return false;

  /** 남은 패턴 항을 기본값으로 채우고 잉여 대상 항을 처리한다. */
  const finish = (c: Ctx, used: readonly boolean[], pending: readonly ExprNode[]): boolean => {
    const cur = cloneCtx(c);
    const leftover = tgtArgs.filter((_, i) => !used[i]);
    const stillPending = [...pending];

    // 잉여 대상 항 먼저 — 미배정 맨 슬롯이 흡수한다. 기본값 채우기보다 앞서야
    // 한다. `e^{-\lambda t}` 의 지수는 `mul(λ,t,-1)` 인데 패턴은 `mul(r,t)` 라,
    // r 을 1 로 먼저 채우면 λ·-1 을 받을 슬롯이 사라진다.
    // 덧셈에서는 흡수를 허용하지 않는다 — `y = ax^2+bx+c+dx^3` 가 c 에 dx^3 를
    // 흡수시켜 통과한다.
    if (leftover.length > 0) {
      if (op !== 'mul') return false;
      const idx = stillPending.findIndex((p) => {
        const sl = bareSlot(p, cur);
        return sl !== null && !cur.bindings.has(sl);
      });
      if (idx < 0) return false;
      const slot = bareSlot(stillPending[idx], cur)!;
      stillPending.splice(idx, 1);
      const value =
        leftover.length === 1
          ? leftover[0]
          : { kind: 'app' as const, op: 'mul' as const, args: leftover, src: [] };
      if (!bindSlot(cur, slot, value)) return false;
    }

    for (const p of stillPending) {
      const slots = new Set<string>();
      slotsIn(p, cur, slots);
      if (slots.size === 0) return false;

      if (op === 'mul') {
        // 곱셈 자리의 누락은 언제나 1이다 — `x^2` 는 `a·x^2` 에서 a=1 이다.
        // optional 과 무관하다.
        const slot = bareSlot(p, cur);
        if (!slot) return false;
        if (!bindSlot(cur, slot, num(1))) return false;
        cur.defaulted.add(slot);
        continue;
      }

      // 덧셈 자리의 누락은 항이 통째로 없다는 뜻이라 optional 이어야 한다.
      if (![...slots].every((sl) => cur.optionalSlots.has(sl))) return false;
      // 구조를 가진 항은 건너뛸 수 없다.
      if (!isTrivialTerm(p, cur)) return false;
      for (const sl of slots) {
        if (!bindSlot(cur, sl, num(0))) return false;
        cur.defaulted.add(sl);
      }
    }

    return k(cur);
  };

  /**
   * 패턴 항을 대상 항에 배정한다. `used`/`pending` 을 인자로 넘겨 분기마다
   * 독립시킨다 — 클로저로 공유하면 되짚을 때 상태가 새어 나간다.
   */
  const assign = (
    pi: number,
    c: Ctx,
    used: readonly boolean[],
    pending: readonly ExprNode[],
  ): boolean => {
    if (pi >= patArgs.length) return finish(c, used, pending);
    const p = patArgs[pi];
    // 구조가 똑같은 후보를 먼저 시도한다. `mul(자유t, 슬롯ω)` 대 `mul(k, t)` 는
    // 해가 둘인데, 사용자가 같은 기호를 썼다면 그것이 의도한 대응이다.
    const pk = canonicalKey(p);
    const order = tgtArgs
      .map((_, i) => i)
      .sort((x, y) => {
        const dx = canonicalKey(tgtArgs[x]) === pk ? 0 : 1;
        const dy = canonicalKey(tgtArgs[y]) === pk ? 0 : 1;
        return dx - dy || x - y;
      });
    for (const ti of order) {
      if (used[ti]) continue;
      const nextUsed = [...used];
      nextUsed[ti] = true;
      if (unify(p, tgtArgs[ti], c, (c2) => assign(pi + 1, c2, nextUsed, pending))) return true;
    }
    // 짝을 못 찾았다 — 기본값으로 건너뛸 수 있는지는 finish 가 판정한다.
    return assign(pi + 1, c, used, [...pending, p]);
  };

  return assign(0, ctx, new Array<boolean>(tgtArgs.length).fill(false), []);
}

// ─── 진입점 ───

export interface FormMatch {
  formId: string;
  shapeIndex: number;
  /** 슬롯 이름 → 바인딩된 부분식. */
  bindings: ReadonlyMap<string, ExprNode>;
  /** 기본값으로 채운 슬롯. */
  defaulted: string[];
  /** 패턴 쪽 리터럴 수 — 모호성 해소에 쓰인 값. */
  literalCount: number;
  /** 동률로 밀려난 다른 형식. */
  alternates: string[];
}

function matchShape(
  form: CompiledForm,
  shape: CompiledShape,
  target: ExprNode,
): { bindings: Map<string, ExprNode>; defaulted: string[] } | null {
  const ctx: Ctx = {
    slotOf: shape.slotOf,
    freeKeys: shape.freeKeys,
    optionalSlots: form.optionalSlots,
    bindings: new Map(),
    freeBind: new Map(),
    defaulted: new Set(),
  };
  let result: Ctx | null = null;
  unify(shape.pattern, target, ctx, (c) => {
    result = c;
    return true;
  });
  if (!result) return null;
  const done: Ctx = result;

  // 선언한 자유 기호가 전부 묶여야 한다. `y = 5` 가 이차식에 걸리는 것을 막는
  // 마지막 가드다.
  for (const key of shape.freeKeys) if (!done.freeBind.has(key)) return null;
  // 이 shape 이 요구하는 슬롯이 전부 채워져야 한다.
  for (const slot of shape.slotOf.values()) if (!done.bindings.has(slot)) return null;
  // 기본값만으로 성립한 매칭은 거부한다.
  if (done.defaulted.size === done.bindings.size) return null;

  return { bindings: done.bindings, defaulted: [...done.defaulted].sort() };
}

/**
 * 형식 매칭. 불리언 + 바인딩이며 점수를 내지 않는다.
 *
 * 여러 형식이 매칭되면 패턴 쪽 리터럴 수가 큰 쪽이 이긴다 —
 * `s = v_0 t + \frac{1}{2}at^2` 는 `\frac{1}{2}` 덕에 등가속도 형식이
 * 이차식 형식을 이긴다. 동률이면 기본값을 덜 쓴 쪽. 그래도 동률이면
 * 데이터 버그이며 `alternates` 로 드러난다.
 */
export function matchForm(
  normalized: NormalizedExpr,
  forms: readonly CompiledForm[],
): FormMatch | null {
  if (!normalized.ok || normalized.relationCount >= 2) return null;

  const hits: FormMatch[] = [];
  for (const form of forms) {
    for (let i = 0; i < form.shapes.length; i++) {
      const r = matchShape(form, form.shapes[i], normalized.root);
      if (!r) continue;
      hits.push({
        formId: form.id,
        shapeIndex: i,
        bindings: r.bindings,
        defaulted: r.defaulted,
        literalCount: form.shapes[i].literalCount,
        alternates: [],
      });
      break; // 한 형식당 첫 성공 shape 만
    }
  }
  if (hits.length === 0) return null;

  hits.sort(
    (a, b) =>
      b.literalCount - a.literalCount ||
      a.defaulted.length - b.defaulted.length ||
      (a.formId < b.formId ? -1 : a.formId > b.formId ? 1 : 0),
  );
  const best = hits[0];
  const tied = hits.filter(
    (h) =>
      h !== best &&
      h.literalCount === best.literalCount &&
      h.defaulted.length === best.defaulted.length,
  );
  return { ...best, alternates: tied.map((h) => h.formId) };
}
