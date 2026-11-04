#!/usr/bin/env node
/**
 * Backs the package manager table in the docs with a CI run: scaffolds a new project from the LOCAL create-devora, with
 * the local core and cli packed as tarballs (the version being worked on is not on npm yet), and runs it under one package
 * manager: install, a package script (typecheck), build, and `start` answering a request.
 *
 *   node scripts/ci-scaffold-pm.mjs <yarn4|pnpm10|pnpm12|pnpm9|npm|yarn1> [--keep]
 *
 * Run it after `pnpm --filter @devorajs/core --filter @devorajs/cli --filter create-devora run build`. Needs pnpm on PATH
 * (packing must apply publishConfig, which npm pack ignores), npm/npx and, for Yarn 4, corepack (it ships with Node).
 * The package managers under test run in a clean environment: no CI variables, so none of them demands a lockfile that a
 * brand new project cannot have yet.
 *
 * It prints one line per step. Exit status 0 only if every step passed.
 */
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const id = process.argv[2];
const keep = process.argv.includes("--keep");
const PORT = Number(process.env.PM_TEST_PORT ?? 4300);
const SPECS = {
  npm: { flag: "npm", install: "npm install", run: (s) => `npm run ${s}` },
  yarn1: { flag: "yarn", shim: 'exec npx -y yarn@1.22.22 "$@"', install: "yarn install", run: (s) => `yarn ${s}` },
  yarn4: { flag: "yarn", corepack: "yarn@4.18.1", install: "yarn install", run: (s) => `yarn ${s}` },
  pnpm9: { flag: "pnpm", shim: 'exec npx -y pnpm@9.15.9 "$@"', install: "pnpm install --no-frozen-lockfile", run: (s) => `pnpm run ${s}` },
  pnpm10: { flag: "pnpm", shim: 'exec npx -y pnpm@10.34.9 "$@"', install: "pnpm install --no-frozen-lockfile", run: (s) => `pnpm run ${s}` },
  pnpm12: { flag: "pnpm", shim: 'exec npx -y pnpm@12.10.1 "$@"', install: "pnpm install --no-frozen-lockfile", run: (s) => `pnpm run ${s}` },
};
const spec = SPECS[id];
if (!spec) {
  console.error(`usage: node scripts/ci-scaffold-pm.mjs <${Object.keys(SPECS).join("|")}> [--keep]`);
  process.exit(2);
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), `devora-pm-${id}-`));
const bin = path.join(work, "bin");
fs.mkdirSync(bin);
if (spec.shim) {
  const name = spec.flag;
  fs.writeFileSync(path.join(bin, name), `#!/bin/sh\n${spec.shim}\n`, { mode: 0o755 });
}
// No CI variables for the package manager under test (pnpm and Yarn 4 turn on frozen lockfiles when they see them).
const cleanEnv = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, COREPACK_ENABLE_DOWNLOAD_PROMPT: "0", YARN_ENABLE_IMMUTABLE_INSTALLS: "false" };
for (const key of ["CI", "GITHUB_ACTIONS", "CONTINUOUS_INTEGRATION", "BUILD_NUMBER", "RUN_ID"]) delete cleanEnv[key];

