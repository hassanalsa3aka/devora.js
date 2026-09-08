#!/usr/bin/env node
// Real bug this script exists to work around, found via an actual
// `npm publish --dry-run` and extracting the resulting tarball: npm does
// NOT merge `publishConfig.exports`/`main`/`types` into the published
// package.json at all — it just warns "Unknown publishConfig config" and
// leaves the top-level fields (still pointing at raw `.ts` source, correct
// for this monorepo's own live-source dev workflow but unresolvable in a
// published tarball that only ships `dist/`) untouched. Publishing as-is
// would have shipped a package whose `exports` field points at a file
// that isn't even in the tarball.
//
// This script temporarily swaps `exports`/`main`/`types` to the
// `publishConfig` values, runs the real npm command, then restores the
// original file byte-for-byte in a `finally` — so the working tree is left
// exactly as it was for local development regardless of whether the
// publish step succeeds, fails, or is a dry run.
//
// Also strips the "prepare" lifecycle script if present — a second, more
// serious bug found the same way (an actual `npm install` of the packed
// tarball into a scratch directory, not just reading the dry-run log):
// `packages/cli`'s "prepare": "node ./build.mjs" reruns automatically on
// every real consumer's `npm install`, but `build.mjs` isn't in `files`
// (only `dist` ships) — confirmed by running it inside the installed
// package and getting `Cannot find module '.../build.mjs'`. "prepare" is
// only useful for this monorepo's own `pnpm install` (rebuilding from
// possibly-edited local source); a published package should ship the
// already-built `dist/` as-is and never try to rebuild itself.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const [, , pkgDir, ...rest] = process.argv;
if (!pkgDir) {
  console.error("Usage: node scripts/preparePublish.mjs <package-dir> [-- <npm publish args>]");
  process.exit(1);
}

const npmArgs = rest[0] === "--" ? rest.slice(1) : rest;
const pkgJsonPath = path.join(pkgDir, "package.json");
const original = readFileSync(pkgJsonPath, "utf-8");
const pkg = JSON.parse(original);

const hasSwap = pkg.publishConfig && pkg.publishConfig.exports;
const hasPrepare = pkg.scripts && pkg.scripts.prepare;
if (hasSwap) {
  pkg.exports = pkg.publishConfig.exports;
  if (pkg.publishConfig.main) pkg.main = pkg.publishConfig.main;
  if (pkg.publishConfig.types) pkg.types = pkg.publishConfig.types;
  delete pkg.publishConfig;
  console.log(`[preparePublish] swapped ${pkg.name}'s exports/main/types to point at dist/ for publish.`);
} else {
  console.log(`[preparePublish] ${pkg.name} has no publishConfig.exports — publishing as-is.`);
}
if (hasPrepare) {
  delete pkg.scripts.prepare;
  console.log(`[preparePublish] removed ${pkg.name}'s "prepare" script — it would fail for a real consumer (build.mjs isn't in "files"; dist/ ships pre-built).`);
}
if (hasSwap || hasPrepare) {
  writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + "\n");
}

try {
  execSync(`npm publish ${npmArgs.join(" ")}`, { cwd: pkgDir, stdio: "inherit" });
} finally {
  writeFileSync(pkgJsonPath, original);
  if (hasSwap || hasPrepare) {
    console.log(`[preparePublish] restored ${pkgJsonPath} to its working-tree state.`);
  }
}
