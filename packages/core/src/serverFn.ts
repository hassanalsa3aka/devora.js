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
  /** Values captured from any `[param]` segments in the matched route file's
   * path (router.ts) — empty object for a route with no dynamic segments. */
  params: Record<string, string>;
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
   * Throws if the submitted CSRF value doesn't match the token this browser
   * was actually issued (see session.ts/csrf.ts). Ad hoc per-action, like
   * `requireAuth()` — not framework-injected middleware; a route opts in by
   * calling this itself.
   *
   * Two shapes, for two genuinely different callers: a page's `<form>`
   * submits `FormData` (the field named by `CSRF_FORM_FIELD`, embedded via
   * `CsrfField`); a same-origin API route (module.ts's `apiRoute`) has no
   * form to read from, so it passes the token as a plain `string` instead —
   * typically read off a request header the frontend set explicitly, using
   * the `csrfToken` its own page render already received as a prop. Either
   * way this checks against the *cookie* actually sent on this request, not
   * a client-supplied claim about what the token should be.
   *
   * This does NOT apply to a third-party webhook (a payment provider posting
   * to your API route) — it never received a token or a session cookie in
   * the first place. That needs its own bring-your-own signature/HMAC
   * verification against a provider-issued secret, the same "bring your
   * own" boundary as DB/auth (architecture-v2.md §3.2.2).
   */
  verifyCsrf: (submitted: FormData | string) => void;
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
