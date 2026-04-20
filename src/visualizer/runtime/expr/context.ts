/**
 * Context 체인 (설계 §14.4). 단순 `{ parent, locals }` chain.
 * lookup은 locals → parent 순. `let` 스코프·repeat 이터레이터 변수에 사용.
 */

export type Scope = Record<string, unknown>;

export class Context {
  constructor(
    public readonly locals: Scope,
    public readonly parent: Context | null = null,
  ) {}

  lookup(name: string): unknown {
    if (name in this.locals) return this.locals[name];
    if (this.parent) return this.parent.lookup(name);
    return undefined;
  }

  has(name: string): boolean {
    if (name in this.locals) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }

  extend(locals: Scope): Context {
    return new Context(locals, this);
  }
}

export function rootContext(locals: Scope): Context {
  return new Context(locals, null);
}
