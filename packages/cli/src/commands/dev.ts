import path from "node:path";
import type { AddressInfo } from "node:net";
import { createServer, type ViteDevServer } from "vite";
import {
  listRouteFiles,
  listRoutePaths,
  resolveAuthMode,
  type AppConfig,
  type AppRuntimeConfig,
  type AuthMode,
  type SessionsConfig,
} from "@devorajs/core";
import { loadProjectConfig, loadAppConfig, resolveAppDir } from "@devorajs/core/config-loader";
import { createSsrMiddleware } from "../server/ssrMiddleware.js";
import { createApiMiddlewarePlugin } from "../server/apiMiddleware.js";
import { createSecurityHeadersMiddleware } from "../server/securityHeadersMiddleware.js";
import { islandsPlugin } from "../islandsPlugin.js";
import { moduleDisposePlugin } from "../server/moduleDisposePlugin.js";
import { reactRefreshPreamblePlugin } from "../server/reactRefreshPreamblePlugin.js";
import { assertNoAuthUsage } from "../build/checkNoAuthUsage.js";
import {
  DEV_BASE_PORT,
  findFreePort,
  getLanAddresses,
  isLoopbackAddress,
  isWildcardAddress,
} from "../server/devNetwork.js";

export interface AppDevServerOptions {
  projectRoot: string;
  app: AppConfig;
  appRoot: string;
  authMode: AuthMode;
  appConfig: AppRuntimeConfig;
  sessions: SessionsConfig | undefined;
  port: number;
  /** Bind every interface instead of loopback only (`devora dev --host`). */
  host?: boolean;
}

/**
 * One app's dev server, fully wired and listening — split out of `dev()` so
 * the integration tests (server/__tests__) boot exactly what `devora dev`
 * boots, not a hand-copied approximation of it.
 */
export async function createAppDevServer(opts: AppDevServerOptions): Promise<ViteDevServer> {
  const { app, appRoot, authMode, appConfig } = opts;
  const server = await createServer({
    root: appRoot,
    appType: "custom", // we own the HTML response — see ../server/ssrMiddleware.ts
    // strictPort: the port was already checked and chosen by dev() below
    // (which logs any move), so Vite silently picking yet another one would
    // make the printed URLs wrong. `host` is only passed when --host was
    // given — otherwise it's left to the app's own vite.config.ts (default:
    // loopback only), and the boot output reports whatever actually bound.
    server: { port: opts.port, strictPort: true, ...(opts.host ? { host: true } : {}) },
    configFile: path.join(appRoot, "vite.config.ts"),
    // Injected here rather than requiring every app's vite.config.ts to
    // import framework internals — Vite merges this with the app's own
    // plugins array (see ROADMAP.md #3).
    // apiMiddlewarePlugin must run before Vite's own internal middlewares
    // (see apiMiddleware.ts's doc comment on why) — passed as a plugin,
    // not a post-hoc server.middlewares.use() call, for exactly that
    // reason.
    plugins: [
      islandsPlugin(),
      moduleDisposePlugin(),
      reactRefreshPreamblePlugin(),
      createApiMiddlewarePlugin({
        appRoot,
        appName: app.name,
        authMode,
        security: appConfig.security,
        projectRoot: opts.projectRoot,
        sessions: opts.sessions,
      }),
    ],
  });
  // Security headers apply to every response from this server, not just
  // SSR-matched routes — "a default, not opt-in" (§7).
  server.middlewares.use(createSecurityHeadersMiddleware(appConfig.security));
  // Backend-only app mode (architecture-v2.md §3.4) — no pages, so no
  // point mounting the page-rendering middleware at all (it would only
  // ever no-op: matchRoute() against a routes/ directory that doesn't
  // exist always returns null). Explicit skip, not just a no-op left to
  // happen implicitly, so "zero unnecessary frontend tooling running" is
  // actually true, not just harmless.
  if (appConfig.backendOnly !== true) {
    server.middlewares.use(
      createSsrMiddleware(
        server,
        appRoot,
        app.name,
        authMode,
        app.domain,
        appConfig.sitemap === true,
        appConfig.defaultRenderMode,
        appConfig.security,
        { projectRoot: opts.projectRoot, config: opts.sessions }
      )
    );
  }
  await server.listen();
  return server;
}

interface BootedApp {
  app: AppConfig;
  authMode: AuthMode;
  appRoot: string;
  server: ViteDevServer;
}

