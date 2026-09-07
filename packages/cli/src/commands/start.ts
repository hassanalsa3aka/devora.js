import { resolveAuthMode } from "@devora/core";
import { loadProjectConfig, loadAppConfig, resolveAppDir } from "@devora/core/config-loader";
import { createNodeServer } from "@devora/adapter-node";
import { assignPorts, DEFAULT_BASE_PORT } from "../build/portScheme.js";

/**
 * Production serve (ROADMAP.md #4) — boots adapter-node against each app's
 * `dist/server` output from `devora build`. Requires a build to already
 * exist; unlike `devora dev` this does not build on the fly.
 */
export async function start(opts: { app?: string; port?: string }) {
  const root = process.cwd();
  const project = await loadProjectConfig(root);

  const apps = opts.app ? project.apps.filter((a) => a.name === opts.app) : project.apps;

  if (opts.app && apps.length === 0) {
    console.error(`[devora] no app named "${opts.app}" in devora.config.ts`);
    process.exit(1);
  }

  const explicitPort = opts.port ? Number.parseInt(opts.port, 10) : undefined;
  // `--app` + `--port` (or `--app` alone) is a literal port for that one
  // process, unchanged from before. Starting every app together assigns
  // each a real sequential port from the shared scheme `generate-proxy.ts`
  // also reads — see portScheme.ts for the bug this replaced (two
  // independently-guessed base ports that used to silently disagree).
  const ports = opts.app ? undefined : assignPorts(project.apps, explicitPort ?? DEFAULT_BASE_PORT);

  for (const app of apps) {
    const authMode = resolveAuthMode(project, app.name);
    const appRoot = resolveAppDir(root, app.dir);
    const appConfig = await loadAppConfig(appRoot);
    createNodeServer({
      appRoot,
      appName: app.name,
      authMode,
      domain: app.domain,
      security: appConfig.security,
      sitemapEnabled: appConfig.sitemap === true,
      defaultRenderMode: appConfig.defaultRenderMode,
      port: ports ? ports.get(app.name)! : (explicitPort ?? DEFAULT_BASE_PORT),
    });
  }
}
