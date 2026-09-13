import path from "node:path";
import { createServer } from "vite";
import { listRouteFiles, resolveAuthMode } from "@devorajs/core";
import { loadProjectConfig, loadAppConfig, resolveAppDir } from "@devorajs/core/config-loader";
import { createSsrMiddleware } from "../server/ssrMiddleware.js";
import { createApiMiddlewarePlugin } from "../server/apiMiddleware.js";
import { createSecurityHeadersMiddleware } from "../server/securityHeadersMiddleware.js";
import { islandsPlugin } from "../islandsPlugin.js";
import { moduleDisposePlugin } from "../server/moduleDisposePlugin.js";
import { assertNoAuthUsage } from "../build/checkNoAuthUsage.js";

export async function dev(opts: { app?: string }) {
  const root = process.cwd();
  const project = await loadProjectConfig(root);

  const apps = opts.app ? project.apps.filter((a) => a.name === opts.app) : project.apps;

  if (opts.app && apps.length === 0) {
    console.error(`[devora] no app named "${opts.app}" in devora.config.ts`);
    process.exit(1);
  }

  // Each app gets its own Vite dev server on a distinct port. Real port
  // allocation/proxying across apps is adapter/CLI work beyond this skeleton.
  let port = 5173;
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
    const server = await createServer({
      root: appRoot,
      appType: "custom", // we own the HTML response — see ../server/ssrMiddleware.ts
      server: { port },
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
        createApiMiddlewarePlugin(appRoot, app.name, authMode, appConfig.security),
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
          appConfig.defaultRenderMode
        )
      );
    }
    await server.listen();
    // Vite may bind a different port than requested if `port` was taken —
    // log what it actually bound, not what we asked for.
    const boundPort = server.config.server.port ?? port;
    console.log(
      `[devora] "${app.name}" (auth: ${authMode}) → http://localhost:${boundPort}  (prod domain: ${app.domain})`
    );
    port = boundPort + 1;
  }
}
