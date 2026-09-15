import { resolveAuthMode } from "@devorajs/core";
import { loadProjectConfig, loadAppConfig, resolveAppDir } from "@devorajs/core/config-loader";
import { createNodeServer } from "@devorajs/adapter-node";
import { assignPorts, DEFAULT_BASE_PORT } from "../build/portScheme.js";

/**
 * Production serve (ROADMAP.md #4) — boots adapter-node against each app's
 * `dist/server` output from `devora build`. Requires a build to already
 * exist; unlike `devora dev` this does not build on the fly.
 *
 * Real bug fixed here (Phase 4 security audit): unlike `build.ts`/
 * `deploy.ts`, this command never set `NODE_ENV` itself, relying entirely on
 * the invoking shell to have exported `NODE_ENV=production` first — exactly
 * the "explicit over implicit" trap build.ts's own doc comment already
 * warns about, just for a different symptom. `session.ts`'s `resolveSecret`
 * only *requires* a real session secret (refusing to start without one)
 * when `NODE_ENV === "production"`; anything else — including simply
 * forgetting to set it on a bare VPS/systemd unit, which the Docker image
 * happens to set but nothing here enforces — silently signs every app's
 * session cookie with a public, hardcoded dev secret checked into this
 * open-source repo. `devora start` is the actual production entrypoint
 * (adapter-node), so it must guarantee this itself.
 */
export async function start(opts: { app?: string; port?: string }) {
  process.env.NODE_ENV = "production";

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
