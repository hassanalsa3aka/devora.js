/**
 * App-local API route (architecture-v2.md §3.2) — the exception case per
 * the ownership rule (3.2.1): genuinely specific to this app, not shared
 * backend logic, so it lives here rather than in packages/backend.
 *
 * Demonstrates the same-origin JSON case from §3.2.2: GET needs only
 * `ctx.requireAuth()`; POST also calls `ctx.verifyCsrf()` with the
 * `x-devora-csrf` header (not FormData — there's no form here) against the
 * token this app's own page already received as a `csrfToken` prop and
 * would send back on this header from client-side JS.
 */
import { apiRoute, CSRF_HEADER_NAME } from "@devorajs/core";

export const handler = apiRoute((req, ctx) => {
  if (req.method === "POST") {
    ctx.requireAuth();
    const csrfHeader = req.headers[CSRF_HEADER_NAME];
    ctx.verifyCsrf(typeof csrfHeader === "string" ? csrfHeader : "");
    return { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
  }

  ctx.requireAuth();
  return {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "hello", session: ctx.session }),
  };
});
