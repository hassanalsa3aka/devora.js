import { resolveAuthMode } from "@devora/core";
import { loadProjectConfig, loadAppConfig, resolveAppDir } from "@devora/core/config-loader";
import { createNodeServer } from "@devora/adapter-node";

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

  // 4173 (not 5173, dev's default) to avoid colliding with a `devora
  // dev` instance still running for the same app.
  let port = opts.port ? Number.parseInt(opts.port, 10) : 4173;
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
      port,
    });
    port += 1;
  }
}
