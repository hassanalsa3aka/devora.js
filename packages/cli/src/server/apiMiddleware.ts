import type { ServerResponse } from "node:http";
import type { Connect, Plugin } from "vite";
import type { DevModuleHost } from "./devModuleHost.js";
import { parseRequestUrl, sendBadRequest } from "./requestUrl.js";
import {
  matchRoute,
  dispatchApiRoute,
  resolveSecurityHeaders,
  readBodyWithLimit,
  PayloadTooLargeError,
  apiErrorResponse,
  apiNotFoundResponse,
  jsonMessageResponse,
  isApiPath,
  resolveApiDir,
  describeRequest,
  corsResponse,
  PRIVATE_NO_STORE,
  createHostCheck,
  requestHost,
  sendUnknownHost,
  type CorsConfig,
  type AuthMode,
  type AppRuntimeConfig,
  type ApiRouteModule,
  type ApiResponse,
  type SessionManifest,
  type SessionsConfig,
} from "@devorajs/core";
import { createDevSessionOptionsResolver } from "./devSessionOptions.js";

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
export interface ApiMiddlewareOptions {
  appRoot: string;
  appName: string;
  authMode: AuthMode;
  security: AppRuntimeConfig["security"];
  projectRoot: string;
  sessions: SessionsConfig | undefined;
  /** app.config.ts `apiDir` (default "api"). */
  apiDir?: string;
  /** This app's resolved session settings (resolveSessionManifest). */
  sessionManifest?: SessionManifest;
  /** app.config.ts `maxBodyBytes`. */
  maxBodyBytes?: number;
  /** app.config.ts `trustProxy` (for ctx.url/ctx.ip). */
  trustProxy?: boolean | number;
  /** app.config.ts `cors`. */
  cors?: CorsConfig;
}

/**
 * app.config.ts `allowedHosts` in dev: the same 400 as production, plus
 * localhost and loopback addresses, so the production list works unchanged.
 * A plugin registered before the API plugin, so it runs before every other
 * middleware, API routes included.
 */
export function createHostCheckPlugin(allowedHosts: string[] | undefined, trustProxy: boolean | number | undefined): Plugin {
  const hostAllowed = createHostCheck(allowedHosts, { allowLoopback: true });
  return {
    name: "devora-allowed-hosts",
    configureServer(server) {
      if (!hostAllowed) return;
      server.middlewares.use((req, res, next) => {
        if (hostAllowed(requestHost(req, trustProxy))) return next();
        sendUnknownHost(res);
      });
    },
  };
}

/**
 * Vite's `/__open-in-editor` (used by its error overlay) opens any file path it is given in the developer's
 * editor, and answers a plain GET. Any web page the developer visits could fire that request at localhost (an
 * image tag needs no CORS). Red team 2026-11-05, finding H28: a request the browser marks as cross-site or
 * same-site (`Sec-Fetch-Site`), or one whose `Origin` is another origin, gets a 403. The overlay's own
 * same-origin request still works, and so does a request with neither header (curl, an editor plugin).
 */
export function createOpenInEditorGuardPlugin(): Plugin {
  return {
    name: "devora-open-in-editor-guard",
    configureServer(server) {
      server.middlewares.use("/__open-in-editor", (req, res, next) => {
        if (isCrossSiteDevRequest(req.headers)) {
          res.statusCode = 403;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end("Forbidden: cross-site request to the dev server's open-in-editor endpoint");
          return;
        }
        next();
      });
    },
  };
}

/**
 * Finding H34: Vite's HMR WebSocket accepted a client that sent no `Origin` header. Browsers always send one, so only a local
 * non-browser process could connect (it can already read the project files), but there is no reason to let it: an upgrade to the
 * HMR protocol without an Origin is closed before Vite sees it. A browser's upgrade is untouched; the other checks (Host, and
 * Vite's own token) stay where they were.
 */
export function createHmrOriginGuardPlugin(): Plugin {
  return {
    name: "devora-hmr-origin-guard",
    configureServer(server) {
      server.httpServer?.prependListener("upgrade", (req, socket) => {
        if (isHmrUpgradeWithoutOrigin(req.headers)) {
          socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
          socket.destroy();
        }
      });
    },
  };
}

/** True for a WebSocket upgrade that speaks Vite's HMR protocol and carries no `Origin`. */
export function isHmrUpgradeWithoutOrigin(headers: Record<string, string | string[] | undefined>): boolean {
  const protocol = headers["sec-websocket-protocol"];
  const speaksHmr = typeof protocol === "string" && protocol.split(",").some((p) => p.trim().startsWith("vite-"));
  return speaksHmr && (typeof headers.origin !== "string" || headers.origin === "");
}

