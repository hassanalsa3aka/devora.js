import path from "node:path";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

/**
 * Multi-app-aware deploy orchestration (ROADMAP.md's §13 N:N item). Doesn't
 * reinvent Vercel's own project-linking mechanism — a real Vercel deploy of
 * N independently-deployed apps from one repo needs N Vercel *projects*
 * (a first-class platform resource, not something the Build Output API can
 * create), and Vercel's own CLI already has exactly this concept: run
 * `vercel link` once per app directory and it writes `.vercel/project.json`
 * there. This just detects that instead of asking devora to track project
 * IDs itself — "bring your own linked project," the natural extension of
 * this framework's existing "bring your own auth/DB/ORM" stance.
 */
export function isVercelLinked(appRoot: string): boolean {
  return existsSync(path.join(appRoot, ".vercel", "project.json"));
}

/**
 * Shells out to the real Vercel CLI via `npx` — no global install required,
 * matching this framework's own "no global install" bin story — rather than
 * reimplementing Vercel's deploy protocol, which would be real scope creep
 * for a framework whose stated job is coordinating N of these, not being
 * one itself. `--prebuilt` tells Vercel to use the `.vercel/output`
 * `writeVercelOutput()` already wrote instead of running its own build.
 * Requires the directory to already be linked — see `isVercelLinked()`;
 * callers should check that first and skip with a clear instruction rather
 * than calling this and getting Vercel's own "not linked" error.
 */
export function deployToVercel(appRoot: string, opts: { prod?: boolean } = {}): Promise<{ ok: boolean }> {
  return new Promise((resolve) => {
    const args = ["--yes", "vercel@latest", "deploy", "--prebuilt"];
    if (opts.prod) args.push("--prod");
    const child = spawn("npx", args, { cwd: appRoot, stdio: "inherit" });
    child.on("exit", (code) => resolve({ ok: code === 0 }));
    child.on("error", () => resolve({ ok: false }));
  });
}
