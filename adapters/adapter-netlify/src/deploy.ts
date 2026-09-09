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
 * required. Requires the directory to already be linked — see
 * `isNetlifyLinked()`.
 *
 * Deliberately does NOT pass `--dir=dist/client`, even though that was the
 * original, "explicit over implicit" (CLAUDE.md §2.2) design here — a real
 * authenticated `devora deploy --adapter=netlify` run against a monorepo
 * site (packagePath-scoped) reproduced `Error: The deploy directory ".../
 * dist/client" has not been found`, using the *repo root* + "dist/client"
 * instead of the app's own directory — even though the exact same run's
 * own "Resolved config" printed the correct, app-scoped absolute path for
 * `publish` (`publishOrigin: config`, read from netlify.toml, no dashboard
 * override involved). So the explicit `--dir` flag and netlify.toml's own
 * `publish` value are resolved by two different code paths inside
 * netlify-cli's own build/deploy pipeline, and only one of them was correct
 * for this packagePath-scoped site. The fix here — dropping the flag so
 * netlify-cli falls through to `netlify.toml`'s own `publish` (the value
 * already proven to resolve correctly in the same failing run's own
 * output) — is the fix being tested next, not yet re-confirmed with a real
 * deploy at the time this comment was written; update this comment once
 * it has been. This is the one place "explicit" loses to "implicit," and
 * only because the explicit path was the one that was actually broken.
 */
export function deployToNetlify(appRoot: string, opts: { prod?: boolean } = {}): Promise<{ ok: boolean }> {
  return new Promise((resolve) => {
    const args = ["--yes", "netlify-cli@latest", "deploy"];
    if (opts.prod) args.push("--prod");
    const child = spawn("npx", args, { cwd: appRoot, stdio: "inherit" });
    child.on("exit", (code) => resolve({ ok: code === 0 }));
    child.on("error", () => resolve({ ok: false }));
  });
}
