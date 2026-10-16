import path from "node:path";
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { buildRouteTable, matchInTable, isDynamicRouteFile, resolveStaticRoutePath, type RouteTable } from "./router.js";
import { createStaticFileServer, HTML_CACHE } from "./staticFiles.js";
import { collectSitemapPaths, generateSitemapXml } from "./sitemap.js";
import type { SessionCookieOptions } from "./session.js";
import { createSessionOptionsResolver, readSessionManifest, SESSION_STORE_BUILD_KEY } from "./sessionConfig.js";
import { resolveSecurityHeaders, generateNonce } from "./securityHeaders.js";
import {
  resolveRenderMode,
  type RenderErrorOptions,
  type RenderRouteRequest,
  type RenderRouteResult,
  type RenderStaticOptions,
} from "./renderRoute.js";
import type { RenderStreamingRequest, StreamingRenderResult } from "./renderStreaming.js";
import { HttpError } from "./httpError.js";
import { renderCsrShell } from "./csrRoute.js";
import { readCachedRoute, writeCachedRoute, isStale, cachedRoutePaths } from "./isrCache.js";
import { dispatchApiRoute } from "./apiDispatch.js";
import { readBodyWithLimit, parseFormBody, PayloadTooLargeError, MalformedBodyError, MAX_BODY_BYTES } from "./readBody.js";
import { apiErrorResponse, apiNotFoundResponse, backendStatusFor, jsonMessageResponse } from "./httpError.js";
import { isApiPath } from "./apiRoute.js";
import type { AuthMode, AppRuntimeConfig, RenderMode } from "./config.js";
import type { RouteModule } from "./route.js";
import type { ApiResponse, ApiRouteModule } from "./apiRoute.js";
import { toBuildKey } from "./buildKey.js";
import { requestPathname } from "./fastPathname.js";
import { resolveApiDir } from "./apiDir.js";
import { describeRequest, isHttpsRequest } from "./trustProxy.js";
import { corsResponse, type CorsConfig } from "./cors.js";
import type { HeadConfig } from "./html.js";
import type { ErrorPageModule } from "./route.js";

/** Trailing options for `createProdRequestHandler` — optional so existing
 * generated Vercel/Netlify functions keep working unchanged. */
export interface ProdRequestHandlerOptions {
  /** app.config.ts `apiDir` (default "api") — see apiDir.ts. */
  apiDir?: string;
  /** app.config.ts `trustProxy` — believe `X-Forwarded-Proto` (trustProxy.ts).
   * Default false here; the generated Vercel/Netlify functions pass true
   * unless the app sets it to false. */
  trustProxy?: boolean | number;
  /** app.config.ts `head` — tags for every page's <head> (html.ts). */
  head?: HeadConfig;
  /** app.config.ts `maxBodyBytes` (default 10 MB). */
  maxBodyBytes?: number;
  /** app.config.ts `cors` (API routes only). */
  cors?: CorsConfig;
}


/**
 * Production counterpart to ssrMiddleware.ts (ROADMAP.md #4) — same
 * request-handling shape (route match → session → action → loader →
 * render), but loads pre-built files via plain `import()` instead of
 * `vite.ssrLoadModule`, so it has no dependency on a running Vite dev
 * server. This is what adapter-node boots directly, and what the
 * Vercel/Netlify function wrappers call into.
 *
 * Real constraint, not glossed over: the built server output still expects
 * to run from within the monorepo's own node_modules (workspace packages
 * and react resolve via the existing pnpm-linked node_modules, since Vite's
 * SSR build externalizes them rather than bundling them in). A fully
 * standalone deployable bundle is real adapter work this doesn't do — see
 * docs/history/BUILD-LOG.md #4.
 */
