#!/usr/bin/env node
/**
 * Publishes one package with its dist-pointing `main`/`types`/`exports` swapped
 * in for real, instead of relying on `publishConfig` deep-merging — confirmed by
 * three separate real `npm publish` attempts (core, adapter-vercel, adapter-netlify)
 * that npm does NOT merge a nested `publishConfig.exports` object into the
 * published package.json at all; it's silently ignored (with an "Unknown
 * publishConfig config" deprecation warning), not applied. The previously-
 * believed-working pattern (top-level `exports` pointing at `./src/*.ts` for
 * local monorepo dev, a `publishConfig.exports` override for publish) never
 * actually worked — every package published with the local-dev `exports` value
 * unchanged, breaking any real consumer's `import`.
 *
 * This script takes the opposite, guaranteed-correct approach: read the
 * package's own `publishConfig` object, merge its keys directly into the
 * top level of package.json, write that to disk, run `npm publish` against
 * the now-correct file, and restore the original (source-pointing) content
 * afterward — in a `finally`, so a failed publish (auth, version conflict,
 * network) can never leave local monorepo dev broken.
 *
 * Usage: node scripts/publish-package.mjs <package-dir> [--access public] [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const [, , pkgDir, ...rest] = process.argv;
if (!pkgDir) {
  console.error("Usage: node scripts/publish-package.mjs <package-dir> [npm publish args...]");
  process.exit(1);
}

const pkgJsonPath = path.join(pkgDir, "package.json");
const original = readFileSync(pkgJsonPath, "utf-8");
const pkg = JSON.parse(original);

if (!pkg.publishConfig) {
  console.error(`[publish-package] ${pkgJsonPath} has no publishConfig — nothing to swap, refusing to guess.`);
  process.exit(1);
}

const merged = { ...pkg, ...pkg.publishConfig };
delete merged.publishConfig; // the published package.json shouldn't carry a now-pointless publishConfig block

writeFileSync(pkgJsonPath, JSON.stringify(merged, null, 2) + "\n");
console.log(`[publish-package] swapped ${pkgJsonPath} to its publish-time shape (main/types/exports -> dist).`);

// Real bug fixed here: a Ctrl+C (or any kill) while `npm publish` is blocked
// waiting on its interactive browser-based OTP prompt reaches BOTH this
// script's own process and the spawned npm child at once (same foreground
// process group) — Node's *default* SIGINT behavior is to terminate
// immediately, which can win the race against the `finally` below before it
// ever runs, leaving package.json stuck in its publish-time (dist-pointing)
// shape. Confirmed this happened for real: two separate publish attempts
// left package.json swapped with no restore, breaking local/CI builds that
// need `./src/*.ts` resolution. Registering explicit signal handlers
// suppresses Node's auto-exit-on-signal behavior, so once the (also-killed)
// child returns control to this script, the restore below still runs.
let restored = false;
function restore() {
  if (restored) return;
  restored = true;
  writeFileSync(pkgJsonPath, original);
  console.log(`[publish-package] restored ${pkgJsonPath} to its local-dev shape (main/types/exports -> src).`);
}
process.on("SIGINT", () => {
  restore();
  process.exit(130);
});
process.on("SIGTERM", () => {
  restore();
  process.exit(143);
});

try {
  execFileSync("npm", ["publish", ...rest], { cwd: pkgDir, stdio: "inherit" });
} finally {
  restore();
}
