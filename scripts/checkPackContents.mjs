#!/usr/bin/env node
/**
 * Release check: for every published package, list what `npm pack` would put
 * in the tarball (a dry run: nothing is written) and fail if anything
 * unexpected is in it, or something expected is not.
 *
 *   node scripts/checkPackContents.mjs            # every published package
 *   node scripts/checkPackContents.mjs core cli   # only these folders' names
 *
 * Unexpected means any of:
 *  - a file outside the package's own `files` entries, other than the ones npm
 *    always adds (package.json, README, LICENSE, CHANGELOG);
 *  - a file that must never be published: .env files, keys, tests, node_modules,
 *    git files, tsconfig files, build scripts, logs, editor leftovers;
 *  - for a package built with plain `tsc` (src/ compiled to dist/): a dist .js
 *    with no source file (a leftover from a deleted module), or a source module
 *    with no dist .js (a stale or missing build).
 * Run it after building, before `npm publish`. It runs `npm pack` with
 * --ignore-scripts, so it never rebuilds anything.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const PUBLISHED = ["packages/core", "packages/cli", "adapters/adapter-node", "adapters/adapter-vercel", "adapters/adapter-netlify", "create-devora"];

const ALWAYS = /^(package\.json|README(\.[a-z]+)?|LICENSE(\.[a-z]+)?|LICENCE(\.[a-z]+)?|CHANGELOG(\.[a-z]+)?)$/i;
const NEVER = [
  [/(^|\/)node_modules\//, "node_modules"],
  [/(^|\/)\.env(\.|$)/, ".env file"],
  [/\.(pem|key|p12|pfx|crt)$/i, "key or certificate"],
  [/(^|\/)\.git(\/|ignore$|attributes$|$)/, "git file"],
  [/(^|\/)(__tests__|__mocks__|fixtures?)\//, "test folder"],
  [/\.(test|spec)\.[cm]?[jt]sx?$/, "test file"],
  [/\.(test|spec)\.d\.ts(\.map)?$/, "test declaration"],
  [/(^|\/)tsconfig[^/]*\.json$/, "tsconfig"],
  [/(^|\/)build\.mjs$/, "build script"],
  [/\.(log|tgz|orig|rej|swp)$|~$|(^|\/)\.DS_Store$/, "log, archive or editor leftover"],
  [/(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/, "lockfile"],
  [/(^|\/)src\//, "source folder (not in `files`)"],
];

// Scaffold templates are meant to ship tsconfig and lock-free project files.
const ALLOWED_UNDER_TEMPLATES = new Set(["tsconfig"]);

const norm = (p) => p.replace(/^\.\//, "").replace(/\/$/, "");

/** Pure: returns the problems for one package. `packed` are tarball paths, `srcFiles`/`distFiles` optional relative lists. */
export function checkPackList({ name, files, packed, tscBuild, srcFiles = [], distFiles = [] }) {
  const problems = [];
  const entries = (files ?? []).map(norm);
  for (const file of packed) {
    const never = NEVER.find(([re]) => re.test(file));
    const inFiles = entries.some((e) => file === e || file.startsWith(`${e}/`));
    const allowed =
      (never && never[1].startsWith("source folder") && inFiles) ||
      (never && ALLOWED_UNDER_TEMPLATES.has(never[1]) && file.startsWith("templates/"));
    if (never && !allowed) problems.push(`${name}: unexpected ${never[1]}: ${file}`);
    else if (!inFiles && !ALWAYS.test(file)) problems.push(`${name}: not covered by "files": ${file}`);
  }
  for (const entry of entries) {
    if (!packed.some((f) => f === entry || f.startsWith(`${entry}/`))) problems.push(`${name}: "files" entry "${entry}" matched nothing in the tarball`);
  }
  if (tscBuild) {
    const stem = (f) => f.replace(/\.(d\.ts|d\.ts\.map|js\.map|js|tsx|ts)$/, "");
    const srcStems = new Set(srcFiles.filter((f) => /\.(ts|tsx)$/.test(f) && !/\.d\.ts$/.test(f) && !/(^|\/)__tests__\//.test(f) && !/\.(test|spec)\./.test(f)).map(stem));
    const distStems = new Set(distFiles.filter((f) => f.endsWith(".js")).map(stem));
    for (const s of distStems) if (!srcStems.has(s)) problems.push(`${name}: dist/${s}.js has no source file (left over from a deleted module?)`);
    for (const s of srcStems) if (!distStems.has(s)) problems.push(`${name}: src/${s} has no dist/${s}.js (stale or missing build)`);
  }
  return problems;
}

function listTree(dir) {
  if (!existsSync(dir)) return [];
  return execFileSync("find", [dir, "-type", "f"], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .map((f) => path.relative(dir, f).split(path.sep).join("/"));
}

export function checkPackage(root, pkgDir) {
  const dir = path.join(root, pkgDir);
  const manifest = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));
  const raw = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const packed = JSON.parse(raw)[0].files.map((f) => f.path);
  const tscBuild = manifest.scripts?.build === "tsc";
  return checkPackList({
    name: manifest.name,
    files: manifest.files,
    packed,
    tscBuild,
    srcFiles: tscBuild ? listTree(path.join(dir, "src")) : [],
    distFiles: tscBuild ? listTree(path.join(dir, "dist")) : [],
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const only = process.argv.slice(2);
  const targets = PUBLISHED.filter((p) => only.length === 0 || only.some((o) => p === o || p.endsWith(`/${o}`)));
  if (targets.length === 0) {
    console.error(`no published package matches: ${only.join(", ")}`);
    process.exit(2);
  }
  let problems = [];
  for (const pkgDir of targets) {
    const found = checkPackage(root, pkgDir);
    console.log(`${found.length === 0 ? "ok  " : "FAIL"} ${pkgDir}`);
    problems = problems.concat(found);
  }
  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`\npack contents: ${targets.length} package(s) checked, nothing unexpected`);
}
