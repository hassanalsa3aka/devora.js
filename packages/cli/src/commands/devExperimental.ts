import { loadSekhem } from "../build/loadSekhem.js";
import path from "node:path";
import { parseRequestUrl } from "../server/requestUrl.js";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  backendStatusFor,
  clearStreamingModuleCache,
  resolveSessionManifest,
  runAndClearDisposable,
  SVG_CSP,
  validateCorsConfig,
} from "@devorajs/core";
import type { AppDevServerOptions } from "./dev.js";
import { createApiMiddleware } from "../server/apiMiddleware.js";
import { createSecurityHeadersMiddleware } from "../server/securityHeadersMiddleware.js";
import { createSsrMiddleware } from "../server/ssrMiddleware.js";
import type { DevAssetUrls, DevPageHost } from "../server/devModuleHost.js";

/** The parts of a running dev server that `devora dev` reads: its address, and a way to stop it. */
export interface DevServerHandle {
  close(): Promise<void>;
  httpServer?: { address(): import("node:net").AddressInfo | string | null } | null;
  config: { server: { port?: number } };
}

type Next = (error?: unknown) => void;
type Middleware = (req: IncomingMessage, res: ServerResponse, next: Next) => void | Promise<void>;

/** Runs middlewares in order, the way the page and API handlers expect (they call next() to pass a request on). */
function chain(handlers: Middleware[], finish: (req: IncomingMessage, res: ServerResponse, error?: unknown) => void): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  return async (req, res) => {
    let i = 0;
    const next: Next = (error) => {
      if (error !== undefined) return finish(req, res, error);
      const handler = handlers[i++];
      if (!handler) return finish(req, res);
      Promise.resolve(handler(req, res, next)).catch((e) => finish(req, res, e));
    };
    next();
  };
}

/**
 * What the app's setup asks for that the experimental dev server does not do. It never reads vite.config.ts, so these would
 * otherwise be ignored without a word: each is reported at start-up (see PLUGINS-DECISION: no plugins, PostCSS or Sass in 0.4).
 */
