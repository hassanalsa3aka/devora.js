/**
 * CSRF protection (ROADMAP.md's login/logout/CSRF item). This codebase has
 * no middleware/route-protection layer anywhere — every check
 * (`ctx.requireAuth()`) is called ad hoc, inline, by whichever route needs
 * it (see session.ts). CSRF follows the exact same shape: a `ctx` method a
 * route calls explicitly (`ctx.verifyCsrf(formData)`), not framework-
 * injected middleware — the latter would itself be new hidden request
 * handling, in tension with "no hidden caching/magic beyond file-based
 * routing" (CLAUDE.md).
 *
 * This is a double-submit-cookie pattern, but with a twist worth recording:
 * the classic version needs client-side JS to read the cookie and attach it
 * to the request, which forces the cookie to be non-HttpOnly. Here the token
 * is embedded server-side into the rendered form (via renderRoute.ts passing
 * `csrfToken` into the page's props) — no client JS ever reads the cookie at
 * all — so the cookie can stay HttpOnly with no downside, unlike the textbook
 * description of this pattern.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createElement, type ReactElement } from "react";

export const CSRF_COOKIE_NAME = "devora_csrf";
export const CSRF_FORM_FIELD = "_csrf";
/**
 * The header a same-origin API route call (apiRoute.ts) uses instead of a
 * form field — there's no `<form>` to embed a hidden input into, so the
 * frontend reads the `csrfToken` its own page render already received as a
 * prop and sends it back explicitly on this header. `ctx.verifyCsrf()`
 * accepts either shape (serverFn.ts).
 */
export const CSRF_HEADER_NAME = "x-devora-csrf";

export function generateCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * The CSRF token of a signed-in browser: an HMAC of its session ID, keyed with the session secret (and the
 * auth scope, the cookie name, like the store key). A request that arrives with a session cookie is accepted
 * only with this token, so a value planted in the CSRF cookie (from a sibling subdomain, or by someone on a
 * plain-HTTP network) proves nothing: the attacker does not know the session ID or the secret. The input starts
 * with `csrf:` so the result is unrelated to the session's store key, which is an HMAC of `<name>:<id>`.
 * A request without a session cookie still uses the double-submit cookie (a login form has no session yet).
 */
export function deriveSessionCsrfToken(sessionId: string, options: { name: string; secret: string }): string {
  return createHmac("sha256", options.secret).update(`csrf:${options.name}:${sessionId}`).digest("base64url");
}

/**
 * Constant-time comparison, mirroring session.ts's tamper-check pattern —
 * a naive `===` would leak timing information about how much of the token
 * matched.
 */
export function verifyCsrfToken(cookieValue: string | undefined, formValue: FormDataEntryValue | null): boolean {
  if (!cookieValue || typeof formValue !== "string" || !formValue) return false;
  const cookieBuf = Buffer.from(cookieValue);
  const formBuf = Buffer.from(formValue);
  if (cookieBuf.length !== formBuf.length) return false;
  return timingSafeEqual(cookieBuf, formBuf);
}

/** A route renders this inside its `<form>` instead of hand-rolling the hidden input. */
export function CsrfField({ token }: { token?: string }): ReactElement {
  return createElement("input", { type: "hidden", name: CSRF_FORM_FIELD, value: token ?? "" });
}

/** The usual methods that change state. Every other method except the safe ones below is checked too. */
export const CSRF_CHECKED_METHODS: ReadonlySet<string> = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * The only methods never checked. Anything else (POST, PUT, PATCH, DELETE, and also PROPPATCH, PURGE, LINK and the
 * rest that Node's parser accepts) is checked: an API route without a `methods` list runs its handler for any
 * method, and the red team (2026-11-05) reached a handler with a cookie-authenticated PURGE and no token.
 */
export const CSRF_SAFE_METHODS: ReadonlySet<string> = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * The default check (see the module comment): for a request authenticated by
 * the session cookie, with any method but GET, HEAD and OPTIONS, on a route that did not
 * export `csrf = false`, require the token — from the form field, or the
 * `x-devora-csrf` header. Throws the same 403 `ctx.verifyCsrf()` does.
 */
export function verifyCsrfByDefault(options: {
  method: string;
  cookieAuthenticated: boolean;
  optedOut: boolean;
  verifyCsrf: (submitted: FormData | string) => void;
  formData?: FormData;
  headerToken?: string | string[];
}): void {
  if (!options.cookieAuthenticated || options.optedOut || CSRF_SAFE_METHODS.has(options.method.toUpperCase())) return;
  const fromForm = options.formData?.get(CSRF_FORM_FIELD);
  const fromHeader = Array.isArray(options.headerToken) ? options.headerToken[0] : options.headerToken;
  options.verifyCsrf(typeof fromForm === "string" && fromForm ? fromForm : (fromHeader ?? ""));
}
