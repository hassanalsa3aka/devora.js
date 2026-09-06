import path from "node:path";
import type { Connect, ViteDevServer } from "vite";
import {
  matchRoute,
  listRoutePaths,
  generateSitemapXml,
  resolveSessionCookieOptions,
  resolveRenderMode,
  renderCsrShell,
  type AuthMode,
  type RenderMode,
  type RouteModule,
  type SessionCookieOptions,
} from "@devora/core";

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
  appDefaultRenderMode?: RenderMode
): Connect.NextHandleFunction {
  const routesDir = path.join(appRoot, "routes");
  const entryServerPath = path.join(appRoot, "entry-server.tsx");
  const sessionCookieOptions = resolveSessionCookieOptions(authMode, appName);

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

      if (renderMode === "streaming") {
        return next(); // not implemented — see ROADMAP.md.
      }

      if (renderMode === "csr") {
        // No loader, no session — data fetching for a csr page is the
        // component's own job (see csrRoute.ts). Dev serves the route file
        // itself and csr-client.tsx by path, same trick islandsPlugin.ts
        // uses for islands; production resolves real hashed URLs instead.
        const html = renderCsrShell(routeModule, `/@fs/${match.filePath}`, "/csr-client.tsx");
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
            sessionCookieOptions: SessionCookieOptions;
            islandClientUrl?: string;
            appDefaultRenderMode?: RenderMode;
          }
        ) => Promise<{ status: number; html: string; setCookie?: string[]; redirectTo?: string } | null>;
        renderStatic: (
          routeModule: RouteModule,
          opts: { islandClientUrl?: string }
        ) => Promise<{ html: string }>;
      };

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
        const { html } = await entryServer.renderStatic(routeModule, { islandClientUrl: "/island-client.tsx" });
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
        return;
      }

      const formData = req.method === "POST" ? await parseFormData(req) : undefined;
      const result = await entryServer.renderRoute(routeModule, {
        method: req.method ?? "GET",
        formData,
        cookieHeader: req.headers.cookie,
        sessionCookieOptions,
        // Dev serves any app-root file by path (Vite's own dev middleware) —
        // production resolves a real hashed URL instead, see ROADMAP.md #4.
        islandClientUrl: "/island-client.tsx",
        appDefaultRenderMode,
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
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const body = Buffer.concat(chunks).toString("utf-8");
  const formData = new FormData();
  // .forEach(), not for-of — see the identical fix + reasoning in
  // packages/core/src/prodRequestHandler.ts.
  new URLSearchParams(body).forEach((value, key) => formData.append(key, value));
  return formData;
}
