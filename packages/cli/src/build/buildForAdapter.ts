import path from "node:path";
import { listRouteFiles, resolveAuthMode, type AppConfig, type ProjectConfig } from "@devora/core";
import { loadAppConfig, resolveAppDir } from "@devora/core/config-loader";
import { buildAppServer } from "./buildAppServer.js";
import { buildAppStatic } from "./buildAppStatic.js";
import { assertNoAuthUsage } from "./checkNoAuthUsage.js";
import { writeVercelOutput } from "@devora/adapter-vercel";
import { writeNetlifyConfig } from "@devora/adapter-netlify";

/**
 * One app's full build pipeline (SSR build → ssg/isr pre-render → optional
 * adapter output) — extracted out of `build.ts`'s loop body so `devora
 * deploy` (new — see ROADMAP.md's multi-app-aware Vercel/Netlify item) can
 * reuse the exact same per-app build step instead of duplicating it. Pure
 * extraction: `build.ts`'s own behavior is unchanged by this refactor.
 */
export async function buildAppForAdapter(
  root: string,
  project: ProjectConfig,
  app: AppConfig,
  adapter?: string
): Promise<{ appRoot: string; serverOutDir: string; staticRoutes: string[] }> {
  const appRoot = resolveAppDir(root, app.dir);
  const appConfig = await loadAppConfig(appRoot);

  // Computed unconditionally (not just inside the vercel/netlify branch
  // below) — a "none"-auth app calling ctx.setSession()/etc. must fail the
  // build regardless of adapter, per the same "fail as early as possible"
  // reasoning as the runtime throw in session.ts's createNoAuthContext().
  const authMode = resolveAuthMode(project, app.name);
  if (authMode === "none") {
    assertNoAuthUsage(app.name, listRouteFiles(path.join(appRoot, "routes")));
  }

  console.log(`[devora] building "${app.name}" (SSR)...`);
  const { serverOutDir } = await buildAppServer(appRoot);
  console.log(`[devora] "${app.name}" built → ${serverOutDir}`);

  const { staticRoutes } = await buildAppStatic(appRoot, serverOutDir, appConfig.defaultRenderMode);
  if (staticRoutes.length > 0) {
    console.log(`[devora] "${app.name}" pre-rendered (ssg/isr): ${staticRoutes.join(", ")}`);
  }

  // adapter-node needs nothing further — see `devora start`. Vercel/Netlify
  // package the same build output into their own output specs.
  if (adapter === "vercel" || adapter === "netlify") {
    const sitemapEnabled = appConfig.sitemap === true;
    if (adapter === "vercel") {
      await writeVercelOutput(app, appRoot, authMode, appConfig.security, sitemapEnabled, appConfig.defaultRenderMode);
    } else {
      await writeNetlifyConfig(app, appRoot, authMode, appConfig.security, sitemapEnabled, appConfig.defaultRenderMode);
    }
  }

  return { appRoot, serverOutDir, staticRoutes };
}
