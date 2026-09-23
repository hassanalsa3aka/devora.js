import path from "node:path";
import type { Connect, ViteDevServer } from "vite";
import {
  matchRoute,
  listRoutePaths,
  generateSitemapXml,
  resolveRenderMode,
  renderCsrShell,
  resolveSecurityHeaders,
  generateNonce,
  readBodyWithLimit,
  PayloadTooLargeError,
  type AuthMode,
  type AppRuntimeConfig,
  type RenderMode,
  type RouteModule,
  type SessionCookieOptions,
} from "@devorajs/core";
import type { SessionsConfig } from "@devorajs/core";
import { createDevSessionOptionsResolver } from "./devSessionOptions.js";
import { REACT_REFRESH_PREAMBLE_VIRTUAL_ID } from "./reactRefreshPreamblePlugin.js";

// See reactRefreshPreamblePlugin.ts's doc comment — "/@id/" is Vite's own
// documented convention for requesting an arbitrary resolved module id
// directly by URL (from HTML, not a JS import specifier Vite's import
// analysis could rewrite for us).
const DEV_PREAMBLE_URL = `/@id/${REACT_REFRESH_PREAMBLE_VIRTUAL_ID}`;

/**
 * The SSR request handler (ROADMAP.md #1): matches a request to a route
 * file, loads it and this app's entry-server.tsx through Vite's SSR module
 * graph, and returns a real HTML response. `renderMode: "ssr"` runs the
 * live per-request path (session/action/loader); `"ssg"`/`"isr"` also
 * render live in dev — dev's whole model is "always fresh", the same
 * reasoning /sitemap.xml is generated fresh per request here rather than
 * once at build time — only a real `devora build && devora start` exercises
 * their actual "rendered once, cached" semantics (see prodRequestHandler.ts).
 * `"csr"` serves a minimal shell + this app's generic csr-client.tsx
 * bootstrap; `"streaming"` isn't implemented (see ROADMAP.md).
 *
 * Also resolves this app's session cookie (ROADMAP.md #2) once per server
 * instance — shared apps get one project-wide cookie, an isolated app gets
 * its own, per §3 — and, if this app opted in (`sitemap: true` in
 * app.config.ts, default false — see ROADMAP.md #7), serves /sitemap.xml,
 * generated from the route tree on every request rather than cached (no
 * build step exists yet to generate it once at build time).
 */
