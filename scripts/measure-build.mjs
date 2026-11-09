#!/usr/bin/env node
// Build time, peak memory and output size of `devora build` for the repository's four apps: Vite 6 (the repo's), Vite 7, Vite 8 and the
// own engine (Sekhem). Same CLI source and the same apps every time; each run is a fresh process after a clean dist/.
// Vite 7/8 come from DEVORA_VITE7_DIR / DEVORA_VITE8_DIR (folders with node_modules/vite), loaded through vite-override.mjs.
//   node scripts/measure-build.mjs [--runs=5] [--json=out.json]
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { REPO, makeRepoAppsProject } from "./dev-server-compare/lib.mjs";

const runs = Number((process.argv.find((a) => a.startsWith("--runs=")) ?? "--runs=5").slice(7));
const jsonOut = process.argv.find((a) => a.startsWith("--json="))?.slice(7);
const variants = [
  { name: "vite6", engine: "vite" },
  ...(process.env.DEVORA_VITE7_DIR ? [{ name: "vite7", engine: "vite", vite: process.env.DEVORA_VITE7_DIR }] : []),
  ...(process.env.DEVORA_VITE8_DIR ? [{ name: "vite8", engine: "vite", vite: process.env.DEVORA_VITE8_DIR }] : []),
  { name: "sekhem", engine: "own" },
];
const size = (dir) => {
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    total += e.isDirectory() ? size(p) : fs.statSync(p).size;
  }
  return total;
};
const project = makeRepoAppsProject();
const apps = ["marketing", "dashboard", "admin", "api-only"];
const results = Object.fromEntries(variants.map((v) => [v.name, { ms: [], rssMb: [], bytes: 0 }]));
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
try {
  for (let round = 0; round < runs; round++) {
    for (const v of variants) {
      for (const a of apps) fs.rmSync(path.join(project.root, "apps", a, "dist"), { recursive: true, force: true });
      const env = { ...process.env, NO_COLOR: "1", DEVORA_SESSION_SECRET: "0123456789abcdef0123456789abcdef" };
      if (v.vite) {
        env.DEVORA_VITE_DIR = v.vite;
        env.NODE_OPTIONS = `--import ${path.join(REPO, "scripts/dev-server-compare/vite-override.mjs")}`;
      }
      const started = performance.now();
      const r = spawnSync("/usr/bin/time", ["-l", path.join(REPO, "node_modules/.bin/tsx"), path.join(REPO, "packages/cli/src/index.ts"), "build", `--engine=${v.engine}`, "--quiet"], { cwd: project.root, env, encoding: "utf8" });
      const ms = performance.now() - started;
      if (r.status !== 0) throw new Error(`${v.name} build failed:\n${(r.stdout + r.stderr).slice(-1200)}`);
      const rss = Number(/(\d+)\s+maximum resident set size/.exec(r.stderr)?.[1] ?? 0) / 1048576;
      results[v.name].ms.push(Math.round(ms));
      results[v.name].rssMb.push(Math.round(rss));
      results[v.name].bytes = apps.reduce((n, a) => n + size(path.join(project.root, "apps", a, "dist")), 0);
    }
  }
} finally {
  project.cleanup();
}
const info = { date: new Date().toISOString(), node: process.version, os: `${os.type()} ${os.release()} ${os.arch()}`, cpu: os.cpus()[0]?.model, cpus: os.cpus().length, ramGb: Math.round(os.totalmem() / 2 ** 30), runs };
console.log(JSON.stringify(info));
console.log("variant   median ms  min..max          peak RSS MB (median)  output KB");
for (const [name, r] of Object.entries(results)) console.log(`${name.padEnd(9)} ${String(median(r.ms)).padStart(8)}   ${Math.min(...r.ms)}..${Math.max(...r.ms)}`.padEnd(46) + `${String(median(r.rssMb)).padStart(6)}               ${Math.round(r.bytes / 1024)}`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ info, results }, null, 2));
