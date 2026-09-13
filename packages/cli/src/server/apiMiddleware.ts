import path from "node:path";
import type { Connect, Plugin, ViteDevServer } from "vite";
import {
  matchRoute,
  dispatchApiRoute,
  resolveSessionCookieOptions,
  resolveSecurityHeaders,
  type AuthMode,
  type AppRuntimeConfig,
  type ApiRouteModule,
  type SessionCookieOptions,
} from "@devorajs/core";

/**
 * Real, previously-undiscovered dev-mode collision, found wiring this up
 * (not anticipated in advance): `routes/settings.tsx` never collides with
 * Vite's own dev-server file resolution, because the URL (`/settings`)
 * doesn't match a real file at that path *relative to the app root*
 * (`apps/dashboard/settings.ts` doesn't exist — the real file is nested
 * under `routes/`). `api/health.ts` is different on purpose: its whole
 * point is that `/api/health` *is* `<appRoot>/api/health.ts`. That exact
 * match is also what Vite's own internal transform middleware uses to
 * decide "this URL is a source file, serve its transformed source" — and
 * that middleware is installed during `createServer()`, before a plain
 * post-hoc `server.middlewares.use()` call (which is what ssrMiddleware.ts/
 * securityHeadersMiddleware.ts already do, and never needed not to). The
 * fix is `createApiMiddlewarePlugin` below: a real Vite plugin whose
 * `configureServer` hook calls `server.middlewares.use()` *inside* the
 * hook body — Vite's own documented mechanism for running a middleware
 * before its internal ones, instead of after (returning a function from
 * the hook is the "after" variant). Confirmed by curling `/api/health`
 * before this fix and getting back the raw transformed module source
 * (`Content-Type: text/javascript`, no security headers at all) instead of
 * this route's real JSON response — not assumed from reading Vite's docs.
 *
 * Running before Vite's internal middlewares also means running before
 * securityHeadersMiddleware.ts (still registered post-hoc, since it has no
 * such collision to avoid) — so this middleware applies security headers
 * itself, rather than silently losing them for every API response the way
 * the bug above did for the whole response.
 */
export function createApiMiddlewarePlugin(
  appRoot: string,
  appName: string,
  authMode: AuthMode,
  security: AppRuntimeConfig["security"]
): Plugin {
  return {
    name: "devora-api-middleware",
    configureServer(server) {
      server.middlewares.use(createApiMiddleware(server, appRoot, appName, authMode, security));
    },
  };
}

function createApiMiddleware(
  vite: ViteDevServer,
  appRoot: string,
  appName: string,
  authMode: AuthMode,
  security: AppRuntimeConfig["security"]
): Connect.NextHandleFunction {
  const apiDir = path.join(appRoot, "api");
  const sessionCookieOptions: SessionCookieOptions | undefined =
    authMode === "none" ? undefined : resolveSessionCookieOptions(authMode, appName);
  const securityHeaders = resolveSecurityHeaders(security);

  return async function apiMiddleware(req, res, next) {
    if (!req.url) return next();
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/api/")) return next();

    for (const [name, value] of Object.entries(securityHeaders)) {
      res.setHeader(name, value);
    }

    // Strip the leading "/api" before matching against apps/<name>/api/ —
    // a file at api/webhooks/stripe.ts serves /api/webhooks/stripe.
    const match = matchRoute(apiDir, url.pathname.slice(4) || "/");
    if (!match) return next();

    try {
      const routeModule = (await vite.ssrLoadModule(match.filePath)) as ApiRouteModule;
      const body = req.method === "GET" || req.method === "HEAD" ? Buffer.from("") : await readBody(req);

      const result = await dispatchApiRoute(routeModule, {
        method: req.method ?? "GET",
        url: req.url,
        headers: req.headers,
        cookieHeader: req.headers.cookie,
        params: match.params,
        sessionCookieOptions,
        body,
      });

      if (result.setCookie) res.setHeader("Set-Cookie", result.setCookie);
      if (result.headers) {
        for (const [name, value] of Object.entries(result.headers)) res.setHeader(name, value);
      }
      res.statusCode = result.status;
      res.end(result.body ?? "");
    } catch (err) {
      vite.ssrFixStacktrace(err as Error);
      next(err);
    }
  };
}

async function readBody(req: Connect.IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}