export function createProdRequestHandler(
  appRoot: string,
  appName: string,
  authMode: AuthMode,
  domain: string,
  security: AppRuntimeConfig["security"],
  sitemapEnabled: boolean,
  appDefaultRenderMode?: RenderMode,
  options: ProdRequestHandlerOptions = {}
) {
  const routesDir = path.join(appRoot, "routes");
  const apiDir = resolveApiDir(appRoot, options.apiDir);
  const serverOutDir = path.join(appRoot, "dist", "server");
  const clientOutDir = path.join(appRoot, "dist", "client");
  const staticOutDir = path.join(appRoot, "dist", "static");
  // Not called at all for a "none"-auth app — see the identical comment in
  // ssrMiddleware.ts; this is exactly the call that throws in production
  // without a configured secret (or session store), and a "none" app must
  // never reach it. The store module, if the build bundled one
  // (buildAppServer.ts), is imported on first use — see sessionConfig.ts.
  const resolveSessionOptions =
    authMode === "none"
      ? undefined
      : createSessionOptionsResolver(authMode, appName, readSessionManifest(serverOutDir), () =>
          importBuilt(serverOutDir, SESSION_STORE_BUILD_KEY)
        );
  const trustProxy = options.trustProxy;
  const sessionOptionsForRequest = async (req: IncomingMessage): Promise<SessionCookieOptions | undefined> =>
    resolveSessionOptions ? resolveSessionOptions({ isHttps: isHttpsRequest(req, trustProxy) }) : undefined;
  const warnIfSecureCookieOverHttp = createPlainHttpCookieWarning(appName);
  const securityHeaders = resolveSecurityHeaders(security);
  const securityHeaderEntries = Object.entries(securityHeaders);
  // Written by buildAppServer.ts after the client build (ROADMAP.md #4) —
  // absent (and islandClientUrl undefined) for an app with no islands.
  const islandManifestPath = path.join(serverOutDir, "island-manifest.json");
  const csrManifestPath = path.join(serverOutDir, "csr-route-manifest.json");
  const maxBodyBytes = options.maxBodyBytes ?? MAX_BODY_BYTES;
  const head = options.head;
  // CSS each built page imports (buildAppServer.ts), keyed by build key.
  const routeStyles = readRouteCssManifest(path.join(serverOutDir, ROUTE_CSS_MANIFEST_FILE));
  // A route file's build key never changes, so compute it once per file, not once per request.
  const buildKeys = new Map<string, string>();
  const buildKeyFor = (file: string): string => {
    let key = buildKeys.get(file);
    if (key === undefined) buildKeys.set(file, (key = toBuildKey(appRoot, file)));
    return key;
  };
  const hasEntryServer = existsSync(path.join(serverOutDir, "entry-server.js"));
  const hasErrorPage = existsSync(path.join(serverOutDir, `${ERROR_PAGE_BUILD_KEY}.js`));
  const loadErrorPage = async (): Promise<ErrorPageModule | undefined> =>
    hasErrorPage ? ((await importBuilt(serverOutDir, ERROR_PAGE_BUILD_KEY)) as ErrorPageModule) : undefined;
  const errorPageStyles = routeStyles[ERROR_PAGE_BUILD_KEY];

  /**
   * An HTML error page (the app's error.tsx, or the built-in one) for a page
   * request — a 404 for an unmatched URL, a 413 for an oversized form. Falls
   * back to `false` (the adapter's plain 404) for a backend-only app.
   */
  const sendErrorPage = async (res: ServerResponse, status: number, error?: unknown): Promise<boolean> => {
    if (!hasEntryServer) return false;
    const entryServer = (await importBuilt(serverOutDir, "entry-server")) as EntryServerModule;
    const renderError = entryServer.renderRoute?.renderError;
    res.statusCode = status;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (typeof renderError !== "function") {
      // An entry-server built by an older core has no error renderer.
      res.end(`<!doctype html><title>${status}</title><h1>${status}</h1>`);
      return true;
    }
    res.end(renderError({ status, error, head, errorPage: await loadErrorPage(), errorPageStyles }).html);
    return true;
  };

  // Built once: the route list and every getStaticParams() are fixed for a build.
  let sitemapXml: Promise<string> | undefined;
  // The routes folder is read once, on the first request that needs it, not
  // on every request (matching used to walk the folder per request).
  let routeTable: RouteTable | undefined;
  const matchPageRoute = (urlPath: string) => matchInTable((routeTable ??= buildRouteTable(routesDir)), urlPath);
  let apiTable: RouteTable | undefined;
  // One byte allowance for built files and pre-rendered pages together.
  const staticFiles = createStaticFileServer(clientOutDir);
  const serveClientFile = staticFiles.serve;

  return async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    for (let i = 0; i < securityHeaderEntries.length; i++) res.setHeader(securityHeaderEntries[i]![0], securityHeaderEntries[i]![1]);

    if (!req.url) return false;
    const pathname = requestPathname(req.url);

    // With `sitemap` off this falls through, so a hand-written
    // public/sitemap.xml is served like any other public file.
    if (pathname === "/sitemap.xml" && sitemapEnabled) {
      sitemapXml ??= collectSitemapPaths(routesDir, async (file) => {
        return (await importBuilt(serverOutDir, buildKeyFor(file))) as RouteModule;
      }).then((paths) => generateSitemapXml(paths, domain));
      const xml = await sitemapXml;
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.end(xml);
      return true;
    }

    // Generic API routes (architecture-v2.md §3.2) — matched and dispatched
    // before any page-route/asset handling, same "/api/*" convention and
    // second-call-site reasoning as apiMiddleware.ts (dev's equivalent).
    //
    // Every outcome under /api/** is a JSON response, including "no route
    // matched" (a JSON 404, not `return false` → the adapter's plain 404)
    // and any error (a JSON `{ message }`, not the adapter's generic 500) —
    // docs/history/devora-pre-v3-hotfixes.md #2/#6.
    if (isApiPath(pathname)) {
      const cors = corsResponse(options.cors, req.method ?? "GET", req.headers);
      for (const [name, value] of Object.entries(cors.headers)) res.setHeader(name, value);
      if (cors.preflight) {
        res.statusCode = 204;
        res.end();
        return true;
      }
      const apiMatch = matchInTable((apiTable ??= buildRouteTable(apiDir)), pathname.slice(4) || "/");
      if (!apiMatch) {
        sendApiResponse(res, apiNotFoundResponse());
        return true;
      }

      try {
        const apiBuildKey = buildKeyFor(apiMatch.filePath);
        const apiRouteModule = (await importBuilt(serverOutDir, apiBuildKey)) as ApiRouteModule;
        let body: Buffer;
        try {
          body = req.method === "GET" || req.method === "HEAD" ? Buffer.from("") : await readBodyWithLimit(req, maxBodyBytes);
        } catch (err) {
          if (err instanceof PayloadTooLargeError) {
            sendApiResponse(res, jsonMessageResponse(413, err.message));
            return true;
          }
          throw err;
        }

        const apiResult = await dispatchApiRoute(apiRouteModule, {
          method: req.method ?? "GET",
          url: req.url,
          headers: req.headers,
          cookieHeader: req.headers.cookie,
          params: apiMatch.params,
          sessionCookieOptions: await sessionOptionsForRequest(req),
          body,
          meta: describeRequest(req, trustProxy),
        });

        if (apiResult.setCookie) {
          res.setHeader("Set-Cookie", apiResult.setCookie);
          warnIfSecureCookieOverHttp(req, apiResult.setCookie);
        }
        sendApiResponse(res, apiResult);
      } catch (err) {
        sendApiResponse(res, apiErrorResponse(err));
      }
      return true;
    }

    // Real built client assets for islands/csr (ROADMAP.md #4) — Vite's
    // client build always puts hashed output under assets/, so this prefix
    // gets an aggressive immutable cache (safe — the filename changes if
    // the content does); matched before the generic public-file fallback
    // below purely so it gets that stronger cache header.
    if (pathname.startsWith("/assets/")) {
      return serveClientFile(req, res, pathname, true);
    }

    if (pathname.startsWith("/@")) return false;

    if (pathname.includes(".")) {
      // Any other dotted path (the logo, favicon.ico, robots.txt, etc.) —
      // try serving it as a plain public-dir file. Vite's own dev server
      // already does this automatically for anything under publicDir
      // (apps/*/vite.config.ts); this is production's equivalent, since
      // there's no running Vite dev server to delegate to here. Not
      // content-hashed, so a shorter, non-immutable cache than /assets/.
      //
      // Only a file that exists ends the request here: a dot in a URL is
      // also legal in a route (a catch-all page for /docs/v1.2/intro), so
      // a dotted path that isn't a public file goes on to route matching.
      if (await serveClientFile(req, res, pathname, false)) return true;
    }

    const match = matchPageRoute(pathname);
    if (!match) {
      if (!hasEntryServer && pathname === "/" && (req.method === "GET" || req.method === "HEAD")) {
        sendApiResponse(res, backendStatusFor(appName, req.headers.accept));
        return true;
      }
      return sendErrorPage(res, 404);
    }

    const buildKey = buildKeyFor(match.filePath);
    const routeModule = (await importBuilt(serverOutDir, buildKey)) as RouteModule;
    const renderMode = resolveRenderMode(routeModule, appDefaultRenderMode);
    const styles = routeStyles[buildKey];
    const meta = describeRequest(req, trustProxy);

    if (renderMode === "streaming") {
      if (routeModule.action) {
        throw new Error(
          `[devora] route "${match.routePath}" is renderMode: "streaming" but exports action — ` +
            `actions never run for streaming routes.`
        );
      }
      const entryServer = (await importBuilt(serverOutDir, "entry-server")) as EntryServerModule;
      const islandClientUrl = await readIslandClientUrl(islandManifestPath);
      // React's own inline Suspense-boundary-patch script needs this
      // response's real CSP nonce, in production exactly as much as dev —
      // it's React's own streaming SSR mechanism, not a Vite/HMR artifact
      // (see securityHeaders.ts's `addNonceToCsp` doc comment for the full
      // account). Overwrites the CSP already set unconditionally above.
      const nonce = generateNonce();
      res.setHeader("Content-Security-Policy", resolveSecurityHeaders(security, nonce)["Content-Security-Policy"]!);

      const result = await entryServer.renderStreaming(routeModule, {
        cookieHeader: req.headers.cookie,
        authorizationHeader: req.headers.authorization,
        params: match.params,
        sessionCookieOptions: await sessionOptionsForRequest(req),
        islandClientUrl,
        nonce,
        meta,
        head,
        styles,
        errorPage: await loadErrorPage(),
        errorPageStyles,
      });
      if (!result) return false; // shouldn't happen — renderMode was resolved to "streaming" above.
      if (result.error !== undefined && result.status >= 500) console.error(`[devora] "${appName}" page error:`, result.error);
      if (result.redirectTo) {
        if (result.setCookie) res.setHeader("Set-Cookie", result.setCookie);
        res.statusCode = result.status;
        res.setHeader("Location", result.redirectTo);
        res.end();
        return true;
      }

      if (result.setCookie) {
        res.setHeader("Set-Cookie", result.setCookie);
        warnIfSecureCookieOverHttp(req, result.setCookie);
      }
      res.statusCode = result.status;
      res.setHeader("Content-Type", "text/html; charset=utf-8");

      // Awaited so this function's own promise doesn't resolve until the
      // response is genuinely complete — a real Node ServerResponse (what
      // adapter-node and Vercel's Node runtime both hand this) keeps the
      // underlying connection open regardless, but making the contract
      // explicit here is more honest than relying on that implicitly.
      await new Promise<void>((resolve) => {
        res.once("finish", resolve);
        result.pipeTo(res, (error, phase) => {
          console.error(`[devora] streaming error ("${phase}") on "${match.routePath}":`, error);
          if (phase === "shell" && !res.headersSent) {
            res.statusCode = 500;
            res.end("Internal Server Error");
            resolve();
          }
        });
      });
      return true;
    }

    if (renderMode === "csr") {
      const csrManifest = await readCsrManifest(csrManifestPath);
      const html = renderCsrShell(routeModule, csrManifest.routes[buildKey], csrManifest.csrClientUrl, undefined, {
        appHead: head,
        styles,
      });
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(html);
      return true;
    }

    if (renderMode === "ssg" || renderMode === "isr") {
      if (renderMode === "ssg") {
        // Never regenerated at request time — a missing entry means the
        // build ran before this route existed (or without --app covering
        // it); honest 404 rather than silently rendering something the
        // build step never produced. The page is held in memory (within the
        // shared byte allowance) and re-checked against the disk at most
        // once a second, so a rebuild shows up without a restart.
        const { htmlPath } = cachedRoutePaths(staticOutDir, match.routePath);
        if (await staticFiles.serveFile(req, res, htmlPath, "text/html; charset=utf-8", HTML_CACHE)) return true;
        return sendErrorPage(res, 404);
      }

      let cached = await readCachedRoute(staticOutDir, match.routePath);
      {
        // isr: regenerate synchronously once stale, then serve — simpler
        // and more deterministic than stale-while-revalidate for v1 (see
        // docs/history/BUILD-LOG.md). Only reliable under adapter-node's long-lived
        // process/writable disk — see isrCache.ts.
        //
        // Real, previously-undiscovered bug closed here: for a DYNAMIC
        // route, getStaticParams() (architecture-v2.md §3.6) is a real
        // allowlist at build time — buildAppStatic.ts only ever pre-renders
        // the concrete values it returns. This runtime regeneration branch
        // used to render+cache *any* value matching the route's file
        // pattern, no matter how it got here — an attacker requesting
        // /posts/<anything> would each get a real render permanently
        // written to disk via writeCachedRoute, defeating the allowlist
        // getStaticParams() exists to establish (unbounded disk growth /
        // cache poisoning from arbitrary attacker-chosen param values).
        // `ssg`'s sibling branch above never had this hole, since it
        // already refuses to render anything not already cached.
        if (isDynamicRouteFile(routesDir, match.filePath) && typeof routeModule.getStaticParams === "function") {
          const declaredParams = await routeModule.getStaticParams();
          const allowed = declaredParams.some(
            (params) => resolveStaticRoutePath(routesDir, match.filePath, params) === match.routePath
          );
          if (!allowed) return sendErrorPage(res, 404); // honest 404 — never declared, never rendered.
        }

        const revalidateSeconds = routeModule.revalidate?.seconds;
        if (!cached || (revalidateSeconds !== undefined && isStale(cached.renderedAt, revalidateSeconds))) {
          const entryServer = (await importBuilt(serverOutDir, "entry-server")) as EntryServerModule;
          const islandClientUrl = await readIslandClientUrl(islandManifestPath);
          const { html } = await entryServer.renderStatic(routeModule, {
            islandClientUrl,
            params: match.params,
            url: new URL(match.routePath, meta.url).href,
            head,
            styles,
          });
          await writeCachedRoute(staticOutDir, match.routePath, html);
          cached = { html, renderedAt: Date.now() };
        }
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(cached.html);
      return true;
    }

    const entryServer = (await importBuilt(serverOutDir, "entry-server")) as EntryServerModule;

    const islandClientUrl = await readIslandClientUrl(islandManifestPath);
    let formData: FormData | undefined;
    try {
      formData =
        req.method === "POST"
          ? await parseFormBody(await readBodyWithLimit(req, maxBodyBytes), req.headers["content-type"])
          : undefined;
    } catch (err) {
      if (err instanceof PayloadTooLargeError) return sendErrorPage(res, 413, new HttpError(413, "Request body too large"));
      if (err instanceof MalformedBodyError) return sendErrorPage(res, 400, new HttpError(400, "Malformed form body"));
      throw err;
    }
    const result = await entryServer.renderRoute(routeModule, {
      method: req.method ?? "GET",
      formData,
      cookieHeader: req.headers.cookie,
      authorizationHeader: req.headers.authorization,
      params: match.params,
      sessionCookieOptions: await sessionOptionsForRequest(req),
      islandClientUrl,
      appDefaultRenderMode,
      meta,
      head,
      styles,
      errorPage: await loadErrorPage(),
      errorPageStyles,
    });

    if (!result) return false; // shouldn't happen — renderMode was resolved to "ssr" above.
    if (result.error !== undefined && result.status >= 500) console.error(`[devora] "${appName}" page error:`, result.error);

    if (result.setCookie) {
      res.setHeader("Set-Cookie", result.setCookie);
      warnIfSecureCookieOverHttp(req, result.setCookie);
    }
    if (result.redirectTo) {
      res.statusCode = result.status;
      res.setHeader("Location", result.redirectTo);
      res.end();
      return true;
    }
    res.statusCode = result.status;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(result.html);
    return true;
  };
}

