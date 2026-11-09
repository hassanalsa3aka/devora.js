#!/usr/bin/env node
// Proves the own engine (Sekhem) does not need Vite: the repository's four apps, copied into a project whose apps have no
// vite.config.ts, are built with `devora build --engine=own`, served with `devora start`, and run with `devora dev --engine=own`,
// while a loader hook makes any attempt to load vite or @vitejs/* throw. Pages must answer 200 and the hook must stay silent.
//   node scripts/check-no-vite.mjs
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { REPO, get, makeRepoAppsProject, portInUse, sleep, startServer } from "./dev-server-compare/lib.mjs";

const HOOK = path.join(REPO, "scripts/dev-server-compare/no-vite-hook.mjs");
const TSX = path.join(REPO, "node_modules/.bin/tsx");
const CLI = path.join(REPO, "packages/cli/src/index.ts");
const env = { ...process.env, NO_COLOR: "1", NODE_OPTIONS: `--import ${HOOK}`, DEVORA_SESSION_SECRET: "0123456789abcdef0123456789abcdef" };
const failures = [];
const project = makeRepoAppsProject();
try {
  for (const app of ["marketing", "dashboard", "admin", "api-only"]) {
    const cfg = path.join(project.root, "apps", app, "vite.config.ts");
    fs.rmSync(cfg, { force: true });
    const pkg = path.join(project.root, "apps", app, "package.json");
    const json = JSON.parse(fs.readFileSync(pkg, "utf8"));
    for (const k of ["dependencies", "devDependencies"]) {
      delete json[k]?.vite;
      delete json[k]?.["@vitejs/plugin-react"];
    }
    fs.writeFileSync(pkg, JSON.stringify(json, null, 2));
  }
  // the project's own configuration asks for the engine; no flag is passed
  const configPath = path.join(project.root, "devora.config.ts");
  fs.writeFileSync(configPath, fs.readFileSync(configPath, "utf8").replace("export default defineProject({", 'export default defineProject({\n  engine: "own",'));

  const build = spawnSync(TSX, [CLI, "build", "--quiet"], { cwd: project.root, env, encoding: "utf8" });
  if (build.status !== 0) failures.push(`build failed:\n${(build.stdout + build.stderr).slice(-1500)}`);
  else console.log("build: ok (engine from devora.config.ts, no vite.config.ts, vite blocked)");

  if (failures.length === 0) {
    const child = spawn(TSX, [CLI, "start", "--app=dashboard", "--port=11002", "--host=127.0.0.1"], { cwd: project.root, env: { ...env, NODE_ENV: "production" }, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (c) => (out += c));
    child.stderr.on("data", (c) => (out += c));
    for (let i = 0; i < 400 && !(await portInUse(11002)); i++) await sleep(50);
    const page = await get("http://127.0.0.1:11002/login");
    if (!page.ok || page.status !== 200) failures.push(`start: /login answered ${page.ok ? page.status : page.error}\n${out.slice(-800)}`);
    else console.log("start: ok (/login 200)");
    child.kill("SIGTERM");
    for (let i = 0; i < 40 && (await portInUse(11002)); i++) await sleep(100);
    if (/NO-VITE/.test(out)) failures.push(`start tried to load vite:\n${out.slice(-800)}`);

    try {
      const server = await startServer({ root: project.root, experimental: false, port: 11001, env: { NODE_OPTIONS: env.NODE_OPTIONS }, args: ["--app=marketing"] });
      const dev = await get("http://localhost:11001/");
      if (!dev.ok || dev.status !== 200) failures.push(`dev: / answered ${dev.ok ? dev.status : dev.error}`);
      else console.log("dev: ok (/ 200)");
      if (/NO-VITE/.test(server.output())) failures.push(`dev tried to load vite:\n${server.output().slice(-800)}`);
      await server.stop();
    } catch (error) {
      failures.push(`dev: ${error.message}`.slice(0, 1200));
    }
  }
} finally {
  project.cleanup();
}
if (failures.length > 0) {
  console.log(`FAILED (${failures.length}):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("PASS: build, start and dev ran on the own engine with vite blocked");
