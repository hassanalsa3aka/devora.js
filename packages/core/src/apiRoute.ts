/**
 * Generic API routes (architecture-v2.md §3.2) — the v1 gap this closes:
 * `serverFn` was only ever reachable via a page route's `loader`/`action`,
 * so nothing like a payment-provider webhook (`POST /api/webhooks/stripe`)
 * had anywhere to live. An API route is a plain request handler — no
 * `component`, no `meta()`, decoupled from page rendering entirely.
 *
 * File contract: a file under `apps/<name>/api/**` exports a `handler`
 * built with `apiRoute()`, matched by the same file-based router (router.ts)
 * page routes use, just pointed at `api/` instead of `routes/` — so
 * `api/webhooks/stripe.ts` serves `POST /api/webhooks/stripe`,
 * `api/users/[id].ts` serves `/api/users/123` with `ctx.params.id`, same
 * dynamic-segment rules as page routes (no new routing concept).
 *
 * Ownership rule (architecture-v2.md §3.2.1): shared backend logic goes in
 * `packages/backend`, exactly like `serverFn` already does (architecture-v1.md
 * §6) — an app's `api/` file for shared logic just re-exports a handler
 * defined in `packages/backend`. An app-local `api/` file that defines its
 * own handler inline is the exception, for something genuinely app-specific
 * (a webhook only that app receives).
 */
import type { RequestContext } from "./serverFn.js";
import { apiErrorResponse } from "./httpError.js";

export interface ApiRequest {
  method: string;
  /** Full request path + query string (e.g. "/api/users/123?verbose=1"). */
  url: string;
  headers: Record<string, string | string[] | undefined>;
  /** Values captured from any `[param]` segments (router.ts) — empty object
   * for an API route with no dynamic segments. */
  params: Record<string, string>;
  /**
   * Raw request body bytes. Deliberately not pre-parsed as JSON/form data —
   * a webhook's payload has to be verified (HMAC/signature) against its
   * *exact* raw bytes before anything trusts it as JSON, so parsing it here
   * unconditionally would be actively wrong for that case, not just
   * unnecessary. Parse it yourself once you know what you're receiving.
   */
  body: Buffer;
}

export interface ApiResponse {
  status: number;
  headers?: Record<string, string>;
  body?: string | Buffer;
}

export type ApiRouteHandler = (req: ApiRequest, ctx: RequestContext) => Promise<ApiResponse> | ApiResponse;

/** The shape a file under `apps/<name>/api/**` must export. */
export interface ApiRouteModule {
  handler: ApiRouteHandler;
  /**
   * Optional explicit method allowlist (Phase 4 security-audit follow-up).
   * Real footgun this closes: with no framework-level method enforcement
   * at all, every route had to hand-roll its own `if (req.method === ...)`
   * branching with no default-deny — this codebase's own shipped example
   * (`apps/dashboard/api/hello.ts`) demonstrated the resulting mistake: a
   * `PUT`/`PATCH`/`DELETE` fell into an `else` branch meant only for `GET`,
   * silently skipping the CSRF check written for "the POST case." Declaring
   * `methods` here makes `dispatchApiRoute` (apiDispatch.ts) itself reject
   * anything not listed with a real `405`, *before* the handler — and
   * therefore any of its branch logic — ever runs. Deliberately optional
   * and additive, not required: a route with no `methods` field behaves
   * exactly as before (explicit opt-in, same reasoning `sitemap: true`
   * already uses elsewhere in this codebase — no silent behavior change for
   * existing routes).
   */
  methods?: string[];
}

/**
 * Wraps `handler` so an uncaught throw becomes a JSON `{ message }` response
 * (httpError.ts) instead of propagating to the dev server's HTML error
 * overlay (devora-pre-v3-hotfixes.md #2). This used to be a pure identity
 * wrapper (`return handler`) that only existed for type inference, which is
 * what let a thrown error in an `api/**` handler leak HTML to API clients.
 *
 * A thrown `HttpError` (or any error with a numeric 4xx/5xx `status`) keeps
 * its status and message; anything else is a 500 whose message is shown in
 * dev and hidden in production. The dispatcher (apiDispatch.ts) applies the
 * same translation around the whole request too, so a handler that skips
 * `apiRoute()` — or an error thrown by middleware wrapped *outside* it —
 * still never produces HTML; this wrapper just makes the contract hold for
 * the handler itself, wherever it ends up being called from.
 */
export function apiRoute(handler: ApiRouteHandler): ApiRouteHandler {
  return async function apiRouteWithJsonErrors(req, ctx) {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return apiErrorResponse(err);
    }
  };
}

/**
 * Whether a request path belongs to the `api/**` namespace — `/api` itself
 * included, not just `/api/...`: a bare `curl /api` used to slip past a
 * `startsWith("/api/")` check and get an HTML 404 instead of the JSON one
 * (devora-pre-v3-hotfixes.md #6). Shared by dev (apiMiddleware.ts) and
 * production (prodRequestHandler.ts) so the two can't disagree.
 */
export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}
