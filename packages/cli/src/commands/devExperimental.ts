import path from "node:path";
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

/** `publicDir` from the app's vite.config.ts when it is the literal form the repo's apps use; else `<app>/public`. */
function resolvePublicDir(appRoot: string): string | undefined {
  const config = path.join(appRoot, "vite.config.ts");
  if (existsSync(config)) {
    const m = /publicDir:\s*path\.resolve\(\s*__dirname\s*,\s*["']([^"']+)["']\s*\)/.exec(readFileSync(config, "utf8"));
    if (m) return path.resolve(appRoot, m[1]!);
  }
  const fallback = path.join(appRoot, "public");
  return existsSync(fallback) ? fallback : undefined;
}

/**
 * One app's dev server on the experimental server (`devora dev --experimental-dev-server`): the same page, API, session
 * and header handlers as the Vite path, over `@devorajs/dev-server`'s confined routes, esbuild transforms and Fast Refresh.
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
  let devServer: typeof import("@devorajs/dev-server");
  try {
    devServer = await import("@devorajs/dev-server");
  } catch (error) {
    throw new Error(
      "[devora] the experimental dev server is not part of the published CLI. Run it from a checkout of the repository: " +
        `pnpm exec tsx packages/cli/src/index.ts dev --experimental-dev-server (${(error as Error).message})`
    );
  }
  process.setSourceMapsEnabled(true);

  const roots = [{ prefix: "/_devora/m/app/", dir: appRoot }];
  const packagesDir = path.join(opts.projectRoot, "packages");
  if (existsSync(packagesDir)) roots.push({ prefix: "/_devora/m/packages/", dir: packagesDir });

  const modules = await devServer.createServerModuleHost({ appId: app.name, projectRoot: opts.projectRoot, roots });
  const cssGraph = devServer.createCssGraph(roots);
  const publicDir = resolvePublicDir(appRoot);
  const host: DevPageHost = {
    ssrLoadModule: (id) => modules.ssrLoadModule(id),
    ssrFixStacktrace: (error) => modules.ssrFixStacktrace(error),
    moduleGraph: cssGraph,
    config: { publicDir: publicDir ?? "", root: appRoot },
  };

  let handler: ((req: IncomingMessage, res: ServerResponse) => Promise<void>) | undefined;
  const server = await devServer.startExperimentalDevServer({
    roots,
    port: opts.port,
    allowedHosts: appConfig.allowedHosts ? [...appConfig.allowedHosts] : undefined,
    fallback: (req, res) => (handler ? handler(req, res) : void res.end()),
    app: {
      appRoot,
      publicDir,
      backendOnly: appConfig.backendOnly === true,
      svgCsp: SVG_CSP,
      onChange(file) {
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
      if ((req.method !== "GET" && req.method !== "HEAD") || new URL(req.url ?? "/", "http://localhost").pathname !== "/") return next();
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