/**
 * Makes the round-3 "every login breaks over plain HTTP" failure visible:
 * browsers silently drop a `Secure` cookie on a plain-HTTP origin (except
 * localhost), so the server looked fine while no login ever stuck. Warns
 * once per app when a Secure cookie goes out on a request that looks like
 * plain HTTP — no TLS socket and no `X-Forwarded-Proto: https`, read here
 * even without trustProxy since it only decides whether to log.
 */
function createPlainHttpCookieWarning(appName: string): (req: IncomingMessage, setCookie: string[]) => void {
  let warned = false;
  return (req, setCookie) => {
    if (warned || !setCookie.some((cookie) => /;\s*Secure\s*(;|$)/i.test(cookie))) return;
    if (isHttpsRequest(req, true)) return;
    const host = (req.headers.host ?? "").toLowerCase().replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
    if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" || host === "::1") return;
    warned = true;
    console.warn(
      `[devora] "${appName}": sent a Secure cookie on what looks like a plain-HTTP request (Host: ${req.headers.host ?? "?"}). ` +
        `Browsers drop Secure cookies over HTTP, so logins here won't stick. Serve the app over HTTPS, or set ` +
        `shared.sessions.cookie.secure in devora.config.ts to "auto" (with trustProxy: true in app.config.ts behind ` +
        `an HTTPS proxy) or false.`
    );
  };
}

