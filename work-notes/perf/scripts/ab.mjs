#!/usr/bin/env node
/**
 * Interleaved A/B of two builds of @devorajs/core + @devorajs/cli in benchmarks/apps/devora-api (or, with
 * APP=devora, the pages app: B = SSR /items, C = form POST /form):
 *   [APP=devora] node ab.mjs <dir with cli-before, core-before, cli-after, core-after> [runs=5]
 * For each run and variant: copy the build over the app's node_modules, `devora start`, 5 s warm-up, 10 s of
 * autocannon (50 connections) on D (GET /api/items) and F1 (POST /api/items, valid). Medians with min-max.
 */
import { cpSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(path.resolve("benchmarks/package.json"));
const autocannon = require("autocannon");
const dir = process.argv[2];
const runs = Number(process.argv[3] ?? 5);
const app = path.resolve("benchmarks/apps", process.env.APP ?? "devora-api");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const body = JSON.stringify({ name: "Bench", price: 9.5 });
const scenarios = process.env.APP === "devora" ? {
  B: { url: "http://127.0.0.1:4310/items", headers: { accept: "text/html" } },
  C: { url: "http://127.0.0.1:4310/form", method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin: "http://127.0.0.1:4310", accept: "text/html" }, body: "name=Bench" },
} : {
  D: { url: "http://127.0.0.1:4310/api/items", headers: { accept: "application/json" } },
  F1: { url: "http://127.0.0.1:4310/api/items", method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body },
};
const load = (opts, duration) => new Promise((resolve) => autocannon({ ...opts, connections: 50, duration }, (_e, r) => resolve(r.requests.average)));
const results = { before: Object.fromEntries(Object.keys(scenarios).map((k) => [k, []])), after: Object.fromEntries(Object.keys(scenarios).map((k) => [k, []])) };
for (let i = 0; i < runs; i++) {
  for (const variant of i % 2 ? ["after", "before"] : ["before", "after"]) {
    for (const pkg of ["cli", "core"]) {
      rmSync(path.join(app, "node_modules/@devorajs", pkg, "dist"), { recursive: true, force: true });
      cpSync(path.join(dir, `${pkg}-${variant}`), path.join(app, "node_modules/@devorajs", pkg, "dist"), { recursive: true });
    }
    const child = spawn("node", [path.join(app, "node_modules/@devorajs/cli/dist/index.js"), "start"], { cwd: app, env: { ...process.env, PORT: "4310", HOST: "127.0.0.1", NODE_ENV: "production", DEVORA_SESSION_SECRET: "bench-secret-bench-secret-bench-secret" }, stdio: "ignore" });
    for (let t = 0; t < 100; t++) {
      try {
        await fetch(Object.values(scenarios)[0].url);
        break;
      } catch {
        await sleep(200);
      }
    }
    for (const [name, opts] of Object.entries(scenarios)) {
      await load(opts, 5);
      results[variant][name].push(Math.round(await load(opts, 10)));
    }
    child.kill("SIGINT");
    await new Promise((r) => child.on("exit", r));
    await sleep(500);
  }
}
const med = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
for (const name of Object.keys(scenarios)) {
  const b = results.before[name];
  const a = results.after[name];
  console.log(`${name}: before ${med(b)} (${Math.min(...b)}-${Math.max(...b)})  after ${med(a)} (${Math.min(...a)}-${Math.max(...a)})  change ${(((med(a) - med(b)) / med(b)) * 100).toFixed(1)}%`);
}
console.log(JSON.stringify(results));