export async function dev(opts: { app?: string; host?: boolean }) {
  const root = process.cwd();
  const project = await loadProjectConfig(root);

  const apps = opts.app ? project.apps.filter((a) => a.name === opts.app) : project.apps;

  if (opts.app && apps.length === 0) {
    console.error(`[devora] no app named "${opts.app}" in devora.config.ts`);
    process.exit(1);
  }

  // Each app gets its own Vite dev server on its own port: `devPort` if
  // set, else 10000 + its index in the *full* apps array — so an app's
  // port doesn't change depending on whether `--app` filtered the others
  // out. Taken ports fall forward to the next free one, logged, the way
  // Vite handles its own default port.
  const claimed = new Set<number>();
  const booted: BootedApp[] = [];
  for (const app of apps) {
    const authMode = resolveAuthMode(project, app.name);
    const appRoot = resolveAppDir(root, app.dir);
    if (authMode === "none") {
      assertNoAuthUsage(app.name, [
        ...listRouteFiles(path.join(appRoot, "routes")),
        ...listRouteFiles(path.join(appRoot, "api")),
      ]);
    }
    const appConfig = await loadAppConfig(appRoot);

    const preferred = app.devPort ?? DEV_BASE_PORT + project.apps.indexOf(app);
    const port = await findFreePort(preferred, claimed, opts.host ? undefined : "localhost");
    if (port !== preferred) {
      const reason = claimed.has(preferred) ? "was assigned to an earlier app" : "is in use";
      console.log(`[devora] port ${preferred} ${reason} — "${app.name}" moved to ${port}`);
    }
    claimed.add(port);

    const server = await createAppDevServer({
      projectRoot: root,
      app,
      appRoot,
      authMode,
      appConfig,
      sessions: project.shared.sessions,
      port,
      host: opts.host,
    });
    booted.push({ app, authMode, appRoot, server });
  }

  printBootSummary(booted);
}

/**
 * Boot output (devora-pre-v3-hotfixes.md #3/#4/#11/#13): per app, where it's
 * reachable, its API base URL, and its route table — built from the same
 * listRoutePaths() the router, sitemap, and build manifests use, so it
 * can't disagree with what's actually served. Network URLs (and the
 * exposure warning) are driven by the address the server *actually* bound,
 * not by whether --host was passed — an app whose own vite.config.ts sets
 * `server.host` gets the same warning.
 */
function printBootSummary(booted: BootedApp[]): void {
  const lanAddresses = getLanAddresses();
  const exposedUrls: string[] = [];
  const lines: string[] = [""];

  for (const { app, authMode, appRoot, server } of booted) {
    const address = server.httpServer?.address() as AddressInfo | null;
    const port = address?.port ?? server.config.server.port;
    const boundHost = address?.address ?? "localhost";

    const networkHosts = isWildcardAddress(boundHost)
      ? lanAddresses
      : isLoopbackAddress(boundHost)
        ? []
        : [boundHost];
    const networkUrls = networkHosts.map((h) => `http://${h}:${port}`);
    if (!isLoopbackAddress(boundHost)) exposedUrls.push(networkUrls[0] ?? `port ${port}`);

    const pages = listRoutePaths(path.join(appRoot, "routes")).sort();
    const apis = listRoutePaths(path.join(appRoot, "api"))
      .sort()
      .map((p) => (p === "/" ? "/api" : `/api${p}`));

    lines.push(`  ${app.name}  (auth: ${authMode}, prod domain: ${app.domain})`);
    lines.push(`    Local:    http://localhost:${port}/`);
    for (const url of networkUrls) lines.push(`    Network:  ${url}/`);
    if (networkUrls.length === 0) {
      lines.push(
        isWildcardAddress(boundHost)
          ? `    Network:  (all interfaces, but no LAN address detected)`
          : `    Network:  use --host to expose`
      );
    }
    if (apis.length > 0) {
      lines.push(`    API:      ${networkUrls[0] ?? `http://localhost:${port}`}/api`);
    }
    const routeRows = [...pages.map((p) => ["page", p]), ...apis.map((p) => ["api", p])];
    if (routeRows.length > 0) {
      lines.push(`    Routes:`);
      for (const [kind, routePath] of routeRows) lines.push(`      ${kind!.padEnd(5)}${routePath}`);
    } else {
      lines.push(`    Routes:   (none yet — add a file under routes/ or api/)`);
    }
    lines.push("");
  }

  if (exposedUrls.length > 0) {
    lines.push(
      `  ⚠ Dev server is reachable on your local network at ${exposedUrls[0]} — anyone on this network can access it.`
    );
    lines.push("");
  }

  console.log(lines.join("\n"));
}
