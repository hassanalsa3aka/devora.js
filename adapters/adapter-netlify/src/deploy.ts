import path from "node:path";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

/**
 * Same reasoning as adapter-vercel/src/deploy.ts — a real Netlify deploy of
 * N independently-deployed apps needs N Netlify *sites*, and Netlify's own
 * CLI already has exactly this concept: `netlify link` writes
 * `.netlify/state.json` (containing the site id) into the linked directory.
 * "Bring your own linked site," not a devora-tracked site-id config field.
 */
export function isNetlifyLinked(appRoot: string): boolean {
  return existsSync(path.join(appRoot, ".netlify", "state.json"));
}

/**
 * Shells out to the real Netlify CLI via `npx` — no global install
 * required. `--dir=dist/client` is explicit even though `netlify.toml`
 * (written by `writeNetlifyConfig`) already declares `publish = "dist/
 * client"` — explicit over implicit (CLAUDE.md §2.2). Requires the
 * directory to already be linked — see `isNetlifyLinked()`.
 */
export function deployToNetlify(appRoot: string, opts: { prod?: boolean } = {}): Promise<{ ok: boolean }> {
  return new Promise((resolve) => {
    const args = ["--yes", "netlify-cli@latest", "deploy", "--dir=dist/client"];
    if (opts.prod) args.push("--prod");
    const child = spawn("npx", args, { cwd: appRoot, stdio: "inherit" });
    child.on("exit", (code) => resolve({ ok: code === 0 }));
    child.on("error", () => resolve({ ok: false }));
  });
}