function sendApiResponse(res: ServerResponse, result: ApiResponse): void {
  if (result.headers) {
    for (const [name, value] of Object.entries(result.headers)) res.setHeader(name, value);
  }
  res.statusCode = result.status;
  res.end(result.body ?? "");
}

/** Exported for buildAppStatic.ts's ssg/isr build step, which needs the
 * same island-client bootstrap URL a live request would get. */
export async function readIslandClientUrl(manifestPath: string): Promise<string | undefined> {
  if (!existsSync(manifestPath)) return undefined;
  try {
    const raw = await readFile(manifestPath, "utf-8");
    const parsed = JSON.parse(raw) as { islandClientUrl?: string };
    return parsed.islandClientUrl;
  } catch {
    return undefined;
  }
}

interface CsrManifest {
  csrClientUrl?: string;
  routes: Record<string, string>;
}

/** Written by buildAppServer.ts — absent (routes: {}) for an app with no csr routes. */
async function readCsrManifest(manifestPath: string): Promise<CsrManifest> {
  if (!existsSync(manifestPath)) return { routes: {} };
  try {
    const parsed = JSON.parse(await readFile(manifestPath, "utf-8")) as {
      csrClientUrl?: string | null;
      routes?: Record<string, string>;
    };
    return { csrClientUrl: parsed.csrClientUrl ?? undefined, routes: parsed.routes ?? {} };
  } catch {
    return { routes: {} };
  }
}