/** True when the browser says the request came from another site or origin. */
export function isCrossSiteDevRequest(headers: Record<string, string | string[] | undefined>): boolean {
  const site = headers["sec-fetch-site"];
  if (typeof site === "string" && site !== "same-origin" && site !== "none") return true;
  const origin = headers.origin;
  if (typeof origin === "string" && origin !== "null") {
    let originHost: string | undefined;
    try {
      originHost = new URL(origin).host;
    } catch {
      return true;
    }
    return originHost !== headers.host;
  }
  return origin === "null";
}

export function createApiMiddlewarePlugin(options: ApiMiddlewareOptions): Plugin {
  return {
    name: "devora-api-middleware",
    configureServer(server) {
      server.middlewares.use(createApiMiddleware(server, options));
    },
  };
}

export function createApiMiddleware(vite: DevModuleHost, options: ApiMiddlewareOptions): Connect.NextHandleFunction {
  const { appRoot, appName, authMode, security } = options;
  const apiDir = resolveApiDir(appRoot, options.apiDir);
  const resolveSessionOptions = createDevSessionOptionsResolver(
    vite,
    options.projectRoot,
    options.sessions,
    authMode,
    appName,
    options.sessionManifest
  );
  const securityHeaders = resolveSecurityHeaders(security);

  return async function apiMiddleware(req, res, next) {
    if (!req.url) return next();
    const url = parseRequestUrl(req.url);
    if (!url) return sendBadRequest(res);
    if (!isApiPath(url.pathname)) return next();

    for (const [name, value] of Object.entries(securityHeaders)) {
      res.setHeader(name, value);
    }
    const cors = corsResponse(options.cors, req.method ?? "GET", req.headers);
    for (const [name, value] of Object.entries(cors.headers)) res.setHeader(name, value);
    if (cors.preflight) {
      res.statusCode = 204;
      res.end();
      return;
    }

    // Strip the leading "/api" before matching against the app's apiDir —
    // a file at <apiDir>/webhooks/stripe.ts serves /api/webhooks/stripe.
    const match = matchRoute(apiDir, url.pathname.slice(4) || "/");
    // Unmatched /api/** is a JSON 404, never `next()` — falling through is
    // exactly what used to hand API clients Connect's HTML "Cannot GET"
    // page (devora-pre-v3-hotfixes.md #6).
    if (!match) return sendApiResponse(res, apiNotFoundResponse());

    try {
      const routeModule = (await vite.ssrLoadModule(match.filePath)) as ApiRouteModule;
      let body: Buffer;
      try {
        body = req.method === "GET" || req.method === "HEAD" ? Buffer.from("") : await readBodyWithLimit(req, options.maxBodyBytes);
      } catch (err) {
        if (err instanceof PayloadTooLargeError) {
          return sendApiResponse(res, jsonMessageResponse(413, err.message));
        }
        throw err;
      }

      const result = await dispatchApiRoute(routeModule, {
        method: req.method ?? "GET",
        url: req.url,
        headers: req.headers,
        cookieHeader: req.headers.cookie,
        params: match.params,
        sessionCookieOptions: resolveSessionOptions ? await resolveSessionOptions() : undefined,
        body,
        meta: describeRequest(req, options.trustProxy),
      });

      if (result.setCookie) res.setHeader("Set-Cookie", result.setCookie);
      sendApiResponse(res, result, result.noStore);
    } catch (err) {
      // Not `next(err)` — that's Vite's HTML error overlay, the exact
      // response an API client can't parse (devora-pre-v3-hotfixes.md #2).
      // Covers what dispatchApiRoute's own catch can't: a route module
      // that fails to load, a body read error, a missing `handler` export.
      // The stack still gets source-mapped and logged to the terminal.
      vite.ssrFixStacktrace(err as Error);
      sendApiResponse(res, apiErrorResponse(err));
    }
  };
}

/** `noStore` replaces any Cache-Control the handler set (core's PRIVATE_NO_STORE). */
function sendApiResponse(res: ServerResponse, result: ApiResponse, noStore = false): void {
  if (result.headers) {
    for (const [name, value] of Object.entries(result.headers)) res.setHeader(name, value);
  }
  if (noStore) res.setHeader("Cache-Control", PRIVATE_NO_STORE);
  res.statusCode = result.status;
  res.end(result.body ?? "");
}