let failed = false;
function run(label, command, cwd, timeoutMs = 240_000) {
  const t0 = Date.now();
  try {
    const out = execFileSync("sh", ["-c", command], { cwd, env: cleanEnv, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs });
    console.log(`PASS  ${label} (${Math.round((Date.now() - t0) / 1000)}s)`);
    return out;
  } catch (err) {
    failed = true;
    console.log(`FAIL  ${label}`);
    console.log(String(err.stdout ?? "").split("\n").slice(-12).join("\n"));
    console.log(String(err.stderr ?? err.message).split("\n").slice(-25).join("\n"));
    throw new Error(`${label} failed`);
  }
}
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `  (${detail})`}`);
  if (!ok) failed = true;
  return ok;
};
function get(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => { res.resume(); resolve(res.statusCode); }).on("error", () => resolve(0));
  });
}

console.log(`package manager: ${id}, work folder ${work}`);
try {
  const tarballs = path.join(work, "tarballs");
  fs.mkdirSync(tarballs);
  for (const dir of ["packages/core", "packages/cli"]) run(`pack ${dir}`, `pnpm pack --pack-destination ${tarballs}`, path.join(repo, dir));
  const tarball = (prefix) => path.join(tarballs, fs.readdirSync(tarballs).find((f) => f.startsWith(prefix)));
  const deps = { "@devorajs/core": `file:${tarball("devorajs-core-")}`, "@devorajs/cli": `file:${tarball("devorajs-cli-")}` };

  run("create (local create-devora)", `node ${path.join(repo, "create-devora/dist/index.js")} proj --scope=fullstack --apps=site,app --auth=site:none,app:shared --pm=${spec.flag} --skip-install`, work);
  const project = path.join(work, "proj");

  // What the scaffold must write for this package manager (the whole point of the Yarn 4 and pnpm 11+ support).
  const workspaceYaml = fs.readFileSync(path.join(project, "pnpm-workspace.yaml"), "utf8");
  check("pnpm-workspace.yaml has linkWorkspacePackages and allowBuilds", /^linkWorkspacePackages: true$/m.test(workspaceYaml) && /^allowBuilds:\n {2}esbuild: true$/m.test(workspaceYaml), workspaceYaml);
  const yarnrc = path.join(project, ".yarnrc.yml");
  if (spec.flag === "yarn") check(".yarnrc.yml selects the node_modules linker", fs.existsSync(yarnrc) && /^nodeLinker: node-modules$/m.test(fs.readFileSync(yarnrc, "utf8")));
  else check("no .yarnrc.yml for npm and pnpm", !fs.existsSync(yarnrc));

  // Point core and cli at the packed local build; a memory session store so `start` can run; Yarn 4 through corepack.
  for (const pkgPath of findPackageJsons(project)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    for (const section of ["dependencies", "devDependencies"]) for (const dep of Object.keys(pkg[section] ?? {})) if (deps[dep]) pkg[section][dep] = deps[dep];
    if (spec.corepack && pkgPath === path.join(project, "package.json")) pkg.packageManager = spec.corepack;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }
  const configPath = path.join(project, "devora.config.ts");
  const config = fs.readFileSync(configPath, "utf8");
  const withStore = config.replace('    // sessions: { store: "packages/backend/sessionStore.ts" },', '    sessions: { store: "memory" },');
  if (withStore === config) throw new Error("devora.config.ts no longer has the commented sessions line this script edits");
  fs.writeFileSync(configPath, withStore);
  if (spec.corepack) run("corepack enable", "corepack enable --install-directory " + bin, project);

  run(`install (${spec.install})`, spec.install, project);
  run("package script (typecheck)", spec.run("typecheck"), project);
  run("build", spec.run("build"), project);
  check("build wrote the app's server output", fs.existsSync(path.join(project, "apps/app/dist/server")));

  // start: both apps come up on PORT and PORT+1; the app with sessions answers /login.
  const child = spawn("sh", ["-c", `exec ${spec.run("start")}`], { cwd: project, env: { ...cleanEnv, PORT: String(PORT), HOST: "127.0.0.1", DEVORA_SESSION_SECRET: "ci-package-manager-secret-ci-package-1234" }, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  let status = 0;
  for (let i = 0; i < 40 && status !== 200; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    status = await get(`http://127.0.0.1:${PORT + 1}/login`);
    if (child.exitCode !== null) break;
  }
  try { process.kill(-child.pid, "SIGTERM"); } catch {}
  await new Promise((r) => setTimeout(r, 1000));
  try { process.kill(-child.pid, "SIGKILL"); } catch {}
  if (!check(`start answers GET /login with 200 on port ${PORT + 1}`, status === 200, `status ${status}`)) console.log(log.split("\n").slice(-20).join("\n"));
} catch (err) {
  failed = true;
  console.log(`stopped: ${err.message}`);
} finally {
  if (keep) console.log(`kept ${work}`);
  else fs.rmSync(work, { recursive: true, force: true });
}
console.log(failed ? `\n${id}: FAILED` : `\n${id}: all steps passed`);
process.exit(failed ? 1 : 0);

function findPackageJsons(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findPackageJsons(full));
    else if (entry.name === "package.json") out.push(full);
  }
  return out;
}
