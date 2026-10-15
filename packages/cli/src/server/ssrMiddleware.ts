import path from "node:path";
import fs, { existsSync } from "node:fs";
import type { ServerResponse } from "node:http";
import type { Connect, ViteDevServer } from "vite";
import {
  matchRoute,
  collectSitemapPaths,
  generateSitemapXml,
  resolveRenderMode,
  renderCsrShell,
  resolveSecurityHeaders,
  generateNonce,
  readBodyWithLimit,
  parseFormBody,
  describeRequest,
  HttpError,
  PayloadTooLargeError,
  MalformedBodyError,
  MAX_BODY_BYTES,
  type AuthMode,
  type ErrorPageModule,
  type HeadConfig,
  type RenderErrorOptions,
  type RenderRouteRequest,
  type RenderRouteResult,
  type RenderStaticOptions,
  type RenderStreamingRequest,
  type StreamingRenderResult,
  type AppRuntimeConfig,
  type RenderMode,
  type RouteModule,
  type SessionCookieOptions,
} from "@devorajs/core";
import type { SessionManifest, SessionsConfig } from "@devorajs/core";
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
  sessions: { projectRoot: string; config: SessionsConfig | undefined; manifest?: SessionManifest },
  page: { head?: HeadConfig; maxBodyBytes?: number; trustProxy?: boolean | number } = {}
): Connect.NextHandleFunction {
  const routesDir = path.join(appRoot, "routes");
  const entryServerPath = path.join(appRoot, "entry-server.tsx");
  const errorPagePath = ERROR_PAGE_FILES.map((f) => path.join(appRoot, f)).find((f) => existsSync(f));
  const { head, trustProxy } = page;
  const maxBodyBytes = page.maxBodyBytes ?? MAX_BODY_BYTES;
  const loadErrorPage = async (): Promise<ErrorPageModule | undefined> =>
    errorPagePath ? ((await vite.ssrLoadModule(errorPagePath)) as ErrorPageModule) : undefined;
  const errorPageStyles = () => (errorPagePath ? collectCssUrls(vite, errorPagePath) : undefined);

  /** 404/413/400 page for a page request (dev mirror of prodRequestHandler's). */
  const sendErrorPage = async (res: ServerResponse, status: number, error?: unknown): Promise<void> => {
    const entryServer = (await vite.ssrLoadModule(entryServerPath)) as DevEntryServer;
    const renderError = entryServer.renderRoute?.renderError;
    res.statusCode = status;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (typeof renderError !== "function") {
      res.end(`<!doctype html><title>${status}</title><h1>${status}</h1>`);
      return;
    }
    res.end(renderError({ status, error, head, errorPage: await loadErrorPage(), errorPageStyles: errorPageStyles() }).html);
  };
  // Not called at all for a "none"-auth app — resolveSessionCookieOptions
  // (via resolveSecret()) is exactly what throws in production without a
  // configured secret; an app with sessions disabled must never reach that
  // call, not just avoid using its result. See renderRoute.ts's
  // createNoAuthContext() for the ctx a "none" app gets instead.
  const resolveSessionOptions = createDevSessionOptionsResolver(
    vite,
    sessions.projectRoot,
    sessions.config,
    authMode,
    appName,
    sessions.manifest
  );

  /** A page's own error (5xx) still belongs in the terminal, source-mapped. */
  const logPageError = (status: number, error: unknown) => {
    if (error === undefined || status < 500) return;
    if (error instanceof Error) vite.ssrFixStacktrace(error);
    console.error(`[devora] "${appName}" page error:`, error);
  };

  return async function ssrMiddleware(req, res, next) {
    if (!req.url) return next();
    const url = new URL(req.url, "http://localhost");

    if (url.pathname === "/sitemap.xml") {
      if (!sitemapEnabled) return next(); // opt-in — see ROADMAP.md #7.
      const xml = generateSitemapXml(
        await collectSitemapPaths(routesDir, async (file) => (await vite.ssrLoadModule(file)) as RouteModule),
        domain
      );
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.end(xml);
      return;
    }

    if (url.pathname.startsWith("/@") || url.pathname.startsWith("/node_modules/")) {
      // Vite internals (HMR client, source maps) — not routes.
      return next();
    }
    if (url.pathname.includes(".") && isStaticFileRequest(vite, url.pathname)) {
      // A real file Vite serves (public dir, source file) — not a route.
      return next();
    }

    const match = matchRoute(routesDir, url.pathname);
    if (!match) {
      // An unmatched page URL gets the app's 404 page (error.tsx, or the
      // built-in one) — before, it fell through to Vite's bare 404, which
      // also lost the security headers.
      try {
        return await sendErrorPage(res, 404);
      } catch (err) {
        return next(err);
      }
    }

    try {
      const routeModule = (await vite.ssrLoadModule(match.filePath)) as RouteModule;
      const renderMode = resolveRenderMode(routeModule, appDefaultRenderMode);
      // Loaded above, so its CSS imports are in the module graph now.
      const styles = collectCssUrls(vite, match.filePath);
      const meta = describeRequest(req, trustProxy);

      if (renderMode === "csr") {
        // No loader, no session — data fetching for a csr page is the
        // component's own job (see csrRoute.ts). Dev serves the route file
        // itself and csr-client.tsx by path, same trick islandsPlugin.ts
        // uses for islands; production resolves real hashed URLs instead.
        const html = renderCsrShell(routeModule, `/@fs/${match.filePath}`, "/csr-client.tsx", DEV_PREAMBLE_URL, {
          appHead: head,
          styles,
        });
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
        return;
      }

      const entryServer = (await vite.ssrLoadModule(entryServerPath)) as DevEntryServer;
      const errorPage = await loadErrorPage();

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
          meta,
          head,
          styles,
          errorPage,
          errorPageStyles: errorPageStyles(),
        });
        if (!result) return next(); // shouldn't happen — renderMode was resolved to "streaming" above.
        logPageError(result.status, result.error);
        if (result.redirectTo) {
          if (result.setCookie) res.setHeader("Set-Cookie", result.setCookie);
          res.statusCode = result.status;
          res.setHeader("Location", result.redirectTo);
          res.end();
          return;
        }

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
          url: new URL(url.pathname, meta.url).href,
          head,
          styles,
        });
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
        return;
      }

      let formData: FormData | undefined;
      try {
        formData =
          req.method === "POST"
            ? await parseFormBody(await readBodyWithLimit(req, maxBodyBytes), req.headers["content-type"])
            : undefined;
      } catch (err) {
        if (err instanceof PayloadTooLargeError) return await sendErrorPage(res, 413, new HttpError(413, "Request body too large"));
        if (err instanceof MalformedBodyError) return await sendErrorPage(res, 400, new HttpError(400, "Malformed form body"));
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
        meta,
        head,
        styles,
        errorPage,
        errorPageStyles: errorPageStyles(),
      });

      if (!result) {
        return next(); // shouldn't happen — renderMode was resolved to "ssr" above.
      }
      logPageError(result.status, result.error);

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

