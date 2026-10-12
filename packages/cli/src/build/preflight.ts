import path from "node:path";
import { existsSync, readFileSync, statSync } from "node:fs";
import type { AuthMode, SessionsConfig } from "@devorajs/core";

export interface PreflightIssue {
  level: "error" | "warning";
  message: string;
}

/** Thrown by buildAppForAdapter when a preflight check fails — the issues
 * were already printed, so callers only need to stop. */
export class PreflightError extends Error {
  constructor(appName: string) {
    super(`[devora] "${appName}": preflight checks failed — nothing was built.`);
  }
}

/**
 * Checks that only make sense for a serverless target, run before anything
 * is built, so a misconfiguration surfaces as a clear build failure instead
 * of a bare 500 on the deployed function's first request.
 *
 * Env vars are an *error* only when the build runs on the platform itself
 * (`VERCEL=1` / `NETLIFY=true`, where the project's env vars are present at
 * build time). A local `devora build --adapter=…` followed by `vercel deploy
 * --prebuilt` legitimately has no production secrets on the machine — the
 * function reads them at runtime — so locally it's a warning.
 */
export function preflightSessions(input: {
  appName: string;
  authMode: AuthMode;
  sessions: SessionsConfig | undefined;
  adapter: "vercel" | "netlify";
  env: NodeJS.ProcessEnv;
}): PreflightIssue[] {
  const { appName, authMode, sessions, adapter, env } = input;
  if (authMode === "none") return [];

  const issues: PreflightIssue[] = [];
  const onPlatform = adapter === "vercel" ? env.VERCEL === "1" : env.NETLIFY === "true";
  const where = adapter === "vercel" ? "the Vercel project's Environment Variables" : "the Netlify site's environment variables";

  const appKey = `DEVORA_SESSION_SECRET_${appName.toUpperCase()}`;
  const keys = authMode === "isolated" ? [appKey, "DEVORA_SESSION_SECRET"] : ["DEVORA_SESSION_SECRET"];
  if (!keys.some((k) => env[k])) {
    const label = authMode === "isolated" ? `${appKey} (or DEVORA_SESSION_SECRET)` : "DEVORA_SESSION_SECRET";
    issues.push({
      level: onPlatform ? "error" : "warning",
      message: onPlatform
        ? `auth: "${authMode}" needs ${label}, and it isn't set in this build's environment — the deployed ` +
          `function would fail every request. Add it in ${where} and redeploy.`
        : `auth: "${authMode}" needs ${label} at runtime. It isn't set here, which is fine for a local build — ` +
          `make sure it's set in ${where}.`,
    });
  }
  if (authMode === "isolated" && !/^[A-Z_][A-Z0-9_]*$/.test(appKey)) {
    issues.push({
      level: "warning",
      message:
        `${appKey} isn't a valid environment variable name on most platforms (app names with "-" produce one). ` +
        `Use DEVORA_SESSION_SECRET for this app, or rename it.`,
    });
  }

  if (sessions?.store === undefined) {
    issues.push({
      level: "error",
      message:
        `no shared.sessions.store in devora.config.ts — a production function refuses to start without one. ` +
        `Point it at a module default-exporting a DB-backed SessionStore.`,
    });
  } else if (sessions.store === "memory") {
    issues.push({
      level: "warning",
      message:
        `shared.sessions.store is "memory" — on serverless each function instance has its own empty store, so ` +
        `logins won't stick. Use a DB-backed store before relying on sessions in production.`,
    });
  }
  return issues;
}

/**
 * Vercel-specific layout checks:
 * - `.vercel/output` has to sit at the root of the Vercel project — that's
 *   the only place Vercel (and `vercel deploy --prebuilt`) looks;
 * - that project root must not have an `api/` folder, which Vercel turns into
 *   its own functions next to the one this adapter writes.
 */
export function preflightVercelLayout(input: {
  appRoot: string;
  /** Where `.vercel/output` will be written. */
  outputDir: string;
  /** Normalized app.config.ts apiDir. */
  apiDir: string;
}): PreflightIssue[] {
  const { appRoot, outputDir, apiDir } = input;
  const issues: PreflightIssue[] = [];

  const endsInVercelOutput =
    path.basename(outputDir) === "output" && path.basename(path.dirname(outputDir)) === ".vercel";
  if (!endsInVercelOutput) {
    issues.push({
      level: "warning",
      message:
        `output goes to ${outputDir}, but Vercel only reads <project root>/.vercel/output. ` +
        `Use --out=<your Vercel Root Directory>/.vercel/output.`,
    });
    return issues;
  }

  const vercelRoot = path.dirname(path.dirname(outputDir));
  const reservedApi = path.join(vercelRoot, "api");
  if (existsSync(reservedApi) && statSync(reservedApi).isDirectory()) {
    const isThisAppsApiDir = vercelRoot === appRoot && apiDir === "api";
    issues.push({
      level: "warning",
      message:
        `${reservedApi} exists at the root of the Vercel project. Vercel treats every file in a top-level api/ ` +
        `as its own serverless function (or type-checks it with its own tsconfig), on top of the function ` +
        `devora builds — expect the Hobby plan's 12-function limit or TS2835 errors. ` +
        (isThisAppsApiDir
          ? `Fix: rename this app's api/ folder (e.g. to endpoints/) and set apiDir: "endpoints" in app.config.ts — URLs stay under /api.`
          : `Fix: move or rename that folder, or deploy from a different Root Directory.`),
    });
  }
  return issues;
}

/**
 * netlify.toml is static and committed (see adapter-netlify), and Netlify's
 * packager only ships files `included_files` names — an app whose apiDir
 * isn't the default needs its folder listed, or every /api request 404s.
 */
export function preflightNetlifyToml(input: { appRoot: string; apiDir: string }): PreflightIssue[] {
  const tomlPath = path.join(input.appRoot, "netlify.toml");
  if (input.apiDir === "api" || !existsSync(tomlPath)) return [];
  const expected = `netlify/functions/ssr/${input.apiDir}/**`;
  if (readFileSync(tomlPath, "utf-8").includes(expected)) return [];
  return [
    {
      level: "warning",
      message: `apiDir is "${input.apiDir}", but netlify.toml's [functions.ssr] included_files doesn't list "${expected}" — add it, or the deployed function won't find any API route.`,
    },
  ];
}

/** Prints issues; returns true if any is an error. */
export function reportPreflight(appName: string, issues: PreflightIssue[]): boolean {
  for (const issue of issues) {
    const line = `[devora] "${appName}" preflight ${issue.level}: ${issue.message}`;
    if (issue.level === "error") console.error(line);
    else console.warn(line);
  }
  return issues.some((i) => i.level === "error");
}
