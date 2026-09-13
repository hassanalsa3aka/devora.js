/**
 * Composable middleware (architecture-v2.md §3.3) — the framework's real,
 * first-class middleware system, not a fallback to the Express/Fastify
 * adapters below. A middleware wraps a handler and decides whether/when to
 * call the next one — plain higher-order functions, no hidden execution
 * order, no registration list to scan: `withMiddleware`'s own argument
 * order *is* the execution order.
 */
import type { ApiRequest, ApiResponse, ApiRouteHandler } from "./apiRoute.js";
import type { RequestContext } from "./serverFn.js";

export type Middleware = (handler: ApiRouteHandler) => ApiRouteHandler;

/**
 * Wraps `handler` with each middleware, left-to-right in the order they run
 * (not the order a `reduce` implementation would naturally nest them) —
 * `withMiddleware(handler, logging, auth)` runs `logging` first, then
 * `auth`, then `handler`, matching how someone reading the call site would
 * expect a request to flow.
 */
export function withMiddleware(handler: ApiRouteHandler, ...middlewares: Middleware[]): ApiRouteHandler {
  return middlewares.reduceRight((wrapped, mw) => mw(wrapped), handler);
}

/**
 * A common middleware shape: run some logic keyed off `ctx` before deciding
 * whether to continue. `defineMiddleware` exists only for the type
 * inference (same role `apiRoute`/`serverFn` play) — it's the same
 * `Middleware` type either way.
 */
export function defineMiddleware(mw: Middleware): Middleware {
  return mw;
}

/**
 * Express/Connect-shaped `(req, res, next)` middleware, adapted into a
 * `Middleware`. Deliberately NOT full Express compatibility (architecture-
 * v2.md §6 rules that out) — this shim supports the common case a real
 * middleware like `cors` actually needs: reading `req.method`/`req.url`/
 * `req.headers`, and calling `res.setHeader`/`res.end` (to short-circuit,
 * e.g. an OPTIONS preflight) or `next()` (to continue). It does NOT provide
 * a real Node stream for the request body, `res.write()` for a chunked
 * response, or any Express-specific req/res extension (`req.query`,
 * `res.json()`, etc.) — a middleware that needs those will not work through
 * this adapter, and should say so loudly (a thrown error) rather than
 * silently misbehave.
 */
export interface ExpressLikeRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
}

export interface ExpressLikeResponse {
  statusCode: number;
  setHeader(name: string, value: string | string[]): void;
  getHeader(name: string): string | string[] | undefined;
  end(chunk?: string): void;
}

export type ExpressMiddleware = (
  req: ExpressLikeRequest,
  res: ExpressLikeResponse,
  next: (err?: unknown) => void
) => void;

export function fromExpressMiddleware(mw: ExpressMiddleware): Middleware {
  return (handler) =>
    async function wrapped(req: ApiRequest, ctx: RequestContext): Promise<ApiResponse> {
      const responseHeaders: Record<string, string> = {};
      let statusCode = 200;
      let shortCircuited: ApiResponse | undefined;

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const settle = (fn: () => void) => {
          if (settled) return; // res.end() and next() are mutually exclusive — first one wins.
          settled = true;
          fn();
        };
        const res: ExpressLikeResponse = {
          get statusCode() {
            return statusCode;
          },
          set statusCode(v: number) {
            statusCode = v;
          },
          setHeader(name, value) {
            responseHeaders[name] = Array.isArray(value) ? value.join(", ") : value;
          },
          getHeader(name) {
            return responseHeaders[name];
          },
          end(chunk) {
            shortCircuited = { status: statusCode, headers: { ...responseHeaders }, body: chunk };
            settle(resolve);
          },
        };
        mw(req, res, (err) => settle(() => (err ? reject(err) : resolve())));
      });

      if (shortCircuited) return shortCircuited;
      const result = await handler(req, ctx);
      return { ...result, headers: { ...responseHeaders, ...(result.headers ?? {}) } };
    };
}
