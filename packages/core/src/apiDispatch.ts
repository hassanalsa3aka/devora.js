/**
 * Second call site for `createRequestContext`/`createNoAuthContext`
 * (session.ts) — the first and, until now, only one was `renderRoute.ts`'s
 * page-route pipeline. Both were already public from this package's barrel;
 * what was missing was a dispatcher that does renderRoute.ts's other job
 * (pulling cookie header/params off a raw request, building `ctx`, calling
 * a handler, collecting Set-Cookie) for a request that never went through
 * page-route matching. See architecture-v2.md §3.2.3.
 */
import { createRequestContext, createNoAuthContext } from "./session.js";
import type { SessionCookieOptions } from "./session.js";
import type { ApiRequest, ApiResponse, ApiRouteModule } from "./apiRoute.js";
import { apiErrorResponse, jsonMessageResponse } from "./httpError.js";

export interface ApiDispatchRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  cookieHeader?: string;
  /** Values captured from any `[param]` segments the route matched on
   * (router.ts) — empty/absent for an API route with no dynamic segments. */
  params?: Record<string, string>;
  /** Absent for an app with `auth: "none"` — see createNoAuthContext(). */
  sessionCookieOptions?: SessionCookieOptions;
  body: Buffer;
}

export interface ApiDispatchResult extends ApiResponse {
  setCookie?: string[];
}

export async function dispatchApiRoute(
  routeModule: ApiRouteModule,
  request: ApiDispatchRequest
): Promise<ApiDispatchResult> {
  if (typeof routeModule.handler !== "function") {
    throw new Error("[devora] API route has no exported `handler` (see apiRoute.ts)");
  }

  // See ApiRouteModule.methods's doc comment — checked before any session/
  // CSRF work runs, so a method a route never declared can't reach the
  // handler's own branching at all (the real footgun this closes: no
  // silent fall-through into a branch meant for a different method).
  if (routeModule.methods && !routeModule.methods.includes(request.method)) {
    return jsonMessageResponse(405, "Method Not Allowed", { Allow: routeModule.methods.join(", ") });
  }

  const apiReq: ApiRequest = {
    method: request.method,
    url: request.url,
    headers: request.headers,
    params: request.params ?? {},
    body: request.body,
  };

  // Same JSON translation apiRoute() applies (httpError.ts), repeated here
  // as the dispatcher-level chokepoint: a handler exported without
  // apiRoute(), or middleware wrapped outside it, can still throw — and an
  // api/** response must never fall through to an HTML error page
  // (devora-pre-v3-hotfixes.md #2). Set-Cookie is still collected on the
  // error path, so e.g. a freshly-issued CSRF cookie isn't silently lost.
  let getSetCookie: () => string[] | undefined = () => undefined;
  let result: ApiResponse;
  try {
    // Inside the try: the session lookup itself hits the store, and a store
    // that's down must still produce a JSON error, not an HTML one.
    const context = request.sessionCookieOptions
      ? await createRequestContext(
          { cookieHeader: request.cookieHeader, authorizationHeader: request.headers.authorization },
          request.sessionCookieOptions,
          request.params
        )
      : createNoAuthContext(request.params);
    getSetCookie = context.getSetCookie;
    result = await routeModule.handler(apiReq, context.ctx);
    await context.settle();
  } catch (err) {
    result = apiErrorResponse(err);
  }
  return { ...result, setCookie: getSetCookie() };
}