// serverOutDir -> build key -> the module's import promise. Looked up by the two strings directly,
// so a request does no path joining; the file path is built once, on the first import.
const builtModules = new Map<string, Map<string, Promise<unknown>>>();

/** Node caches the module itself; this skips re-resolving the path and URL on every request. */
function importBuilt(serverOutDir: string, key: string): Promise<unknown> {
  let perDir = builtModules.get(serverOutDir);
  if (!perDir) builtModules.set(serverOutDir, (perDir = new Map()));
  let loaded = perDir.get(key);
  if (!loaded) {
    const modules = perDir;
    loaded = importBuiltUncached(path.join(serverOutDir, `${key}.js`));
    modules.set(key, loaded);
    // A failed import is not remembered, so a fixed file can load later.
    loaded.catch(() => modules.delete(key));
  }
  return loaded;
}

async function importBuiltUncached(filePath: string): Promise<unknown> {
  // @vite-ignore: this only ever runs against real pre-built files at a path
  // computed from the request (production only — dev never calls this),
  // never from unsanitized user input; Vite's static import-analyzer can't
  // trace a runtime-computed specifier and warns about it on every dev-mode
  // transform of this module even though the function itself never executes
  // in dev. Harmless noise otherwise — silencing it here rather than living
  // with the warning on every `devora dev` run.
  const mod = (await import(/* @vite-ignore */ pathToFileURL(filePath).href)) as Record<
    string,
    unknown
  >;
  return unwrapCjsDefaultInterop(mod);
}

