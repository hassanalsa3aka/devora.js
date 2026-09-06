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
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createElement } from "react";

export const CSRF_COOKIE_NAME = "devora_csrf";
export const CSRF_FORM_FIELD = "_csrf";

export function generateCsrfToken(): string {
  return randomBytes(32).toString("base64url");
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
export function CsrfField({ token }: { token?: string }): unknown {
  return createElement("input", { type: "hidden", name: CSRF_FORM_FIELD, value: token ?? "" });
}