export function createSsrMiddleware(
  vite: ViteDevServer,
  appRoot: string,
  appName: string,
  authMode: AuthMode,
  domain: string,
  sitemapEnabled: boolean,
  appDefaultRenderMode: RenderMode | undefined,
  security: AppRuntimeConfig["security"] | undefined,
  sessions: { projectRoot: string; config: SessionsConfig | undefined }
): Connect.NextHandleFunction {
  const routesDir = path.join(appRoot, "routes");
  const entryServerPath = path.join(appRoot, "entry-server.tsx");
  // Not called at all for a "none"-auth app — resolveSessionCookieOptions
  // (via resolveSecret()) is exactly what throws in production without a
  // configured secret; an app with sessions disabled must never reach that
  // call, not just avoid using its result. See renderRoute.ts's
  // createNoAuthContext() for the ctx a "none" app gets instead.
  const resolveSessionOptions = createDevSessionOptionsResolver(vite, sessions.projectRoot, sessions.config, authMode, appName);

  return async function ssrMiddleware(req, res, next) {
    if (!req.url) return next();
    const url = new URL(req.url, "http://localhost");

    if (url.pathname === "/sitemap.xml") {
      if (!sitemapEnabled) return next(); // opt-in — see ROADMAP.md #7.
      const xml = generateSitemapXml(listRoutePaths(routesDir), domain);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.end(xml);
      return;
    }

    if (url.pathname.startsWith("/@") || url.pathname.includes(".")) {
      // Vite internals (HMR client, source maps) and asset requests — not routes.
      return next();
    }

    const match = matchRoute(routesDir, url.pathname);
    if (!match) return next();

    try {
      const routeModule = (await vite.ssrLoadModule(match.filePath)) as RouteModule;
      const renderMode = resolveRenderMode(routeModule, appDefaultRenderMode);

      if (renderMode === "csr") {
        // No loader, no session — data fetching for a csr page is the
        // component's own job (see csrRoute.ts). Dev serves the route file
        // itself and csr-client.tsx by path, same trick islandsPlugin.ts
        // uses for islands; production resolves real hashed URLs instead.
        const html = renderCsrShell(routeModule, `/@fs/${match.filePath}`, "/csr-client.tsx", DEV_PREAMBLE_URL);
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
        return;
      }

      const entryServer = (await vite.ssrLoadModule(entryServerPath)) as {
        renderRoute: (
          routeModule: RouteModule,
          request: {
            method: string;
            formData?: FormData;
            cookieHeader?: string;
            authorizationHeader?: string | string[];
            params?: Record<string, string>;
            sessionCookieOptions?: SessionCookieOptions;
            islandClientUrl?: string;
            appDefaultRenderMode?: RenderMode;
            devPreambleUrl?: string;
          }
        ) => Promise<{ status: number; html: string; setCookie?: string[]; redirectTo?: string } | null>;
        renderStatic: (
          routeModule: RouteModule,
          opts: { islandClientUrl?: string; params?: Record<string, string>; devPreambleUrl?: string }
        ) => Promise<{ html: string }>;
        renderStreaming: (
          routeModule: RouteModule,
          request: {
            cookieHeader?: string;
            authorizationHeader?: string | string[];
            params?: Record<string, string>;
            sessionCookieOptions?: SessionCookieOptions;
            islandClientUrl?: string;
            devPreambleUrl?: string;
            nonce?: string;
          }
        ) => Promise<{
          status: number;
          setCookie?: string[];
          pipeTo: (
            destination: NodeJS.WritableStream,
            onError?: (error: unknown, phase: "shell" | "boundary") => void
          ) => void;
        } | null>;
      };

      if (renderMode === "streaming") {
        // GET-only, same reasoning as ssg/isr's identical guard just below —
        // see renderStreaming.ts's doc comment for why an action can't
        // coexist with an already-started stream.
        if (routeModule.action) {
          throw new Error(
            `[devora] route "${match.routePath}" is renderMode: "streaming" but exports action — ` +
              `actions never run for streaming routes.`
          );
        }
        // React's own inline Suspense-boundary-patch script needs this
        // response's real CSP nonce (securityHeaders.ts's `addNonceToCsp`
        // doc comment has the full account of the real bug this fixes) —
        // overwrites the CSP the earlier securityHeadersMiddleware already
        // set on `res`, since only *this* render mode needs the nonce and
        // that middleware runs before renderMode is even known.
        const nonce = generateNonce();
        res.setHeader("Content-Security-Policy", resolveSecurityHeaders(security, nonce)["Content-Security-Policy"]!);

        const result = await entryServer.renderStreaming(routeModule, {
          cookieHeader: req.headers.cookie,
          authorizationHeader: req.headers.authorization,
          params: match.params,
          sessionCookieOptions: resolveSessionOptions ? await resolveSessionOptions() : undefined,
          islandClientUrl: "/island-client.tsx",
          devPreambleUrl: DEV_PREAMBLE_URL,
          nonce,
        });
        if (!result) return next(); // shouldn't happen — renderMode was resolved to "streaming" above.

        if (result.setCookie) res.setHeader("Set-Cookie", result.setCookie);
        res.statusCode = result.status;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        result.pipeTo(res, (error, phase) => {
          if (phase === "shell") {
            // Real, previously-undiscovered bug fixed here: this callback
            // used to only console.error() a shell error, with no `phase`
            // even available to branch on — nothing was ever written to
            // `res` (renderStreaming.ts's own doc comment: a shell error
            // means `destination.write` is never called), so the request
            // hung until a client/proxy timeout instead of ever getting a
            // response. `next(error)` is exactly what every other render
            // mode's catch block below already does — Vite's dev error
            // overlay, not a bare console.error with no HTTP response at
            // all.
            vite.ssrFixStacktrace(error as Error);
            next(error);
            return;
          }
          // A post-shell ("boundary") error can't change a response
          // already streaming — this is a reporting hook only
          // (renderStreaming.ts's own doc comment).
          console.error(`[devora] streaming error on "${match.routePath}":`, error);
        });
        return;
      }

      if (renderMode === "ssg" || renderMode === "isr") {
        // Live per-request in dev, on purpose — see this function's doc
        // comment. Guarded the same way buildAppStatic.ts guards the real
        // build: an action export on one of these routes is a mistake, not
        // silently ignored.
        if (routeModule.action) {
          throw new Error(
            `[devora] route "${match.routePath}" is renderMode: "${renderMode}" but exports action — ` +
              `actions never run for ${renderMode} routes.`
          );
        }
        // A dynamic route (`[id].tsx`) needs getStaticParams() only for the
        // real *build* step (buildAppStatic.ts), which has no live request
        // to derive params from. Dev never pre-renders anything — it
        // already has the real params from this actual request
        // (match.params), the same way ssr/csr already do — so there's
        // nothing to reject here (architecture-v2.md §3.6).
        const { html } = await entryServer.renderStatic(routeModule, {
          islandClientUrl: "/island-client.tsx",
          params: match.params,
          devPreambleUrl: DEV_PREAMBLE_URL,
        });
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
        return;
      }

      let formData: FormData | undefined;
      try {
        formData = req.method === "POST" ? await parseFormData(req) : undefined;
      } catch (err) {
        if (err instanceof PayloadTooLargeError) {
          res.statusCode = 413;
          res.end(err.message);
          return;
        }
        throw err;
      }
      const result = await entryServer.renderRoute(routeModule, {
        method: req.method ?? "GET",
        formData,
        cookieHeader: req.headers.cookie,
        authorizationHeader: req.headers.authorization,
        params: match.params,
        sessionCookieOptions: resolveSessionOptions ? await resolveSessionOptions() : undefined,
        // Dev serves any app-root file by path (Vite's own dev middleware) —
        // production resolves a real hashed URL instead, see ROADMAP.md #4.
        islandClientUrl: "/island-client.tsx",
        appDefaultRenderMode,
        devPreambleUrl: DEV_PREAMBLE_URL,
      });

      if (!result) {
        return next(); // shouldn't happen — renderMode was resolved to "ssr" above.
      }

      if (result.setCookie) {
        res.setHeader("Set-Cookie", result.setCookie);
      }
      if (result.redirectTo) {
        res.statusCode = result.status;
        res.setHeader("Location", result.redirectTo);
        res.end();
        return;
      }
      res.statusCode = result.status;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(result.html);
    } catch (err) {
      vite.ssrFixStacktrace(err as Error);
      next(err);
    }
  };
}

async function parseFormData(req: Connect.IncomingMessage): Promise<FormData> {
  const body = (await readBodyWithLimit(req)).toString("utf-8");
  const formData = new FormData();
  // .forEach(), not for-of — see the identical fix + reasoning in
  // packages/core/src/prodRequestHandler.ts.
  new URLSearchParams(body).forEach((value, key) => formData.append(key, value));
  return formData;
}