/** Where an app's custom error page lives (see ErrorPageModule). */
export const ERROR_PAGE_FILES = ["error.tsx", "error.jsx", "error.ts", "error.js"];

const CSS_FILE_RE = /\.(css|scss|sass|less|styl|stylus|pcss|postcss)$/;

/**
 * URLs of every stylesheet `file` imports, directly or through other
 * modules — read from Vite's module graph after the file was loaded, so
 * the SSR'd page can `<link>` them (Vite serves a CSS file requested
 * directly as CSS). `?inline`/`?raw`/`?url` imports are values, not
 * stylesheets, and are skipped.
 */
export function collectCssUrls(vite: ViteDevServer, file: string): string[] {
  const urls: string[] = [];
  const seen = new Set<unknown>();
  type Node = { id: string | null; url: string; importedModules: Set<Node> };
  const visit = (node: Node | undefined) => {
    if (!node || seen.has(node)) return;
    seen.add(node);
    if (node.id && CSS_FILE_RE.test(node.id)) {
      urls.push(node.url);
      return;
    }
    for (const dep of node.importedModules) visit(dep);
  };
  for (const node of vite.moduleGraph.getModulesByFile(file) ?? []) visit(node as unknown as Node);
  return urls;
}

/** What an app's entry-server.tsx exports (loaded through Vite). */
interface DevEntryServer {
  renderRoute: ((routeModule: RouteModule, request: RenderRouteRequest) => Promise<RenderRouteResult | null>) & {
    renderError?: (options: RenderErrorOptions) => { status: number; html: string };
  };
  renderStatic: (routeModule: RouteModule, options: RenderStaticOptions) => Promise<{ html: string }>;
  renderStreaming: (routeModule: RouteModule, request: RenderStreamingRequest) => Promise<StreamingRenderResult | null>;
}

/**
 * A dotted URL is a file request only when a file is really there: in the
 * public dir or under the app root (a source module Vite transforms). Any
 * other dotted URL may be a route, e.g. a catch-all page for /docs/v1.2.
 */
function isStaticFileRequest(vite: ViteDevServer, pathname: string): boolean {
  let rel: string;
  try {
    rel = decodeURIComponent(pathname).replace(/^\/+/, "");
  } catch {
    return false;
  }
  if (rel.split("/").includes("..")) return false;
  const publicDir = vite.config.publicDir;
  const roots = [publicDir, vite.config.root].filter((dir): dir is string => typeof dir === "string" && dir !== "");
  return roots.some((dir) => {
    const full = path.join(dir, rel);
    if (!full.startsWith(dir + path.sep)) return false;
    try {
      return fs.statSync(full).isFile();
    } catch {
      return false;
    }
  });
}
