import path from "node:path";
import {
  listRouteFiles,
  normalizeApiDir,
  resolveAuthMode,
  resolveSessionManifest,
  type AppConfig,
  type ProjectConfig,
} from "@devorajs/core";
import { loadAppConfig, resolveAppDir } from "@devorajs/core/config-loader";
import { buildAppServer } from "./buildAppServer.js";
import { buildAppStatic } from "./buildAppStatic.js";
import { assertNoAuthUsage } from "./checkNoAuthUsage.js";
import { runPrebuild } from "./runPrebuild.js";
import { PreflightError, preflightNetlifyToml, preflightSessions, preflightVercelLayout, reportPreflight, type PreflightIssue } from "./preflight.js";
import { writeVercelOutput, resolveVercelRuntime, readEnginesNode } from "@devorajs/adapter-vercel";
import { writeNetlifyConfig } from "@devorajs/adapter-netlify";

export interface BuildForAdapterOptions {
  /**
   * `devora build --out` — where to write Vercel's `.vercel/output` instead
   * of `<app>/.vercel/output`. Absolute, or relative to the project root.
   */
  out?: string;
}

/**
 * One app's full build pipeline (preflight → prebuild → SSR build → ssg/isr
 * pre-render → optional adapter output) — shared by `devora build` and
 * `devora deploy` so both run exactly the same steps.
 */
export async function buildAppForAdapter(
  root: string,
  project: ProjectConfig,
  app: AppConfig,
  adapter?: string,
  options: BuildForAdapterOptions = {}
): Promise<{ appRoot: string; serverOutDir: string; staticRoutes: string[] }> {
  const appRoot = resolveAppDir(root, app.dir);
  const appConfig = await loadAppConfig(appRoot);
  const apiDir = normalizeApiDir(appConfig.apiDir);

  // Computed unconditionally (not just inside the vercel/netlify branch
  // below) — a "none"-auth app calling ctx.setSession()/etc. must fail the
  // build regardless of adapter, per the same "fail as early as possible"
  // reasoning as the runtime throw in session.ts's createNoAuthContext().
  const authMode = resolveAuthMode(project, app.name);
  if (authMode === "none") {
    assertNoAuthUsage(app.name, [
      ...listRouteFiles(path.join(appRoot, "routes")),
      ...listRouteFiles(path.join(appRoot, apiDir)),
    ]);
  }

  // Validated before any build work (an invalid cookie/session setting is an
  // error here, not a cookie browsers silently reject in production) — and
  // then written into the build as dist/server/session-manifest.json, the
  // only place production reads these settings from.
  const sessionManifest = resolveSessionManifest({
    appName: app.name,
    appDomain: app.domain,
    authMode,
    sessions: project.shared.sessions,
    appSessions: appConfig.sessions,
    csrf: appConfig.csrf,
  });

  // Preflight before any build work, so a deploy that can't work fails in
  // seconds with a reason instead of building green and 500ing at runtime.
  const issues: PreflightIssue[] = [];
  let vercelRuntime: string | undefined;
  const vercelOutputDir = options.out ? path.resolve(root, options.out) : path.join(appRoot, ".vercel", "output");
  if (adapter === "vercel" || adapter === "netlify") {
    issues.push(...preflightSessions({ appName: app.name, authMode, sessions: project.shared.sessions, adapter, env: process.env }));
  }
  if (adapter === "vercel") {
    const resolved = resolveVercelRuntime({
      override: appConfig.vercel?.runtime,
      enginesNode: readEnginesNode(appRoot, root),
      runningNodeVersion: process.versions.node,
    });
    for (const warning of resolved.warnings) issues.push({ level: "warning", message: warning });
    if (resolved.error) {
      issues.push({ level: "error", message: resolved.error });
    } else {
      vercelRuntime = resolved.runtime;
      console.log(`[devora] "${app.name}" Vercel runtime: ${resolved.runtime} (from ${resolved.source})`);
    }
    issues.push(...preflightVercelLayout({ appRoot, outputDir: vercelOutputDir, apiDir }));
  }
  if (adapter === "netlify") issues.push(...preflightNetlifyToml({ appRoot, apiDir }));
  if (reportPreflight(app.name, issues)) throw new PreflightError(app.name);

  runPrebuild(app.name, appRoot, appConfig.prebuild, root);

  const backendOnly = appConfig.backendOnly === true;

  console.log(`[devora] building "${app.name}" (SSR)...`);
  const sessionsConfig = project.shared.sessions;
  const sessions =
    sessionManifest === undefined
      ? undefined
      : {
          manifest: sessionManifest,
          storeModulePath:
            sessionsConfig?.store && sessionsConfig.store !== "memory"
              ? path.resolve(root, sessionsConfig.store)
              : undefined,
        };
  const { serverOutDir } = await buildAppServer(appRoot, { backendOnly, sessions, apiDir });
  console.log(`[devora] "${app.name}" built → ${serverOutDir}`);

  const { staticRoutes } = await buildAppStatic(appRoot, serverOutDir, appConfig.defaultRenderMode, { backendOnly });
  if (staticRoutes.length > 0) {
    console.log(`[devora] "${app.name}" pre-rendered (ssg/isr): ${staticRoutes.join(", ")}`);
  }

  // adapter-node needs nothing further — see `devora start`. Vercel/Netlify
  // package the same build output into their own output specs.
  if (adapter === "vercel" || adapter === "netlify") {
    const sitemapEnabled = appConfig.sitemap === true;
    if (adapter === "vercel") {
      await writeVercelOutput(app, appRoot, authMode, appConfig.security, sitemapEnabled, appConfig.defaultRenderMode, {
        apiDir,
        outputDir: vercelOutputDir,
        runtime: vercelRuntime,
        trustProxy: appConfig.trustProxy,
      });
    } else {
      await writeNetlifyConfig(app, appRoot, authMode, appConfig.security, sitemapEnabled, appConfig.defaultRenderMode, {
        apiDir,
        trustProxy: appConfig.trustProxy,
      });
    }
  }

  return { appRoot, serverOutDir, staticRoutes };
}
