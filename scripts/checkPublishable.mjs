/**
 * Refuses to publish a package that would ship without its built output
 * (adapter-node 0.2.0 and adapter-vercel/netlify 0.2.2 went to npm with an
 * empty dist/). Used by publish-package.mjs and preparePublish.mjs, after the
 * manifest has its publish-time shape.
 *
 * Nothing here builds, deletes or rewrites anything.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

/** Every file path a manifest's entry fields point at (string leaves of exports/main/types/bin). */
export function entryTargets(manifest) {
  const out = new Set();
  const walk = (value) => {
    if (typeof value === "string") out.add(value);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(manifest.main);
  walk(manifest.types);
  walk(manifest.module);
  walk(manifest.exports);
  walk(manifest.bin);
  return [...out].filter((p) => p.startsWith("./") || !p.startsWith("."));
}

const norm = (p) => p.replace(/^\.\//, "");

function hasFiles(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return false;
  return readdirSync(dir, { recursive: true }).some((entry) => statSync(path.join(dir, entry)).isFile());
}

/**
 * Returns a list of problems (empty = fine).
 * @param manifest the package.json as it will be published (publishConfig merged)
 * @param pkgDir   the package folder
 * @param packedFiles optional: paths from `npm pack --dry-run --json` (relative to the package)
 */
export function checkPublishable(manifest, pkgDir, packedFiles) {
  const problems = [];
  const targets = entryTargets(manifest);
  const wantsDist = (manifest.files ?? []).includes("dist") || targets.some((t) => norm(t).startsWith("dist/"));

  if (wantsDist && !hasFiles(path.join(pkgDir, "dist"))) {
    problems.push(`${manifest.name}: dist/ is missing or empty — build it first (nothing was published)`);
  }
  for (const target of targets) {
    if (!existsSync(path.join(pkgDir, norm(target)))) {
      problems.push(`${manifest.name}: "${target}" (from exports/main/types/bin) does not exist`);
    }
  }
  if (packedFiles) {
    const packed = new Set(packedFiles.map(norm));
    for (const target of targets) {
      if (!packed.has(norm(target))) {
        problems.push(`${manifest.name}: the pack list does not include "${target}" (check "files")`);
      }
    }
  }
  return problems;
}

/** Runs `npm pack --dry-run --json` in pkgDir and returns the file paths it would pack. */
export function listPackedFiles(pkgDir) {
  const raw = execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: pkgDir, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
  return JSON.parse(raw)[0].files.map((f) => f.path);
}

/** Throws with every problem listed. */
export function assertPublishable(manifest, pkgDir) {
  const problems = checkPublishable(manifest, pkgDir, listPackedFiles(pkgDir));
  if (problems.length) {
    throw new Error(`refusing to publish:\n  - ${problems.join("\n  - ")}`);
  }
}

// CLI: node scripts/checkPublishable.mjs <package-dir>...  — checks the publish-time shape
// (publishConfig merged) of each package; exits 1 on any problem. Run before `pnpm publish`.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let failed = false;
  for (const dir of process.argv.slice(2)) {
    const pkg = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf-8"));
    const manifest = { ...pkg, ...(pkg.publishConfig ?? {}) };
    // `npm pack --dry-run` lists what the *current* package.json packs; pnpm applies publishConfig
    // itself at publish time, so only the on-disk checks are meaningful here.
    const problems = checkPublishable(manifest, dir);
    console.log(problems.length ? `FAIL ${dir}\n  - ${problems.join("\n  - ")}` : `ok   ${manifest.name}@${manifest.version}`);
    if (problems.length) failed = true;
  }
  process.exit(failed ? 1 : 0);
}