export function findUnsupportedSettings(appRoot: string, projectRoot: string): string[] {
  const found: string[] = [];
  for (const dir of new Set([appRoot, projectRoot])) {
    for (const base of ["postcss.config", "tailwind.config"]) {
      for (const ext of ["js", "cjs", "mjs", "ts"]) {
        if (existsSync(path.join(dir, `${base}.${ext}`))) found.push(`${base}.${ext} (PostCSS and Tailwind are not run)`);
      }
    }
  }
  const config = path.join(appRoot, "vite.config.ts");
  if (existsSync(config)) {
    const text = readFileSync(config, "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const plugins = /\bplugins\s*:\s*\[([\s\S]*?)\]/.exec(text)?.[1]?.replace(/\breact\(\s*\)/g, "").replace(/[,\s]/g, "");
    if (plugins) found.push("vite.config.ts plugins other than react() (Vite plugins are not run)");
    for (const [key, what] of [["alias", "resolve.alias"], ["define", "define"], ["proxy", "server.proxy"], ["css", "css options (preprocessors, PostCSS)"]] as const) {
      if (new RegExp(`\\b${key}\\s*:`).test(text)) found.push(`vite.config.ts ${what} (not read)`);
    }
  }
  return found;
}

/** `publicDir` from the app's vite.config.ts when it is the literal form the repo's apps use; else `<app>/public`. */
function resolvePublicDir(appRoot: string): string | undefined {
  const config = path.join(appRoot, "vite.config.ts");
  if (existsSync(config)) {
    const m = /publicDir:\s*path\.resolve\(\s*__dirname\s*,\s*["']([^"']+)["']\s*\)/.exec(readFileSync(config, "utf8"));
    if (m) return path.resolve(appRoot, m[1]!);
  }
  const fallback = path.join(appRoot, "public");
  if (existsSync(fallback)) return fallback;
  // A project scaffolded for this engine has no vite.config.ts: its shared brand assets are the project's assets/ folder.
  const shared = path.resolve(appRoot, "..", "..", "assets");
  return !existsSync(config) && existsSync(shared) ? shared : undefined;
}

/**
 * One app's dev server on the experimental server (`devora dev --experimental-dev-server`): the same page, API, session
 * and header handlers as the Vite path, over `@devorajs/sekhem`'s confined routes, esbuild transforms and Fast Refresh.
 * Loaded only when the flag is given, so the default path never imports it.
 */
export async function createExperimentalAppDevServer(options: AppDevServerOptions): Promise<DevServerHandle> {
  // Real paths throughout (symlinks followed): the module loader and the URL table compare paths as files resolve.
  const opts = { ...options, appRoot: realpathSync(options.appRoot), projectRoot: realpathSync(options.projectRoot) };
  const { app, appRoot, authMode, appConfig } = opts;
  const sessionManifest = resolveSessionManifest({
    appName: app.name,
    appDomain: app.domain,
    authMode,
    sessions: opts.sessions,
    appSessions: appConfig.sessions,
    csrf: appConfig.csrf,
  });
  validateCorsConfig(app.name, appConfig.cors);
  if (opts.host) throw new Error("[devora] --host is not available with --experimental-dev-server: it binds 127.0.0.1 only");
  const devServer = await loadSekhem();
  process.setSourceMapsEnabled(true);
  for (const item of findUnsupportedSettings(appRoot, opts.projectRoot)) {
    console.warn(`[devora] "${app.name}": the experimental dev server does not support ${item}. Use plain devora dev (Vite) if the app needs it.`);
  }

  const roots = [{ prefix: "/_devora/m/app/", dir: appRoot }];
  const packagesDir = path.join(opts.projectRoot, "packages");
  if (existsSync(packagesDir)) roots.push({ prefix: "/_devora/m/packages/", dir: packagesDir });

  devServer.trace("cli: dev-server module loaded");
  const aliases = devServer.loadPathAliases(appRoot);
  const cacheRoot = await devServer.resolveCacheRoot(appRoot);
  const modules = await devServer.createServerModuleHost({ appId: app.name, projectRoot: opts.projectRoot, roots, compileCacheDir: cacheRoot ? path.join(cacheRoot, "compiled-v1") : undefined, aliases });
  // Compile the app's files in parallel while the first request has not arrived yet (best effort).
  void devServer.listAppScripts(appRoot).then((files) => modules.prewarm(files)).catch(() => {});
  const cssGraph = devServer.createCssGraph(roots);
  const publicDir = resolvePublicDir(appRoot);
  const host: DevPageHost = {
    ssrLoadModule: (id) => modules.ssrLoadModule(id),
    ssrFixStacktrace: (error) => modules.ssrFixStacktrace(error),
    moduleGraph: cssGraph,
    config: { publicDir: publicDir ?? "", root: appRoot },
  };

  devServer.trace("cli: module host ready");
  let handler: ((req: IncomingMessage, res: ServerResponse) => Promise<void>) | undefined;
  const server = await devServer.startExperimentalDevServer({
    roots,
    port: opts.port,
    allowedHosts: appConfig.allowedHosts ? [...appConfig.allowedHosts] : undefined,
    fallback: (req, res) => (handler ? handler(req, res) : void res.end()),
    app: {
      appRoot,
      publicDir,
      aliases,
      backendOnly: appConfig.backendOnly === true,
      svgCsp: SVG_CSP,
      onChange(file) {
        cssGraph.clear(file);
        // The same cleanup Vite's hot-update hook does: run the dispose callbacks of the changed module and of what imports it.
        for (const f of modules.invalidate(file)) runAndClearDisposable(f);
        clearStreamingModuleCache();
      },
    },
  });

  const urls: DevAssetUrls = {
    islandClient: "/_devora/m/app/island-client.tsx",
    csrClient: "/_devora/m/app/csr-client.tsx",
    preamble: server.preambleUrl,
    moduleUrl: (file) => server.clientModules?.urlOf(file) ?? "/_devora/m/outside-the-served-folders",
  };
  const handlers: Middleware[] = [createSecurityHeadersMiddleware(appConfig.security) as Middleware];
  handlers.push(
    createApiMiddleware(host, {
      appRoot,
      appName: app.name,
      authMode,
      security: appConfig.security,
      projectRoot: opts.projectRoot,
      sessions: opts.sessions,
      apiDir: appConfig.apiDir,
      sessionManifest,
      maxBodyBytes: appConfig.maxBodyBytes,
      trustProxy: appConfig.trustProxy,
      cors: appConfig.cors,
    }) as Middleware
  );
  if (appConfig.backendOnly === true) {
    handlers.push((req, res, next) => {
      if ((req.method !== "GET" && req.method !== "HEAD") || parseRequestUrl(req.url)?.pathname !== "/") return next();
      const status = backendStatusFor(app.name, req.headers.accept);
      res.statusCode = status.status;
      for (const [name, value] of Object.entries(status.headers ?? {})) res.setHeader(name, value);
      res.end(status.body);
    });
  } else {
    handlers.push(
      createSsrMiddleware(
        host,
        appRoot,
        app.name,
        authMode,
        app.domain,
        appConfig.sitemap === true,
        appConfig.defaultRenderMode,
        appConfig.security,
        { projectRoot: opts.projectRoot, config: opts.sessions, manifest: sessionManifest },
        {
          head: appConfig.head,
          maxBodyBytes: appConfig.maxBodyBytes,
          maxFormFields: appConfig.maxFormFields,
          maxFormFiles: appConfig.maxFormFiles,
          trustProxy: appConfig.trustProxy,
        },
        urls
      ) as Middleware
    );
  }
  // What Connect's final handler (and so Vite's dev server) answers when nothing handled the request: the same page.
  const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const finalPage = (res: ServerResponse, status: number, text: string) => {
    res.statusCode = status;
    res.setHeader("Content-Security-Policy", "default-src 'none'");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(`<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Error</title>\n</head>\n<body>\n<pre>${escapeHtml(text)}</pre>\n</body>\n</html>\n`);
  };
  handler = chain(handlers, (req, res, error) => {
    if (res.headersSent) return void res.end();
    if (error !== undefined) {
      console.error(`[devora] "${app.name}" request error:`, error);
      return finalPage(res, 500, error instanceof Error ? (error.stack ?? `${error.name}: ${error.message}`) : String(error));
    }
    finalPage(res, 404, `Cannot ${req.method} ${req.url}`);
  });

  return {
    close: () => server.close(),
    httpServer: server.server,
    config: { server: { port: server.port } },
  };
}
