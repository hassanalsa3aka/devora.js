/**
 * serverFn — the one backend primitive v1 ships (see architecture doc §6).
 *
 * Deliberately NOT a general RPC/codegen system: no dynamic dispatch by
 * string name from client input, no reflection over arbitrary modules.
 * Each serverFn is a plain function reference that gets imported directly
 * by whichever route calls it — the callable surface is exactly the set
 * of functions a developer chose to export, nothing discovered at runtime.
 * This is what "no dynamic eval/require paths reachable from user input"
 * (§7) means in practice for this primitive.
 */

export interface RequestContext {
  /** Throws if there is no authenticated session. Session shape is bring-your-own. */
  requireAuth: () => void;
  /** The current session, if any — undefined when unauthenticated. */
  session: unknown | undefined;
  /**
   * Establishes a session for this response (framework signs/carries it in a
   * cookie — see session.ts). Checking who the caller is stays bring-your-own
   * per §6/§11; this just makes the result of that check persist.
   */
  setSession: (data: unknown) => void;
  /** Clears the current session (logout). */
  clearSession: () => void;
  /**
   * Throws if `formData`'s CSRF field doesn't match the token this browser
   * was actually issued (see session.ts/csrf.ts). Ad hoc per-action, like
   * `requireAuth()` — not framework-injected middleware; a route opts in by
   * calling this itself.
   */
  verifyCsrf: (formData: FormData) => void;
}

export type ServerFn<Input, Output> = (input: Input, ctx: RequestContext) => Promise<Output>;

export function serverFn<Input, Output>(fn: ServerFn<Input, Output>): ServerFn<Input, Output> {
  return fn;
}

/** clientOnly — guarantees no server-side execution for client-only libs (§9). */
export function clientOnly<T>(loader: () => Promise<T>): () => Promise<T> {
  return () => {
    if (typeof window === "undefined") {
      return Promise.resolve(undefined as unknown as T);
    }
    return loader();
  };
}
