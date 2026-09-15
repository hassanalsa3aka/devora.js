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
 *
 * Also demonstrates §3.3's native middleware composition, wrapping the real
 * `cors` package via `fromExpressMiddleware()` — the wrapped middleware
 * itself is defined once in packages/backend/middleware.ts (§3.3.1's
 * governance rule), this route just opts in explicitly.
 *
 * `methods` below is this file's own real bug, closed as part of the Phase
 * 4 security audit's follow-up: without it, the `if (req.method ===
 * "POST")`/`else` shape reads as "GET does one thing, POST does another,"
 * but literally means "POST does one thing, EVERYTHING ELSE (PUT, PATCH,
 * DELETE, ...) falls into the branch written for GET" — the exact
 * fall-through-into-the-wrong-branch shape that made the audit flag this
 * file by name. Declaring `methods` makes `dispatchApiRoute` reject
 * anything else with a real `405` before the handler runs at all, so the
 * `else` branch is now honestly only ever reached by a GET.
 */
import { apiRoute, withMiddleware, CSRF_HEADER_NAME } from "@devorajs/core";
import { allowMarketingOrigin } from "@devorajs/backend/middleware";

const helloHandler = apiRoute((req, ctx) => {
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

export const methods = ["GET", "POST"];
export const handler = withMiddleware(helloHandler, allowMarketingOrigin);
