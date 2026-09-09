import path from "node:path";
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { matchRoute, listRoutePaths } from "./router.js";
import { generateSitemapXml } from "./sitemap.js";
import { resolveSessionCookieOptions } from "./session.js";
import { resolveSecurityHeaders } from "./securityHeaders.js";
import { resolveRenderMode } from "./renderRoute.js";
import { renderCsrShell } from "./csrRoute.js";
import { readCachedRoute, writeCachedRoute, isStale } from "./isrCache.js";
import type { AuthMode, AppRuntimeConfig, RenderMode } from "./config.js";
import type { RouteModule } from "./route.js";
import { toBuildKey } from "./buildKey.js";

const ASSET_CONTENT_TYPES: Record<string, string> = {
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
};

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
 * ROADMAP.md #4.
 */
export function createProdRequestHandler(
  appRoot: string,
  appName: string,
  authMode: AuthMode,
  domain: string,
  security: AppRuntimeConfig["security"],
  sitemapEnabled: boolean,
  appDefaultRenderMode?: RenderMode
) {
  const routesDir = path.join(appRoot, "routes");
  const serverOutDir = path.join(appRoot, "dist", "server");
  const clientOutDir = path.join(appRoot, "dist", "client");
  const staticOutDir = path.join(appRoot, "dist", "static");
  // Not called at all for a "none"-auth app — see the identical comment in
  // ssrMiddleware.ts; this is exactly the call that throws in production
  // without a configured secret, and a "none" app must never reach it.
  const sessionCookieOptions = authMode === "none" ? undefined : resolveSessionCookieOptions(authMode, appName);
  const securityHeaders = resolveSecurityHeaders(security);
  // Written by buildAppServer.ts after the client build (ROADMAP.md #4) —
  // absent (and islandClientUrl undefined) for an app with no islands.
  const islandManifestPath = path.join(serverOutDir, "island-manifest.json");
  const csrManifestPath = path.join(serverOutDir, "csr-route-manifest.json");

  return async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    for (const [name, value] of Object.entries(securityHeaders)) {
      res.setHeader(name, value);
    }

    if (!req.url) return false;
    const url = new URL(req.url, "http://localhost");

    if (url.pathname === "/sitemap.xml") {
      if (!sitemapEnabled) return false;
      const xml = generateSitemapXml(listRoutePaths(routesDir), domain);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.end(xml);
      return true;
    }

    // Real built client assets for islands/csr (ROADMAP.md #4) — Vite's
    // client build always puts hashed output under assets/, so this prefix
    // gets an aggressive immutable cache (safe — the filename changes if
    // the content does); matched before the generic public-file fallback
    // below purely so it gets that stronger cache header.
    if (url.pathname.startsWith("/assets/")) {
      return serveAsset(clientOutDir, url.pathname, res, true);
    }

    if (url.pathname.startsWith("/@")) return false;

    if (url.pathname.includes(".")) {
      // Any other dotted path (the logo, favicon.ico, robots.txt, etc.) —
      // try serving it as a plain public-dir file. Vite's own dev server
      // already does this automatically for anything under publicDir
      // (apps/*/vite.config.ts); this is production's equivalent, since
      // there's no running Vite dev server to delegate to here. Not
      // content-hashed, so a shorter, non-immutable cache than /assets/.
      return serveAsset(clientOutDir, url.pathname, res, false);
    }

    const match = matchRoute(routesDir, url.pathname);
    if (!match) return false;

    const buildKey = toBuildKey(appRoot, match.filePath);
    const routeModule = (await importBuilt(serverOutDir, buildKey)) as RouteModule;
    const renderMode = resolveRenderMode(routeModule, appDefaultRenderMode);

    if (renderMode === "streaming") return false; // not implemented — see ROADMAP.md.

    if (renderMode === "csr") {
      const csrManifest = await readCsrManifest(csrManifestPath);
      const html = renderCsrShell(routeModule, csrManifest.routes[buildKey], csrManifest.csrClientUrl);
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(html);
      return true;
    }

    if (renderMode === "ssg" || renderMode === "isr") {
      let cached = await readCachedRoute(staticOutDir, match.routePath);

      if (renderMode === "ssg") {
        // Never regenerated at request time — a missing entry means the
        // build ran before this route existed (or without --app covering
        // it); honest 404 rather than silently rendering something the
        // build step never produced.
        if (!cached) return false;
      } else {
        // isr: regenerate synchronously once stale, then serve — simpler
        // and more deterministic than stale-while-revalidate for v1 (see
        // ROADMAP.md). Only reliable under adapter-node's long-lived
        // process/writable disk — see isrCache.ts.
        const revalidateSeconds = routeModule.revalidate?.seconds;
        if (!cached || (revalidateSeconds !== undefined && isStale(cached.renderedAt, revalidateSeconds))) {
          const entryServer = (await importBuilt(serverOutDir, "entry-server")) as {
            renderStatic: (routeModule: RouteModule, opts: { islandClientUrl?: string }) => Promise<{ html: string }>;
          };
          const islandClientUrl = await readIslandClientUrl(islandManifestPath);
          const { html } = await entryServer.renderStatic(routeModule, { islandClientUrl });
          await writeCachedRoute(staticOutDir, match.routePath, html);
          cached = { html, renderedAt: Date.now() };
        }
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(cached.html);
      return true;
    }

    const entryServer = (await importBuilt(serverOutDir, "entry-server")) as {
      renderRoute: (
        routeModule: RouteModule,
        request: {
          method: string;
          formData?: FormData;
          cookieHeader?: string;
          params?: Record<string, string>;
          sessionCookieOptions: typeof sessionCookieOptions;
          islandClientUrl?: string;
          appDefaultRenderMode?: RenderMode;
        }
      ) => Promise<{ status: number; html: string; setCookie?: string[]; redirectTo?: string } | null>;
    };

    const islandClientUrl = await readIslandClientUrl(islandManifestPath);
    const formData = req.method === "POST" ? await parseFormData(req) : undefined;
    const result = await entryServer.renderRoute(routeModule, {
      method: req.method ?? "GET",
      formData,
      cookieHeader: req.headers.cookie,
      params: match.params,
      sessionCookieOptions,
      islandClientUrl,
      appDefaultRenderMode,
    });

    if (!result) return false; // shouldn't happen — renderMode was resolved to "ssr" above.

    if (result.setCookie) res.setHeader("Set-Cookie", result.setCookie);
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

async function serveAsset(
  clientOutDir: string,
  pathname: string,
  res: ServerResponse,
  immutable: boolean
): Promise<boolean> {
  const filePath = path.join(clientOutDir, pathname);
  // Reject any path that escapes clientOutDir (e.g. via "..") before touching the filesystem.
  if (!filePath.startsWith(clientOutDir + path.sep)) return false;
  if (!existsSync(filePath)) return false;

  const body = await readFile(filePath);
  const contentType = ASSET_CONTENT_TYPES[path.extname(filePath)] ?? "application/octet-stream";
  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);
  // Hashed filenames (/assets/*) are safe to cache forever; plain public
  // files (logo, favicon, robots.txt) aren't content-hashed, so an update
  // should actually reach visitors within the hour rather than a year.
  res.setHeader(
    "Cache-Control",
    immutable ? "public, max-age=31536000, immutable" : "public, max-age=3600"
  );
  res.end(body);
  return true;
}

async function importBuilt(serverOutDir: string, key: string): Promise<unknown> {
  const filePath = path.join(serverOutDir, `${key}.js`);
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

async function parseFormData(req: IncomingMessage): Promise<FormData> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const body = Buffer.concat(chunks).toString("utf-8");
  const formData = new FormData();
  // .forEach(), not for-of — @types/node's URLSearchParams and the DOM
  // lib's disagree on its iterator typing when both are in scope, which a
  // real tsc build (this package never had one before) caught immediately.
  new URLSearchParams(body).forEach((value, key) => formData.append(key, value));
  return formData;
}