/**
 * Works around a real, verified esbuild + Node ESM/CJS interop gap
 * (ROADMAP.md #4): when a module has both a `default` export and named
 * exports, esbuild's CJS output omits `default` from the static hint
 * `cjs-module-lexer` uses to detect named exports for ESM `import()`. Node
 * then falls back to making the *whole* CJS `module.exports` the `.default`
 * — so the real default (a route's component) ends up one level deeper, at
 * `mod.default.default`, while `mod.loader`/`mod.meta`/etc. (correctly
 * hinted) stay at the top level. Confirmed by inspecting the actual bundled
 * output and its resulting import() shape directly, not assumed from the
 * esbuild docs. Only ever triggers for esbuild-CJS-bundled output (the
 * Vercel/Netlify function packaging step) — plain Vite-built ESM (what
 * adapter-node serves) doesn't have this shape at all, so this is a no-op
 * there.
 */
function unwrapCjsDefaultInterop(mod: Record<string, unknown>): unknown {
  const inner = mod.default as Record<string, unknown> | undefined;
  if (inner && typeof mod.default !== "function" && typeof inner.default === "function") {
    return inner;
  }
  return mod;
}

/** Written by buildAppServer.ts: build key → URLs of the CSS that page imports. */
export const ROUTE_CSS_MANIFEST_FILE = "route-css-manifest.json";
/** Build key of the app's error.tsx (buildAppServer.ts). */
export const ERROR_PAGE_BUILD_KEY = "error-page";

function readRouteCssManifest(manifestPath: string): Record<string, string[]> {
  if (!existsSync(manifestPath)) return {};
  try {
    return JSON.parse(readFileSync(manifestPath, "utf-8")) as Record<string, string[]>;
  } catch {
    return {};
  }
}

/** What a built entry-server.js exports (see apps/*\/entry-server.tsx). */
interface EntryServerModule {
  renderRoute: ((routeModule: RouteModule, request: RenderRouteRequest) => Promise<RenderRouteResult | null>) & {
    renderError?: (options: RenderErrorOptions) => { status: number; html: string };
  };
  renderStatic: (routeModule: RouteModule, options: RenderStaticOptions) => Promise<{ html: string }>;
  renderStreaming: (routeModule: RouteModule, request: RenderStreamingRequest) => Promise<StreamingRenderResult | null>;
}
