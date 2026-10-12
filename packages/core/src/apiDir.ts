import path from "node:path";

/**
 * The folder (relative to the app root) that holds an app's generic API
 * route files. Only the *folder* is configurable — the URL prefix is always
 * `/api` (`isApiPath()`), so `endpoints/health.ts` still serves `/api/health`.
 *
 * Why it's configurable at all: `api/` at the root of a Vercel project is
 * Vercel's own reserved functions folder. With the project's Root Directory
 * set to `apps/<name>`, Vercel turns every file in `apps/<name>/api/` into
 * its own serverless function (hitting the Hobby plan's 12-function limit)
 * or type-checks it with its own tsconfig — on top of the single function
 * this framework already built for the whole app. New apps are scaffolded
 * with `apiDir: "endpoints"`; `"api"` stays the default so existing apps
 * don't move.
 */
export const DEFAULT_API_DIR = "api";

/** Validates `apiDir` from app.config.ts and returns it normalized ("endpoints", "server/api"). */
export function normalizeApiDir(apiDir: string | undefined): string {
  if (apiDir === undefined) return DEFAULT_API_DIR;
  const normalized = path.posix.normalize(apiDir.replace(/\\/g, "/")).replace(/^\.\/+/, "").replace(/\/+$/, "");
  if (
    normalized === "" ||
    normalized === "." ||
    path.posix.isAbsolute(normalized) ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new Error(`[devora] apiDir "${apiDir}" must be a folder inside the app, e.g. "endpoints".`);
  }
  const first = normalized.split("/")[0];
  if (first === "routes" || first === "dist" || first === "node_modules") {
    throw new Error(`[devora] apiDir "${apiDir}" can't live under ${first}/ — pick a separate folder, e.g. "endpoints".`);
  }
  return normalized;
}

/** Absolute path of an app's API route folder. */
export function resolveApiDir(appRoot: string, apiDir: string | undefined): string {
  return path.join(appRoot, normalizeApiDir(apiDir));
}
